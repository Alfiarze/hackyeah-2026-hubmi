/**
 * Patterny tła HubMI — cztery powtarzalne kafle zbudowane z tych samych
 * znaków co ikony (koło, miękki kwadrat, łuk, węzeł).
 *
 * Reguły (strona 03 systemu wizualnego):
 *  — krycie 6–14%, jedna linia 1,5 px w turkusie;
 *  — tylko pod nagłówkami, w hero i stopce — nigdy pod długim tekstem;
 *  — jeden pattern na ekran;
 *  — tekst na patternie ≥ 4,5:1 względem najciemniejszego miejsca tła
 *    (przy kryciu ≤ 16% i atramencie wynik nie spada poniżej 10:1).
 */
import { useId, type CSSProperties } from "react";

type Variant = "network" | "paths" | "rings" | "wave";

interface Props {
  variant?: Variant;
  /** krycie kafla — domyślnie wartość z systemu dla wariantu */
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

const STROKE = "var(--pattern-stroke, #2bb3a5)";

function Tile({ variant, id }: { variant: Variant; id: string }) {
  switch (variant) {
    case "paths":
      return (
        <pattern id={id} width={200} height={240} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--pattern-stroke, #16756c)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="40" cy="60" r="10" />
            <rect x="140" y="50" width="20" height="20" rx="6" />
            <path d="M40 50C40 15 150 15 150 50" strokeDasharray="1 6" />
            <rect x="30" y="170" width="20" height="20" rx="6" />
            <circle cx="150" cy="180" r="10" />
            <path d="M40 170C40 135 150 135 150 170" strokeDasharray="1 6" />
          </g>
          <g fill="var(--pattern-stroke, #16756c)">
            <circle cx="95" cy="23.8" r="3.5" />
            <circle cx="95" cy="143.8" r="3.5" />
          </g>
        </pattern>
      );
    case "rings":
      return (
        <pattern id={id} width={180} height={180} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--pattern-stroke, #16756c)" strokeWidth={1.5}>
            <circle cx="90" cy="90" r="14" />
            <circle cx="90" cy="90" r="34" />
            <circle cx="90" cy="90" r="56" strokeDasharray="2 8" strokeLinecap="round" />
            <circle cx="0" cy="0" r="30" />
            <circle cx="180" cy="0" r="30" />
            <circle cx="0" cy="180" r="30" />
            <circle cx="180" cy="180" r="30" />
          </g>
          <g fill="var(--pattern-stroke, #16756c)">
            <circle cx="90" cy="56" r="4" />
            <circle cx="119.4" cy="107" r="4" />
            <circle cx="60.6" cy="107" r="4" />
          </g>
        </pattern>
      );
    case "wave":
      return (
        <pattern id={id} width={240} height={80} patternUnits="userSpaceOnUse">
          <g fill="none" stroke={STROKE} strokeWidth={1.5} strokeLinecap="round">
            <path d="M0 26C40 6 80 6 120 26S200 46 240 26" />
            <path d="M0 58C40 38 80 38 120 58S200 78 240 58" strokeDasharray="1 7" />
          </g>
          <circle cx="120" cy="26" r="3.5" fill={STROKE} />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width={160} height={160} patternUnits="userSpaceOnUse">
          <g fill="none" stroke={STROKE} strokeWidth={1.5} strokeLinecap="round">
            <path d="M30 40 104 28 136 100 62 118Z" />
            <path d="M136 100 190 40M-24 100 30 40M62 118 104 188M62 -42 104 28" />
            <circle cx="104" cy="28" r="10" />
          </g>
          <g fill={STROKE}>
            <circle cx="30" cy="40" r="4" />
            <circle cx="136" cy="100" r="4" />
            <circle cx="62" cy="118" r="4" />
            <circle cx="104" cy="28" r="3" />
          </g>
        </pattern>
      );
  }
}

const DEFAULT_OPACITY: Record<Variant, number> = {
  network: 0.12,
  paths: 0.14,
  rings: 0.1,
  wave: 0.14,
};

export function Pattern({ variant = "network", opacity, className, style }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const pid = `hm-p-${id}`;
  return (
    <svg
      className={className ? `pattern pattern--${variant} ${className}` : `pattern pattern--${variant}`}
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", ...style }}
    >
      <defs>
        <Tile variant={variant} id={pid} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} opacity={opacity ?? DEFAULT_OPACITY[variant]} />
    </svg>
  );
}
