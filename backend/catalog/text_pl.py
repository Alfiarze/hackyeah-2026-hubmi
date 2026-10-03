"""
Wyszukiwanie polskie: tokenizacja i stemmer.

Port `app/src/lib/text.ts` — ta sama lista stopwords i te same końcówki, bo
inaczej rdzenie z przeglądarki nie trafiłyby w słownik policzony tutaj.
Test spójności: `scripts/check_stemmer.py`.
"""
from __future__ import annotations

import re

DIACRITICS = str.maketrans("ąćęłńóśźż", "acelnoszz")

STOPWORDS = set(
    (
        "a aby albo ale ani az bardzo bedzie bez bo by byc byl byla byly bylo byc "
        "chce chcialbym chcialabym co coraz czy czyms dla do dosc dwa dwie dzieki "
        "gdy gdzie go i ich ile im inne inny iz ja jak jaka jakie jako je jednak "
        "jego jej jest jestem ja juz kazdy kiedy kilka kto ktora ktore ktorego "
        "ktorych ktory lat lub ma majac maja mam mamy mi mnie moga moge moze "
        "mozna moj moja na nad nam nas nasze nawet nic nie niego niej nim no "
        "o od oraz osoba osobom osoby osobach pan pani po pod ponad potem "
        "potrzebuje potrzebujemy poza prosze przed przez przy raz roku sa sie "
        "sobie sposob swoje szukam szukamy ta tak taka takie tam te tego tej "
        "ten teraz tez to tu tym tys u w we wiec wszystko z za ze zeby"
    ).split()
)

SUFFIXES = [
    "iejszego", "iejszych", "owanie", "owania", "osciami", "osciach",
    "ajacych", "ajacym", "ujacych", "ujacym", "nietych", "ieniem",
    "osciom", "oscia", "ascie", "ejszy", "ajacy", "ujacy", "aniem",
    "eniem", "nosci", "nosc", "ach", "ami", "ach", "owi", "emu", "ego",
    "ych", "ich", "ymi", "imi", "owy", "owa", "owe", "nia", "nie", "niu",
    "cie", "cia", "ciu", "ow", "om", "em", "ie", "ia", "ie", "ym", "im",
    "ej", "aj", "ac", "ec", "ic", "yc", "a", "e", "i", "o", "u", "y",
]

WORD_RE = re.compile(r"[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{2,}")


def fold(text: str) -> str:
    """„samotnosc” i „samotność” muszą dać ten sam rdzeń."""
    return text.translate(DIACRITICS)


def stem(word: str) -> str:
    """Zdejmuje jedną końcówkę, o ile rdzeń zostanie wystarczająco długi."""
    w = fold(word)
    if len(w) <= 4:
        return w
    for suf in SUFFIXES:
        if len(w) - len(suf) >= 4 and w.endswith(suf):
            return w[: len(w) - len(suf)]
    return w


class Token:
    __slots__ = ("stem", "raw", "start", "end")

    def __init__(self, stem_: str, raw: str, start: int, end: int):
        self.stem = stem_
        self.raw = raw
        self.start = start
        self.end = end

    def __repr__(self) -> str:  # pragma: no cover
        return f"Token({self.stem!r})"


def tokenize(text: str) -> list[Token]:
    out: list[Token] = []
    if not text:
        return out
    for m in WORD_RE.finditer(text):
        raw = m.group(0)
        lower = fold(raw.lower())
        if len(lower) < 3 or lower in STOPWORDS:
            continue
        out.append(Token(stem(raw.lower()), raw, m.start(), m.end()))
    return out


def stems(text: str) -> list[str]:
    return [t.stem for t in tokenize(text)]


def snippet(text: str, max_len: int = 180) -> str:
    """Skraca do pełnego zdania mieszczącego się w limicie."""
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    stop = max(cut.rfind(". "), cut.rfind("; "))
    return cut[: stop + 1] if stop > max_len * 0.5 else cut.rstrip() + "…"
