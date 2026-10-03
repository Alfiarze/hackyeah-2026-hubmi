"""
Silnik dopasowania problem → innowacja, z wyjaśnieniem.

Port `app/src/lib/match.ts` — te same wagi, progi i uzasadnienia, żeby
wynik z backendu był identyczny jak ten z przeglądarki.

Dlaczego BM25 + wątki pojęciowe, a nie sam model językowy: wynik musi być
*wytłumaczalny*. Jury pyta wprost „czy narzędzie skutecznie sugeruje innowacje
na podstawie słów kluczowych z opisu potrzeb" — przy samym LLM jedyną
odpowiedzią jest „bo model tak powiedział”. Tu widać, który wątek został
rozpoznany, w którym polu karty się zgadza i jakimi słowami. Model z
kontenera `ai` dostaje te kandydaty do weryfikacji, ale to nie on ustala
rankingu.
"""
from __future__ import annotations

import math
import threading
from collections import Counter

from catalog.text_pl import snippet, tokenize

from .concepts_pl import (
    CONCEPT_LABEL,
    CONCEPT_STEMS,
    STEM_TO_CONCEPTS,
)

# Pola karty i ich waga. Pole problemowe waży najwięcej.
FIELDS = [
    {"key": "problem", "weight": 3.0, "label": "opis problemu"},
    {"key": "target", "weight": 2.6, "label": "grupa docelowa"},
    {"key": "desc", "weight": 2.0, "label": "opis rozwiązania"},
    {"key": "name", "weight": 1.8, "label": "nazwa"},
    {"key": "benef", "weight": 1.5, "label": "kto może skorzystać"},
    {"key": "catName", "weight": 1.4, "label": "kategoria"},
    {"key": "evidence", "weight": 0.9, "label": "wyniki testu"},
]

CONCEPT_FIELD_STRENGTH = {
    "problem": 1.0,
    "target": 0.85,
    "name": 0.7,
    "desc": 0.6,
    "evidence": 0.3,
    "catName": 0.25,
    "benef": 0.15,
}

K1 = 1.2
B = 0.75
CONCEPT_WEIGHT = 0.55  # dopasowanie przez wątek liczy się słabiej niż dosłowne
UNTESTED_PENALTY = 0.88  # karta bez opisanych wyników testu dostaje korektę w dół
# Karta z bazy spoza Małopolski: temat może pasować idealnie, ale ROPS jej tu nie
# testował, więc przy równym wyniku pierwszeństwo ma innowacja małopolska.
EXTERNAL_PENALTY = 0.9

GAP_SCORE_THRESHOLD = 35
GAP_COVERAGE_THRESHOLD = 0.25

GAP_REASON_TEXT = {
    "brak-watkow": (
        "Nie rozpoznaliśmy w tym opisie żadnego z obszarów, które pokrywa "
        "Biblioteka Innowacji Społecznych."
    ),
    "brak-trafien": "Żadna z 115 innowacji nie odpowiada na ten problem.",
    "slabe-pokrycie": (
        "Znaleźliśmy tylko luźno powiązane rozwiązania — żadne nie odpowiada na to wprost."
    ),
}


# --- model danych indeksu ---------------------------------------------------

class _FieldIndex:
    __slots__ = ("tf", "length")

    def __init__(self, tf: Counter, length: int):
        self.tf = tf
        self.length = length


class _ConceptHit:
    __slots__ = ("fields", "tf")

    def __init__(self):
        self.fields: set[str] = set()
        self.tf = 0


class _DocIndex:
    __slots__ = ("id", "fields", "concepts")

    def __init__(self, doc_id: str, fields: dict, concepts: dict):
        self.id = doc_id
        self.fields = fields
        self.concepts = concepts


_STATE: dict = {"docs": None}
_LOCK = threading.Lock()


def invalidate() -> None:
    """Wołane z sygnału po zapisie karty — indeks przebuduje się przy zapytaniu."""
    _STATE["docs"] = None


def _field_text(doc: dict, key: str) -> str:
    return doc.get(key) or ""


def _load_docs() -> list[dict]:
    from catalog.models import Innovation

    rows = Innovation.objects.select_related("category").prefetch_related("deployments")
    out = []
    for inn in rows:
        out.append(
            {
                "id": inn.id,
                "problem": inn.problem,
                "target": inn.target,
                "desc": inn.description,
                "name": inn.name,
                "benef": inn.beneficiaries,
                "catName": inn.cat_name,
                "evidence": inn.evidence,
                "cat": inn.cat_slug,
                "powiaty": [d.powiat for d in inn.deployments.all()],
                "ext": inn.ext,
                "origin": inn.origin or {},
            }
        )
    return out


def ensure_index() -> None:
    if _STATE.get("docs") is not None:
        return
    with _LOCK:
        if _STATE.get("docs") is not None:
            return
        docs = _load_docs()
        index: list[_DocIndex] = []
        df: Counter = Counter()
        len_sum: Counter = Counter()

        for doc in docs:
            fields = {}
            concepts: dict[str, _ConceptHit] = {}
            seen_stems: set[str] = set()
            for f in FIELDS:
                tokens = tokenize(_field_text(doc, f["key"]))
                tf: Counter = Counter()
                for t in tokens:
                    tf[t.stem] += 1
                    seen_stems.add(t.stem)
                    for cid in STEM_TO_CONCEPTS.get(t.stem, []):
                        hit = concepts.setdefault(cid, _ConceptHit())
                        hit.fields.add(f["key"])
                        hit.tf += 1
                fields[f["key"]] = _FieldIndex(tf, len(tokens))
                len_sum[f["key"]] += len(tokens)
            for s in seen_stems:
                df[s] += 1
            index.append(_DocIndex(doc["id"], fields, concepts))

        n_docs = len(docs)
        idf = {
            s: max(0.08, math.log(1 + (n_docs - cnt + 0.5) / (cnt + 0.5)))
            for s, cnt in df.items()
        }
        avg_len = {
            f["key"]: (len_sum[f["key"]] / max(1, n_docs)) for f in FIELDS
        }
        _STATE.update(
            {
                "docs": {d["id"]: d for d in docs},
                "index": index,
                "idf": idf,
                "avg_len": avg_len,
            }
        )


def _concept_strength(hit: _ConceptHit) -> float:
    best = max((CONCEPT_FIELD_STRENGTH[f] for f in hit.fields), default=0.0)
    return best * (0.65 + 0.35 * min(1.0, hit.tf / 3))


def analyze_query(query: str) -> dict:
    """Rozpoznaje wątki tematyczne i wypisuje, czego nie zrozumiało."""
    tokens = tokenize(query)
    seen: set[str] = set()
    concepts: list[dict] = []
    unknown: list[str] = []
    for t in tokens:
        cids = STEM_TO_CONCEPTS.get(t.stem)
        if cids:
            for cid in cids:
                if cid in seen:
                    continue
                seen.add(cid)
                concepts.append({"id": cid, "label": CONCEPT_LABEL.get(cid, cid)})
        elif len(t.raw) > 3 and t.raw.lower() not in unknown:
            unknown.append(t.raw.lower())
    return {
        "concepts": concepts,
        "stems": sorted({t.stem for t in tokens}),
        "unknown": unknown,
    }


def _bm25(tf: int, length: int, avg_len: float, idf: float) -> float:
    if tf == 0:
        return 0.0
    return (idf * (tf * (K1 + 1))) / (tf + K1 * (1 - B + B * (length / max(1, avg_len))))


def _build_reasons(doc: dict, matched: list[dict], missed: list[dict]) -> list[str]:
    out: list[str] = []
    in_problem = [m for m in matched if "opis problemu" in m["fields"]]
    in_target = [m for m in matched if "grupa docelowa" in m["fields"]]

    if in_problem:
        out.append(
            "Odpowiada na ten sam problem: "
            + ", ".join(m["label"] for m in in_problem)
            + "."
        )
    if in_target:
        out.append(
            "Grupa docelowa się zgadza — karta wymienia "
            + ", ".join(m["label"] for m in in_target)
            + f": {snippet(doc['target'], 120)}"
        )
    if not in_problem and not in_target and matched:
        out.append("Wspólne wątki: " + ", ".join(m["label"] for m in matched) + ".")
    if doc.get("ext"):
        origin = doc.get("origin") or {}
        region = origin.get("region")
        out.append(
            "Ta innowacja nie pochodzi z Małopolski — źródło: "
            f"{origin.get('source') or 'inna baza'}"
            + (f" ({region})" if region else "")
            + ". Wynik dopasowania jest lekko obniżony, bo ROPS nie testował jej "
            "w regionie — traktuj ją jak inspirację do adaptacji."
        )
    if doc["evidence"]:
        out.append(f"Było testowane: {snippet(doc['evidence'], 150)}")
    else:
        out.append(
            "Ta karta nie ma opisanych wyników testu, więc wynik dopasowania "
            "został obniżony — tematycznie pasuje, ale nikt nie udokumentował, czy działa."
        )
    if missed:
        out.append(
            "Nie pokrywa: "
            + ", ".join(m["label"] for m in missed)
            + " — sprawdź, czy to dla Ciebie istotne."
        )
    return out[:4]


def _highlights(doc: dict, wanted: set[str]) -> dict:
    hl: dict = {}
    for f in FIELDS:
        text = _field_text(doc, f["key"])
        if not text:
            continue
        spans = [
            [t.start, t.end] for t in tokenize(text) if t.stem in wanted
        ]
        if spans:
            hl[f["key"]] = spans
    return hl


def search(
    query: str,
    *,
    limit: int = 8,
    cat: str | None = None,
    powiat: str | None = None,
    external: bool = False,
) -> dict:
    """
    Pełna odpowiedź dopasowania: analiza zapytania, wyniki z uzasadnieniami
    i flaga luki (gdy nic sensownego nie pasuje).
    """
    ensure_index()
    analysis = analyze_query(query)

    weights: dict[str, float] = {}
    for s in analysis["stems"]:
        weights[s] = 1.0
    for c in analysis["concepts"]:
        for s in CONCEPT_STEMS.get(c["id"], []):
            weights.setdefault(s, CONCEPT_WEIGHT)

    if not weights:
        return {"analysis": analysis, "results": [], "gap_reason": "brak-watkow"}

    query_concept_ids = {c["id"] for c in analysis["concepts"]}
    raw: list[dict] = []
    for doc_idx in _STATE["index"]:
        doc = _STATE["docs"][doc_idx.id]
        if cat and doc["cat"] != cat:
            continue
        if powiat and powiat not in doc["powiaty"]:
            continue
        if doc.get("ext") and not external:
            continue

        lex = 0.0
        for f in FIELDS:
            fi = doc_idx.fields[f["key"]]
            for s, w in weights.items():
                tf = fi.tf.get(s, 0)
                if not tf:
                    continue
                lex += f["weight"] * w * _bm25(
                    tf, fi.length, _STATE["avg_len"][f["key"]], _STATE["idf"].get(s, 0.08)
                )
        if lex <= 0:
            continue

        cov_sum = 0.0
        for cid in query_concept_ids:
            hit = doc_idx.concepts.get(cid)
            if hit:
                cov_sum += _concept_strength(hit)
        raw.append(
            {
                "doc": doc_idx,
                "lex": lex,
                "coverage": (cov_sum / len(query_concept_ids)) if query_concept_ids else 0.0,
            }
        )

    if not raw:
        return {"analysis": analysis, "results": [], "gap_reason": "brak-trafien"}

    max_lex = max(r["lex"] for r in raw)
    results: list[dict] = []
    for r in raw:
        doc = _STATE["docs"][r["doc"].id]
        score = round(100 * (0.65 * r["coverage"] + 0.35 * (r["lex"] / max_lex)))
        if not query_concept_ids:
            score = min(score, 30)
        if not doc["evidence"]:
            score = round(score * UNTESTED_PENALTY)
        if doc.get("ext"):
            score = round(score * EXTERNAL_PENALTY)

        matched = []
        for c in analysis["concepts"]:
            hit = r["doc"].concepts.get(c["id"])
            if not hit:
                continue
            cstems = set(CONCEPT_STEMS.get(c["id"], []))
            terms: list[str] = []
            for fk in hit.fields:
                for t in tokenize(_field_text(doc, fk)):
                    if t.stem in cstems and t.raw.lower() not in terms:
                        terms.append(t.raw.lower())
            matched.append(
                {
                    "id": c["id"],
                    "label": c["label"],
                    "fields": [
                        next(f["label"] for f in FIELDS if f["key"] == fk)
                        for fk in hit.fields
                    ],
                    "terms": terms[:6],
                    "strength": round(_concept_strength(hit) * 100) / 100,
                }
            )
        matched.sort(key=lambda m: -m["strength"])
        missed = [c for c in analysis["concepts"] if c["id"] not in r["doc"].concepts]

        results.append(
            {
                "innovation_id": doc["id"],
                "score": score,
                "tier": (
                    "wysokie"
                    if (r["coverage"] >= 0.6 and score >= 55)
                    else "średnie" if score >= 35 else "niskie"
                ),
                "coverage": round(r["coverage"], 4),
                "matched": matched,
                "missed": [{"id": c["id"], "label": c["label"]} for c in missed],
                "reasons": _build_reasons(doc, matched, missed),
                "highlights": _highlights(doc, set(weights)),
            }
        )

    results.sort(key=lambda r: (-r["score"], r["innovation_id"]))
    results = results[:limit]
    return {"analysis": analysis, "results": results, "gap_reason": gap_reason(analysis, results)}


def gap_reason(analysis: dict, results: list[dict]) -> str | None:
    """Powód uznania zgłoszenia za lukę albo None, gdy dopasowanie jest wiarygodne."""
    if not analysis["concepts"]:
        return "brak-watkow"
    if not results:
        return "brak-trafien"
    if (
        results[0]["score"] < GAP_SCORE_THRESHOLD
        or results[0]["coverage"] < GAP_COVERAGE_THRESHOLD
    ):
        return "slabe-pokrycie"
    return None
