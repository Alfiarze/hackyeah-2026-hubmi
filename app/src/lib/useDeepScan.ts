/**
 * „Nie znaleziono? Niech przejrzy Jev." — wspólna ścieżka ostatniej szansy dla
 * każdego miejsca na stronie, w którym szukamy po bazie.
 *
 * Reguła jest jedna i obowiązuje wszystkie moduły: **najpierw tanio, potem
 * modelem**. Dopóki zwykłe wyszukiwanie (BM25, filtr w przeglądarce, tsquery)
 * zwraca cokolwiek, model nie jest wołany. Dopiero zero wyników uruchamia
 * `POST /api/match/scan/`, gdzie Jev dostaje **każdą** pozycję w bazie i sam
 * decyduje, co pasuje.
 *
 * Dlaczego tak, a nie od razu modelem: przejrzenie 115 kart i 74 dokumentów to
 * ~2,5 s i pięć wywołań. Na trafnym zapytaniu byłoby to palenie wywołań bez
 * powodu — a na nietrafnym jest to jedyna rzecz, która jeszcze może pomóc.
 *
 * Włączane przez `enabled`, żeby wywołanie nie poszło w trakcie ładowania
 * zwykłych wyników (inaczej mignięcie pustej listy wyzwalałoby skan).
 */
import { useEffect, useRef, useState } from "react";

import { api } from "./api";

/** Krótsze zapytanie nie opisuje niczego, czego warto szukać w całej bazie. */
const MIN_CHARS = 3;

export interface ScanHit {
  kind: "innovation" | "library";
  id: string | number;
  confidence: number;
  item: any;
}

export interface DeepScanState {
  hits: ScanHit[];
  loading: boolean;
  /** `jev`, `fallback`, `brak-kandydatow` albo `null`, gdy nie pytaliśmy */
  source: string | null;
}

const EMPTY: DeepScanState = { hits: [], loading: false, source: null };

export function useDeepScan(
  query: string,
  kind: "innovations" | "library" | "both" = "both",
  enabled = true,
  limit = 6,
): DeepScanState {
  const [state, setState] = useState<DeepScanState>(EMPTY);
  const cache = useRef(new Map<string, ScanHit[]>());

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_CHARS) {
      setState(EMPTY);
      return;
    }

    const key = `${kind}:${q.toLowerCase()}`;
    const cached = cache.current.get(key);
    if (cached) {
      setState({ hits: cached, loading: false, source: "jev" });
      return;
    }

    const controller = new AbortController();
    let active = true;
    setState({ hits: [], loading: true, source: null });

    (async () => {
      const res = await api.match.scan(q, kind, limit, controller.signal);
      if (!active) return;

      if (!res.ok || !res.data) {
        // Tania ścieżka już zawiodła, model też nie odpowiedział — nie mamy
        // czym tego zastąpić, więc mówimy wprost, że nie ma wyników.
        setState({ hits: [], loading: false, source: "fallback" });
        return;
      }

      const hits = res.data.results ?? [];
      if (res.data.source === "jev") cache.current.set(key, hits);
      setState({ hits, loading: false, source: res.data.source });
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, kind, enabled, limit]);

  return state;
}
