/**
 * Moduł I - dopasowanie liczone wyłącznie po stronie backendu.
 *
 * Front nie ma tu własnego rankingu. `POST /api/match/search/` zwraca komplet:
 * analizę zapytania, wyniki z uzasadnieniami i podświetleniami, werdykt Jev
 * „czy powiązane" oraz flagę luki - i przy okazji zapisuje zapytanie jako
 * sygnał potrzeby, z którego powstają trendy w panelu ROPS. Liczenie tego
 * samego drugi raz w przeglądarce rozjechałoby wyniki z tym, co widzi
 * koordynator, więc ten moduł tylko tłumaczy JSON na typy komponentów.
 */
import { api, type BackendMatchResult, type MatchSearchResult } from "./api";
import type { Innovation } from "./data";
import type { FieldKey, Highlight, MatchResult, QueryAnalysis } from "./match";

export type GapReason = MatchSearchResult["gap"]["reason"];

export interface AiVerdict {
  related?: boolean;
  confidence?: number;
  reason?: string;
  source?: string;
}

export interface MatchResponse {
  /** id SearchQuery w bazie - bez niego nie da się zgłosić luki */
  queryId: number;
  analysis: QueryAnalysis;
  results: MatchResult[];
  gap: { isGap: boolean; reason: GapReason; text: string };
  verdicts: Record<string, AiVerdict>;
}

/** Nazwy pól karty są wspólne dla backendu i frontu - patrz `engine.FIELDS`. */
const FIELD_KEYS: FieldKey[] = [
  "problem",
  "target",
  "desc",
  "name",
  "benef",
  "catName",
  "evidence",
];

function toInnovation(row: BackendMatchResult): Innovation {
  return {
    id: row.id,
    name: row.name,
    cat: row.cat,
    catName: row.catName,
    problem: row.problem ?? "",
    desc: row.desc ?? "",
    target: row.target ?? "",
    benef: row.benef ?? "",
    evidence: row.evidence ?? "",
    authors: row.authors ?? [],
    badges: row.badges ?? [],
    video: row.video ?? null,
    pdf: row.pdf ?? null,
    zip: row.zip ?? null,
    license: row.license ?? null,
    url: row.url ?? "",
    deployments: row.deployments ?? [],
    ext: Boolean(row.ext),
    origin: row.origin ?? undefined,
  };
}

/** Backend podaje offsety jako pary [start, end]; komponenty chcą obiektów. */
function toHighlights(
  raw: BackendMatchResult["match"]["highlights"],
): Partial<Record<FieldKey, Highlight[]>> {
  const out: Partial<Record<FieldKey, Highlight[]>> = {};
  if (!raw) return out;
  for (const key of FIELD_KEYS) {
    const spans = raw[key];
    if (!Array.isArray(spans) || spans.length === 0) continue;
    out[key] = spans.map(([start, end]) => ({ start, end }));
  }
  return out;
}

function toMatchResult(row: BackendMatchResult): MatchResult {
  const m = row.match;
  return {
    innovation: toInnovation(row),
    score: m.score,
    tier: m.tier,
    matched: m.matched ?? [],
    missed: m.missed ?? [],
    coverage: m.coverage ?? 0,
    reasons: m.reasons ?? [],
    highlights: toHighlights(m.highlights),
  };
}

export class MatchApiError extends Error {}

/**
 * Odpytuje backend i zwraca gotowe wyniki.
 *
 * Rzuca `MatchApiError`, gdy serwer nie odpowiada - moduł I świadomie nie ma
 * trybu offline: wynik bez zapisu w bazie nie zasiliłby trendów i nie dałby
 * się zgłosić jako luka, więc pokazanie go byłoby kłamstwem wobec użytkownika.
 */
export async function fetchMatches(
  query: string,
  opts: {
    limit?: number;
    powiat?: string | null;
    cat?: string | null;
    /** dopuść karty z baz spoza Małopolski */
    external?: boolean;
  } = {},
): Promise<MatchResponse> {
  const res = await api.match.search(
    query,
    opts.limit ?? 6,
    opts.cat ?? undefined,
    opts.powiat ?? undefined,
    opts.external ?? false,
  );

  if (!res.ok || !res.data) {
    throw new MatchApiError(res.error || "Backend nie odpowiedział na zapytanie.");
  }

  const data = res.data;
  const verdicts: Record<string, AiVerdict> = {};
  for (const row of data.results ?? []) {
    if (!row.ai) continue;
    verdicts[row.id] = {
      related: row.ai.related ?? undefined,
      confidence: typeof row.ai.confidence === "number" ? row.ai.confidence : undefined,
      reason: row.ai.reason || undefined,
      source: row.ai.source || undefined,
    };
  }

  return {
    queryId: data.query_id,
    analysis: {
      concepts: data.analysis?.concepts ?? [],
      stems: data.analysis?.stems ?? [],
      unknown: data.analysis?.unknown ?? [],
    },
    results: (data.results ?? []).map(toMatchResult),
    gap: {
      isGap: Boolean(data.gap?.is_gap),
      reason: data.gap?.reason ?? null,
      text: data.gap?.text ?? "",
    },
    verdicts,
  };
}

/** Rejestruje lukę w backendzie; zwraca id utworzonego wątku dla ROPS. */
export async function reportGap(payload: {
  queryId: number;
  title: string;
  body: string;
  powiat?: string | null;
}): Promise<string> {
  const res = await api.match.reportGap({
    query_id: payload.queryId,
    title: payload.title,
    body: payload.body,
    powiat: payload.powiat ?? undefined,
  });
  if (!res.ok || !res.data) {
    throw new MatchApiError(res.error || "Nie udało się zapisać zgłoszenia w ROPS.");
  }
  return res.data.thread;
}
