/**
 * Moduł VII — Middleman Innowacji.
 *
 * Karta ROPS opisuje rozwiązanie w ogóle. Wójt gminy wiejskiej do 5 tys.
 * mieszkańców potrzebuje wiedzieć, co to znaczy u niego: ile to kosztuje
 * przy jego skali, kto to poprowadzi, co trzeba zmienić i co pójdzie nie tak.
 * Middleman przerabia innowację na opis usługi dla konkretnego profilu.
 *
 * Reguły adaptacji siedzą w lib/middleman.ts i są jawne. To celowe: wójt
 * dostaje liczby, które może obronić przed radą gminy, a nie prozę modelu.
 */
import { useMemo, useState } from "react";
import { INNOVATIONS, type Innovation } from "../lib/data";
import { foldDiacritics } from "../lib/text";
import {
  adapt,
  ORG_TYPES,
  SIZE_BANDS,
  type OrgProfile,
  type OrgType,
  type SizeBand,
} from "../lib/middleman";
import { Stamp } from "../components/Stamp";
import "./middleman.css";

interface Props {
  preselected?: Innovation | null;
  onClearPreselect?: () => void;
}

export function Middleman({ preselected, onClearPreselect }: Props) {
  const [picked, setPicked] = useState<Innovation | null>(null);
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState<OrgProfile>({
    type: "gmina wiejska",
    size: "do 5 tys.",
    budget: 20_000,
    staff: 1,
  });

  const current = preselected ?? picked;

  const needle = foldDiacritics(q.trim().toLowerCase());
  const options = useMemo(() => {
    if (!needle) return INNOVATIONS.slice(0, 10);
    return INNOVATIONS.filter((i) =>
      foldDiacritics(`${i.name} ${i.catName} ${i.desc}`.toLowerCase()).includes(needle),
    ).slice(0, 15);
  }, [needle]);

  const out = useMemo(
    () => (current ? adapt(current, profile) : null),
    [current, profile],
  );

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł VII · Adaptacja innowacji (Middleman)</p>
        <h1>Plan wdrożenia i kalkulator skali</h1>
        <p>
          Wybierz rozwiązanie i określ profil swojej jednostki. Wyliczymy realne
          widełki kosztów, zapotrzebowanie kadrowe, harmonogram wdrożenia oraz wymogi formalne.
        </p>
      </div>

      <div className="mi__grid">
        <form className="mi__form" data-reveal="left" onSubmit={(e) => e.preventDefault()}>
          {current ? (
            <div className="ts__picked">
              <div>
                <p className="eyebrow">{current.catName}</p>
                <h3>{current.name}</h3>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPicked(null);
                  onClearPreselect?.();
                }}
              >
                Zmień
              </button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="mi-search">Którą innowację chcesz wdrożyć?</label>
              <input
                id="mi-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nazwa albo słowo z opisu…"
              />
              <ul className="ts__options">
                {options.map((i) => (
                  <li key={i.id}>
                    <button type="button" className="btn ts__option" onClick={() => setPicked(i)}>
                      <span>{i.name}</span>
                      <span className="eyebrow">{i.catName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="mi__profile">
            <legend>Profil mojej instytucji</legend>

            <div className="field">
              <label htmlFor="mi-type">Typ instytucji</label>
              <select
                id="mi-type"
                value={profile.type}
                onChange={(e) => setProfile({ ...profile, type: e.target.value as OrgType })}
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="mi-size">Liczba mieszkańców / odbiorców</label>
              <select
                id="mi-size"
                value={profile.size}
                onChange={(e) => setProfile({ ...profile, size: e.target.value as SizeBand })}
              >
                {SIZE_BANDS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="mi-budget">
                Budżet roczny: {profile.budget.toLocaleString("pl-PL")} zł
              </label>
              <input
                id="mi-budget"
                type="range"
                min={0}
                max={200_000}
                step={5_000}
                value={profile.budget}
                onChange={(e) => setProfile({ ...profile, budget: Number(e.target.value) })}
                style={{ minHeight: "44px" }}
              />
              <p className="hint">Ustaw 0 zł, jeśli jeszcze nie wiesz — pominiemy ocenę wykonalności.</p>
            </div>

            <div className="field">
              <label htmlFor="mi-staff">
                Osoby, które mogą to prowadzić: {profile.staff}
              </label>
              <input
                id="mi-staff"
                type="range"
                min={0}
                max={8}
                step={1}
                value={profile.staff}
                onChange={(e) => setProfile({ ...profile, staff: Number(e.target.value) })}
                style={{ minHeight: "44px" }}
              />
            </div>
          </fieldset>
        </form>

        <section className="mi__out" data-reveal="right" aria-live="polite" aria-label="Wersja dopasowana">
          {!out || !current ? (
            <div className="mi__placeholder">
              <h3>Wybierz innowację z listy obok</h3>
              <p>
                Pokażemy tę samą innowację rozpisaną jako usługę Twojej jednostki —
                z kalkulacją kosztów przy Twojej skali, harmonogramem wdrożenia
                i wytycznymi adaptacyjnymi.
              </p>
            </div>
          ) : (
            <>
              <h2>{out.title}</h2>
              <p className="mi__summary">{out.summary}</p>

              <div className="mi__numbers">
                <div className={`mi__num${out.affordable ? "" : " mi__num--warn"}`}>
                  <span className="eyebrow">Koszt wdrożenia</span>
                  <strong>
                    {out.costLow.toLocaleString("pl-PL")}–
                    {out.costHigh.toLocaleString("pl-PL")} zł
                  </strong>
                  <span className="hint">
                    {out.affordable
                      ? "mieści się w podanym budżecie"
                      : "powyżej podanego budżetu — zobacz ryzyka"}
                  </span>
                </div>
                <div className="mi__num">
                  <span className="eyebrow">Skala</span>
                  <strong>{out.scale}</strong>
                </div>
                <div className="mi__num">
                  <span className="eyebrow">Kto prowadzi</span>
                  <strong>{out.staffing}</strong>
                </div>
              </div>

              <Stamp evidence={current.evidence} compact />

              <section className="mi__block" data-reveal>
                <h3>Kroki wdrożenia</h3>
                <ol className="mi__steps">
                  {out.steps.map((s) => (
                    <li key={s.no}>
                      <span className="mono mi__stepno">{String(s.no).padStart(2, "0")}</span>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {out.adaptations.length > 0 && (
                <section className="mi__block" data-reveal>
                  <h3>Co trzeba zmienić dla tego profilu</h3>
                  <ul className="mi__list mi__list--adapt">
                    {out.adaptations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mi__block" data-reveal>
                <h3>Ryzyka</h3>
                <ul className="mi__list mi__list--risk">
                  {out.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>

              {out.legal.length > 0 && (
                <section className="mi__block" data-reveal>
                  <h3>Wymogi formalne</h3>
                  <ul className="mi__list">
                    {out.legal.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="row mi__actions">
                <button type="button" className="btn" onClick={() => window.print()}>
                  Drukuj / zapisz PDF
                </button>
                {current.zip && (
                  <a className="btn" href={current.zip} target="_blank" rel="noreferrer">
                    Pobierz materiały innowacji
                  </a>
                )}
              </div>

              <p className="hint mi__disclaimer">
                Widełki kosztów i obsady są szacunkiem wyliczonym z typu rozwiązania
                i podanej skali, nie ofertą. Przed uchwałą budżetową potwierdź je
                u realizatora, który wdrożył to u siebie — przycisk „Skontaktuj się
                z realizatorem" jest na fiszce w module I i II.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
