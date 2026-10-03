/**
 * Wyszukiwarka problemu w stylu pigułki — pole, pod którym „z dołu" wjeżdżają
 * emotki dobrane przez analizę zapytania.
 *
 * Skąd ten kształt: referencja (zrzut z filmu) — jedno duże, zaokrąglone
 * pole zawieszone na tle, bez ramki formularza, a pod nim emotki, które
 * lecą z ogólnej sterty na dole ekranu w górę, pod pole. U nas sterta siedzi
 * na dole hero (`EmojiPile`), a wynik analizy wjeżdża tutaj, pod pigułką.
 *
 * Kto „decyduje", które emotki pasują: to nie model i nie losowanie — tekst
 * trafia do `analyzeQuery`, tego samego silnika, który dopasowuje innowacje,
 * i każdy rozpoznany wątek dostaje swoją emotkę (zob. lib/emojis.ts).
 * Dzięki temu „Mama mieszka sama na wsi" konsekwentnie dostaje 👵🌾,
 * a nie coś, co akurat wyszło z losowania — i da się to wytłumaczyć jury.
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
import { useMemo, type FormEvent, type ReactNode } from "react";
import { pickEmojis } from "../lib/emojis";

interface Props {
  value: string;
  /** tekst dopowiadany przez dyktowanie — pokazany obok wpisanego */
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
  // Analiza przy każdym znaku: to tylko tokenizacja i mapowanie rdzeni,
  // więc nie potrzeba debouncera.
  const picks = useMemo(() => pickEmojis(value), [value]);

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

      {/* Pod pigułką, jak w referencji: krótka nadlinia i emotki wjeżdżające
          z dołu. Pusty box ma zarezerwowaną wysokość, żeby pole i
          podpowiedzi nie skakały przy każdym naciśnięciu klawisza. */}
      <div className="mm__picks" aria-hidden="true">
        {picks.map((p, i) => (
          <span key={p.id} className="mm__pick" style={{ animationDelay: `${i * 70}ms` }}>
            {p.emoji}
          </span>
        ))}
      </div>

      <p id={hintId} className="hint mm__hint">
        {hint}
      </p>
      {status}
    </form>
  );
}
