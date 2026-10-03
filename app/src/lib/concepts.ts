/**
 * Mostek między językiem potocznym a językiem Biblioteki ROPS.
 *
 * Powód istnienia: mieszkanka napisze „mama mieszka sama na wsi i nie ma z kim
 * pogadać". W kartach ROPS to samo zjawisko nazywa się „osamotnienie",
 * „izolacja społeczna", „obszary wiejskie", „osoby w podeszłym wieku".
 * Bez tej warstwy dopasowanie leksykalne nie znajdzie niczego.
 *
 * Terminy zostały dobrane pod rzeczywiste słownictwo 115 kart (zob.
 * scripts/scrape_rops.py) - nie są listą zgadniętą z sufitu.
 */
import { stem } from "./text";

export interface Concept {
  id: string;
  /** nazwa pokazywana użytkownikowi: „rozpoznaliśmy: samotność" */
  label: string;
  terms: string[];
}

export const CONCEPTS: Concept[] = [
  { id: "samotnosc", label: "samotność i izolacja", terms: [
    "sama", "sam", "samotny", "samotna", "samotność", "osamotnienie", "izolacja",
    "izolowany", "odosobnienie", "towarzystwo", "pogadać", "rozmowa", "rozmawiać",
    "kontakt", "nikogo", "opuszczony", "wykluczenie", "wyklucz" ] },
  { id: "senior", label: "osoby starsze", terms: [
    "senior", "seniorka", "starszy", "starsza", "starsze", "emeryt", "emerytka",
    "mama", "tata", "babcia", "dziadek", "babci", "dziadka", "podeszły", "wiek",
    "starość", "osiemdziesiąt", "siedemdziesiąt" ] },
  { id: "wies", label: "obszary wiejskie", terms: [
    "wieś", "wsi", "wiejski", "wiejska", "wiejskich", "gmina", "sołectwo",
    "miejscowość", "peryferie", "oddalony", "daleko", "prowincja", "popegeerowski" ] },
  { id: "demencja", label: "demencja i pamięć", terms: [
    "demencja", "dementywny", "otępienie", "otępienny", "alzheimer", "zapomina",
    "pamięć", "pamięciowy", "zaburzenia", "dezorientacja", "udar", "wylew" ] },
  { id: "psyche", label: "zdrowie psychiczne", terms: [
    "depresja", "depresyjny", "antydepresyjny", "lęk", "lękowy", "psychiczny",
    "psychika", "psychiatra", "psycholog", "kryzys", "przygnębienie", "stres",
    "wypalenie", "samobójczy", "nastrój" ] },
  // Celowo rozdzielone od "bariery": ktoś na wózku może nie mieć problemu
  // z dostępem do budynku, a ktoś z wózkiem dziecięcym - odwrotnie.
  // Zlanie tych wątków w jeden powodowało, że ochrona protez przed
  // zamoknięciem wychodziła jako odpowiedź na schody w urzędzie.
  //
  // Nie ma tu słowa "niepełnosprawność" ani "dysfunkcja" - występują w 101
  // z 115 kart, więc jako wyzwalacz wątku są bezwartościowe.
  { id: "ruch", label: "ograniczona mobilność", terms: [
    "wózek", "wózkach", "wózkowy", "ruchowy", "ruchowa", "mobilność", "poruszanie",
    "chodzenie", "sparaliżowany", "proteza", "kule", "kończyna", "niesprawny",
    "unieruchomiony", "rehabilitant" ] },
  { id: "bariery", label: "bariery architektoniczne", terms: [
    "schody", "schodach", "podjazd", "winda", "próg", "progi", "rampa",
    "krawężnik", "pochylnia", "architektoniczny", "bariera", "bariery",
    "wejście", "wejścia", "wjechać", "wejść", "piętro", "stopień", "wysoki",
    "dostępność", "przystosowany", "nieprzystosowany" ] },
  { id: "wzrok", label: "niepełnosprawność wzroku", terms: [
    "niewidomy", "niewidome", "niewidzący", "słabowidzący", "wzrok", "wzroku",
    "ślepy", "braille", "brajl", "audiodeskrypcja", "tyflo" ] },
  { id: "sluch", label: "niepełnosprawność słuchu", terms: [
    "głuchy", "głuche", "niesłyszący", "słabosłyszący", "słuch", "słuchu",
    "migowy", "pjm", "niedosłuch", "implant", "napisy" ] },
  { id: "intelekt", label: "niepełnosprawność intelektualna", terms: [
    "intelektualny", "intelektualna", "upośledzenie", "umiarkowany", "znaczny",
    "stopień", "etr", "łatwy", "prosty", "zrozumiały" ] },
  { id: "autyzm", label: "autyzm i spektrum", terms: [
    "autyzm", "autystyczny", "spektrum", "asd", "asperger", "sensoryczny",
    "nadwrażliwość", "stymulacja" ] },
  { id: "dzieci", label: "dzieci i młodzież", terms: [
    "dziecko", "dzieci", "młodzież", "nastolatek", "uczeń", "uczniowie", "szkoła",
    "szkolny", "przedszkole", "świetlica", "rówieśnik", "nauczyciel" ] },
  { id: "rodzina", label: "rodzina i piecza zastępcza", terms: [
    "rodzina", "rodzic", "rodzice", "piecza", "zastępcza", "opiekuńczo",
    "wychowawczy", "dom", "dziecka", "adopcja", "wielodzietny" ] },
  { id: "opieka", label: "opieka długoterminowa", terms: [
    "opieka", "opiekun", "opiekuńczy", "pielęgnacja", "całodobowy", "dps",
    "zamieszkania", "środowiskowy", "leżący", "niesamodzielny", "wytchnieniowy" ] },
  { id: "bezdomnosc", label: "kryzys bezdomności", terms: [
    "bezdomny", "bezdomność", "noclegownia", "schronisko", "ulica", "pustostan",
    "eksmisja", "ubóstwo", "ubogi", "bieda" ] },
  { id: "cudzoziemcy", label: "cudzoziemcy i integracja", terms: [
    "cudzoziemiec", "obcokrajowiec", "migrant", "uchodźca", "ukraiński",
    "ukrainka", "język", "tłumacz", "kulturowy", "międzykulturowy", "integracja" ] },
  { id: "praca", label: "rynek pracy", terms: [
    "praca", "pracy", "bezrobocie", "bezrobotny", "zatrudnienie", "zawodowy",
    "aktywizacja", "staż", "pracodawca", "kwalifikacje", "zarobek", "etat" ] },
  { id: "cyfrowe", label: "wykluczenie cyfrowe", terms: [
    "komputer", "internet", "smartfon", "telefon", "aplikacja", "cyfrowy",
    "online", "obsługa", "technologia", "urządzenie", "qr", "sms", "e-usługa" ] },
  { id: "zdrowie", label: "zdrowie i medycyna", terms: [
    "lekarz", "przychodnia", "rehabilitacja", "rehabilitacyjny", "pacjent",
    "leczenie", "lek", "leki", "szpital", "choroba", "chory", "terapia",
    "terapeutyczny", "profilaktyka", "dieta", "żywienie" ] },
  { id: "transport", label: "dojazd i dostępność", terms: [
    "dojazd", "transport", "dowóz", "komunikacja", "odległość", "dotarcie",
    "autobus", "przystanek", "podróż", "mobilny", "dostępność", "dostęp" ] },
  { id: "aktywnosc", label: "aktywność i kultura", terms: [
    "zajęcia", "aktywność", "aktywny", "kultura", "kulturalny", "hobby",
    "wolontariat", "wolontariusz", "spotkanie", "warsztat", "klub", "sport",
    "gra", "zabawa", "muzeum", "teatr", "międzypokoleniowy", "sąsiedzki" ] },
  { id: "instytucje", label: "instytucje i samorząd", terms: [
    "gmina", "powiat", "urząd", "urzędowy", "samorząd", "cus", "ops", "mops",
    "gops", "pcpr", "ngo", "stowarzyszenie", "fundacja", "wtz", "śds",
    "formalność", "wniosek", "procedura", "biurokracja" ] },
];

/** stem → lista id konceptów, w których ten rdzeń występuje */
export const STEM_TO_CONCEPTS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const c of CONCEPTS) {
    for (const t of c.terms) {
      const s = stem(t.toLowerCase());
      const cur = m.get(s);
      if (cur) {
        if (!cur.includes(c.id)) cur.push(c.id);
      } else {
        m.set(s, [c.id]);
      }
    }
  }
  return m;
})();

/** id → wszystkie rdzenie konceptu (do rozszerzania zapytania) */
export const CONCEPT_STEMS: Map<string, string[]> = new Map(
  CONCEPTS.map((c) => [c.id, [...new Set(c.terms.map((t) => stem(t.toLowerCase())))]]),
);

export const CONCEPT_LABEL: Map<string, string> = new Map(
  CONCEPTS.map((c) => [c.id, c.label]),
);
