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
    """
    Rozwija pomysł mieszkańca i ocenia go za pomocą modelu decyzyjnego Jev.
    Klasyfikuje obszar, ocenia nowość vs Biblioteka i rekomenduje ścieżkę.
    """
    idea = (problem or "").strip() or (fiszka or {}).get("istota", "")
    top = nearest[0] if nearest else None

    # Fallback, gdy brak modelu lub brak sieci
    def _fallback() -> dict:
        sugestie = []
        if top:
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
        }

    # Wywołanie modelu decyzyjnego Jev
    state = {
        "pomysl": idea[:1500],
        "najblizsze_z_biblioteki": [
            {
                "nazwa": n["name"],
                "kategoria": n.get("cat_name", ""),
                "dopasowanie": n["score"],
                "opis": n.get("problem", "")[:200],
            }
            for n in nearest[:3]
        ] if nearest else [],
    }

    questions = {
        "obszar": {
            "type": "choice",
            "instructions": "Do jakiego głównego obszaru wsparcia społecznego należy ten pomysł?",
            "criteria": {
                "osoby starsze": "Wsparcie seniorów, opieka wytchnieniowa, demencja, aktywność osób starszych",
                "dzieci i młodzież": "Edukacja, wsparcie psychologiczne, czas wolny młodych",
                "osoby z niepełnosprawnościami": "Dostępność, bariery architektoniczne, sensoryczne, intelektualne",
                "wykluczenie cyfrowe": "Kompetencje cyfrowe, dostęp do e-usług, nowoczesne technologie",
                "usługi społeczne i rynek pracy": "Aktywizacja zawodowa, kryzys bezdomności, integracja",
            },
        },
        "czy_nowosc": {
            "type": "noul",
            "instructions": "Czy ten pomysł wnosi nową wartość lub rozwiązuje problem inaczej niż zbliżone karty z Biblioteki?",
            "criteria": {
                "true": "Pomysł wnosi nową perspektywę lub dotyka problemu nie w pełni pokrytego przez Bibliotekę.",
                "false": "W Bibliotece istnieje już rozwiązanie odpowiadające na ten problem w bardzo zbliżony sposób.",
            },
        },
        "rekomendacja": {
            "type": "choice",
            "instructions": "Jaka jest optymalna rekomendacja ścieżki wdrożenia dla autora tego pomysłu?",
            "criteria": {
                "wdroz_z_biblioteki": "Skorzystać z gotowej innowacji z Biblioteki i przetestować ją w gminie",
                "zloz_wniosek_grantowy": "Złożyć fiszkę innowacji w naborze grantowym ROPS (IWS 2.0)",
                "znajdz_partnera": "Nawiązać partnerstwo z OPS/CUS lub NGO przed przystąpieniem do testów",
            },
        },
        "potencjal": {
            "type": "score",
            "instructions": "Oceń potencjał wykonalności i wpływu społecznego tego pomysłu",
            "criteria": ["Lokalny / niszowy", "Umiarkowany", "Wysoki", "Przełomowy / regionalny"],
        },
    }

    result = transport.evaluate(state, questions)
    if not result:
        return _fallback()

    obszar_data = transport.choice_answer(result, "obszar")
    obszar_name = (obszar_data.get("choice") if obszar_data else "") or (fiszka or {}).get("obszar", "")

    nowosc_val = transport.noul_answer(result, "czy_nowosc")
    rekom_data = transport.choice_answer(result, "rekomendacja")
    rekom_choice = rekom_data.get("choice") if rekom_data else "zloz_wniosek_grantowy"
    potencjal_data = transport.score_answer(result, "potencjal")

    sugestie = []
    if rekom_choice == "wdroz_z_biblioteki" and top:
        sugestie.append(
            f"Jev rekomenduje: w Bibliotece jest już bliskie rozwiązanie „{top['name']}” ({top['score']}/100) — "
            "skorzystaj z gotowego pakietu lub zgłoś się jako gmina/NGO do testowania."
        )
    elif rekom_choice == "znajdz_partnera":
        sugestie.append(
            "Zidentyfikowano kluczową rolę partnerstwa: zgłoś zapotrzebowanie na partnera "
            "(CUS/OPS lub NGO w Twoim powiecie) przed złożeniem formalnego wniosku."
        )
    else:
        nowosc_proc = int((nowosc_val or 0.8) * 100)
        sugestie.append(
            f"Jev ocenia nowość rozwiązania na {nowosc_proc}% — warto złożyć fiszkę w naborze IWS 2.0 "
            "(mikrogrant do 100 tys. zł na przetestowanie pomysłu)."
        )

    sugestie.append(
        f"Główny obszar wg Jev: {obszar_name} — zdefiniuj grupę pilotażową i wskaźnik zmiany przed i po."
    )
    sugestie.append(
        "Dopisz etapy: pomysł → prototyp → testowanie → wdrożenie. Ułatwi to ocenę merytoryczną w ROPS."
    )

    return {
        "source": "jev",
        "istota": (fiszka or {}).get("istota") or idea[:400],
        "adresat": (fiszka or {}).get("adresat") or f"Grupa docelowa w obszarze: {obszar_name}",
        "obszar": obszar_name,
        "sugestie": sugestie[:3],
        "jev_decisions": {
            "obszar": obszar_data,
            "czy_nowosc": nowosc_val,
            "rekomendacja": rekom_data,
            "potencjal": potencjal_data,
            "latency_ms": transport.last_ms(),
        },
    }


def thread_digest(title: str, messages: list[dict]) -> dict:
    """
    Streszczenie dyskusji w wątku oparte na modelu decyzyjnym Jev.
    Diagnozuje stan wątku, pilność oraz obecność kolejnych kroków.
    """
    if not messages:
        return {"source": "brak", "summary": "Brak wiadomości do streszczenia."}

    first = messages[0]
    last = messages[-1]

    def _fallback() -> dict:
        summary = (
            f"{len(messages)} wiadomości w wątku. Zaczęło się od: "
            f"„{first.get('text', '')[:180]}”. "
        )
        if last is not first:
            summary += f"Ostatni głos ({last.get('author_name', '')}): „{last.get('text', '')[:180]}”."
        else:
            summary += "To na razie jedno zgłoszenie bez odpowiedzi."
        return {"source": "fallback", "summary": summary}

    state = {
        "tytul_watku": title[:200],
        "liczba_wiadomosci": len(messages),
        "wiadomosci": [
            {
                "autor": m.get("author_name", "Anonim"),
                "rola": m.get("role", "uczestnik"),
                "tekst": m.get("text", "")[:300],
            }
            for m in messages[:15]
        ],
    }

    questions = {
        "status_dyskusji": {
            "type": "choice",
            "instructions": "Jaki jest aktualny stan i potrzeba w tym wątku?",
            "criteria": {
                "czeka_na_odpowiedz": "Mieszkaniec zadał pytanie lub zgłosił problem i czeka na reakcję ROPS/moderatora",
                "wymaga_decyzji": "Padły propozycje rozwiązań, wymagana jest formalna decyzja lub zmiana etapu",
                "w_toku_ustalen": "Trwa aktywna dyskusja i uzgadnianie szczegółów między uczestnikami",
                "wyjasniony": "Kwestia została wyjaśniona lub problem rozwiązany",
            },
        },
        "pilnosc": {
            "type": "score",
            "instructions": "Oceń pilność interwencji w tym wątku",
            "criteria": ["Niska", "Standardowa", "Wysoka", "Pilna / interwencyjna"],
        },
        "czy_ustalono_kroki": {
            "type": "noul",
            "instructions": "Czy w dyskusji padły już konkretne ustalenia, zadania lub terminy?",
            "criteria": {
                "true": "Padły konkretne ustalenia dotyczące kolejnych działań.",
                "false": "Brak jeszcze konkretnych ustaleń — dyskusja na etapie wstępnym.",
            },
        },
    }

    result = transport.evaluate(state, questions)
    if not result:
        return _fallback()

    status_data = transport.choice_answer(result, "status_dyskusji")
    status_choice = status_data.get("choice") if status_data else "w_toku_ustalen"

    pilnosc_data = transport.score_answer(result, "pilnosc")
    pilnosc_score = pilnosc_data.get("score", 1.0) if pilnosc_data else 1.0

    kroki_val = transport.noul_answer(result, "czy_ustalono_kroki") or 0.0

    status_labels = {
        "czeka_na_odpowiedz": "Wątek oczekuje na odpowiedź pracownika ROPS / eksperta.",
        "wymaga_decyzji": "Wątek oczekuje na decyzję formalną lub zmianę etapu.",
        "w_toku_ustalen": "Trwa aktywna dyskusja i doprecyzowywanie zgłoszenia.",
        "wyjasniony": "Sprawa została wyjaśniona.",
    }
    status_text = status_labels.get(status_choice, "Wątek w toku dyskusji.")

    pilnosc_levels = ["niska", "standardowa", "wysoka", "pilna"]
    pilnosc_text = pilnosc_levels[min(3, max(0, int(round(pilnosc_score))))]

    kroki_text = (
        "Ustalono konkretne kroki dalszego postępowania."
        if kroki_val >= 0.5
        else "Brak jeszcze ustalonych konkretnych terminów."
    )

    summary = (
        f"Diagnoza Jev: {status_text} "
        f"Pilność: {pilnosc_text} (score {pilnosc_score:.1f}/3). "
        f"{kroki_text} "
        f"Liczba wpisów: {len(messages)}. Ostatni głos ({last.get('author_name', 'uczestnik')}): „{last.get('text', '')[:120]}”."
    )

    return {
        "source": "jev",
        "summary": summary,
        "jev_decisions": {
            "status": status_data,
            "pilnosc": pilnosc_data,
            "czy_ustalono_kroki": kroki_val,
            "latency_ms": transport.last_ms(),
        },
    }
