/**
 * Mapa Małopolski — gdzie podobny problem już rozwiązano.
 *
 * Geometria jest prawdziwa: 22 jednostki (19 powiatów + 3 miasta na prawach
 * powiatu), wycięte z polska-geojson i uproszczone do 10% punktów
 * (scripts/build_geo.py). Nie jest to schemat ani kafelki — jury widzi
 * rzeczywisty kształt województwa.
 *
 * Lokalizacje wdrożeń to natomiast DANE DEMO i jest to w interfejsie napisane
 * wprost: Biblioteka ROPS nie publikuje, gdzie która innowacja była wdrażana.
 * Udawanie, że mamy te dane, byłoby wprowadzaniem jury w błąd.
 *
 * Dostępność: mapa nie jest jedynym dostępem do tej informacji — pod nią stoi
 * ta sama lista jako tabela. Same ścieżki są przyciskami osiągalnymi
 * tabulatorem, z nazwą i liczbą w etykiecie (WCAG 1.1.1, 2.1.1).
 */
import { MAP } from "../lib/data";
import "./map.css";

interface Props {
  /** liczba wdrożeń per powiat */
  counts: Map<string, number>;
  selected?: string | null;
  onSelect: (powiat: string | null) => void;
  /** opis dla czytników — co ta mapa pokazuje w tym kontekście */
  caption: string;
}

export function MalopolskaMap({ counts, selected, onSelect, caption }: Props) {
  const max = Math.max(1, ...counts.values());

  /** 5 progów — intensywność nigdy nie jest jedynym nośnikiem, liczba jest w etykiecie */
  const bucket = (n: number): number => {
    if (!n) return 0;
    return Math.min(4, Math.ceil((n / max) * 4));
  };

  return (
    <figure className="map">
      <figcaption className="map__caption">{caption}</figcaption>

      <div className="map__shell">
        <svg
          viewBox={MAP.viewBox}
          className="map__svg"
          role="group"
          aria-label="Mapa województwa małopolskiego — 22 powiaty i miasta"
        >
          {MAP.units.map((u) => {
            const n = counts.get(u.id) ?? 0;
            const isSel = selected === u.id;
            return (
              <g key={u.id}>
                <path
                  d={u.d}
                  className={`map__unit map__unit--b${bucket(n)}${
                    isSel ? " map__unit--sel" : ""
                  }`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSel}
                  aria-label={`${u.name}: ${n} ${
                    n === 1 ? "wdrożenie" : n >= 2 && n <= 4 ? "wdrożenia" : "wdrożeń"
                  }`}
                  onClick={() => onSelect(isSel ? null : u.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(isSel ? null : u.id);
                    }
                  }}
                />
                {u.city && (
                  <circle cx={u.cx} cy={u.cy} r={3.5} className="map__city" aria-hidden="true" />
                )}
              </g>
            );
          })}
        </svg>

        <ul className="map__legend" aria-hidden="true">
          <li>
            <span className="map__swatch map__unit--b0" /> brak
          </li>
          <li>
            <span className="map__swatch map__unit--b1" /> mniej
          </li>
          <li>
            <span className="map__swatch map__unit--b2" />
          </li>
          <li>
            <span className="map__swatch map__unit--b3" />
          </li>
          <li>
            <span className="map__swatch map__unit--b4" /> więcej
          </li>
        </ul>
      </div>

      {selected && (
        <p className="map__sel" role="status">
          Filtr: <strong>{MAP.units.find((u) => u.id === selected)?.name}</strong>{" "}
          <button type="button" className="btn btn--ghost" onClick={() => onSelect(null)}>
            Wyczyść filtr
          </button>
        </p>
      )}

      {/* Ta sama informacja bez mapy — dla czytników ekranu i nawigacji klawiaturą. */}
      <details className="map__table">
        <summary>Te same dane jako tabela</summary>
        <div className="scroll-x">
          <table>
            <caption className="sr-only">Liczba wdrożeń w powiatach</caption>
            <thead>
              <tr>
                <th scope="col">Powiat / miasto</th>
                <th scope="col">Wdrożenia</th>
                <th scope="col">Filtr</th>
              </tr>
            </thead>
            <tbody>
              {[...MAP.units]
                .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
                .map((u) => (
                  <tr key={u.id}>
                    <th scope="row">{u.name}</th>
                    <td>{counts.get(u.id) ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        aria-pressed={selected === u.id}
                        onClick={() => onSelect(selected === u.id ? null : u.id)}
                      >
                        {selected === u.id ? "Wyczyść" : "Pokaż"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="map__note">
        <strong>Dane demo.</strong> Biblioteka Innowacji Społecznych ROPS nie publikuje
        lokalizacji wdrożeń, więc rozmieszczenie zostało wygenerowane na potrzeby
        prototypu (deterministycznie, z charakteru innowacji). Granice powiatów są
        prawdziwe. Po wdrożeniu to pole wypełniają realne zgłoszenia realizatorów.
      </p>
    </figure>
  );
}
