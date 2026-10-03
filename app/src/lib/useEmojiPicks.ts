/**
 * Dobór emotek do opisu problemu — **w 100% decyzja Jev**.
 *
 * Front nie ma tu żadnej reguły zapasowej i jest to świadome: lokalny dobór po
 * rozpoznanych wątkach działał średnio, a pokazanie emotki wybranej regułą
 * byłoby niezgodne z tym, co mówimy o module („o doborze decyduje model").
 * Dlatego gdy Jev milczy, zostaje **poprzedni** wybór, a nie wybór zastępczy.
 *
 * Trzy rzeczy, które ten hook pilnuje, bo inaczej endpoint dostawałby żądanie
 * na każdą literę (a każde to jedno wywołanie Jev):
 *
 *  1. **Minimalna długość** — poniżej `MIN_CHARS` nie ma czego oceniać.
 *  2. **Pamięć w sesji** — ten sam tekst nie jest pytany dwa razy; przy
 *     cofaniu znaków odpowiedź wraca z `Map` bez wywołania.
 *  3. **Przerwanie w locie** — każda nowa litera anuluje poprzednie pytanie,
 *     więc równolegle nigdy nie wisi więcej niż jedno.
 *
 * Żądanie w locie jest przerywane, gdy tekst zdąży się zmienić — `AbortSignal`
 * idzie do `api.match.emojis` i dokłada się do limitu czasu w `request()`.
 */
import { useEffect, useRef, useState } from "react";

import { api } from "./api";
import { EMOJI_CANDIDATES, EMOJI_LIMIT, type PickedEmoji } from "./emojis";

/** Krócej niż to nie opisuje problemu — nie zawracamy modelowi głowy. */
const MIN_CHARS = 6;

export interface EmojiPicksState {
  picks: PickedEmoji[];
  /** `true`, gdy pytanie do Jev jest w locie (poprzedni wybór zostaje widoczny) */
  loading: boolean;
  /** `jev`, `fallback`, `brak-kandydatow` albo `null`, gdy jeszcze nie pytaliśmy */
  source: string | null;
}

export function useEmojiPicks(text: string): EmojiPicksState {
  const [state, setState] = useState<EmojiPicksState>({
    picks: [],
    loading: false,
    source: null,
  });
  // Pamięć w obrębie sesji: tekst → wybór Jev.
  const cache = useRef(new Map<string, PickedEmoji[]>());

  useEffect(() => {
    // Bez odczekiwania ciszy: pytanie leci od razu po zmianie tekstu,
    // a poprzednie jest przerywane przez `AbortController` w cleanupie.
    const q = text.trim();

    if (q.length < MIN_CHARS) {
      setState({ picks: [], loading: false, source: null });
      return;
    }

    const cached = cache.current.get(q);
    if (cached) {
      setState({ picks: cached, loading: false, source: "jev" });
      return;
    }

    const controller = new AbortController();
    let active = true;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      const res = await api.match.emojis(
        q,
        EMOJI_CANDIDATES,
        EMOJI_LIMIT,
        controller.signal,
      );
      if (!active) return;

      if (!res.ok || !res.data) {
        // Jev niedostępny: zostaje poprzedni wybór. Bez reguły zapasowej.
        setState((s) => ({ ...s, loading: false, source: "fallback" }));
        return;
      }

      const picks: PickedEmoji[] = (res.data.picks ?? []).map((p) => ({
        id: `jev-${p.conceptId || "x"}-${p.emoji}`,
        emoji: p.emoji,
        conceptId: p.conceptId || undefined,
        label: p.label,
        confidence: p.confidence,
      }));

      if (res.data.source === "jev") cache.current.set(q, picks);
      setState({ picks, loading: false, source: res.data.source });
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [text]);

  return state;
}
