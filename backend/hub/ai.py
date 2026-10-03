"""
Asystent kreatora (moduł III) i streszczenie dyskusji (moduł IV).

Oba korzystają z tego samego transportu AI co matchmaking (`hubmi/ai.py`).
Jedyny dostawca to Jev — model decyzyjny, który NIE generuje tekstu, więc
`generate_text()` zwraca tu `None` i oba widoki schodzą na swój szablon:
  * kreator  → podpowiedź zbudowana z wyniku matchmakingu (co jest w Bibliotece),
  * digest   → rzetelne podstawienie liczb i pierwszego/ostatniego głosu.

Prompty zostają na miejscu — gdyby projekt dołożył generatora tekstu,
wystarczy, że `hubmi/ai.py` zacznie zwracać odpowiedź, a te funkcje od razu
zaczną składać zdania zamiast szablonu.
"""
from __future__ import annotations

import logging

from hubmi import ai as transport

log = logging.getLogger("hubmi.kreator.ai")

SYSTEM = (
    "Jesteś Asystentem Kreatora Innowacji w HubMI (ROPS Kraków). Pomagasz "
    "mieszkańcom i NGO rozwinąć pomysł na innowację społeczną: doprecyzowujesz "
    "adresata, sugerujesz nietuzinkowe rozwiązania i mówisz, co już istnieje "
    "w Bibliotece Innowacji. Odpowiadasz po polsku, konkretnie, maks. 6 zdaniami "
    "na punkt. Nie obiecujesz finansowania i nie zmyślasz danych."
)

DEVELOP_PROMPT = (
    "POMYSŁ MIESZKAŃCA:\n{idea}\n\n"
    "CO JEST JUŻ W BIBLIOTECE INNOWACJI (dopasowanie {top_score}/100):\n{nearest}\n\n"
    "Zwróć JSON:\n"
    '{{"istota": "1 zdanie — na czym to polega", '
    '"adresat": "1 zdanie — konkretna grupa odbiorców", '
    '"obszar": "jeden z: zdrowie i medycyna, osoby starsze, dzieci i młodzież, '
    "wykluczenie cyfrowe, usługi społeczne, aktywność i kultura\", "
    '"sugestie": ["3 nietuzinkowe rozwinięcia, każde w jednym zdaniu"]}}'
)

DIGEST_PROMPT = (
    "WĄTEK W HUBIE:\nTytuł: {title}\nWiadomości ({count}):\n{messages}\n\n"
    "Napisz streszczenie dyskusji po polsku: 2–3 zdania, co ustalono, co jest "
    "do zrobienia i kto powinien odpowiedzieć. Bez wstępów typu „Podsumowanie”."
)


def develop_idea(problem: str, fiszka: dict, nearest: list[dict], top_score: int | None) -> dict:
    """Rozwija pomysł mieszkańca i mówi, co już jest w Bibliotece."""
    nearest_block = (
        "\n".join(
            f"- {n['name']} ({n.get('cat_name', '')}) — dopasowanie {n['score']}/100: "
            f"{n.get('problem', '')[:180]}"
            for n in nearest[:3]
        )
        or "nic — to nowy temat"
    )
    idea = (problem or "").strip() or (fiszka or {}).get("istota", "")
    raw = transport.generate_text(
        DEVELOP_PROMPT.format(idea=idea[:1500], nearest=nearest_block, top_score=top_score or 0),
        system=SYSTEM,
        json_mode=True,
        max_tokens=700,
    )
    data = transport.extract_json(raw) if raw else None

    if isinstance(data, dict) and data.get("istota"):
        return {
            "source": "llm",
            "istota": str(data.get("istota", ""))[:600],
            "adresat": str(data.get("adresat", ""))[:400],
            "obszar": str(data.get("obszar", ""))[:120],
            "sugestie": [str(s) for s in (data.get("sugestie") or [])][:3],
        }

    # fallback: szablon oparty na tym, co realnie wiemy (Biblioteka + 4 kroki fiszki)
    sugestie = []
    if nearest:
        top = nearest[0]
        sugestie.append(
            f"W Bibliotece jest już „{top['name']}” (dopasowanie {top['score']}/100) — "
            "zdefiniuj, co robisz inaczej, albo zgłoś się jako tester tego rozwiązania."
        )
        sugestie.append(
            "Wybierz jedną grupę odbiorców do pilotażu — komisja ocenia wykonalność, "
            "a nie zasięg deklaracji."
        )
    else:
        sugestie.append(
            "Biblioteka nie ma takiego rozwiązania — opisz problem tak, żeby dało się "
            "go zmierzyć (jedna liczba przed i po)."
        )
        sugestie.append(
            "Wskaż partnera lokalnego (CUS/OPS, biblioteka, szkoła, NGO) — bez niego "
            "test jest trudny do przeprowadzenia."
        )
    sugestie.append(
        "Dopisz etap: pomysł → prototyp → testowanie → gotowe do skalowania. "
        "To pierwsze pytanie, które padnie na spotkaniu z mentorem."
    )

    return {
        "source": "fallback",
        "istota": (fiszka or {}).get("istota") or idea[:400],
        "adresat": (fiszka or {}).get("adresat", ""),
        "obszar": (fiszka or {}).get("obszar", ""),
        "sugestie": sugestie[:3],
        "note": (
            "Odpowiedź z szablonu: Jev jest modelem decyzyjnym i nie składa zdań, "
            "więc dostajesz podpowiedź opartą na wyniku matchmakingu."
        ),
    }


def thread_digest(title: str, messages: list[dict]) -> dict:
    """Streszczenie dyskusji w wątku (albo uczciwy fallback z samych wiadomości)."""
    if not messages:
        return {"source": "brak", "summary": "Brak wiadomości do streszczenia."}

    block = "\n".join(
        f"- {m.get('author_name', '')} ({m.get('role', '')}): {m.get('text', '')[:500]}"
        for m in messages[:20]
    )
    raw = transport.generate_text(
        DIGEST_PROMPT.format(title=title, count=len(messages), messages=block),
        max_tokens=400,
    )
    if raw and raw.strip():
        return {"source": "llm", "summary": raw.strip()}

    first = messages[0]
    last = messages[-1]
    summary = (
        f"{len(messages)} wiadomości w wątku. Zaczęło się od: "
        f"„{first.get('text', '')[:180]}”. "
    )
    if last is not first:
        summary += f"Ostatni głos ({last.get('author_name', '')}): „{last.get('text', '')[:180]}”. "
    else:
        summary += "To na razie jedno zgłoszenie bez odpowiedzi."
    return {"source": "fallback", "summary": summary}
