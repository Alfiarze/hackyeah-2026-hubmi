/**
 * Dobór emotek do zapytania — „AI" decyduje, które pasują.
 *
 * To nie jest ozdoba i nie jest losowanie: emotki wybiera ten sam silnik,
 * który dopasowuje innowacje (`analyzeQuery` z lib/match.ts). Zapytanie jest
 * rozbijane na rdzenie, rdzenie trafiają do znanych wątków (lib/concepts.ts),
 * a każdy wątek ma przypisaną paczkę emotek. Dzięki temu „Mama mieszka sama
 * na wsi" dostaje 👵🌾🫂, a „nie wejdę do urzędu, wszędzie schody" — ♿🏛️🛗.
 *
 * Dlaczego bez API: cała aplikacja działa offline (zob. komentarz w match.ts),
 * a demo na hackathonie nie może zależeć od wifi na sali. Decyzja jest
 * w pełni explainable — dla każdego wyboru widać, który wątek go spowodował,
 * więc da się pokazać jury, „skąd" wzięła się dana emotka.
 *
 * Kolejność emotek w paczce ma znaczenie: pierwsza jest nośnikiem wątku
 * (najbardziej rozpoznawalna), kolejne go dopowiadają.
 */
import { analyzeQuery } from "./match";

/** koncept (wątek z lib/concepts.ts) → emotki, którymi go pokazujemy */
const CONCEPT_EMOJI: Record<string, string[]> = {
  samotnosc: ["🫂", "💬", "📞"],
  senior: ["👵", "👴", "🧓"],
  wies: ["🌾", "🏡", "🚏"],
  demencja: ["🧭", "🧠", "💊"],
  psyche: ["🌿", "🧘", "💛"],
  ruch: ["🦽", "🛗", "🚶"],
  bariery: ["🪜", "🏛️", "♿"],
  wzrok: ["🦯", "👁️", "🔊"],
  sluch: ["👂", "💬", "📢"],
  intelekt: ["🧩", "📖", "🎨"],
  autyzm: ["🧸", "🎧", "🧩"],
  dzieci: ["🧒", "🎒", "🏫"],
  rodzina: ["👨‍👩‍👧", "🏠", "💛"],
  opieka: ["🤲", "🩺", "🏠"],
  bezdomnosc: ["🛏️", "🆘", "🏠"],
  cudzoziemcy: ["🌍", "🗣️", "🤝"],
  praca: ["💼", "🛠️", "🤝"],
  cyfrowe: ["💻", "📱", "📶"],
  zdrowie: ["🩺", "💊", "🏥"],
  transport: ["🚌", "🗺️", "🚏"],
  aktywnosc: ["🎭", "⚽", "🎨"],
  instytucje: ["🏛️", "📋", "🤝"],
};

/**
 * Emotki dla zapytania, którego nie rozpoznaliśmy jako żadnego znanego wątku.
 * Nie zostawiamy pola pustego — użytkownik ma wtedy sygnał, że tekst dotarł
 * i jest przetwarzany, a nie że wpisanie nic nie dało.
 */
const FALLBACK = ["🔎", "💭", "✨"];

/**
 * Cała pula — do „sterty" emotek na dole hero (dekoracja, `aria-hidden`).
 * Sterta jest źródłem, z którego widoczny dobór „wylatuje" w górę pod pole
 * wyszukiwania, więc musi zawierać dokładnie te same emotki, co wybór.
 */
export const ALL_EMOJI: string[] = [
  ...new Set([...Object.values(CONCEPT_EMOJI).flat(), ...FALLBACK]),
];

/** Ile emotek maksymalnie pokazujemy — więcej przestaje być czytelne. */
const MAX = 6;

/**
 * Rozpoznane wątki → pasujące emotki.
 *
 * Zwraca tablicę z kluczami nadającymi się do `key` w React (powtarzające się
 * emotki z różnych wątków dostają inny klucz).
 */
export function pickEmojis(text: string): { id: string; emoji: string }[] {
  const q = text.trim();
  if (q.length < 2) return [];

  const { concepts } = analyzeQuery(q);
  const out: { id: string; emoji: string }[] = [];

  if (concepts.length === 0) {
    return FALLBACK.map((emoji, i) => ({ id: `fb-${i}`, emoji }));
  }

  for (const c of concepts) {
    const pack = CONCEPT_EMOJI[c.id];
    if (!pack) continue;
    // Po jednej emotce z wątku — dzięki temu każdy rozpoznany wątek jest
    // reprezentowany, zamiast jeden wątek zajął całe miejsce.
    const emoji = pack[out.length % pack.length] ?? pack[0];
    out.push({ id: `${c.id}-${out.length}`, emoji });
    if (out.length >= MAX) break;
  }

  return out;
}
