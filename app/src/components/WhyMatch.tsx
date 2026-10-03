/**
 * „Dlaczego to pasuje" - rozliczenie dopasowania.
 *
 * Założenie: jury nie ma wierzyć w trafność, ma ją zobaczyć. Dlatego obok
 * wyniku stoi rozbicie na wątki (co pokryte, co nie), pola karty, w których
 * się zgadza, i konkretne słowa, które to uruchomiły. Wynik, którego nie da
 * się wytłumaczyć, jest w tym module bezwartościowy - także dla urzędnika,
 * który musi uzasadnić wybór rozwiązania przed radą gminy.
 */
import type { MatchResult } from "../lib/match";
import "./why.css";

export function ScoreDial({ score, tier }: { score: number; tier: MatchResult["tier"] }) {
  return (
    <div className={`dial dial--${tier.replace("ś", "s")}`}>
      <span className="dial__num">{score}</span>
      <span className="dial__den" aria-hidden="true">
        /100
      </span>
      <span className="sr-only">
        na 100 punktów, dopasowanie {tier}
      </span>
      <span className="dial__tier">{tier}</span>
    </div>
  );
}

export function WhyMatch({ result }: { result: MatchResult }) {
  const { matched, missed, reasons, coverage } = result;
  const total = matched.length + missed.length;

  return (
    <section className="why" aria-label="Dlaczego to pasuje">
      <h4 className="why__h">Dlaczego to pasuje</h4>

      {total > 0 && (
        <p className="why__cov">
          Pokrywa <strong>{matched.length}</strong> z <strong>{total}</strong>{" "}
          {total === 1 ? "wątku" : "wątków"} rozpoznanych w Twoim opisie
          <span className="muted"> (siła pokrycia {Math.round(coverage * 100)}%)</span>
        </p>
      )}

      <ul className="why__reasons">
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      {(matched.length > 0 || missed.length > 0) && (
        <div className="why__chips">
          {matched.map((m) => (
            <span key={m.id} className="chip chip--match">
              <span aria-hidden="true">✓</span>
              <span>
                {m.label}
                <span className="muted"> · {m.fields.join(", ")}</span>
              </span>
            </span>
          ))}
          {missed.map((m) => (
            <span key={m.id} className="chip chip--miss">
              <span aria-hidden="true">-</span>
              <span>
                {m.label} <span className="muted">nie pokryte</span>
              </span>
            </span>
          ))}
        </div>
      )}

      {matched.some((m) => m.terms.length > 0) && (
        <details className="why__terms">
          <summary>Które słowa w karcie to uruchomiły</summary>
          <dl>
            {matched
              .filter((m) => m.terms.length)
              .map((m) => (
                <div key={m.id} className="why__term-row">
                  <dt>{m.label}</dt>
                  <dd className="mono">{m.terms.join(" · ")}</dd>
                </div>
              ))}
          </dl>
        </details>
      )}
    </section>
  );
}
