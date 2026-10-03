/**
 * Znacznik „przetestowane".
 *
 * 111 ze 115 kart ROPS ma opisany wynik realnego testu i to jest najmocniejsza
 * rzecz w tych danych - ale nośnikiem tej informacji jest treść, nie ozdoba.
 * Dlatego znacznik jest cichy: jedno słowo, znak potwierdzenia i cytat
 * z karty. Brak wyników dostaje osobny, jeszcze spokojniejszy wariant,
 * bo to nie jest błąd - to po prostu brak danych.
 */
import "./stamp.css";

interface Props {
  /** treść pola „Czy to działa?" z karty ROPS */
  evidence: string;
  compact?: boolean;
}

export function Stamp({ evidence, compact }: Props) {
  if (!evidence) {
    return (
      <p className="stamp stamp--none" role="note">
        <span className="stamp__label">Brak opisanych wyników testu</span>
        <span className="stamp__text">
          Ta karta nie zawiera pola „Czy to działa?" - traktuj jako pomysł do
          sprawdzenia, nie rozwiązanie gotowe do wdrożenia.
        </span>
      </p>
    );
  }
  return (
    <div className="stamp" role="note" aria-label="Wynik testu innowacji">
      <span className="stamp__label">Przetestowane</span>
      <span className="stamp__text">
        {compact && evidence.length > 150 ? evidence.slice(0, 150).trimEnd() + "…" : evidence}
      </span>
    </div>
  );
}
