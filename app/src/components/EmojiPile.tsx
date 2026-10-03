/**
 * Sterta emotek na dole hero — wizualne „źródło", z którego pod polem
 * wyszukiwania wjeżdżają te dopasowane do zapytania.
 *
 * Całość jest dekoracyjna (`aria-hidden`), nie klika się jej i nie mówi o niej
 * czytnikowi — jedyne miejsce, w którym emotki mają znaczenie, to dobór pod
 * pigułką, a ten i tak jest tylko wizualnym skrótem od wątków wypisywanych
 * słownie w podsumowaniu dopasowania.
 *
 * Kolejność jest deterministyczna (bez Math.random), żeby przy każdym
 * wejściu na stronę sterta wyglądała tak samo — na demonstracji przed jury
 * nie może się „przestawić" między odświeżeniami.
 */
import { ALL_EMOJI } from "../lib/emojis";

/** Ile emotek mieści się w rzędzie przy pełnej szerokości hero. */
const COUNT = 34;

/**
 * Stała kolejność: przesunięcie o złotą liczbę względem puli, żeby sterta
 * nie zaczynała się zawsze od tej samej emotki i nie powtarzała sekwencji.
 */
const PILE: string[] = Array.from(
  { length: COUNT },
  (_, i) => ALL_EMOJI[(i * 7 + 3) % ALL_EMOJI.length],
);

export function EmojiPile() {
  return (
    <div className="hero__pile" aria-hidden="true">
      {PILE.map((e, i) => (
        <span
          key={i}
          className="hero__pile-emoji"
          style={{
            animationDelay: `${(i % 9) * 0.45}s`,
            // Losowany wygląd z pozycji — bez losowania w runtime.
            fontSize: `${1 + ((i * 5) % 7) * 0.09}rem`,
            rotate: `${((i * 13) % 25) - 12}deg`,
          }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}
