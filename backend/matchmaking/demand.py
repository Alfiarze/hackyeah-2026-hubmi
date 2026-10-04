"""
Popyt: ile razy, przez ile osób i kiedy pytano o to samo.

Log `SearchQuery` odpowiada na pytanie „czego ktoś szukał”, ale nie na pytanie
„ile razy szukano **tego samego**”. Dwie mieszkanki piszą „boimy się, że mama
wyjdzie z domu” i „dziadek z alzheimerem gubi się na wsi” - to jedna potrzeba
rynkowa i dwa osobne wiersze w logu. Dlatego każde zapytanie dostaje tu klucz
tematu i trafia do licznika `DemandTopic`.

Jak powstaje temat - deterministycznie i wytłumaczalnie, tak samo jak ranking:

  1. rozpoznane wątki (`w:`) - najmocniejszy sygnał, bo to kontrolowany
     słownik Biblioteki; identyczny zestaw wątków = ten sam temat;
  2. słowa spoza bazy (`n:`) - gdy silnik nie rozpoznał żadnego wątku, tematem
     staje się to, czego nie zrozumiał (dokładnie ta luka interesuje ROPS);
  3. rdzenie z samego opisu (`t:`) - ostatnia deska ratunku.

W przypadkach 2 i 3 porównujemy **rdzenie** (`text_pl.stem`), nie słowa, i
dokładamy scalanie wariantów: zapytanie dzielące co najmniej dwa rdzenie
z istniejącym tematem dopisuje się do niego, zamiast zakładać nowy. Bez tego
„hodowla pstrąga w stawie”, „hodowla pstraga w stawie” i „potrzebuję pomysłu
na hodowlę pstrąga” byłyby trzema potrzebami po jednym zapytaniu zamiast
jedną potrzebą zgłoszoną trzy razy - czyli dokładnym przeciwieństwem tego,
co ma pokazywać ten moduł.

Żadnego modelu językowego ani klastrowania na żywo: te same zapytania zawsze
dają ten sam podział, a „dlaczego te zdania to jeden temat” widać w panelu
po wspólnych rdzeniach.
"""
from __future__ import annotations

import hashlib

from django.db import transaction
from django.db.models import Q

from catalog.text_pl import stem, stems

#: ile oryginalnych sformułowań trzymamy przy temacie (do pokazania w panelu)
MAX_SAMPLES = 6
#: ile wątków wchodzi do klucza tematu
MAX_CONCEPTS = 3
#: ile rdzeni wchodzi do klucza i do porównań
MAX_TERMS = 5
#: tyle wspólnych rdzeni wystarczy, by uznać zapytanie za wariant tego samego tematu
MERGE_OVERLAP = 2
#: limit skrótów pytających; chroni wiersz przed puchnięciem przy dużym ruchu
MAX_CLIENTS = 5000


def _dedupe(values) -> list[str]:
    out: list[str] = []
    for v in values or []:
        v = (v or "").strip()
        if v and v not in out:
            out.append(v)
    return out


def _stems_of(words) -> list[str]:
    """Rdzenie bez powtórzeń, w kolejności wystąpienia - do klucza i porównań."""
    out: list[str] = []
    for w in words or []:
        s = stem((w or "").strip())
        if s and s not in out:
            out.append(s)
    return out


def topic_of(concepts, unknown, text: str) -> dict | None:
    """Zwraca `{key, label, kind, concepts, terms}` albo None dla pustki."""
    ids, named = [], {}
    for c in concepts or []:
        cid = (c.get("id") or c.get("label") or "").strip()
        if cid and cid not in ids:
            ids.append(cid)
            named[cid] = (c.get("label") or cid).strip()
    if ids:
        # Etykieta po posortowanych wątkach, nie w kolejności z zapytania -
        # inaczej dwa różne tematy wyglądają w tabeli identycznie, tylko
        # z przestawionymi słowami. Nadmiar sygnalizujemy „+N”.
        shown = [named[i] for i in sorted(ids)[:MAX_CONCEPTS]]
        label = ", ".join(shown)
        if len(ids) > MAX_CONCEPTS:
            label += f" +{len(ids) - MAX_CONCEPTS}"
        # Pełny zestaw wątków w kluczu, bez scalania wariantów (`terms` puste).
        # Wątki to słownik kontrolowany, więc inny zestaw = inna potrzeba, a
        # sklejanie „po dwóch wspólnych” robiło z „osoby starsze” magnes, który
        # wciągał pół logu do jednego wiersza. Agregat po pojedynczym wątku
        # i tak jest obok, na wykresie podaży i popytu.
        return {
            "key": "w:" + "+".join(sorted(ids)),
            "label": label,
            "kind": "wątki",
            "concepts": ids,
            "terms": [],
        }

    words = _dedupe(unknown)
    rdzenie = _stems_of(words)[:MAX_TERMS]
    if rdzenie:
        return {
            "key": "n:" + "+".join(sorted(rdzenie)),
            # etykieta ze słów, nie z rdzeni - „pstrąg, hodowla” czyta się,
            # „pstrag, hodowl” wygląda jak literówka
            "label": ", ".join(words[:MAX_CONCEPTS]),
            "kind": "nowe pojęcia",
            "concepts": [],
            "terms": rdzenie,
        }

    rdzenie = _stems_of(stems(text or ""))[:MAX_TERMS]
    if rdzenie:
        label = (text or "").strip()
        return {
            "key": "t:" + "+".join(sorted(rdzenie)),
            "label": (label[:77] + "…") if len(label) > 78 else label,
            "kind": "opis",
            "concepts": [],
            "terms": rdzenie,
        }
    return None


def _find_variant(info: dict):
    """
    Szuka tematu, który jest wariantem tego samego pytania.

    Warunek: ten sam rodzaj i co najmniej `MERGE_OVERLAP` wspólnych rdzeni.
    Przy remisie wygrywa temat częściej wyszukiwany - nowy wariant dokleja się
    do głównego nurtu potrzeby, a nie do przypadkowej odnogi.
    """
    from .models import DemandTopic

    terms = set(info["terms"])
    if len(terms) < MERGE_OVERLAP:
        return None

    cond = Q()
    for t in terms:
        cond |= Q(terms__contains=[t])
    candidates = DemandTopic.objects.filter(cond, kind=info["kind"]).order_by("-searches")[:50]

    best, best_overlap = None, 0
    for topic in candidates:
        overlap = len(terms & set(topic.terms or []))
        if overlap > best_overlap:
            best, best_overlap = topic, overlap
    return best if best_overlap >= MERGE_OVERLAP else None


def _hash_client(client_id: str) -> str:
    """Skrót, nie identyfikator: do liczenia „ilu różnych ludzi”, nie „kto”."""
    return hashlib.sha1(client_id.encode("utf-8")).hexdigest()[:12]


@transaction.atomic
def record(query, client_id: str = ""):
    """
    Dolicza zapytanie do tematu i wiąże je z nim (`SearchQuery.topic`).

    Wiązanie jest tu kluczowe: oś czasu („kiedy i jak często”) liczymy potem
    z dat zapytań, a nie z osobnej tabeli zdarzeń - jedno źródło prawdy.
    """
    from .models import DemandTopic

    info = topic_of(query.concepts, query.unknown, query.text)
    if info is None:
        return None

    when = query.created_at

    # 1. Który wiersz obsługuje ten klucz: dokładny, wchłonięty jako alias,
    #    wariant dzielący rdzenie - a jeśli żaden, zakładamy nowy temat.
    found = (
        DemandTopic.objects.filter(key=info["key"]).first()
        or DemandTopic.objects.filter(aliases__contains=[info["key"]]).first()
    )
    merged_into = None
    if found is None:
        merged_into = _find_variant(info)
        found = merged_into
        # Uwaga: wariant dopisuje do tematu tylko swój klucz, a nie swoje
        # rdzenie. Poszerzanie `terms` przy każdym scaleniu robiło z tematu
        # magnes - po kilku wariantach pasowało do niego wszystko.

    created = False
    if found is None:
        # get_or_create, nie save() - przy dwóch identycznych zapytaniach naraz
        # unikat na `key` rozstrzyga wyścig w bazie, a nie w Pythonie.
        topic, created = DemandTopic.objects.get_or_create(
            key=info["key"],
            defaults={
                "label": info["label"],
                "kind": info["kind"],
                "concepts": info["concepts"],
                "terms": info["terms"],
                "first_seen": when,
                "last_seen": when,
            },
        )

    # 2. Blokada wiersza na czas podbijania liczników - dwa równoległe
    #    zapytania o ten sam temat nie mogą nadpisać sobie `searches`.
    topic = DemandTopic.objects.select_for_update().get(
        pk=(found.pk if found is not None else topic.pk)
    )

    if merged_into is not None:
        topic.aliases = _dedupe(list(topic.aliases or []) + [info["key"]])

    topic.searches += 1
    if query.is_gap:
        topic.unmet_searches += 1
    if query.top_score is not None:
        topic.best_score = max(topic.best_score or 0, query.top_score)

    if not created:
        # Backfill chodzi po logu od najstarszego, ale pojedyncze zapytanie
        # może dojść z dowolną datą - stąd min/max zamiast nadpisania.
        if when < topic.first_seen:
            topic.first_seen = when
        if when > topic.last_seen:
            topic.last_seen = when

    if query.powiat:
        counts = dict(topic.powiats or {})
        counts[query.powiat] = counts.get(query.powiat, 0) + 1
        topic.powiats = counts

    text = (query.text or "").strip()
    if text and text not in (topic.samples or []):
        topic.samples = ([text] + list(topic.samples or []))[:MAX_SAMPLES]

    if client_id:
        h = _hash_client(client_id)
        seen = list(topic.clients or [])
        if h not in seen and len(seen) < MAX_CLIENTS:
            topic.clients = seen + [h]

    topic.save()

    if query.topic_id != topic.id:
        query.topic = topic
        query.save(update_fields=["topic"])
    return topic
