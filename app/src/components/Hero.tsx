/**
 * Hero - jasny, ciepły, z ilustracją „potrzeba → rozwiązanie".
 *
 * System wizualny HubMI: Bricolage Grotesque 800, turkus prowadzi, jedno
 * słowo tezy dostaje żółte podkreślenie Krakowa (nigdy żółty tekst).
 * Pattern tła kładzie globalny `Backdrop` - hero nie powiela warstw.
 *
 * Sygnatura zostaje: po wejściu wyników hero kurczy się i oddaje
 * pierwszeństwo narzędziu; ilustracja znika, bo narzędzie właśnie
 * pokazało prawdziwe dopasowanie.
 */
import { type ReactNode } from "react";
import "./hero.css";

interface Props {
  /** true = wyniki są na ekranie, hero ma się skurczyć */
  receded?: boolean;
  children: ReactNode;
}

export function Hero({ receded, children }: Props) {
  return (
    <section className={`hero${receded ? " hero--receded" : ""}`}>
      <div className="hero__inner wrap">
        <div className="hero__text">{children}</div>

        {/* Ilustracja systemu (strona 06): potrzeba połączona łukiem
            z rozwiązaniem, wokół sieć ludzi i zasobów. Łuk rysuje się
            raz (hm-draw), węzeł „zaskakuje" (hm-pulse) - tokeny ruchu
            z global.css, wyłączane przez prefers-reduced-motion. */}
        <div className="hero__art" aria-hidden="true">
          <svg viewBox="0 0 520 420" fill="none" className="hero__art-svg">
            <g stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" opacity={0.45}>
              <path d="M60 120 120 300M120 300 250 360M250 360 400 320M400 320 470 130M470 130 330 60M60 120 190 80" />
            </g>
            <g className="hm-float">
              <circle cx="60" cy="120" r="8" fill="var(--accent-deep)" />
              <circle cx="190" cy="80" r="6" fill="var(--accent-deep)" style={{ animationDelay: "-1.4s" }} />
              <circle cx="330" cy="60" r="6" fill="var(--accent-deep)" style={{ animationDelay: "-2.6s" }} />
              <circle cx="470" cy="130" r="8" fill="var(--accent-deep)" style={{ animationDelay: "-0.8s" }} />
              <circle cx="400" cy="320" r="6" fill="var(--accent-deep)" style={{ animationDelay: "-2s" }} />
              <circle cx="250" cy="360" r="8" fill="var(--accent-deep)" style={{ animationDelay: "-1.1s" }} />
              <circle cx="120" cy="300" r="6" fill="var(--accent-deep)" style={{ animationDelay: "-3.1s" }} />
            </g>

            <circle cx="140" cy="250" r="54" fill="var(--surface)" stroke="var(--accent-deep)" strokeWidth={5} />
            <circle cx="140" cy="250" r="14" fill="var(--beige)" />
            <rect x="324" y="196" width="108" height="108" rx="30" fill="var(--surface)" stroke="var(--accent-deep)" strokeWidth={5} />
            <path d="M360 252l14 14 26-30" stroke="var(--accent-deep)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            <path className="hm-draw" pathLength={1} d="M140 196C140 70 378 70 378 196" stroke="var(--accent)" strokeWidth={6} strokeLinecap="round" />
            <circle className="hm-pulse" cx="259" cy="102" r={16} fill="var(--accent)" opacity={0} />
            <circle cx="259" cy="102" r={16} fill="var(--accent)" />
            <circle cx="259" cy="102" r={6} fill="var(--ink)" />

            <g fontFamily="var(--font)" fontSize={18} fontWeight={700} fill="var(--ink)" textAnchor="middle">
              <text x="140" y="336">Potrzeba</text>
              <text x="378" y="336">Rozwiązanie</text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
