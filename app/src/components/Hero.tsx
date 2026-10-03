/**
 * Hero — płaskie ciemne tło, ogromna typografia, jedno słowo z poświatą.
 *
 * Materiał filmowy mieszka teraz w globalnym `Backdrop` (na całej stronie,
 * na każdym widoku), więc hero nie prowadzi własnego wideo — inaczej ten sam
 * klatkowałby dwa razy obok siebie. Tu zostaje tylko to, co jest specyficzne
 * dla hero: poświata pod nagłówkiem, sterta emotek na dole i sygnaturowy
 * ruch — po pojawieniu się wyników hero kurczy się i wygasza, kino oddaje
 * pierwszeństwo narzędziu.
 *
 * Kontrast nie zależy od żadnego materiału: tekst stoi na stałym kolorze
 * `--bg`, a przyciemnienie kadrów jest policzone w tokens.css (`--scrim`).
 */
import { type ReactNode } from "react";
import { EmojiPile } from "./EmojiPile";
import "./hero.css";

interface Props {
  /** true = wyniki są na ekranie, hero ma się skurczyć */
  receded?: boolean;
  children: ReactNode;
}

export function Hero({ receded, children }: Props) {
  return (
    <section className={`hero${receded ? " hero--receded" : ""}`}>
      <div className="hero__glow" aria-hidden="true" />

      <div className="hero__content wrap">{children}</div>

      {/* Sterta emotek na dole — źródło, z którego pod polem wyszukiwania
          wjeżdżają dobrane przez analizę. Czysto dekoracyjna. */}
      <EmojiPile />
    </section>
  );
}
