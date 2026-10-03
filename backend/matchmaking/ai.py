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
            f"Jev uznaje związek ({noul:.2f}) — „{name}” odpowiada na opisany "
            "problem, a nie tylko porusza ten sam temat."
        )
    else:
        powod = (
            f"Jev nie dopatrzył się związku ({noul:.2f}) — „{name}” nie sięga "
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
    question = {
        "type": "noul",
        "instructions": {
            "question": (
                "Czy `tresc` realnie dotyczy tego samego problemu co `kontekst`? "
                "Odpowiedź dotyczy znaczenia, a nie samych powtórzonych słów."
            ),
            "tresc": text[:4000],
            "kontekst": context[:4000] or "(brak kontekstu — oceniaj samą treść)",
        },
        "criteria": RELATED_CRITERIA,
    }

    result = transport.evaluate({"zapytanie": text[:2000]}, {"powiazane": question})
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

    Jev nie generuje tekstu, więc żadnej prozy nie złożymy — zwracamy same
    źródła (uczciwie, bez udawania odpowiedzi). Zasobnik ma 76 dokumentów
    i 115 kart, więc użytkownik dostaje to, po co przyszedł.
    """
    if not sources:
        return {
            "source": "brak",
            "answer": "Nie znaleźliśmy w materiałach ROPS nic na ten temat.",
            "sources": [],
        }
    return {
        "source": "fallback",
        "answer": (
            "Odpowiedź generowaną wyłączyliśmy na rzecz modelu decyzyjnego Jev "
            "(nie pisze on tekstu). Poniżej materiały, które pasują do Twojego "
            "pytania — każdy z linkiem do źródła."
        ),
        "sources": sources,
    }
