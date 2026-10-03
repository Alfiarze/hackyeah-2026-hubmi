/**
 * Przetwarzanie tekstu polskiego dla wyszukiwania.
 *
 * Bez zewnętrznych bibliotek i bez wywołań API - całość działa w przeglądarce,
 * offline. Dla 115 dokumentów to w pełni wystarcza, a dzięki temu demo nie
 * zależy od wifi na sali ani od klucza do modelu.
 */

/** Mapowanie diakrytyków: użytkownik może pisać "samotnosc" albo "samotność". */
const DIACRITICS: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
};

export function foldDiacritics(s: string): string {
  return s.replace(/[ąćęłńóśźż]/g, (c) => DIACRITICS[c] ?? c);
}

/**
 * Słowa, które nie niosą treści problemowej. Zawiera też czasowniki ramowe
 * („potrzebuję", „szukam"), bo w potocznym zgłoszeniu pojawiają się zawsze
 * i rozmywają dopasowanie.
 */
const STOPWORDS = new Set(
  (
    "a aby albo ale ani az bardzo bedzie bez bo by byc byl byla byly bylo byc " +
    "chce chcialbym chcialabym co coraz czy czyms dla do dosc dwa dwie dzieki " +
    "gdy gdzie go i ich ile im inne inny iz ja jak jaka jakie jako je jednak " +
    "jego jej jest jestem ja juz kazdy kiedy kilka kto ktora ktore ktorego " +
    "ktorych ktory lat lub ma majac maja mam mamy mi mnie moga moge moze " +
    "mozna moj moja na nad nam nas nasze nawet nic nie niego niej nim no " +
    "o od oraz osoba osobom osoby osobach pan pani po pod ponad potem " +
    "potrzebuje potrzebujemy poza prosze przed przez przy raz roku sa sie " +
    "sobie sposob swoje szukam szukamy ta tak taka takie tam te tego tej " +
    "ten teraz tez to tu tym tys u w we wiec wszystko z za ze zeby" +
    ""
  ).split(/\s+/),
);

/**
 * Końcówki fleksyjne, zdejmowane od najdłuższej. To celowo lekki stemmer, nie
 * morfologia - ma skleić „niepełnosprawnością" z „niepełnosprawnościami",
 * a nie poprawnie odmieniać polski.
 */
const SUFFIXES = [
  "iejszego", "iejszych", "owanie", "owania", "osciami", "osciach",
  "ajacych", "ajacym", "ujacych", "ujacym", "nietych", "ieniem",
  "osciom", "oscia", "ascie", "ejszy", "ajacy", "ujacy", "aniem",
  "eniem", "nosci", "nosc", "ach", "ami", "ach", "owi", "emu", "ego",
  "ych", "ich", "ymi", "imi", "owy", "owa", "owe", "nia", "nie", "niu",
  "cie", "cia", "ciu", "ow", "om", "em", "ie", "ia", "ie", "ym", "im",
  "ej", "aj", "ac", "ec", "ic", "yc", "a", "e", "i", "o", "u", "y",
];

/** Zdejmuje jedną końcówkę, o ile rdzeń zostanie wystarczająco długi. */
export function stem(word: string): string {
  const w = foldDiacritics(word);
  if (w.length <= 4) return w;
  for (const suf of SUFFIXES) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) {
      return w.slice(0, w.length - suf.length);
    }
  }
  return w;
}

export interface Token {
  /** rdzeń - klucz dopasowania */
  stem: string;
  /** forma z oryginalnego tekstu, do podświetlania */
  raw: string;
  /** pozycja w tekście źródłowym */
  start: number;
  end: number;
}

const WORD_RE = /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}/g;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    const lower = foldDiacritics(raw.toLowerCase());
    if (lower.length < 3 || STOPWORDS.has(lower)) continue;
    out.push({
      stem: stem(raw.toLowerCase()),
      raw,
      start: m.index!,
      end: m.index! + raw.length,
    });
  }
  return out;
}

export function stems(text: string): string[] {
  return tokenize(text).map((t) => t.stem);
}

/** Skraca tekst do pełnego zdania mieszczącego się w limicie. */
export function snippet(text: string, max = 180): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.trimEnd() + "…";
}

/**
 * Polska odmiana rzeczownika przez liczebnik: 1 / 2-4 / 5+.
 *
 * Nie jest to kosmetyka - „6 rozwiązania” w podsumowaniu wyników czyta się
 * jak maszynowe tłumaczenie i podważa zaufanie do reszty tekstu.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  if (abs === 1) return one;
  const last = abs % 10;
  // 12-14 idą do formy „wielu” mimo końcówki 2-4
  if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return few;
  return many;
}
