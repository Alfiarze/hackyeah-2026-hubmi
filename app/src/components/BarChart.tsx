/**
 * Poziome słupki w inline SVG. Bez bibliotek wykresowych.
 *
 * Poziome, nie pionowe, bo etykiety są długimi polskimi nazwami obszarów
 * („niepełnosprawność intelektualna") — w pionie trzeba by je obracać, a
 * obrócony tekst jest barierą dla osób słabowidzących i przy powiększeniu.
 *
 * Tożsamość serii nie zależy od koloru: druga seria dostaje teksturę
 * (ukośne kreski), każda seria ma legendę, a pod wykresem stoi ta sama
 * tabela (WCAG 1.4.1, 1.1.1). Wartości noszą kolor tekstu, nie serii.
 */
import { useId, useState } from "react";
import "./chart.css";

export interface Series {
  label: string;
  /** 1 = --chart-1, 2 = --chart-2 */
  slot: 1 | 2;
}

export interface BarRow {
  label: string;
  /** jedna wartość na serię, w tej samej kolejności co `series` */
  values: number[];
  /** dopisek pod etykietą, np. liczba bezwzględna */
  note?: string;
}

interface Props {
  title: string;
  /** co opisuje oś wartości, np. „% zgłoszeń" */
  unit: string;
  series: Series[];
  rows: BarRow[];
  /** sformatowana wartość w etykiecie i tabeli */
  format?: (v: number) => string;
  /** maksimum osi; domyślnie z danych */
  max?: number;
  caption?: string;
}

const ROW_H = 34;
const BAR_GAP = 2; // 2px przerwy powierzchni między sąsiednimi słupkami
const LABEL_W = 230;
const PAD_R = 56;
const TOP = 26;

export function BarChart({
  title,
  unit,
  series,
  rows,
  format = (v) => String(v),
  max,
  caption,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ r: number; s: number } | null>(null);

  if (rows.length === 0) {
    return (
      <figure className="chart chart--empty">
        <figcaption>
          <h3>{title}</h3>
        </figcaption>
        <p className="muted">
          Brak danych do pokazania. Wykres pojawi się, gdy wpłyną pierwsze zgłoszenia.
        </p>
      </figure>
    );
  }

  const hi = max ?? Math.max(...rows.flatMap((r) => r.values), 1);
  const barH = Math.max(8, (ROW_H - BAR_GAP * (series.length + 1)) / series.length);
  const plotH = rows.length * ROW_H;
  const H = plotH + TOP + 8;
  const W = 760;
  const plotW = W - LABEL_W - PAD_R;
  const x = (v: number) => (v / hi) * plotW;

  /**
   * Podziałki osi. Przy małych maksimach (np. 1 wystąpienie) ułamki zaokrąglone
   * do liczb całkowitych dawały oś „0 0 1 1 1" — bezużyteczną i wyglądającą
   * na błąd. Gdy maksimum jest całkowite i niskie, dzielimy je na krokach
   * całkowitych zamiast na stałych czwartych.
   */
  const ticks = (() => {
    const whole = Number.isInteger(hi) && hi <= 6;
    if (whole) return Array.from({ length: hi + 1 }, (_, i) => i);
    return [0, 0.25, 0.5, 0.75, 1].map((f) => f * hi);
  })();

  return (
    <figure className="chart">
      <figcaption>
        <h3>{title}</h3>
        {caption && <p className="chart__cap">{caption}</p>}
      </figcaption>

      {series.length > 1 && (
        <ul className="chart__legend">
          {series.map((s) => (
            <li key={s.label}>
              <span className={`chart__key chart__key--${s.slot}`} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="chart__scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart__svg"
          role="img"
          aria-label={`${title}. Oś: ${unit}. ${rows.length} pozycji. Dane dostępne też jako tabela pod wykresem.`}
        >
          <defs>
            {/* Tekstura dla drugiej serii — identyfikacja bez polegania na barwie. */}
            <pattern
              id={`hatch-${uid}`}
              width="6"
              height="6"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="6" height="6" fill="var(--chart-2)" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-surface)" strokeWidth="2.2" />
            </pattern>
          </defs>

          {/* siatka — recesywna, za markami */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={LABEL_W + x(t)}
                y1={TOP - 8}
                x2={LABEL_W + x(t)}
                y2={TOP + plotH}
                stroke="var(--chart-grid)"
                strokeWidth={i === 0 ? 1.5 : 1}
              />
              <text
                x={LABEL_W + x(t)}
                y={TOP - 14}
                className="chart__tick"
                textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
              >
                {format(t)}
              </text>
            </g>
          ))}

          {rows.map((row, ri) => {
            const y0 = TOP + ri * ROW_H;
            return (
              <g key={row.label}>
                <text x={LABEL_W - 12} y={y0 + ROW_H / 2} className="chart__label" textAnchor="end">
                  {row.label.length > 30 ? row.label.slice(0, 29) + "…" : row.label}
                </text>

                {row.values.map((v, si) => {
                  const w = x(v);
                  const y = y0 + BAR_GAP + si * (barH + BAR_GAP);
                  const isHot = hover?.r === ri && hover?.s === si;
                  return (
                    <g key={si}>
                      {/* cel kursora szerszy niż sam mark */}
                      <rect
                        x={LABEL_W}
                        y={y - 1}
                        width={plotW}
                        height={barH + 2}
                        fill="transparent"
                        onMouseEnter={() => setHover({ r: ri, s: si })}
                        onMouseLeave={() => setHover(null)}
                      />
                      <rect
                        x={LABEL_W}
                        y={y}
                        width={Math.max(v > 0 ? 3 : 0, w)}
                        height={barH}
                        rx={4}
                        fill={
                          series[si].slot === 2 ? `url(#hatch-${uid})` : "var(--chart-1)"
                        }
                        stroke={isHot ? "var(--ink)" : "none"}
                        strokeWidth={isHot ? 2 : 0}
                      />
                      {/* etykieta tylko przy najdłuższym słupku serii — nie na każdym */}
                      {(isHot || v === Math.max(...rows.map((r) => r.values[si] ?? 0))) && v > 0 && (
                        <text
                          x={LABEL_W + w + 8}
                          y={y + barH / 2}
                          className="chart__val"
                        >
                          {format(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {hover && (
        <p className="chart__tip" role="status">
          <strong>{rows[hover.r].label}</strong>
          {series.length > 1 && <> · {series[hover.s].label}</>} ·{" "}
          {format(rows[hover.r].values[hover.s])}
          {rows[hover.r].note && <span className="muted"> · {rows[hover.r].note}</span>}
        </p>
      )}

      <details className="chart__table">
        <summary>Te same dane jako tabela</summary>
        <div className="scroll-x">
          <table>
            <caption className="sr-only">
              {title} — {unit}
            </caption>
            <thead>
              <tr>
                <th scope="col">Pozycja</th>
                {series.map((s) => (
                  <th scope="col" key={s.label}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">
                    {r.label}
                    {r.note && <span className="muted"> · {r.note}</span>}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className="mono">
                      {format(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Kafel ze wskaźnikiem — tam, gdzie wykres nic nie dodaje. */
export function StatTile({
  value,
  label,
  note,
  tone = "neutral",
}: {
  value: string | number;
  label: string;
  note?: string;
  tone?: "neutral" | "alert" | "good";
}) {
  return (
    <div className={`tile tile--${tone}`}>
      <span className="tile__v">{value}</span>
      <span className="tile__l">{label}</span>
      {note && <span className="tile__n">{note}</span>}
    </div>
  );
}
