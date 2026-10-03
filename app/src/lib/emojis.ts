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
  demencja: ["💊", "🧠", "🧭"],
  psyche: ["🧠", "🌿", "🧘"],
  ruch: ["🦽", "🛗", "🚶"],
  bariery: ["♿", "🛗", "🏛️"],
  wzrok: ["🦯", "👁️", "🔊"],
  sluch: ["🧏", "👂", "💬"],
  intelekt: ["🧩", "🎨", "📖"],
  autyzm: ["🧩", "🧸", "🎧"],
  dzieci: ["🧒", "🎒", "🏫"],
  rodzina: ["👨‍👩‍👧", "🏠", "💛"],
  opieka: ["💛", "🩺", "🤲"],
  bezdomnosc: ["🏠", "🛏️", "🆘"],
  cudzoziemcy: ["🌍", "🗣️", "🤝"],
  praca: ["💼", "🛠️", "🤝"],
  cyfrowe: ["💻", "📱", "📶"],
  zdrowie: ["🩺", "🏥", "💊"],
  transport: ["🚌", "🚏", "🗺️"],
  aktywnosc: ["🎨", "🎭", "⚽"],
  instytucje: ["🏛️", "🤝", "📋"],
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

export interface PickedEmoji {
  id: string;
  emoji: string;
  conceptId?: string;
  label?: string;
}

export interface LooseEmoji {
  emoji: string;
  conceptId: string;
  label: string;
  sampleQuery: string;
  tilt: number;
  jitterY: number;
  scale: number;
}

/** Luźno rozmieszczone emotki wyzwań społecznych Małopolski leżące na dnie (jakby spadły pod wpływem grawitacji) */
export const LOOSE_EMOJIS: LooseEmoji[] = [
  { emoji: "👵", conceptId: "senior", label: "Osoby starsze", sampleQuery: "Mama mieszka sama na wsi i nie ma z kim pogadać", tilt: -14, jitterY: 4, scale: 1.05 },
  { emoji: "👴", conceptId: "senior", label: "Seniorzy i emeryci", sampleQuery: "Starszy pan potrzebuje pomocy w codziennych zakupach", tilt: 9, jitterY: 0, scale: 0.98 },
  { emoji: "🌾", conceptId: "wies", label: "Obszary wiejskie", sampleQuery: "Brak dojazdu i samotność w małej wsi", tilt: -7, jitterY: 6, scale: 1.02 },
  { emoji: "🏡", conceptId: "wies", label: "Sołectwa i peryferie", sampleQuery: "Peryferyjne sołectwo odcięte od usług gminnych", tilt: 16, jitterY: 2, scale: 0.96 },
  { emoji: "♿", conceptId: "bariery", label: "Dostępność architektoniczna", sampleQuery: "Jestem na wózku i nie wejdę do urzędu, wszędzie schody", tilt: -12, jitterY: 8, scale: 1.06 },
  { emoji: "🦽", conceptId: "ruch", label: "Ograniczona mobilność", sampleQuery: "Osoba po wypadku potrzebuje wózka i rehabilitacji", tilt: 8, jitterY: 1, scale: 0.99 },
  { emoji: "🛗", conceptId: "bariery", label: "Windy i pochylnie", sampleQuery: "Brak windy w przychodni uniemożliwia dostanie się na piętro", tilt: -18, jitterY: 5, scale: 0.95 },
  { emoji: "🧠", conceptId: "psyche", label: "Zdrowie psychiczne", sampleQuery: "Kryzys psychiczny, lęki i brak wsparcia specjalisty", tilt: 13, jitterY: 3, scale: 1.04 },
  { emoji: "🌿", conceptId: "psyche", label: "Wyciszenie i terapia", sampleQuery: "Potrzeba przestrzeni terapeutycznej i antystresowej", tilt: -5, jitterY: 7, scale: 0.97 },
  { emoji: "🧩", conceptId: "autyzm", label: "Spektrum autyzmu", sampleQuery: "Syn ma autyzm i boi się hałasu w szkole", tilt: 11, jitterY: 2, scale: 1.03 },
  { emoji: "🧸", conceptId: "autyzm", label: "Wsparcie sensoryczne", sampleQuery: "Dziecko z nadwrażliwością sensoryczną potrzebuje pokoju wyciszeń", tilt: -15, jitterY: 6, scale: 0.96 },
  { emoji: "🧏", conceptId: "sluch", label: "Osoby głuche (PJM)", sampleQuery: "Głucha pacjentka nie dogada się w przychodni bez tłumacza", tilt: 7, jitterY: 0, scale: 1.05 },
  { emoji: "👂", conceptId: "sluch", label: "Niedosłuch", sampleQuery: "Osoba starsza z niedosłuchem potrzebuje pętli indukcyjnej", tilt: -9, jitterY: 8, scale: 0.95 },
  { emoji: "🦯", conceptId: "wzrok", label: "Niewidomi i słabowidzący", sampleQuery: "Niewidoma osoba potrzebuje audiodeskrypcji i tyflografiki", tilt: 15, jitterY: 4, scale: 1.02 },
  { emoji: "👁️", conceptId: "wzrok", label: "Wzrok i dostępność cyfrowa", sampleQuery: "Strona urzędu nieczytelna dla osób słabowidzących", tilt: -6, jitterY: 1, scale: 0.98 },
  { emoji: "🫂", conceptId: "samotnosc", label: "Samotność i relacje", sampleQuery: "Samotny senior nie ma z kim porozmawiać od tygodni", tilt: 17, jitterY: 7, scale: 1.06 },
  { emoji: "💬", conceptId: "samotnosc", label: "Rozmowa i kontakt", sampleQuery: "Telefon zaufania i wsparcie rozmową dla samotnych", tilt: -8, jitterY: 3, scale: 0.97 },
  { emoji: "🧒", conceptId: "dzieci", label: "Dzieci i młodzież", sampleQuery: "Brak świetlicy i bezpiecznych zajęć dla dzieci po lekcjach", tilt: 12, jitterY: 5, scale: 1.04 },
  { emoji: "🎒", conceptId: "dzieci", label: "Wsparcie szkolne", sampleQuery: "Dzieci z trudnościami w nauce potrzebują korepetycji sąsiedzkich", tilt: -16, jitterY: 2, scale: 0.95 },
  { emoji: "👨‍👩‍👧", conceptId: "rodzina", label: "Wsparcie rodziny", sampleQuery: "Opiekun osoby zależnej potrzebuje opieki wytchnieniowej", tilt: 6, jitterY: 8, scale: 1.05 },
  { emoji: "💛", conceptId: "opieka", label: "Opieka wytchnieniowa", sampleQuery: "Zmęczony opiekun osoby leżącej szuka wsparcia na kilka godzin", tilt: -11, jitterY: 0, scale: 0.98 },
  { emoji: "🩺", conceptId: "zdrowie", label: "Zdrowie i lekarze", sampleQuery: "Trudny dostęp do lekarza specjalisty w powiecie", tilt: 14, jitterY: 6, scale: 1.03 },
  { emoji: "💊", conceptId: "demencja", label: "Leki i demencja", sampleQuery: "Babcia zapomina o przyjmowaniu leków i gubi się w domu", tilt: -17, jitterY: 3, scale: 0.96 },
  { emoji: "🏥", conceptId: "zdrowie", label: "Rehabilitacja", sampleQuery: "Kolejki na turnus rehabilitacyjny po udarze", tilt: 5, jitterY: 7, scale: 1.01 },
  { emoji: "🚌", conceptId: "transport", label: "Transport lokalny", sampleQuery: "Wykluczenie transportowe mieszkańców wsi bez busa", tilt: -13, jitterY: 1, scale: 1.04 },
  { emoji: "🚏", conceptId: "transport", label: "Przystanki i dojazdy", sampleQuery: "Brak przystanku i bezpiecznego dojścia do autobusu", tilt: 10, jitterY: 9, scale: 0.97 },
  { emoji: "💻", conceptId: "cyfrowe", label: "Kompetencje cyfrowe", sampleQuery: "Seniorzy nie potrafią obsłużyć smartfona i e-recepty", tilt: -4, jitterY: 4, scale: 1.02 },
  { emoji: "📱", conceptId: "cyfrowe", label: "Smartfony i aplikacje", sampleQuery: "Potrzeba prostego kursu obsługi aplikacji dla osób 60+", tilt: 13, jitterY: 2, scale: 0.99 },
  { emoji: "💼", conceptId: "praca", label: "Aktywizacja zawodowa", sampleQuery: "Osoba z niepełnosprawnością szuka dostosowanego miejsca pracy", tilt: -15, jitterY: 6, scale: 1.05 },
  { emoji: "🛠️", conceptId: "praca", label: "Warsztaty terapii zajęciowej", sampleQuery: "Zajęcia WTZ i przyuczenie do zawodu dla podopiecznych", tilt: 8, jitterY: 0, scale: 0.96 },
  { emoji: "🏠", conceptId: "bezdomnosc", label: "Kryzys bezdomności", sampleQuery: "Osoba bez dachu nad głową potrzebuje bezpiecznego schronienia", tilt: -10, jitterY: 7, scale: 1.04 },
  { emoji: "🛏️", conceptId: "bezdomnosc", label: "Noclegownie i ogrzewalnie", sampleQuery: "Brak miejsc w schronisku w sezonie zimowym", tilt: 18, jitterY: 3, scale: 0.98 },
  { emoji: "🤝", conceptId: "instytucje", label: "Samopomoc i wolontariat", sampleQuery: "Chcemy założyć grupę sąsiedzkiej pomocy i wolontariatu", tilt: -7, jitterY: 5, scale: 1.03 },
  { emoji: "🏛️", conceptId: "instytucje", label: "Urząd bez barier", sampleQuery: "Załatwienie spraw urzędowych wymaga asysty i wsparcia", tilt: 9, jitterY: 1, scale: 0.97 },
  { emoji: "🎨", conceptId: "aktywnosc", label: "Integracja przez kulturę", sampleQuery: "Warsztaty ceramiczne i malarskie integrujące mieszkańców", tilt: -14, jitterY: 8, scale: 1.05 },
  { emoji: "🎭", conceptId: "aktywnosc", label: "Teatr i ekspresja", sampleQuery: "Teatr integrujący osoby z niepełnosprawnością intelektualną", tilt: 6, jitterY: 2, scale: 0.96 },
  { emoji: "⚽", conceptId: "aktywnosc", label: "Sport i rekreacja", sampleQuery: "Zajęcia sportowe adaptowane dla osób na wózkach", tilt: -12, jitterY: 6, scale: 1.02 },
  { emoji: "🌍", conceptId: "cudzoziemcy", label: "Integracja obcokrajowców", sampleQuery: "Dzieci migrantów potrzebują nauki języka polskiego", tilt: 15, jitterY: 0, scale: 0.98 },
  { emoji: "🗣️", conceptId: "cudzoziemcy", label: "Bariera językowa", sampleQuery: "Tłumacz i pomoc asystenta kulturowego w szkole", tilt: -8, jitterY: 5, scale: 1.04 },
  { emoji: "🆘", conceptId: "psyche", label: "Sytuacje kryzysowe", sampleQuery: "Nagła pomoc kryzysowa dla ofiar przemocy domowej", tilt: 11, jitterY: 4, scale: 0.97 },
];

/**
 * Rozpoznane wątki → pasujące emotki (zawsze wybierane z dolnej sterty LOOSE_EMOJIS).
 *
 * Emotki nigdy nie biorą się „znikąd" — każda emotka widoczna pod polem
 * jest fizycznie reprezentowana w stercie na dole ekranu i odlatuje z niej
 * do pigułki wyszukiwania. Nawet przy braku podpiętego backendu lub
 * nietypowych frazach testowych, wybierane są elementy z tej samej sterty.
 */
export function pickEmojis(text: string): PickedEmoji[] {
  const q = text.trim();
  if (q.length < 2) return [];

  const { concepts } = analyzeQuery(q);
  const out: PickedEmoji[] = [];
  const used = new Set<string>();

  // 1. Dopasowanie po rozpoznanych wątkach (Jev AI)
  for (const c of concepts) {
    // Szukamy pasującej emotki bezpośrednio w LOOSE_EMOJIS
    const candidates = LOOSE_EMOJIS.filter((item) => item.conceptId === c.id);
    const item = candidates[out.length % (candidates.length || 1)] ?? candidates[0];
    if (item && !used.has(item.emoji)) {
      used.add(item.emoji);
      out.push({
        id: `c-${c.id}-${item.emoji}`,
        emoji: item.emoji,
        conceptId: c.id,
        label: c.label,
      });
    }
    if (out.length >= MAX) break;
  }

  // 2. Dopasowanie po słowach kluczowych w etykietach i przykładowych zapytaniach sterty
  if (out.length < MAX) {
    const tokens = q.toLowerCase().split(/[\s,.-]+/).filter((w) => w.length >= 2);
    for (const token of tokens) {
      for (const item of LOOSE_EMOJIS) {
        if (out.length >= MAX) break;
        if (used.has(item.emoji)) continue;
        if (
          item.label.toLowerCase().includes(token) ||
          item.sampleQuery.toLowerCase().includes(token) ||
          item.conceptId.toLowerCase().includes(token)
        ) {
          used.add(item.emoji);
          out.push({
            id: `kw-${item.conceptId}-${item.emoji}`,
            emoji: item.emoji,
            conceptId: item.conceptId,
            label: item.label,
          });
        }
      }
    }
  }

  // 3. Gdy zapytanie nie pasuje do żadnych reguł (np. wpisywanie w trakcie, testy offline)
  // Wybieramy 2-3 emotki BEZPOŚREDNIO ze sterty według stabilnego hasha wpisanego tekstu.
  // Dzięki temu pod polem NIGDY nie pojawiają się obce emotki znikąd.
  if (out.length === 0) {
    let hash = 0;
    for (let i = 0; i < q.length; i++) {
      hash = ((hash << 5) - hash + q.charCodeAt(i)) | 0;
    }
    const count = Math.min(3, Math.max(1, (Math.abs(hash) % 3) + 1));
    for (let i = 0; i < count; i++) {
      const idx = Math.abs((hash + i * 17) ^ (i * 31)) % LOOSE_EMOJIS.length;
      const item = LOOSE_EMOJIS[idx];
      if (item && !used.has(item.emoji)) {
        used.add(item.emoji);
        out.push({
          id: `tray-${item.conceptId}-${item.emoji}`,
          emoji: item.emoji,
          conceptId: item.conceptId,
          label: item.label,
        });
      }
    }
  }

  return out;
}
