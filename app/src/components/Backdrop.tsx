/**
 * Tło strony — jasny papier z patternem marki.
 *
 * System wizualny HubMI v1: patterny tła są „ledwo widoczne" (krycie 6–14%)
 * i pojawiają się tylko pod nagłówkami, w hero i stopce — nigdy pod długim
 * tekstem. Ten komponent kładzie kafel „Sieć węzłów" (A) jako pas u góry
 * strony, wygaszany gradientem do czystej bieli: nagłówek i hero dostają
 * życie, a treść niżej — spokój.
 *
 * Dostępność — trzy niezależne wyłączniki:
 *  1. `prefers-reduced-motion: reduce` — „oddech" patternu się nie odpala
 *     (WCAG 2.3.3);
 *  2. tryb wysokiego kontrastu (`data-contrast="high"`) — cała warstwa
 *     znika, bo dekoracja nie może obniżać policzonego kontrastu tekstu;
 *  3. przełącznik „Ruch w tle" w pasku dostępności — zatrzymuje pętlę
 *     (WCAG 2.2.2: ruch trwający dłużej niż 5 s musi mieć widoczną pauzę).
 *     Atrybut `data-bg-motion` czyta global.css.
 */
import "./backdrop.css";

interface Props {
  /** aktualna podstrona — z niej CSS dobiera wariant kafla */
  route?: string;
}

/** Kafel na widok — jeden pattern na ekran, dobrany do treści modułu. */
const TILE: Record<string, "network" | "paths" | "rings" | "wave"> = {
  matchmaking: "network",
  biblioteka: "wave",
  kreator: "paths",
  tester: "paths",
  komunikacja: "rings",
  admin: "network",
  middleman: "rings",
  dostepnosc: "network",
};

export function Backdrop({ route }: Props) {
  return (
    <div
      className="backdrop no-print"
      data-route={route}
      aria-hidden="true"
    >
      <div className="backdrop__tile hm-breathe" data-tile={TILE[route ?? "matchmaking"] ?? "network"} />
    </div>
  );
}
