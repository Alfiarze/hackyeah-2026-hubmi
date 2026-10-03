/**
 * Silnik dopasowania problem → innowacja, z wyjaśnieniem.
 *
 * Dlaczego BM25 + koncepty, a nie embeddingi: wynik musi być *wytłumaczalny*.
 * Jury pyta wprost „czy narzędzie skutecznie sugeruje innowacje na podstawie
 * słów kluczowych z opisu potrzeb" - a przy embeddingach jedyną odpowiedzią
 * jest „bo model tak policzył". Tu dla każdego trafienia widać, który wątek
 * został rozpoznany, w którym polu karty się zgadza i jakimi słowami.
 * Dodatkowo: zero wywołań API, więc demo działa bez internetu i bez kosztów.
 */
import { tokenize, stem, snippet } from "./text";
import { STEM_TO_CONCEPTS, CONCEPT_STEMS, CONCEPT_LABEL } from "./concepts";
import type { Innovation } from "./data";

/** Pola karty i ich waga. Pole problemowe waży najwięcej. */
const FIELDS = [
  { key: "problem", weight: 3.0, label: "opis problemu" },
  { key: "target", weight: 2.6, label: "grupa docelowa" },
  { key: "desc", weight: 2.0, label: "opis rozwiązania" },
  { key: "name", weight: 1.8, label: "nazwa" },
  { key: "benef", weight: 1.5, label: "kto może skorzystać" },
  { key: "catName", weight: 1.4, label: "kategoria" },
  { key: "evidence", weight: 0.9, label: "wyniki testu" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/**
 * Ile warte jest trafienie wątku w danym polu - osobno od wag BM25.
 *
 * Kluczowe jest tu `benef` = 0.15. Pole „kto może skorzystać" w prawie każdej
 * karcie zawiera tę samą szablonową listę („urzędy miasta i gmin, ośrodki
 * pomocy społecznej, organizacje pozarządowe"), więc trafienie tam nie mówi
 * nic o temacie innowacji. Bez tego zbicia „Chlap Pro" (ochrona protez przed
 * zamoknięciem) wychodził na 99/100 dla pytania o schody w urzędzie.
 */
const CONCEPT_FIELD_STRENGTH: Record<FieldKey, number> = {
  problem: 1.0,
  target: 0.85,
  name: 0.7,
  desc: 0.6,
  evidence: 0.3,
  catName: 0.25,
  benef: 0.15,
};

const K1 = 1.2;
const B = 0.75;
/** Dopasowanie przez koncept liczy się słabiej niż trafienie dosłowne. */
const CONCEPT_WEIGHT = 0.55;
/** Mnożnik dla kart bez opisanych wyników testu - zob. komentarz przy użyciu. */
const UNTESTED_PENALTY = 0.88;
/**
 * Mnożnik dla kart z baz spoza Małopolski. Taka innowacja bywa świetna, ale nie
 * została przetestowana w regionie, więc przy równym dopasowaniu pierwszeństwo
 * ma karta małopolska. Powód trafia do uzasadnienia, nie znika po cichu.
 */
const EXTERNAL_PENALTY = 0.9;

interface FieldIndex {
  tf: Map<string, number>;
  len: number;
}

interface ConceptHit {
  fields: Set<FieldKey>;
  /** łączna liczba wystąpień rdzeni tego wątku w karcie */
  tf: number;
}

interface DocIndex {
  id: string;
  fields: Record<FieldKey, FieldIndex>;
  /** koncepty obecne w karcie: gdzie i jak mocno */
  concepts: Map<string, ConceptHit>;
}

/**
 * Siła obecności wątku w karcie, 0-1. Wzmianka rzucona raz w jednym słabym
 * polu daje ~0.1; wątek, na który karta wprost odpowiada - blisko 1.
 */
function conceptStrength(hit: ConceptHit): number {
  let best = 0;
  for (const f of hit.fields) best = Math.max(best, CONCEPT_FIELD_STRENGTH[f]);
  return best * (0.65 + 0.35 * Math.min(1, hit.tf / 3));
}

export interface MatchedConcept {
  id: string;
  label: string;
  /** pola karty, w których ten wątek jest obecny */
  fields: string[];
  /** słowa z karty, które go uruchomiły */
  terms: string[];
  /** jak mocno ten wątek jest obecny w karcie, 0-1 */
  strength: number;
}

export interface Highlight {
  start: number;
  end: number;
}

export interface MatchResult {
  innovation: Innovation;
  /** 0-100; 65% pokrycie wątków + 35% siła leksykalna */
  score: number;
  tier: "wysokie" | "średnie" | "niskie";
  matched: MatchedConcept[];
  missed: { id: string; label: string }[];
  /** ważone pokrycie wątków zapytania, 0-1 */
  coverage: number;
  /** gotowe zdania uzasadnienia */
  reasons: string[];
  highlights: Partial<Record<FieldKey, Highlight[]>>;
}

export interface QueryAnalysis {
  concepts: { id: string; label: string }[];
  stems: string[];
  /** słowa zapytania nierozpoznane jako żaden wątek */
  unknown: string[];
}

let INDEX: DocIndex[] = [];
let IDF: Map<string, number> = new Map();
let AVG_LEN: Record<string, number> = {};
let DOCS: Map<string, Innovation> = new Map();

function fieldText(inn: Innovation, key: FieldKey): string {
  return (inn as unknown as Record<string, string>)[key] ?? "";
}

export function buildIndex(innovations: Innovation[]): void {
  INDEX = [];
  DOCS = new Map();
  const df = new Map<string, number>();
  const lenSum: Record<string, number> = {};

  for (const inn of innovations) {
    DOCS.set(inn.id, inn);
    const fields = {} as Record<FieldKey, FieldIndex>;
    const concepts = new Map<string, ConceptHit>();
    const seenStems = new Set<string>();

    for (const f of FIELDS) {
      const toks = tokenize(fieldText(inn, f.key));
      const tf = new Map<string, number>();
      for (const t of toks) {
        tf.set(t.stem, (tf.get(t.stem) ?? 0) + 1);
        seenStems.add(t.stem);
        for (const cid of STEM_TO_CONCEPTS.get(t.stem) ?? []) {
          let h = concepts.get(cid);
          if (!h) concepts.set(cid, (h = { fields: new Set(), tf: 0 }));
          h.fields.add(f.key);
          h.tf += 1;
        }
      }
      fields[f.key] = { tf, len: toks.length };
      lenSum[f.key] = (lenSum[f.key] ?? 0) + toks.length;
    }
    for (const s of seenStems) df.set(s, (df.get(s) ?? 0) + 1);
    INDEX.push({ id: inn.id, fields, concepts });
  }

  const N = innovations.length;
  IDF = new Map();
  for (const [s, n] of df) {
    // przycięcie od dołu, by terminy obecne niemal wszędzie (np. rdzeń
    // „innowacj") nie wychodziły na wartość ujemną
    IDF.set(s, Math.max(0.08, Math.log(1 + (N - n + 0.5) / (n + 0.5))));
  }
  AVG_LEN = {};
  for (const f of FIELDS) AVG_LEN[f.key] = (lenSum[f.key] ?? 0) / Math.max(1, N);
}

/** Rozpoznaje w zapytaniu wątki tematyczne i wypisuje, czego nie zrozumiało. */
export function analyzeQuery(query: string): QueryAnalysis {
  const toks = tokenize(query);
  const seen = new Set<string>();
  const concepts: { id: string; label: string }[] = [];
  const unknown: string[] = [];

  for (const t of toks) {
    const cids = STEM_TO_CONCEPTS.get(t.stem);
    if (cids && cids.length) {
      for (const cid of cids) {
        if (seen.has(cid)) continue;
        seen.add(cid);
        concepts.push({ id: cid, label: CONCEPT_LABEL.get(cid) ?? cid });
      }
    } else if (t.raw.length > 3 && !unknown.includes(t.raw.toLowerCase())) {
      unknown.push(t.raw.toLowerCase());
    }
  }
  return { concepts, stems: [...new Set(toks.map((t) => t.stem))], unknown };
}

function bm25(tf: number, len: number, avg: number, idf: number): number {
  if (tf === 0) return 0;
  return (idf * (tf * (K1 + 1))) / (tf + K1 * (1 - B + B * (len / Math.max(1, avg))));
}

function buildReasons(
  inn: Innovation,
  matched: MatchedConcept[],
  missed: { label: string }[],
): string[] {
  const out: string[] = [];
  const inProblem = matched.filter((m) => m.fields.includes("opis problemu"));
  const inTarget = matched.filter((m) => m.fields.includes("grupa docelowa"));

  if (inProblem.length) {
    out.push(
      `Odpowiada na ten sam problem: ${inProblem.map((m) => m.label).join(", ")}.`,
    );
  }
  if (inTarget.length) {
    out.push(
      `Grupa docelowa się zgadza - karta wymienia ${inTarget
        .map((m) => m.label)
        .join(", ")}: ${snippet(inn.target, 120)}`,
    );
  }
  if (!inProblem.length && !inTarget.length && matched.length) {
    out.push(`Wspólne wątki: ${matched.map((m) => m.label).join(", ")}.`);
  }
  if (inn.ext) {
    out.push(
      `Ta innowacja nie pochodzi z Małopolski - źródło: ${inn.origin?.source ?? "inna baza"}` +
        `${inn.origin?.region ? ` (${inn.origin.region})` : ""}. Wynik dopasowania jest ` +
        "lekko obniżony, bo ROPS nie testował jej w regionie - traktuj ją jak inspirację " +
        "do adaptacji.",
    );
  }
  if (inn.evidence) {
    out.push(`Było testowane: ${snippet(inn.evidence, 150)}`);
  } else {
    out.push(
      "Ta karta nie ma opisanych wyników testu, więc wynik dopasowania został " +
        "obniżony - tematycznie pasuje, ale nikt nie udokumentował, czy działa.",
    );
  }
  if (missed.length) {
    out.push(
      `Nie pokrywa: ${missed.map((m) => m.label).join(", ")} - sprawdź, czy to dla Ciebie istotne.`,
    );
  }
  return out.slice(0, 4);
}

function computeHighlights(
  inn: Innovation,
  wanted: Set<string>,
): Partial<Record<FieldKey, Highlight[]>> {
  const hl: Partial<Record<FieldKey, Highlight[]>> = {};
  for (const f of FIELDS) {
    const text = fieldText(inn, f.key);
    if (!text) continue;
    const spans = tokenize(text)
      .filter((t) => wanted.has(t.stem))
      .map((t) => ({ start: t.start, end: t.end }));
    if (spans.length) hl[f.key] = spans;
  }
  return hl;
}

export interface SearchOptions {
  limit?: number;
  /** tylko innowacje wdrożone w tym powiecie */
  powiat?: string;
  cat?: string;
  /**
   * Czy dopuścić karty z baz spoza Małopolski (`Innovation.ext`).
   * Domyślnie nie: zadanie dotyczy innowacji przetestowanych w Małopolsce,
   * a reszta baz jest inspiracją, o którą użytkownik prosi świadomie.
   */
  external?: boolean;
}

export function search(
  query: string,
  opts: SearchOptions = {},
): { analysis: QueryAnalysis; results: MatchResult[] } {
  const analysis = analyzeQuery(query);
  const limit = opts.limit ?? 8;

  // Rdzenie wpisane dosłownie mają wagę 1, rdzenie dociągnięte z konceptów
  // CONCEPT_WEIGHT - żeby rozszerzenie pomagało, ale nie dominowało.
  const weights = new Map<string, number>();
  for (const s of analysis.stems) weights.set(s, 1);
  for (const c of analysis.concepts) {
    for (const s of CONCEPT_STEMS.get(c.id) ?? []) {
      if (!weights.has(s)) weights.set(s, CONCEPT_WEIGHT);
    }
  }
  if (weights.size === 0) return { analysis, results: [] };

  const queryConceptIds = new Set(analysis.concepts.map((c) => c.id));
  const raw: { doc: DocIndex; lex: number; coverage: number }[] = [];

  for (const doc of INDEX) {
    const inn = DOCS.get(doc.id)!;
    if (opts.cat && inn.cat !== opts.cat) continue;
    if (inn.ext && !opts.external) continue;
    if (opts.powiat && !inn.deployments.some((d) => d.powiat === opts.powiat)) continue;

    let lex = 0;
    for (const f of FIELDS) {
      const fi = doc.fields[f.key];
      for (const [s, w] of weights) {
        const tf = fi.tf.get(s);
        if (!tf) continue;
        lex += f.weight * w * bm25(tf, fi.len, AVG_LEN[f.key], IDF.get(s) ?? 0.08);
      }
    }
    if (lex <= 0) continue;

    // Ważone pokrycie: każdy wątek zapytania wnosi tyle, ile naprawdę waży
    // w karcie - nie 1 za samo pojawienie się słowa.
    let covSum = 0;
    for (const cid of queryConceptIds) {
      const hit = doc.concepts.get(cid);
      if (hit) covSum += conceptStrength(hit);
    }
    raw.push({
      doc,
      lex,
      coverage: queryConceptIds.size ? covSum / queryConceptIds.size : 0,
    });
  }
  if (!raw.length) return { analysis, results: [] };

  const maxLex = Math.max(...raw.map((r) => r.lex));
  const results: MatchResult[] = raw
    .map((r) => {
      const inn = DOCS.get(r.doc.id)!;
      // Pokrycie wątków waży więcej niż siła leksykalna: zgodność tematu jest
      // ważniejsza niż liczba powtórzeń słowa w karcie.
      let score = Math.round(100 * (0.65 * r.coverage + 0.35 * (r.lex / maxLex)));
      // Nie rozpoznaliśmy żadnego wątku - zostaje samo trafienie w słowa.
      // Taki wynik nie ma prawa wyglądać na pewny, więc ścinamy go do 30.
      if (!queryConceptIds.size) score = Math.min(score, 30);
      // Obietnica tego modułu brzmi „pokażemy, co już zadziałało", więc karta
      // bez opisanych wyników testu (4 ze 115) dostaje lekką korektę w dół.
      // Celowo lekką: nie ukrywamy najlepszego tematycznie dopasowania, tylko
      // nie pozwalamy mu wygrywać po cichu. Powód jest wypisany w uzasadnieniu.
      if (!inn.evidence) score = Math.round(score * UNTESTED_PENALTY);
      if (inn.ext) score = Math.round(score * EXTERNAL_PENALTY);

      const matched: MatchedConcept[] = [];
      for (const c of analysis.concepts) {
        const hit = r.doc.concepts.get(c.id);
        if (!hit) continue;
        const cstems = new Set(CONCEPT_STEMS.get(c.id) ?? []);
        const terms = new Set<string>();
        for (const fk of hit.fields) {
          for (const t of tokenize(fieldText(inn, fk))) {
            if (cstems.has(t.stem)) terms.add(t.raw.toLowerCase());
          }
        }
        matched.push({
          id: c.id,
          label: c.label,
          fields: [...hit.fields].map((fk) => FIELDS.find((f) => f.key === fk)!.label),
          terms: [...terms].slice(0, 6),
          strength: Math.round(100 * conceptStrength(hit)) / 100,
        });
      }
      matched.sort((a, b) => b.strength - a.strength);
      const missed = analysis.concepts.filter((c) => !r.doc.concepts.has(c.id));

      return {
        innovation: inn,
        score,
        tier: (r.coverage >= 0.6 && score >= 55
          ? "wysokie"
          : score >= 35
            ? "średnie"
            : "niskie") as MatchResult["tier"],
        matched,
        missed,
        coverage: r.coverage,
        reasons: buildReasons(inn, matched, missed),
        highlights: computeHighlights(inn, new Set(weights.keys())),
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.innovation.name.localeCompare(b.innovation.name, "pl"),
    )
    .slice(0, limit);

  return { analysis, results };
}

/**
 * Czy zgłoszenie jest luką w ofercie Hubu.
 *
 * Gdy nic sensownego nie pasuje, zgłoszenie ma trafić do adminowego widoku
 * „niezaspokojone potrzeby" - problem bez rozwiązania staje się zadaniem dla
 * Hubu, a nie pustą listą dla użytkownika.
 */
export const GAP_SCORE_THRESHOLD = 35;
export const GAP_COVERAGE_THRESHOLD = 0.25;

export type GapReason = "brak-watkow" | "brak-trafien" | "slabe-pokrycie" | null;

/** Zwraca powód uznania za lukę, albo null gdy dopasowanie jest wiarygodne. */
export function gapReason(
  analysis: QueryAnalysis,
  results: MatchResult[],
): GapReason {
  // Nie rozpoznaliśmy ani jednego wątku - Biblioteka nie pokrywa tego tematu.
  // To najważniejszy przypadek: pytanie spoza domeny polityki społecznej
  // („hodowla pstrąga") nie może dostać wyniku wyglądającego na trafienie.
  if (analysis.concepts.length === 0) return "brak-watkow";
  if (results.length === 0) return "brak-trafien";
  if (
    results[0].score < GAP_SCORE_THRESHOLD ||
    results[0].coverage < GAP_COVERAGE_THRESHOLD
  ) {
    return "slabe-pokrycie";
  }
  return null;
}

export function isGap(analysis: QueryAnalysis, results: MatchResult[]): boolean {
  return gapReason(analysis, results) !== null;
}

export const GAP_REASON_TEXT: Record<Exclude<GapReason, null>, string> = {
  "brak-watkow":
    "Nie rozpoznaliśmy w tym opisie żadnego z obszarów, które pokrywa Biblioteka Innowacji Społecznych.",
  "brak-trafien": "Żadna z 115 innowacji nie odpowiada na ten problem.",
  "slabe-pokrycie":
    "Znaleźliśmy tylko luźno powiązane rozwiązania - żadne nie odpowiada na to wprost.",
};

export { FIELDS, stem };
export type { FieldKey };
