/**
 * Sterta emotek wyzwań społecznych Małopolski + typy doboru.
 *
 * **Doboru NIE liczy ten plik.** O tym, które emotki pasują do opisu problemu,
 * decyduje wyłącznie Jev przez `POST /api/match/emojis/` (zob.
 * `lib/useEmojiPicks.ts`). Tutaj zostaje tylko sterta — zbiór, z którego Jev
 * wybiera — bo emotka widoczna pod polem musi fizycznie istnieć na dole
 * ekranu i odlecieć z tej samej sterty.
 *
 * Dlaczego bez lokalnych reguł: dobór po rozpoznanych wątkach trafiał średnio
 * („wszędzie schody" dostawało emotki od pierwszego pasującego wątku, nie od
 * najtrafniejszego). Jev ocenia każdą emotkę osobno w jednej przepustce i
 * zwraca pewność, więc kolejność jest wynikiem oceny, a nie kolejności w
 * tablicy.
 *
 * Kolejność emotek w stercie nie wpływa już na wybór — ma znaczenie wyłącznie
 * dla układu wizualnego.
 */
/** Ile emotek maksymalnie pokazujemy — więcej przestaje być czytelne. */
export const EMOJI_LIMIT = 6;

export interface PickedEmoji {
  id: string;
  emoji: string;
  conceptId?: string;
  label?: string;
  /** pewność Jev 0..1 — `undefined`, gdy wybór pochodzi z zachowanego stanu */
  confidence?: number;
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
 * Cała pula — do „sterty" emotek na dole hero (dekoracja, `aria-hidden`).
 * Sterta jest źródłem, z którego widoczny dobór „wylatuje" w górę pod pole
 * wyszukiwania, więc musi zawierać dokładnie te same emotki, co wybór Jev.
 */
export const ALL_EMOJI: string[] = [...new Set(LOOSE_EMOJIS.map((e) => e.emoji))];

/**
 * Sterta w formie wysyłanej do Jev — bez pól czysto wizualnych (`tilt`,
 * `jitterY`, `scale`), bo model ich nie potrzebuje i tylko zwiększałyby payload.
 */
export const EMOJI_CANDIDATES = LOOSE_EMOJIS.map(
  ({ emoji, label, conceptId, sampleQuery }) => ({
    emoji,
    label,
    conceptId,
    sampleQuery,
  }),
);
