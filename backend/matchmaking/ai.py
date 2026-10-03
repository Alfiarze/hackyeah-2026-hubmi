"""
AI matchmakingu — to tu Jev odpowiada na pytanie:
„czy ta innowacja jest powiązana z tym, co opisał mieszkaniec?”.

Wejście: zapytanie + kandydaci wybrani przez silnik BM25 (bo nie czytamy 115 kart
przy każdym zapytaniu). Wyjście: werdykt tak/nie + prawdopodobieństwo `noul`
(0..1) + pewność + jedno zdanie uzasadnienia po polsku + źródło (`jev` albo
`fallback`).

Jest też `check_related()` — pojedyncza ocena „czy to, co wpisano, jest
powiązane” pod CRUD z `/api/relevance/`.

Gdy brak klucza, sieci albo limitu, `source=fallback` — werdykt wynika z progów
silnika, demo nigdy nie stoi. To jest ten przypadek, o którym mówi zasada
„żaden endpoint nie wolno się wywalić, bo model odpowiada za wolno”.

Uwaga: Jev nie generuje tekstu. `ask()` (moduł II) nie ma więc czym odpowiadać
i uczciwie oddaje same źródła.
"""
from __future__ import annotations

import logging
import re
import time

from django.conf import settings

from hubmi import ai as transport

log = logging.getLogger("hubmi.matchmaking.ai")

# Pytanie powtarzane dla każdego kandydata — w jednej przepustce Jev ocenia
# wszystkie karty naraz (dokumentacja: answers wraca pod tymi samymi kluczami).
#
# UWAGA na backticki: pola przekazane w `instructions` trzeba nazywać w tekście
# pytania po nazwie, inaczej Jev ich nie podpinie. Bez ``karta`` karta „Merkury”
# (kompetencje cyfrowe seniorów) dostała 0.38 przy zapytaniu o smartfony,
# a z backtickiem 0.71 — zmierzono to na żywym API.
RELATED_INSTRUCTIONS = (
    "Czy `karta` realnie rozwiązuje problem opisany w `zapytanie`? "
    "Odpowiedź `true` tylko wtedy, gdy `karta` dotyczy tego samego problemu "
    "lub tej samej przyczyny."
)

RELATED_CRITERIA = {
    "true": "Karta dotyczy tego samego problemu co zapytanie.",
    "false": "Karta dotyczy innego problemu — jest tylko tematycznie bliska.",
}

# Słowa, które nie niosą znaczenia przy porównywaniu tekstu (fallback).
_STOP = {
    "i", "w", "na", "to", "z", "o", "że", "się", "nie", "do", "jak", "jest",
    "a", "ale", "czy", "dla", "po", "przy", "od", "za", "co", "by", "od",
    "the", "and", "of", "for",
}


def _candidates_payload(candidates: list[dict]) -> list[dict]:
    return [
        {
            "id": c["id"],
            "nazwa": c.get("name", ""),
            "problem": c.get("problem", "")[:600],
            "grupa_docelowa": c.get("target", "")[:300],
            "czy_to_dziala": c.get("evidence", "")[:300] or "(brak opisu testu)",
        }
        for c in candidates
    ]


def _answer(name: str, noul: float, threshold: float) -> dict:
    """Werdykt z surowego `noul` + uzasadnienie z szablonu (Jev nie pisze prozy)."""
    related = noul >= threshold
    pewnosc = round(max(noul, 1 - noul) * 100)
    if related:
        powod = (
            f"AI uznaje związek ({noul:.2f}) — „{name}” odpowiada na opisany "
            "problem, a nie tylko porusza ten sam temat."
        )
    else:
        powod = (
            f"AI nie widzi związku ({noul:.2f}) — „{name}” nie sięga "
            "opisanego problemu, brakuje w karcie tego, o co pyta mieszkaniec."
        )
    return {
        "powiazane": related,
        "pewnosc": pewnosc,
        "noul": round(noul, 4),
        "powod": powod[:400],
    }


def _fallback(query: str, candidates: list[dict]) -> list[dict]:
    """Werdykt z progów silnika, gdy Jev nie odpowiada."""
    out = []
    for c in candidates:
        score = int(c.get("score", 0))
        related = score >= 55
        if related:
            reason = c.get("reasons", [""])[0] if c.get("reasons") else ""
            reason = reason or (
                "Karta pokrywa ten sam wątek problemowy, co opisane zgłoszenie."
            )
        else:
            reason = (
                "Tylko luźne pokrycie tematu — trzeba sprawdzić, czy to rozwiązanie "
                "dotyczy tego samego problemu."
            )
        out.append(
            {
                "id": c["id"],
                "powiazane": related,
                "pewnosc": min(95, score),
                "noul": round(min(95, score) / 100, 4),
                "powod": reason,
            }
        )
    return out


def judge_related(query: str, candidates: list[dict]) -> dict:
    """
    Zwraca {source, werdykty[]} — zawsze, nawet gdy Jev milczy.

    Jeden request do Jev na wszystkich kandydatów: pytań tyle, ilu kandydatów,
    ale `state` (zapytanie) idzie raz.
    """
    if not candidates:
        return {"source": "brak-kandydatow", "werdykty": []}

    questions = {
        f"card_{c['id']}": {
            "type": "noul",
            "instructions": {
                "question": RELATED_INSTRUCTIONS,
                "karta": _candidates_payload([c])[0],
            },
            "criteria": RELATED_CRITERIA,
        }
        for c in candidates
    }

    result = transport.evaluate({"zapytanie": query[:2000]}, questions)
    if not result:
        return {"source": "fallback", "werdykty": _fallback(query, candidates)}

    threshold = settings.JEV_THRESHOLD
    werdykty = []
    for c in candidates:
        noul = transport.noul_answer(result, f"card_{c['id']}")
        if noul is None:
            continue
        row = _answer(c.get("name", "") or f"karta {c['id']}", noul, threshold)
        row["id"] = c["id"]
        werdykty.append(row)

    if not werdykty:
        return {"source": "fallback", "werdykty": _fallback(query, candidates)}

    log.info(
        "Jev: %s kart, %s powiązanych, %s ms",
        len(werdykty),
        sum(1 for w in werdykty if w["powiazane"]),
        transport.last_ms(),
    )
    return {"source": "jev", "werdykty": werdykty}


def check_related(text: str, context: str = "", *, threshold: float | None = None) -> dict:
    """
    Pojedyncza ocena „czy wpisana treść jest powiązana z kontekstem” —
    pod CRUD `/api/relevance/`.

    Zwraca: {source, related, noul, confidence, model, powod, threshold,
    latency_ms}. Bez klucza/sieci: source=fallback i wyliczenie z nakładania
    się słów — tylko po to, by demo miało cokolwiek.
    """
    limit = settings.JEV_THRESHOLD if threshold is None else float(threshold)
    ctx_clean = (context or "").strip()
    state = {
        "tresc": text[:2000],
        "kontekst": ctx_clean[:2000] or "(brak kontekstu — oceniaj samą treść)",
    }
    question = {
        "type": "noul",
        "instructions": (
            "Czy `tresc` realnie dotyczy tego samego problemu lub tej samej grupy odbiorców co `kontekst`? "
            "Odpowiedź dotyczy znaczenia i realnej potrzeby, a nie samych powtórzonych słów."
        ),
        "criteria": {
            "true": "Tresc i kontekst odnoszą się do tego samego problemu lub zbieżnej potrzeby społecznej.",
            "false": "Tresc i kontekst dotyczą zupełnie innych spraw lub nie ma między nimi merytorycznego związku.",
        },
    }

    result = transport.evaluate(state, {"powiazane": question})
    noul = transport.noul_answer(result, "powiazane")

    if noul is None:
        source = "fallback"
        model = ""
        latency = None
        noul = _overlap(text, context)
    else:
        source = "jev"
        model = str((result or {}).get("model") or "")
        latency = transport.last_ms()

    name = (text.strip().splitlines() or ["treść"])[0][:80]
    answer = _answer(name, noul, limit)
    return {
        "source": source,
        "related": answer["powiazane"],
        "noul": answer["noul"],
        "confidence": answer["pewnosc"],
        "powod": answer["powod"],
        "model": model,
        "latency_ms": latency,
        "threshold": limit,
    }


def _overlap(text: str, context: str) -> float:
    """Fallback bez modelu: splot słów (>3 znaków) → 0..1."""

    def norm(s: str) -> set[str]:
        return {
            w for w in re.findall(r"[\wąćęłńóśźż]+", s.lower())
            if len(w) > 3 and w not in _STOP
        }

    a, b = norm(text), norm(context)
    if not a or not b:
        return 0.0
    return round(min(1.0, len(a & b) / min(len(a), len(b)) * 1.5), 4)


def ask(question: str, sources: list[dict]) -> dict:
    """
    Pytanie do materiałów ROPS (moduł II).

    Wykorzystuje model decyzyjny Jev do wytypowania najbardziej trafnego źródła
    spośród dokumentów i kart oraz oceny powiązania każdego ze źródeł (noul + choice).
    """
    if not sources:
        return {
            "source": "brak",
            "answer": "Nie znaleźliśmy w materiałach ROPS nic na ten temat.",
            "sources": [],
        }

    questions = {}
    criteria_choice = {}
    for i, s in enumerate(sources[:5]):
        key = f"src_{i}"
        questions[key] = {
            "type": "noul",
            "instructions": {
                "question": "Czy `zrodlo` zawiera merytoryczną odpowiedź, procedurę lub rozwiązanie problemu z `pytanie`?",
                "zrodlo": {
                    "tytul": s.get("title", ""),
                    "typ": s.get("type", "dokument"),
                    "fragment": s.get("snippet", "")[:400],
                },
            },
            "criteria": {
                "true": "Źródło bezpośrednio odpowiada na zadane pytanie lub zawiera potrzebne informacje.",
                "false": "Źródło nie odpowiada na to pytanie lub jest tylko luźno powiązane.",
            },
        }
        criteria_choice[key] = f"{s.get('title', '')[:60]}: {s.get('snippet', '')[:100]}"

    questions["najlepsze"] = {
        "type": "choice",
        "instructions": "Które z wymienionych źródeł najlepiej i najpełniej odpowiada na `pytanie`?",
        "criteria": criteria_choice,
    }

    result = transport.evaluate({"pytanie": question[:2000]}, questions)

    if not result:
        return {
            "source": "fallback",
            "answer": (
                f"W materiałach ROPS znaleziono {len(sources)} pasujących pozycji. "
                "Poniżej lista wraz z odnośnikami do źródeł."
            ),
            "sources": sources,
            "best_source": sources[0] if sources else None,
        }

    best_choice = transport.choice_answer(result, "najlepsze")
    best_key = best_choice["choice"] if best_choice else "src_0"
    try:
        best_idx = int(best_key.replace("src_", ""))
    except (ValueError, AttributeError):
        best_idx = 0

    evaluated_sources = []
    for i, s in enumerate(sources[:5]):
        noul = transport.noul_answer(result, f"src_{i}")
        s_copy = dict(s)
        s_copy["noul"] = round(noul, 4) if noul is not None else 0.5
        s_copy["related"] = (noul is not None and noul >= settings.JEV_THRESHOLD)
        s_copy["is_best"] = (i == best_idx)
        evaluated_sources.append(s_copy)

    evaluated_sources.sort(key=lambda x: (x.get("is_best", False), x.get("noul", 0)), reverse=True)
    best = evaluated_sources[0] if evaluated_sources else sources[0]

    noul_val = best.get("noul") or 0.8
    answer_text = (
        f"Model wytypował jako najbardziej adekwatną odpowiedź materiał: „{best['title']}” "
        f"(trafność {noul_val*100:.0f}%). "
        f"{best.get('snippet', '')}"
    )

    return {
        "source": "jev",
        "answer": answer_text,
        "best_source": best,
        "sources": evaluated_sources,
        "jev_model": result.get("model", settings.JEV_MODEL),
        "latency_ms": transport.last_ms(),
    }


# --- emotki ----------------------------------------------------------------

# Jedno pytanie `noul` na emotkę — Jev ocenia całą stertę w jednej przepustce.
# Backticki wokół `emotka` i `zapytanie` są wymagane: bez nich model nie podpina
# pól z `instructions` (ten sam mechanizm, co przy ``karta`` wyżej).
EMOJI_INSTRUCTIONS = (
    "Czy `emotka` trafnie ilustruje problem opisany w `zapytanie`? "
    "Odpowiedź `true` tylko wtedy, gdy znaczenie emotki dotyczy tego samego "
    "problemu, tej samej grupy osób albo tej samej przyczyny. "
    "Emotka luźno skojarzona z tematem to `false`."
)

EMOJI_CRITERIA = {
    "true": "Znaczenie emotki odpowiada problemowi z zapytania.",
    "false": "Emotka dotyczy czegoś innego albo jest skojarzona tylko luźno.",
}

# Sterta ma ~40 pozycji; limit chroni endpoint przed żądaniem z 500 emotkami.
EMOJI_MAX_CANDIDATES = 80


def pick_emojis(query: str, candidates: list[dict], limit: int = 6) -> dict:
    """
    Wybór emotek do zapytania — **decyduje wyłącznie Jev**.

    `candidates` to sterta z frontu: `{emoji, label, sampleQuery, conceptId}`.
    Trzymamy ją w jednym miejscu (`app/src/lib/emojis.ts`), żeby emotka widoczna
    pod polem zawsze istniała fizycznie w stercie na dole ekranu.

    Zwraca `{source, picks[]}`. Gdy Jev milczy — `source="fallback"` i **pusta**
    lista: lepiej nie pokazać nic, niż pokazać emotkę wybraną regułą, o której
    mówimy jury, że jej nie ma. Front zachowuje wtedy poprzedni wybór.
    """
    pool = [
        c for c in candidates
        if isinstance(c, dict) and c.get("emoji") and c.get("label")
    ][:EMOJI_MAX_CANDIDATES]
    if not query.strip() or not pool:
        return {"source": "brak-kandydatow", "picks": []}

    questions = {
        f"emoji_{i}": {
            "type": "noul",
            "instructions": {
                "question": EMOJI_INSTRUCTIONS,
                "emotka": {
                    "znak": c["emoji"],
                    "znaczenie": c["label"],
                    "przyklad_problemu": (c.get("sampleQuery") or "")[:200],
                },
            },
            "criteria": EMOJI_CRITERIA,
        }
        for i, c in enumerate(pool)
    }

    result = transport.evaluate({"zapytanie": query[:2000]}, questions)
    if not result:
        return {"source": "fallback", "picks": []}

    threshold = settings.JEV_THRESHOLD
    scored = []
    for i, c in enumerate(pool):
        noul = transport.noul_answer(result, f"emoji_{i}")
        if noul is None or noul < threshold:
            continue
        scored.append(
            {
                "emoji": c["emoji"],
                "label": c["label"],
                "conceptId": c.get("conceptId") or "",
                "confidence": round(noul, 3),
            }
        )

    scored.sort(key=lambda p: -p["confidence"])
    return {"source": "jev", "picks": scored[: max(1, min(limit, 12))]}


# --- przeszukanie całej bazy przez Jev -------------------------------------

# Ścieżka ostatniej szansy: zwykłe wyszukiwanie (BM25, filtr po stronie
# przeglądarki, tsquery) nic nie znalazło, więc oddajemy decyzję modelowi i
# pytamy go o KAŻDĄ pozycję w bazie. Jest to drogie, dlatego wolno tu wejść
# tylko wtedy, gdy tania ścieżka zwróciła zero.
SCAN_INSTRUCTIONS = (
    "Czy `pozycja` może pomóc osobie, która opisała sprawę w `zapytanie`? "
    "Odpowiedź `true`, gdy pozycja dotyczy tego samego problemu, tej samej "
    "grupy osób albo tej samej przyczyny — nawet jeśli używa innych słów. "
    "Odpowiedź `false`, gdy to inny temat."
)

SCAN_CRITERIA = {
    "true": "Pozycja dotyczy tej samej sprawy co zapytanie, choćby innymi słowami.",
    "false": "Pozycja dotyczy czegoś innego.",
}

# Ile pozycji pytamy w jednym wywołaniu. Jedna passa Jev obsługuje wiele pytań
# naraz, ale payload rośnie liniowo — 40 to kompromis między liczbą round-tripów
# i rozmiarem żądania.
SCAN_BATCH = 40
# Zabezpieczenie przed wejściem w to na bazie, która urosła do tysięcy pozycji.
SCAN_MAX_BATCHES = 6
# Przy przeglądaniu całej bazy próg jest wyższy niż zwykły: tu nie ma rankingu
# leksykalnego, który by wynik podparł, więc luźne skojarzenia muszą wypaść.
SCAN_MIN = 0.55


def _scan_items(kind: str) -> list[dict]:
    """Pozycje do przejrzenia: `innovations`, `library` albo oba."""
    from catalog.models import Innovation, LibraryItem

    out: list[dict] = []
    if kind in ("innovations", "both"):
        for i in Innovation.objects.all().only(
            "id", "name", "problem", "target", "description"
        ):
            out.append(
                {
                    "kind": "innovation",
                    "id": i.id,
                    "payload": {
                        "nazwa": i.name,
                        "problem": (i.problem or i.description or "")[:400],
                        "dla_kogo": (i.target or "")[:160],
                    },
                }
            )
    if kind in ("library", "both"):
        for d in LibraryItem.objects.all().only("id", "title", "type", "desc"):
            out.append(
                {
                    "kind": "library",
                    "id": d.id,
                    "payload": {
                        "nazwa": d.title,
                        "rodzaj": d.type or "dokument",
                        "opis": (d.desc or "")[:400],
                    },
                }
            )
    return out


def scan_all(query: str, kind: str = "both", limit: int = 6) -> dict:
    """
    „Przejrzyj wszystko" — Jev ocenia każdą pozycję w bazie, jedna po drugiej.

    Wywoływane **tylko** gdy zwykłe wyszukiwanie zwróciło zero wyników, bo
    kosztuje tyle wywołań, ile batchy (115 kart + 74 dokumenty ≈ 5 passów).

    Zwraca `{source, kind, hits[]}`; `hits` to `{kind, id, confidence}` od
    najwyższej pewności. Gdy Jev milczy — `source="fallback"` i pusta lista,
    bo nie mamy czym go zastąpić na tym etapie (tania ścieżka już zawiodła).
    """
    q = (query or "").strip()
    items = _scan_items(kind) if q else []
    if not items:
        return {"source": "brak-kandydatow", "kind": kind, "hits": []}

    batches = [
        items[i : i + SCAN_BATCH] for i in range(0, len(items), SCAN_BATCH)
    ][:SCAN_MAX_BATCHES]

    hits: list[dict] = []
    answered = False
    for batch in batches:
        questions = {
            f"item_{n}": {
                "type": "noul",
                "instructions": {
                    "question": SCAN_INSTRUCTIONS,
                    "pozycja": it["payload"],
                },
                "criteria": SCAN_CRITERIA,
            }
            for n, it in enumerate(batch)
        }
        _t = time.monotonic()
        result = transport.evaluate({"zapytanie": q[:2000]}, questions)
        log.info(
            "Jev scan batch: %s pytan, %s ms, ok=%s",
            len(batch), int((time.monotonic() - _t) * 1000), bool(result),
        )
        if not result:
            continue
        answered = True
        for n, it in enumerate(batch):
            noul = transport.noul_answer(result, f"item_{n}")
            if noul is None or noul < SCAN_MIN:
                continue
            hits.append(
                {"kind": it["kind"], "id": it["id"], "confidence": round(noul, 3)}
            )

    if not answered:
        return {"source": "fallback", "kind": kind, "hits": []}

    hits.sort(key=lambda h: -h["confidence"])
    log.info("Jev scan: %s pozycji, %s trafien", len(items), len(hits))
    return {"source": "jev", "kind": kind, "hits": hits[: max(1, min(limit, 20))]}
