/**
 * Fiszka innowacji - podstawowa jednostka kartoteki.
 *
 * Kolejność jest celowa i inna niż w portalu ROPS: najpierw dowód
 * („przetestowane"), potem co to jest, potem dlaczego pasuje. Urzędnik szukający
 * rozwiązania pyta najpierw „czy to działa", a nie „jak to wygląda".
 */
import { useEffect, useState } from "react";
import type { MatchResult } from "../lib/match";
import type { Innovation } from "../lib/data";
import { Stamp } from "./Stamp";
import { WhyMatch, ScoreDial } from "./WhyMatch";
import { Highlighted } from "./Highlighted";
import { Modal } from "./Modal";
import { ContactRealizer } from "./ContactRealizer";
import "./card.css";

interface Props {
  result?: MatchResult;
  innovation?: Innovation;
  /** werdykt modelu decyzyjnego Jev z backendu */
  aiVerdict?: {
    related?: boolean;
    confidence?: number;
    reason?: string;
    source?: string;
  };
  /**
   * Ile ms po wejściu karty odsłonić werdykt AI (0 = od razu).
   * W modułu I kartki są podawane po kolei, żeby było widać, że najpierw
   * silnik znajduje trafienia, a dopiero potem model je weryfikuje.
   */
  verdictDelay?: number;
  /** otwiera Middleman dla tej innowacji */
  onAdapt?: (inn: Innovation) => void;
  /** zgłoszenie chęci testowania (moduł IV) */
  onTest?: (inn: Innovation) => void;
}

export function InnovationCard({
  result,
  innovation,
  aiVerdict,
  onAdapt,
  onTest,
  verdictDelay = 0,
}: Props) {
  const inn = result?.innovation ?? innovation!;
  const [contact, setContact] = useState(false);
  const [full, setFull] = useState(false);
  const hl = result?.highlights;

  // Etap „sprawdzam" dotyczy tylko prawdziwego werdyktu modelu (source=jev).
  // Fallbacku nie udajemy: bez AI etykieta „Diagnoza powiązania" pokazuje się
  // od razu, dokładnie tak jak mówi o tym kod na backendzie.
  const isModelVerdict = aiVerdict?.source === "jev";
  const [verdictShown, setVerdictShown] = useState(
    () => !aiVerdict || !isModelVerdict || verdictDelay <= 0,
  );

  useEffect(() => {
    if (verdictShown) return;
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-bg-motion") === "off";
    if (reduce) {
      setVerdictShown(true);
      return;
    }
    const id = window.setTimeout(() => setVerdictShown(true), verdictDelay);
    return () => window.clearTimeout(id);
  }, [verdictShown, verdictDelay]);

  return (
    <article className="fiszka">
      <header className="fiszka__head">
        <div className="fiszka__id">
          <p className="eyebrow">{inn.catName}</p>
          <h3>
            <Highlighted text={inn.name} spans={hl?.name} />
          </h3>
        </div>
        {result && <ScoreDial score={result.score} tier={result.tier} />}
      </header>

      {inn.badges.length > 0 && (
        <p className="fiszka__badge">{inn.badges[0]}</p>
      )}

      {inn.ext && <OriginTag innovation={inn} />}

      <Stamp evidence={inn.evidence} compact />

      <dl className="fiszka__fields">
        <div>
          <dt>Na czym polega</dt>
          <dd>
            <Highlighted text={inn.desc} spans={hl?.desc} max={300} />
          </dd>
        </div>
        <div>
          <dt>Jakiego problemu dotyczy</dt>
          <dd>
            <Highlighted text={inn.problem} spans={hl?.problem} max={300} />
          </dd>
        </div>
        <div>
          <dt>Dla kogo</dt>
          <dd>
            <Highlighted text={inn.target} spans={hl?.target} max={200} />
          </dd>
        </div>
        <div>
          <dt>Kto może wdrożyć</dt>
          <dd>
            <Highlighted text={inn.benef} spans={hl?.benef} max={200} />
          </dd>
        </div>
      </dl>

      {/* Werdykt AI wchodzi dwufazowo: najpierw karta pokazuje stan „weryfikuję"
          (shimmer), potem werdykt wyskakuje z ikoną różniąca się kształtem, nie
          kolorem (✓ powiązane / △ luźne / ○ diagnoza bez modelu). Fallbacku
          (source != jev) nie animujemy — bez AI nie udajemy weryfikacji. */}
      {aiVerdict && !verdictShown && (
        <div className="fiszka__ai-verdict fiszka__ai-verdict--checking" aria-hidden="true">
          <span className="eyebrow">Weryfikuję powiązanie…</span>
          <span className="fiszka__shimmer" />
        </div>
      )}
      {aiVerdict && verdictShown && (
        <div
          className={`fiszka__ai-verdict fiszka__ai-verdict--reveal${
            aiVerdict.related === false ? " fiszka__ai-verdict--loose" : ""
          }`}
        >
          <span className="eyebrow">
            <span className="fiszka__ai-ico" aria-hidden="true">
              {!isModelVerdict || aiVerdict.related === undefined
                ? "○"
                : aiVerdict.related
                  ? "✓"
                  : "△"}
            </span>
            {isModelVerdict ? "Weryfikacja AI" : "Diagnoza powiązania"}
            {typeof aiVerdict.confidence === "number" && ` · pewność ${aiVerdict.confidence}%`}
          </span>
          <p>{aiVerdict.reason || (aiVerdict.related ? "Potwierdzono silne powiązanie merytoryczne z opisanym problemem." : "Rozwiązanie kontekstowo zbliżone.")}</p>
        </div>
      )}

      {result && <WhyMatch result={result} />}

      {inn.deployments.length > 0 && (
        <p className="fiszka__where">
          <span className="eyebrow">Wdrożono w</span>{" "}
          {inn.deployments.map((d) => d.powiat).join(", ")}
          <span className="muted"> (dane demo)</span>
        </p>
      )}

      <footer className="fiszka__actions">
        {/* Kontakt do realizatora opiera się na wdrożeniach w powiatach -
            karty z innych baz ich nie mają, więc zamiast pustego formularza
            prowadzimy do źródła. */}
        {inn.ext ? (
          <a className="btn btn--primary" href={inn.url} target="_blank" rel="noreferrer">
            Otwórz w bazie źródłowej
            <span className="sr-only"> (otwiera {inn.origin?.source ?? "serwis źródłowy"} w nowej karcie)</span>
          </a>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setContact(true)}>
            Skontaktuj się z realizatorem
          </button>
        )}
        {onAdapt && (
          <button type="button" className="btn" onClick={() => onAdapt(inn)}>
            Dopasuj do mojej instytucji
          </button>
        )}
        {onTest && (
          <button type="button" className="btn" onClick={() => onTest(inn)}>
            Chcę to przetestować
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => setFull(true)}>
          Pełna karta
        </button>
      </footer>

      <Modal open={contact} onClose={() => setContact(false)} title={`Kontakt - ${inn.name}`}>
        <ContactRealizer innovation={inn} onDone={() => setContact(false)} />
      </Modal>

      <Modal open={full} onClose={() => setFull(false)} title={inn.name} wide>
        <FullCard innovation={inn} />
      </Modal>
    </article>
  );
}

/**
 * Jedno zdanie prawdy o pochodzeniu karty. Pokazywane tylko dla kart spoza
 * Małopolski - przy 115 kartach ROPS taki znacznik byłby szumem.
 */
function OriginTag({ innovation: inn }: { innovation: Innovation }) {
  const region = inn.origin?.region;
  return (
    <p className="fiszka__origin">
      <span className="fiszka__origin-mark" aria-hidden="true" />
      <span>
        <strong>Spoza Małopolski{region ? ` · ${region}` : ""}</strong>
        {inn.origin?.source && <span className="muted"> - {inn.origin.source}</span>}
      </span>
    </p>
  );
}

function FullCard({ innovation: inn }: { innovation: Innovation }) {
  return (
    <div className="stack">
      <p className="eyebrow">{inn.catName}</p>
      {inn.ext && <OriginTag innovation={inn} />}
      <Stamp evidence={inn.evidence} />

      <dl className="fiszka__fields">
        <div>
          <dt>Na czym polega rozwiązanie</dt>
          <dd>{inn.desc}</dd>
        </div>
        <div>
          <dt>Jakich problemów dotyczy</dt>
          <dd>{inn.problem}</dd>
        </div>
        <div>
          <dt>Grupa docelowa</dt>
          <dd>{inn.target}</dd>
        </div>
        <div>
          <dt>Kto może skorzystać</dt>
          <dd>{inn.benef}</dd>
        </div>
        {inn.authors.length > 0 && (
          <div>
            <dt>Autorzy</dt>
            <dd>{inn.authors.join(", ")}</dd>
          </div>
        )}
      </dl>

      <div className="row">
        {inn.video && (
          <a className="btn" href={inn.video} target="_blank" rel="noreferrer">
            Zobacz film
            <span className="sr-only"> (otwiera YouTube w nowej karcie)</span>
          </a>
        )}
        {inn.pdf && (
          <a className="btn" href={inn.pdf} target="_blank" rel="noreferrer">
            Folder PDF
            <span className="sr-only"> (otwiera plik w nowej karcie)</span>
          </a>
        )}
        {inn.zip && (
          <a className="btn" href={inn.zip} target="_blank" rel="noreferrer">
            Materiały do wdrożenia
            <span className="sr-only"> (pobiera archiwum ZIP)</span>
          </a>
        )}
        {(inn.files ?? []).map((f) => (
          <a className="btn" key={f.url} href={f.url} target="_blank" rel="noreferrer">
            {f.title || "Materiał do pobrania"}
            <span className="sr-only"> (otwiera plik w nowej karcie)</span>
          </a>
        ))}
        <a className="btn btn--ghost" href={inn.url} target="_blank" rel="noreferrer">
          {inn.ext ? "Karta w bazie źródłowej" : "Karta w serwisie ROPS"}
          <span className="sr-only">
            {" "}
            (otwiera {inn.ext ? (inn.origin?.source ?? "serwis źródłowy") : "rops.krakow.pl"} w
            nowej karcie)
          </span>
        </a>
      </div>

      {inn.license && (
        <p className="hint">
          Licencja:{" "}
          <a href={inn.license} target="_blank" rel="noreferrer">
            {inn.license.includes("creativecommons") ? "CC BY 4.0" : "warunki źródła"}
          </a>
          {inn.license.includes("creativecommons")
            ? " - można wdrażać i modyfikować, wymagane podanie autorstwa."
            : " - sprawdź warunki ponownego użycia u właściciela bazy."}
        </p>
      )}
    </div>
  );
}
