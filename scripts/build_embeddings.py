# -*- coding: utf-8 -*-
"""Liczy wektory semantyczne dla 115 kart innowacji (LSA na macierzy term-dokument).

Dlaczego tak, a nie API modelu:
  * demo musi działać bez internetu i bez klucza — na sali hackathonowej
    i w gminie ze słabym łączem,
  * koszt zmienny = 0 zł, co jest argumentem w kryterium wdrożeniowym,
  * wynik jest odtwarzalny: ten sam korpus daje ten sam wektor, zawsze.

Co to daje ponad BM25: generalizację. BM25 wymaga wspólnego rdzenia słowa.
Wektor z rozkładu SVD łączy słowa, które występują w podobnych kontekstach
w 115 kartach — „wytchnieniowy" i „zastępstwo" trafiają blisko siebie, mimo
że nie mają wspólnego rdzenia. Front liczy te same wektory dla nowych kart
dodanych w panelu administratora (to samo `U`), więc nowa karta jest
wyszukiwalna semantycznie od razu po zapisie.

Wyjście:
  app/src/data/vectors.json  — słownik, idf, macierz termów U (int8) i wektory kart

Tokenizacja i stemmer są portem `app/src/lib/text.ts` — ta sama lista
stopwords i te same końcówki, bo inaczej rdzenie z przeglądarki nie trafiłyby
w słownik policzony tutaj. Test spójności: `scripts/check_stemmer.py`.
"""
import base64
import json
import math
import pathlib
import re

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "src" / "data" / "vectors.json"

DIM = 48
MAX_VOCAB = 2400
MIN_DF = 2

# --- port app/src/lib/text.ts -------------------------------------------------

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


def stem(word: str) -> str:
    w = word.translate(DIACRITICS)
    if len(w) <= 4:
        return w
    for suf in SUFFIXES:
        if len(w) - len(suf) >= 4 and w.endswith(suf):
            return w[: len(w) - len(suf)]
    return w


def tokenize(text: str) -> list[str]:
    out = []
    for m in WORD_RE.finditer(text):
        raw = m.group(0)
        lower = raw.lower().translate(DIACRITICS)
        if len(lower) < 3 or lower in STOPWORDS:
            continue
        out.append(stem(raw.lower()))
    return out


# --- te same wagi pól co w lib/match.ts --------------------------------------

FIELDS = [
    ("problem", 3.0),
    ("target_group", 2.6),
    ("description", 2.0),
    ("name", 1.8),
    ("beneficiaries", 1.5),
    ("evidence", 0.9),
]


def doc_counts(inn: dict, cat_name: str) -> dict[str, float]:
    """Ważona liczba wystąpień rdzeni w jednej karcie."""
    counts: dict[str, float] = {}
    for key, weight in FIELDS:
        for s in tokenize(inn.get(key) or ""):
            counts[s] = counts.get(s, 0.0) + weight
    for s in tokenize(cat_name):
        counts[s] = counts.get(s, 0.0) + 1.4
    return counts


def b64_int8(arr: np.ndarray) -> str:
    return base64.b64encode(arr.astype(np.int8).tobytes()).decode("ascii")


def quantize(mat: np.ndarray) -> tuple[str, float]:
    """int8 + jedna skala. Błąd kwantyzacji ~0.4% — nieistotny przy cosinusie."""
    scale = float(np.abs(mat).max()) or 1.0
    q = np.clip(np.round(mat / scale * 127.0), -127, 127)
    return b64_int8(q), scale


def main() -> None:
    src = json.load(open(ROOT / "data" / "innovations.json", encoding="utf-8"))
    cats = {c["slug"]: c["title"] for c in src["categories"]}
    inns = src["innovations"]
    n_docs = len(inns)

    per_doc = [doc_counts(i, cats.get(i["category_slug"], "")) for i in inns]

    df: dict[str, int] = {}
    for counts in per_doc:
        for s in counts:
            df[s] = df.get(s, 0) + 1

    # Rdzenie zbyt rzadkie nie mają z czego uogólniać, a zbyt częste nie
    # różnicują. Sortujemy po df i obcinamy słownik — int8 x 2400 x 48 to
    # 115 KB w bundlu, co jest górną granicą, jaką ten prototyp może zapłacić.
    vocab = [s for s, d in df.items() if d >= MIN_DF]
    vocab.sort(key=lambda s: (-df[s], s))
    vocab = vocab[:MAX_VOCAB]
    index = {s: i for i, s in enumerate(vocab)}

    idf = np.array(
        [max(0.08, math.log(1 + (n_docs - df[s] + 0.5) / (df[s] + 0.5))) for s in vocab]
    )

    # X: term x dokument, tf-idf z saturacją tf (1 + log tf) — ta sama intuicja
    # co w BM25, bez parametru długości, bo tu liczy się kierunek, nie ranking.
    X = np.zeros((len(vocab), n_docs))
    for d, counts in enumerate(per_doc):
        for s, c in counts.items():
            i = index.get(s)
            if i is not None:
                X[i, d] = (1.0 + math.log(c)) * idf[i]
    # normalizacja kolumn: długość karty nie może decydować o podobieństwie
    col = np.linalg.norm(X, axis=0)
    col[col == 0] = 1.0
    X /= col

    U, S, _ = np.linalg.svd(X, full_matrices=False)
    k = min(DIM, len(S))
    Uk = U[:, :k]                      # baza do kodowania zapytań i nowych kart
    D = X.T @ Uk                       # wektory kart — dokładnie to, co policzy front
    D /= np.maximum(np.linalg.norm(D, axis=1, keepdims=True), 1e-9)

    terms_b64, terms_scale = quantize(Uk)
    docs_b64, docs_scale = quantize(D)

    payload = {
        "note": (
            "Wektory semantyczne LSA (SVD na macierzy term-dokument 115 kart ROPS). "
            "Liczone offline skryptem scripts/build_embeddings.py, bez wywołań API. "
            "Front koduje zapytania i nowe karty tą samą macierzą `terms`."
        ),
        "dim": k,
        "vocab": vocab,
        "idf": [round(float(v), 4) for v in idf],
        "termsScale": terms_scale,
        "terms": terms_b64,
        "docIds": [i["slug"] for i in inns],
        "docsScale": docs_scale,
        "docs": docs_b64,
        "variance": round(float((S[:k] ** 2).sum() / (S**2).sum()), 4),
    }
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    size = OUT.stat().st_size / 1024
    print(f"  vectors.json: {size:.0f} KB")
    print(f"  {len(vocab)} rdzeni, {k} wymiarów, {n_docs} kart")
    print(f"  wariancja zachowana: {payload['variance'] * 100:.1f}%")


if __name__ == "__main__":
    main()
