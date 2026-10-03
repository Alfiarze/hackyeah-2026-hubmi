"""
Transport do Jev — jedyne miejsce w backendzie, które wie, jak rozmawiać z AI.

Jev (TypeSafe AI) to model **decyzyjny**, a nie generator tekstu. Dostaje
`state` (treść do oceny) plus mapę pytań typowanych — `noul` (tak/nie),
`choice` (wybór z listy), `score` (ocena po rubryce) — i w jednej równoległej
passie zwraca odpowiedzi z prawdopodobieństwem oraz pewnością, w 70–500 ms.

Wywołujemy wyłącznie Decisions API OpenRouter (Jev nie jest modelem chatowym,
więc `/v1/chat/completions` tu nie działa):
    POST https://openrouter.ai/api/alpha/decisions   (klucz: JEV_API_KEY)

W tym repo **nie ma** OpenAI, Anthropic ani Ollamy — zostały usunięte na prośbę
projektu. Jedyny dostawca to Jev.

Zasada projektowa: żaden endpoint nie wolno się wywalić, bo model odpowiada za
wolno albo w ogóle. Dlatego:
  * `evaluate()` zwraca `None` zamiast rzucać wyjątek (brak klucza, brak sieci,
    429/529 po trzech próbach),
  * `generate_text()` zwraca `None`, bo Jev nie pisze prozy — wywołujący schodzi
    na swój fallback słownikowy/szablonowy.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import requests
from django.conf import settings

log = logging.getLogger("hubmi.ai")

# Ostatnie wywołanie — podgląd w /api/health/ bez sięgania do bazy.
_last: dict[str, Any] = {"ok": None, "ms": None, "error": None, "at": None}

# Statusy, których dokumentacja TypeSafe każe nie traktować jako błędu.
_RETRY_STATUS = {429, 529}
_MAX_ATTEMPTS = 3

# Ile razy max wolno nam marudzić w logu, że Jev nie generuje tekstu.
_text_warned = False


# --- czysty transport -------------------------------------------------------

def evaluate(
    state: Any,
    questions: dict[str, Any],
    *,
    model: str | None = None,
    timeout: float | None = None,
) -> dict[str, Any] | None:
    """
    Jedno wywołanie Jev: `state` + pytania → `{"model", "answers", "usage"}`.

    Zwraca `None` przy każdym problemie (brak klucza, sieć, limit, walidacja).
    Nigdy nie rzuca wyjątku — widoki mają plan B.
    """
    if not settings.JEV_API_KEY:
        _last.update(ok=False, error="brak JEV_API_KEY", at=time.time())
        log.info("Jev: brak klucza API — wywołanie pominięte, działa fallback")
        return None

    payload = {
        "model": model or settings.JEV_MODEL,
        "state": state,
        "questions": questions,
    }
    headers = {
        "Authorization": f"Bearer {settings.JEV_API_KEY}",
        "Content-Type": "application/json",
        # OpenRouter lubi wiedzieć, skąd ruch (opcjonalne, ale nie boli)
        "X-Title": "HubMI",
    }
    started = time.monotonic()
    last_error = "brak odpowiedzi"

    for attempt in range(_MAX_ATTEMPTS):
        try:
            r = requests.post(
                settings.JEV_URL,
                headers=headers,
                json=payload,
                timeout=timeout or settings.JEV_TIMEOUT,
            )
        except requests.RequestException as exc:  # noqa: BLE001 — DNS, timeout, reset
            last_error = str(exc)[:200]
            log.info("Jev nieosiągalny: %s", last_error)
            break  # sieci nie naprawimy kolejnym immediate retry

        if r.status_code in _RETRY_STATUS and attempt < _MAX_ATTEMPTS - 1:
            wait = 0.5 * (2**attempt)
            log.warning("Jev zwrócił %s — ponawiam za %.1fs", r.status_code, wait)
            time.sleep(wait)
            continue

        if not r.ok:
            last_error = f"HTTP {r.status_code}: {r.text[:200]}"
            log.warning("Jev odrzucił zapytanie: %s", last_error)
            break

        try:
            data = r.json()
        except ValueError:
            last_error = "odpowiedź nie jest JSON-em"
            log.warning("Jev: %s", last_error)
            break

        _last.update(
            ok=True,
            ms=int((time.monotonic() - started) * 1000),
            error=None,
            at=time.time(),
        )
        return data

    _last.update(ok=False, error=last_error, at=time.time())
    return None


def noul_answer(result: dict[str, Any] | None, key: str) -> float | None:
    """Wyciąga odpowiedź `noul` (0..1) po kluczu pytania z wyniku `evaluate()`."""
    if not result:
        return None
    answer = (result.get("answers") or {}).get(key) or {}
    try:
        return float(answer.get("noul"))
    except (TypeError, ValueError):
        return None


def last_ms() -> int | None:
    """Czas ostatniego wywołania Jev w ms (None, gdy jeszcze nie było)."""
    return _last.get("ms")


def generate_text(
    prompt: str,
    *,
    system: str = "",
    json_mode: bool = False,
    max_tokens: int = 700,
) -> str | None:
    """
    Generowanie swobodnego tekstu — **niewspierane przez Jev**.

    Jev zwraca wyłącznie odpowiedzi typowane (noul/choice/score), nigdy prozę,
    więc ta funkcja celowo zwraca `None`. Wywołujący (pytania do Zasobnika,
    asystent kreatora, streszczenie wątku, Middleman) ma własny fallback
    i schodzi na niego bez błędu.

    Tu jest miejsce na innego generatora, gdyby projekt znów chciał zdania
    po polsku — bez dotykania reszty kodu.
    """
    global _text_warned
    if not _text_warned:
        log.info("Jev nie generuje tekstu — moduły proszące o zdanie idą na fallback")
        _text_warned = True
    return None


def extract_json(text: str | None) -> Any | None:
    """Wyciąga pierwszy poprawny JSON z odpowiedzi (zostaje dla fallbacków)."""
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"[\[{].*[\]}]", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def available() -> dict:
    """Status AI dla /api/health/ — konfiguracja Jev + ostatnie wywołanie."""
    return {
        "provider": settings.AI_PROVIDER,
        "model": settings.JEV_MODEL,
        "endpoint": settings.JEV_URL,
        "key": bool(settings.JEV_API_KEY),
        "text_generation": False,
        "last_call": dict(_last),
    }
