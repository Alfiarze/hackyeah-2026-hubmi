/**
 * Wartość, która „dogania" wejście dopiero po chwili ciszy.
 *
 * Używane w module I do dwóch rzeczy naraz: rozpoznawanie emotek nie miga
 * przy każdym wciśniętym klawiszu, a zapytanie do backendu nie leci przy
 * każdym kliknięciu w mapę. Każde zapytanie zapisuje się w bazie jako sygnał
 * potrzeby, więc seria odrzuconych żądań zaśmieciłaby trendy w panelu ROPS.
 */
import { useEffect, useState } from "react";

/** Ile ciszy po ostatniej zmianie czekamy, zanim ruszymy dalej. */
export const QUIET_MS = 350;

export function useDebounced<T>(value: T, delayMs: number = QUIET_MS): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return settled;
}
