"""
Wektory LSA dla 115 kart — ten sam plik, którego używa front
(`app/src/data/vectors.json`, liczy `scripts/build_embeddings.py`).

Po co to w backendzie, skoro jest BM25: BM25 wymaga wspólnego rdzenia słowa.
Wektor z SVD łączy słowa, które występują w podobnych kontekstach — „wytchnieniowy”
i „zastępstwo” leżą blisko, mimo że nie mają wspólnego korzenia. Wektory lecą
do pgvector jako ścieżka produkcyjna (a nie tylko „ładna historyjka na slajdzie”).
"""
from __future__ import annotations

import base64
import json
import logging
import math
import re
from functools import lru_cache

import numpy as np
from django.conf import settings

from .text_pl import stems

log = logging.getLogger("hubmi.vectors")

# te same wagi pól co scripts/build_embeddings.py (i lib/match.ts)
FIELD_WEIGHTS = [
    ("problem", 3.0),
    ("target", 2.6),
    ("description", 2.0),
    ("name", 1.8),
    ("beneficiaries", 1.5),
    ("evidence", 0.9),
]


@lru_cache(maxsize=1)
def _payload() -> dict | None:
    path = settings.VECTORS_FILE
    if not path.exists():
        log.warning("brak %s — wyszukiwanie wektorowe wyłączone", path)
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _decode(b64: str, scale: float, shape: tuple[int, int]) -> np.ndarray:
    arr = np.frombuffer(base64.b64decode(b64), dtype=np.int8).astype(np.float32)
    return (arr / 127.0 * scale).reshape(shape)


@lru_cache(maxsize=1)
def basis() -> np.ndarray | None:
    """Macierz Uk (vocab × 48) — baza do kodowania zapytań i nowych kart."""
    p = _payload()
    if not p:
        return None
    return _decode(p["terms"], float(p["termsScale"]), (len(p["vocab"]), p["dim"]))


@lru_cache(maxsize=1)
def _doc_matrix() -> tuple[list[str], np.ndarray] | None:
    p = _payload()
    if not p:
        return None
    docs = _decode(p["docs"], float(p["docsScale"]), (len(p["docIds"]), p["dim"]))
    return list(p["docIds"]), docs


def available() -> bool:
    return basis() is not None


def encode_counts(counts: dict[str, float]) -> np.ndarray | None:
    """Wektor dla mapy ważonych częstości rdzeni — współdzielone dla kart i zapytań."""
    p, U = _payload(), basis()
    if not p or U is None:
        return None
    index = {s: i for i, s in enumerate(p["vocab"])}
    idf = np.asarray(p["idf"], dtype=np.float32)
    x = np.zeros(len(p["vocab"]), dtype=np.float32)
    for stem, count in counts.items():
        i = index.get(stem)
        if i is not None and count > 0:
            x[i] = (1.0 + math.log(count)) * idf[i]
    norm = float(np.linalg.norm(x))
    if norm <= 0:
        return None
    x /= norm
    vec = U.T @ x
    n = float(np.linalg.norm(vec))
    return vec / n if n > 0 else None


def encode_document(fields: dict[str, str]) -> np.ndarray | None:
    """Wektor karty dodanej w panelu admina — ważony tak jak 115 kart z ROPS."""
    counts: dict[str, float] = {}
    for key, weight in FIELD_WEIGHTS:
        for stem in stems(fields.get(key, "") or ""):
            counts[stem] = counts.get(stem, 0.0) + weight
    for stem in stems(fields.get("cat_name", "") or ""):
        counts[stem] = counts.get(stem, 0.0) + 1.4
    return encode_counts(counts)


def encode_query(text: str) -> np.ndarray | None:
    """Wektor zapytania mieszkańca — bez wag pól, bo to jedno zdanie."""
    counts: dict[str, float] = {}
    for stem in stems(text):
        counts[stem] = counts.get(stem, 0.0) + 1.0
    return encode_counts(counts)


def doc_vectors() -> dict[str, np.ndarray]:
    """Wektory wszystkich kart (awaria pgvector → liczymy w procesie)."""
    data = _doc_matrix()
    if not data:
        return {}
    ids, matrix = data
    return {slug: matrix[i] for i, slug in enumerate(ids)}


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom else 0.0
