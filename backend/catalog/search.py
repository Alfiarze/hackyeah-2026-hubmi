"""
Wyszukiwanie hybrydowe: wektor (pgvector) + fraza (Postgres, prefiksy rdzeni).

Dlaczego `simple` zamiast `polish`: Postgres NIE ma w rdzeniu polskiego
stemmera (ani konfiguracji `polish`), a dokładnego dorzucić się nie da —
obraz nie ma kompilatora. Dlatego kluczowe jest to, że:

  * kolumna `search_vector` trzyma oryginalne słowa (bez stemmowania),
  * zapytanie budujemy jako PREFIKSY rdzeni z naszego polskiego stemmera
    (`catalog.text_pl`): „samotnosc" → `samotn:*`, co trafia w „samotność",
    „samotni", „osamotnienie"… przez indeks GIN, bez PrefixQuery w Pythonie.

Dzięki temu mamy i indeks w SQL (skalowalne), i polskie końcówki, i zero
dodatkowych zależności. BM25 z `matchmaking.engine` nadal liczy główny ranking
i wytłumacza, dlaczego coś pasuje.
"""
from __future__ import annotations

import logging

import numpy as np
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db import connection
from django.db.models import F

from . import vectors
from .text_pl import stems

log = logging.getLogger("hubmi.search")

MAX_QUERY_STEMS = 12


def _to_param(vec: np.ndarray) -> str:
    return "[" + ",".join(f"{float(v):.6f}" for v in vec) + "]"


def prefix_query(text: str) -> SearchQuery | None:
    """
    Zapytanie tsquery z rdzeni: `samotn:* | izolac:*`.

    Rdzenie z `text_pl.stem` są prefiksami oryginalnych słów, więc prefiksowe
    dopasowanie w PostgreSQL obsługuje polskie odmiany bez stemmera po stronie
    bazy. Zwraca None, gdy nie ma z czego budować zapytania.
    """
    query_stems = list(dict.fromkeys(stems(text)))[:MAX_QUERY_STEMS]
    if not query_stems:
        return None
    raw = " | ".join(f"{s}:*" for s in query_stems)
    try:
        return SearchQuery(raw, config="simple", search_type="raw")
    except Exception as exc:  # noqa: BLE001 — awaria parsowania nie może zabić widoku
        log.info("nieprawidłowe tsquery %r: %s", raw, exc)
        return None


def vector_search(vec, limit: int = 10) -> list[tuple[str, float]]:
    """Najbliższe karty po cosinusie. Najpierw pgvector, potem numpy w procesie."""
    if vec is None:
        return []
    param = _to_param(vec)
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT id, 1 - (embedding <=> %s::vector) AS score
                FROM catalog_innovation
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                [param, param, limit],
            )
            return [(row[0], round(float(row[1]), 4)) for row in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001 — brak rozszerzenia → liczę w procesie
        log.info("pgvector niedostępne (%s) — liczę cosinus w procesie", exc)
        docs = vectors.doc_vectors()
        scored = sorted(
            ((slug, vectors.cosine(vec, d)) for slug, d in docs.items()),
            key=lambda t: -t[1],
        )
        return [(slug, round(score, 4)) for slug, score in scored[:limit]]


def text_search(query: str, limit: int = 10) -> list[tuple[str, float]]:
    """
    Frazowe szukanie po kartach: prefiksy rdzeni w SQL + fallback w Pythonie.

    Fallback łapie przypadek, gdy w bazie nie ma jeszcze `search_vector`
    (świeży kontener przed imporem) albo gdy Postgres nie odpowie.
    """
    from .models import Innovation

    if not query.strip():
        return []

    sq = prefix_query(query)
    if sq is not None:
        try:
            rows = list(
                Innovation.objects.annotate(rank=SearchRank(F("search_vector"), sq))
                .filter(search_vector=sq)
                .order_by("-rank")[: limit * 2]
                .values_list("id", "rank")
            )
            if rows:
                top = max(float(r) for _, r in rows) or 1.0
                return [(i, round(float(r) / top, 4)) for i, r in rows[:limit]]
        except Exception as exc:  # noqa: BLE001
            log.info("tsvector niedostępne (%s) — szukam rdzeniami w Pythonie", exc)

    return _stem_search(query, limit)


def _stem_search(query: str, limit: int) -> list[tuple[str, float]]:
    """Pokrycie rdzeni: ile z tego, co napisał mieszkaniec, jest w karcie."""
    from .models import Innovation

    wanted = set(stems(query))
    if not wanted:
        return []
    fields = ["name", "problem", "description", "target", "beneficiaries", "evidence"]
    scored: list[tuple[str, float]] = []
    for row in Innovation.objects.all().values("id", *fields):
        blob = " ".join(row[k] or "" for k in fields)
        have = set(stems(blob))
        overlap = len(wanted & have)
        if overlap:
            scored.append((row["id"], round(overlap / len(wanted), 4)))
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored[:limit]


def hybrid_search(query: str, limit: int = 10) -> list[dict]:
    """Fuzja rankingu: wynik = max z normalizowanych rankingów obu ścieżek."""
    vec = vectors.encode_query(query)
    by_vector = {slug: score for slug, score in vector_search(vec, limit * 2)}
    by_text = {slug: score for slug, score in text_search(query, limit * 2)}
    slugs = list(dict.fromkeys([*by_vector, *by_text]))
    merged = [
        {
            "id": slug,
            "vector": by_vector.get(slug),
            "text": by_text.get(slug),
            "score": round(max(by_vector.get(slug, 0.0), by_text.get(slug, 0.0)), 4),
        }
        for slug in slugs
    ]
    merged.sort(key=lambda r: -r["score"])
    return merged[:limit]
