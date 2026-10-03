/**
 * „Nic nie pasowało? Niech przejrzy model." — wspólny blok dla wszystkich
 * miejsc na stronie, w których szukamy po bazie.
 *
 * Kolejność jest wszędzie ta sama i tak ją opisujemy użytkownikowi:
 *   1. zwykłe wyszukiwanie (dosłowne słowa, filtry) — tanie, natychmiastowe,
 *   2. **zero wyników** → model przegląda całą bazę pozycja po pozycji,
 *   3. nadal nic → mówimy to wprost i pokazujemy `fallback` od modułu.
 *
 * Komponent sam nic nie szuka. Decyzję o trafności podejmuje wyłącznie model
 * (`useDeepScan` → `POST /api/match/scan/`), a tutaj zostaje wyświetlenie
 * wyniku i podpisanie go, skąd się wziął — żeby użytkownik nie pomylił tego
 * z dopasowaniem po słowach.
 */
import { type ReactNode } from "react";

import { type Innovation } from "../lib/data";

import { toInnovation } from "../lib/matchApi";
import { useDeepScan } from "../lib/useDeepScan";
import { InnovationCard } from "./InnovationCard";

interface Props {
  /** tekst, którego szukał użytkownik */
  query: string;
  kind?: "innovations" | "library" | "both";
  /** ile pozycji pokazać */
  limit?: number;
  /** co pokazać, gdy model też nic nie znalazł */
  fallback?: ReactNode;
  onAdapt?: (inn: Innovation) => void;
  onTest?: (inn: Innovation) => void;
}

export function ScanFallback({
  query,
  kind = "both",
  limit = 6,
  fallback,
  onAdapt,
  onTest,
}: Props) {
  const { hits, loading, source } = useDeepScan(
    query,
    kind,
    query.trim().length >= 3,
    limit,
  );

  if (loading) {
    return (
      <div className="card" data-reveal aria-live="polite">
        <h3>Nic nie pasowało do słów — przeglądam całą bazę</h3>
        <p>
          Model ocenia teraz każdą pozycję osobno, nie tylko te, które mają
          wspólne słowa z zapytaniem. Trwa to kilka sekund.
        </p>
      </div>
    );
  }

  const innovations = hits.filter((h) => h.kind === "innovation");
  const docs = hits.filter((h) => h.kind === "library");

  if (hits.length === 0) {
    // `source === "fallback"` znaczy, że i model nie odpowiedział — mówimy to
    // wprost, zamiast udawać, że po prostu nic nie ma.
    return (
      <>
        {source === "fallback" && (
          <div className="card" data-reveal>
            <h3>Nie udało się przejrzeć bazy modelem</h3>
            <p>
              Zwykłe wyszukiwanie nic nie znalazło, a model jest teraz
              niedostępny. Spróbuj ponownie za chwilę albo opisz problem zdaniem
              w module Matchmaking.
            </p>
          </div>
        )}
        {fallback}
      </>
    );
  }

  return (
    <section className="scan" data-reveal>
      <div className="scan__head">
        <h3>Po słowach nic nie pasowało — to znalazł model w całej bazie</h3>
        <p className="hint">
          Te pozycje nie mają wspólnych słów z Twoim zapytaniem. Wybrał je model,
          oceniając każdą kartę i każdy dokument osobno — przy każdej pozycji
          widzisz, jak pewny jest tego wyboru.
        </p>
      </div>

      {innovations.length > 0 && (
        <div className="results results--two" data-reveal="stagger">
          {innovations.map((h) => (
            <div key={`i-${h.id}`} className="scan__item">
              <p className="scan__conf mono">
                pewność modelu {Math.round(h.confidence * 100)}%
              </p>
              <InnovationCard
                innovation={toInnovation(h.item)}
                onAdapt={onAdapt}
                onTest={onTest}
              />
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <ul className="lib__docs" data-reveal="stagger">
          {docs.map((h) => (
            <li key={`d-${h.id}`} className="lib__doc">
              <div className="lib__doc-meta">
                <span className="chip">{(h.item.type || "dokument").toUpperCase()}</span>
                {h.item.year && <span className="mono">{h.item.year}</span>}
                <span className="mono muted">
                  pewność modelu {Math.round(h.confidence * 100)}%
                </span>
              </div>
              <h3>
                <a href={h.item.url} target="_blank" rel="noreferrer">
                  {h.item.title}
                </a>
              </h3>
              {h.item.desc && <p>{h.item.desc}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
