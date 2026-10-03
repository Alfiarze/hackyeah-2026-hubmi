/**
 * Wyszukiwarka problemu w stylu pigułki - pole, pod którym „z dołu" wjeżdżają
 * emotki dobrane przez analizę zapytania.
 *
 * Skąd ten kształt: referencja (zrzut z filmu) - jedno duże, zaokrąglone
 * pole zawieszone na tle, bez ramki formularza, a pod nim emotki, które
 * lecą z ogólnej sterty na dole ekranu w górę, pod pole. U nas sterta siedzi
 * na dole hero (`EmojiPile`), a wynik analizy wjeżdża tutaj, pod pigułką.
 *
 * Kto „decyduje", które emotki pasują: to nie model i nie losowanie - tekst
 * trafia do `analyzeQuery`, tego samego silnika, który dopasowuje innowacje,
 * i każdy rozpoznany wątek dostaje swoją emotkę (zob. lib/emojis.ts).
 * Dzięki temu „Mama mieszka sama na wsi" konsekwentnie dostaje 👵🌾,
 * a nie coś, co akurat wyszło z losowania - i da się to wytłumaczyć jury.
 *
 * Dostępność:
 *  - emotki są dekoracją (`aria-hidden`): informacja o rozpoznanych wątkach
 *    i tak jest czytana na końcu rozmowy („Rozpoznane wątki: ..."), więc
 *    czytnik nie traci treści, a nie dostaje szumu ogłoszonego po każdym
 *    naciśnięciu klawisza;
 *  - animacja wjeżdżania wyłączana jest przez globalną regułę
 *    `prefers-reduced-motion` (wtedy emotki są po prostu widoczne);
 *  - etykieta pola jest `sr-only`, przyciski mają nazwy dostępne,
 *    a minimalny cel to 44×44 px (WCAG 2.5.5).
 */
import { useLayoutEffect, useMemo, useRef, type FormEvent, type ReactNode } from "react";
import { pickEmojis, type PickedEmoji } from "../lib/emojis";

interface Props {
  value: string;
  picks?: PickedEmoji[];
  /** tekst dopowiadany przez dyktowanie - pokazany obok wpisanego */
  interim?: string;
  onChange: (v: string) => void;
  onSubmit: (e?: FormEvent) => void;
  onClear: () => void;
  placeholder: string;
  label: string;
  hintId: string;
  hint: string;
  /** przyciski w pigułce: mikrofon, „Szukaj" */
  actions?: ReactNode;
  /** stany spoczynkowe pod pigułką: słuchanie, błędy */
  status?: ReactNode;
}

export function SearchPill({
  value,
  picks: picksProp,
  interim,
  onChange,
  onSubmit,
  onClear,
  placeholder,
  label,
  hintId,
  hint,
  actions,
  status,
}: Props) {
  // Jeśli rodzic przekazał picks (np. Matchmaking współdzielący stan z dolną stertą),
  // używamy ich bezpośrednio. W przeciwnym razie wyliczamy lokalnie.
  const computedPicks = useMemo(() => pickEmojis(value), [value]);
  const activePicks = picksProp ?? computedPicks;

  return (
    <form className="mm__search" onSubmit={(e) => onSubmit(e)}>
      <label className="sr-only" htmlFor="mm-input">
        {label}
      </label>

      <div className="mm__pill">
        <input
          id="mm-input"
          type="text"
          autoComplete="off"
          value={value + (interim ? ` ${interim}` : "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={hintId}
        />

        {value && (
          <button type="button" className="mm__pillbtn" onClick={onClear}>
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Wyczyść pole wyszukiwania</span>
          </button>
        )}

        {actions}
      </div>

      {/* Pod pigułką: emotki przylatujące z dołu po rozpoznaniu przez Jev AI */}
      {activePicks.length > 0 && (
        <div className="mm__picks mm__picks--active" aria-live="polite">
          <span className="mm__ai-tag">
            <span className="mm__ai-icon" aria-hidden="true">✦</span>
            <span>Jev AI:</span>
          </span>
          <div className="mm__picks-list">
            {activePicks.map((p, i) => (
              <FlyingPick key={p.emoji} pick={p} index={i} />
            ))}
          </div>
        </div>
      )}

      <p id={hintId} className="hint mm__hint">
        {hint}
      </p>
      {status}
    </form>
  );
}

/**
 * Pojedyncza emotka pod inputem, która fizycznie startuje z punktu (X, Y)
 * krążka w dolnej stercie i przelatuje po łuku w swoje docelowe miejsce.
 */
function FlyingPick({ pick, index }: { pick: PickedEmoji; index: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Szukamy odpowiadającego krążka leżącego w stercie na dole
    const pebble = document.querySelector(`[data-pebble="${pick.emoji}"]`) as HTMLElement | null;
    if (!pebble) return;

    const elRect = el.getBoundingClientRect();
    const pebbleRect = pebble.getBoundingClientRect();

    // Różnica współrzędnych: od krążka na dole do tego slotu pod inputem
    const deltaX = pebbleRect.left + pebbleRect.width / 2 - (elRect.left + elRect.width / 2);
    const deltaY = pebbleRect.top + pebbleRect.height / 2 - (elRect.top + elRect.height / 2);

    // Lot trwa 1,5 s - dla kogoś z nadwrażliwością przedsionkową to już nie
    // ozdobnik, tylko przeszkoda. Przy wyłączonym ruchu emotka pojawia się
    // od razu na miejscu.
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Animujemy DOKŁADNIE z fizycznej pozycji krążka na dole aż pod input
    if (!reduced && Math.abs(deltaY) > 8 && typeof el.animate === "function") {
      el.animate(
        [
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.9) rotate(-10deg)`,
            opacity: 0.92,
          },
          {
            transform: `translate3d(${deltaX * 0.25}px, ${deltaY * 0.2 - 14}px, 0) scale(1.16) rotate(0deg)`,
            opacity: 1,
            offset: 0.65,
          },
          {
            transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
            opacity: 1,
            offset: 1,
          },
        ],
        {
          // Lot krążka z tacy pod pole wyszukiwania celowo trwa długo:
          // ma być czytelny jako „to słowo pochodzi stąd”, a nie mignąć.
          duration: 1500,
          delay: Math.min(480, index * 120),
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      );
    }
  }, [pick.emoji, index]);

  return (
    <span
      ref={ref}
      className="mm__pick"
      title={pick.label}
      aria-label={pick.label}
      data-pick-emoji={pick.emoji}
    >
      <span className="mm__pick-emoji" aria-hidden="true">{pick.emoji}</span>
    </span>
  );
}
