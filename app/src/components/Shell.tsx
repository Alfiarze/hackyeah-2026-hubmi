/**
 * Rama aplikacji: skip-link, nagłówek, nawigacja, pasek dostępności.
 *
 * Przełącznik roli (mieszkaniec / ROPS / ekspert) nie jest zabawką — bez niego
 * nie da się pokazać zamkniętej pętli komunikacji na jednym ekranie podczas
 * prezentacji. W wersji produkcyjnej zastępuje go logowanie.
 */
import type { ReactNode } from "react";
import { useA11y, type FontScale } from "../lib/a11y";
import { setRole, type Role, type AppState } from "../lib/store";
import "./shell.css";

export type Route =
  | "matchmaking"
  | "biblioteka"
  | "kreator"
  | "tester"
  | "komunikacja"
  | "admin"
  | "middleman"
  | "dostepnosc";

const NAV: { id: Route; label: string; short: string; module: string }[] = [
  { id: "matchmaking", label: "Znajdź rozwiązanie", short: "Szukaj", module: "I" },
  { id: "biblioteka", label: "Zasobnik wiedzy", short: "Wiedza", module: "II" },
  { id: "kreator", label: "Zgłoś pomysł", short: "Pomysł", module: "III" },
  { id: "tester", label: "Testuj innowacje", short: "Testuj", module: "IV" },
  { id: "komunikacja", label: "Komunikacja", short: "Rozmowy", module: "V" },
  { id: "admin", label: "Panel ROPS", short: "Panel", module: "VI" },
  { id: "middleman", label: "Middleman", short: "Middleman", module: "VII" },
  { id: "dostepnosc", label: "Dostępność", short: "WCAG", module: "—" },
];

interface Props {
  route: Route;
  onRoute: (r: Route) => void;
  state: AppState;
  adminUnread: number;
  authorUnseen: number;
  children: ReactNode;
}

const SCALES: { v: FontScale; label: string; aria: string }[] = [
  { v: 1, label: "A", aria: "Czcionka normalna, 18 pikseli" },
  { v: 1.25, label: "A+", aria: "Czcionka duża, 22 piksele" },
  { v: 1.5, label: "A++", aria: "Czcionka bardzo duża, 27 pikseli" },
];

export function Shell({
  route,
  onRoute,
  state,
  adminUnread,
  authorUnseen,
  children,
}: Props) {
  const a11y = useA11y();

  return (
    <>
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>

      <div className="a11ybar no-print">
        <div className="wrap a11ybar__inner">
          <p className="a11ybar__label" id="a11y-label">
            Dostosuj widok
          </p>
          <div className="row" role="group" aria-labelledby="a11y-label">
            <button
              type="button"
              className="btn btn--ghost"
              aria-pressed={a11y.simpleLanguage}
              onClick={() => a11y.set("simpleLanguage", !a11y.simpleLanguage)}
            >
              Prosty język
            </button>

            <div className="row a11ybar__group" role="group" aria-label="Rozmiar tekstu">
              {SCALES.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  className="btn btn--icon btn--ghost"
                  aria-pressed={a11y.fontScale === s.v}
                  onClick={() => a11y.set("fontScale", s.v)}
                >
                  <span aria-hidden="true">{s.label}</span>
                  <span className="sr-only">{s.aria}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn--ghost"
              aria-pressed={a11y.highContrast}
              onClick={() => a11y.set("highContrast", !a11y.highContrast)}
            >
              Wysoki kontrast
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                a11y.set("theme", a11y.theme === "dark" ? "light" : "dark")
              }
            >
              {a11y.theme === "dark" ? "Jasny motyw" : "Ciemny motyw"}
            </button>

            {/* WCAG 2.2.2: ruch w tle trwa bez przerwy, więc musi mieć
                widoczną pauzę — nie tylko wyciszenie w systemie. */}
            <button
              type="button"
              className="btn btn--ghost"
              aria-pressed={a11y.bgMotion}
              onClick={() => a11y.set("bgMotion", !a11y.bgMotion)}
            >
              Ruch w tle
            </button>
          </div>

          <div className="a11ybar__role">
            <label htmlFor="role-switch" className="sr-only">
              Rola w demonstracji
            </label>
            <span className="eyebrow" aria-hidden="true">
              Demo — jestem:
            </span>
            <select
              id="role-switch"
              value={state.role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="mieszkaniec">mieszkanka / NGO / gmina</option>
              <option value="ROPS">pracownik ROPS</option>
              <option value="ekspert">ekspert branżowy</option>
            </select>
          </div>
        </div>
      </div>

      <header className="hdr">
        <div className="wrap hdr__inner">
          <a
            className="hdr__brand"
            href="#matchmaking"
            onClick={(e) => {
              e.preventDefault();
              onRoute("matchmaking");
            }}
          >
            <span className="hdr__mark" aria-hidden="true" />
            <span>
              <strong>HubMI</strong>
              <span className="hdr__sub">Małopolski Hub Innowacji Społecznych</span>
            </span>
          </a>

          <nav className="hdr__nav" aria-label="Moduły Hubu">
            <ul>
              {NAV.map((n) => {
                const badge =
                  n.id === "admin" ? adminUnread : n.id === "komunikacja" ? authorUnseen : 0;
                return (
                  <li key={n.id}>
                    <a
                      href={`#${n.id}`}
                      aria-current={route === n.id ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onRoute(n.id);
                      }}
                    >
                      <span className="hdr__full">{n.label}</span>
                      <span className="hdr__short" aria-hidden="true">
                        {n.short}
                      </span>
                      {badge > 0 && (
                        <>
                          <span className="hdr__badge" aria-hidden="true">
                            {badge}
                          </span>
                          <span className="sr-only">
                            , {badge} {badge === 1 ? "nowe powiadomienie" : "nowych powiadomień"}
                          </span>
                        </>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <footer className="ftr" data-reveal>
        <div className="wrap stack">
          <p className="mono">
            Prototyp na HackYeah 2026 · zadanie Województwa Małopolskiego, realizator
            ROPS Kraków
          </p>
          <p className="hint" style={{ maxWidth: "60ch" }}>
            Dane innowacji pochodzą z Biblioteki Innowacji Społecznych ROPS (115 kart,
            w większości CC BY 4.0). Dodatkowo, na wyraźne włączenie, Hub pokazuje karty
            z baz spoza regionu — ogólnopolskiej bazy PO WER, ROPS Poznań i Social
            Innovation Match ESF+. Każda z nich jest oznaczona źródłem i nie udaje
            innowacji przetestowanej w Małopolsce. Lokalizacje wdrożeń, kontakty
            realizatorów i zgłoszenia w panelu są danymi demonstracyjnymi — prototyp
            nie używa prawdziwych danych osobowych.
          </p>
        </div>
      </footer>
    </>
  );
}

export { NAV };
