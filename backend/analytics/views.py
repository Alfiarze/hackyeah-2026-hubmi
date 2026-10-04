"""
Moduł VI — Panel administratora: agregaty dla pracownika ROPS.

Bez własnych modeli — wszystko liczone z danych, które i tak już mamy:
  * zapytania do matchmakingu → sygnały potrzeb i trendy
  * tematy zapytań            → popyt: ile razy i kiedy pytano o to samo
  * wątki i głosy            → mapa zgłoszeń, kolejka, cykl życia pomysłów
  * luki                     → potrzeby bez rozwiązania

Widoczne TYLKO dla administratora (§2.II: „trendy widoczne tylko dla
administratora") — stąd IsHubmiAdmin na każdym widoku.
"""
from collections import Counter
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsHubmiAdmin
from hub.models import Thread, Vote
from hub.serializers import ThreadSerializer
from matchmaking.engine import GAP_SCORE_THRESHOLD
from matchmaking.models import DemandTopic, Gap, SearchQuery


@api_view(["GET"])
@permission_classes([IsHubmiAdmin])
def trends(request):
    """
    GET /api/admin/trends/

    Wykres potrzeb (seria dzienna), top wątki tematyczne z zapytań,
    luki bez rozwiązań, geografia zgłoszeń, cykl życia pomysłów.
    """
    days = min(int(request.query_params.get("days", 14)), 90)
    since = timezone.now() - timedelta(days=days)

    queries = SearchQuery.objects.filter(created_at__gte=since)
    series = []
    per_day = Counter(q.created_at.date().isoformat() for q in queries)
    for i in range(days):
        day = (since + timedelta(days=i)).date()
        series.append({"date": day.isoformat(), "count": per_day.get(day.isoformat(), 0)})

    concept_counter: Counter = Counter()
    for concepts in queries.values_list("concepts", flat=True):
        for c in concepts or []:
            concept_counter[c.get("label", c.get("id", ""))] += 1

    threads = Thread.objects.all()
    stages = dict(
        threads.filter(kind=Thread.Kind.POMYSŁ)
        .values_list("stage")
        .annotate(c=Count("id"))
        .order_by()
    )
    by_powiat = dict(
        threads.exclude(powiat="")
        .values_list("powiat")
        .annotate(c=Count("id"))
        .order_by()
    )

    return Response(
        {
            "period_days": days,
            "queries": {
                "total": queries.count(),
                "gaps": queries.filter(is_gap=True).count(),
                "series": series,
                "top_concepts": [
                    {"label": label, "count": count}
                    for label, count in concept_counter.most_common(10)
                ],
                "unknown_terms": _unknown_terms(queries),
                "avg_top_score": _avg(queries.values_list("top_score", flat=True)),
            },
            "threads": {
                "total": threads.count(),
                "unread": threads.filter(read=False, status=Thread.Status.NOWE).count(),
                "by_kind": dict(threads.values_list("kind").annotate(c=Count("id")).order_by()),
                "by_status": dict(threads.values_list("status").annotate(c=Count("id")).order_by()),
                "ideas_by_stage": stages,
                "by_powiat": by_powiat,
                "votes_total": Vote.objects.count(),
            },
            "gaps_open": Gap.objects.filter(status=Gap.Status.NOWE).count(),
            "cards": _card_stats(),
        }
    )


def _unknown_terms(queries) -> list[dict]:
    counter: Counter = Counter()
    for terms in queries.values_list("unknown", flat=True):
        for t in terms or []:
            counter[t] += 1
    return [{"term": t, "count": c} for t, c in counter.most_common(15)]


def _avg(values) -> float | None:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _card_stats() -> dict:
    from catalog.models import Innovation

    total = Innovation.objects.count()
    return {
        "total": total,
        "with_evidence": Innovation.objects.exclude(evidence="").count(),
        "with_embedding": Innovation.objects.exclude(embedding=None).count(),
        "rated": Innovation.objects.annotate(c=Count("ratings")).filter(c__gt=0).count(),
    }


@api_view(["GET"])
@permission_classes([IsHubmiAdmin])
def demand(request):
    """
    GET /api/admin/demand/?days=180&limit=20&scope=unmet|all

    Popyt policzony tematami, nie zdaniami: ile razy pytano o to samo, ilu
    różnych ludzi pytało, kiedy padło pierwsze i ostatnie pytanie, jak to
    wygląda miesiąc po miesiącu i czy rośnie.

    To jest widok dla kogoś, kto wycenia rynek: „trzydzieści dwa zapytania
    o opiekę wytchnieniową w pół roku, dwadzieścia dziewięć bez żadnego
    pokrycia w Bibliotece, ostatnie wczoraj” to zdanie, którego nie da się
    powiedzieć z samego logu zapytań.
    """
    days = min(max(int(request.query_params.get("days", 180) or 180), 7), 730)
    limit = min(max(int(request.query_params.get("limit", 20) or 20), 1), 100)
    scope = (request.query_params.get("scope") or "unmet").lower()

    now = timezone.now()
    since = now - timedelta(days=days)

    # Lista może być zawężona do tematów bez pokrycia, ale podsumowanie liczymy
    # zawsze z całości okresu - inaczej „bez pokrycia” wychodziłoby zawsze 100%
    # wszystkich zapytań, co jest nieprawdą i widać to na pierwszy rzut oka.
    topics = list(DemandTopic.objects.filter(last_seen__gte=since))
    listed = topics if scope == "all" else [t for t in topics if t.unmet_searches]

    # Oś czasu jednym zapytaniem, nie po jednym na temat: przy kilkuset
    # tematach N+1 kosztowałby więcej niż całe liczenie w Pythonie.
    hits = SearchQuery.objects.filter(
        topic__in=topics, created_at__gte=since
    ).values_list("topic_id", "created_at", "is_gap")

    monthly: dict[int, Counter] = {}
    monthly_unmet: dict[int, Counter] = {}
    window: dict[int, list[int]] = {}        # [zapytania, bez pokrycia]
    recent: dict[int, list[int]] = {}        # [ostatnie 30 dni, poprzednie 30]
    all_months: Counter = Counter()
    all_months_unmet: Counter = Counter()

    cut_recent = now - timedelta(days=30)
    cut_previous = now - timedelta(days=60)

    for topic_id, created_at, is_gap in hits:
        month = created_at.strftime("%Y-%m")
        monthly.setdefault(topic_id, Counter())[month] += 1
        monthly_unmet.setdefault(topic_id, Counter())
        w = window.setdefault(topic_id, [0, 0])
        w[0] += 1
        all_months[month] += 1
        if is_gap:
            monthly_unmet[topic_id][month] += 1
            w[1] += 1
            all_months_unmet[month] += 1
        r = recent.setdefault(topic_id, [0, 0])
        if created_at >= cut_recent:
            r[0] += 1
        elif created_at >= cut_previous:
            r[1] += 1

    def _status(topic: DemandTopic) -> str:
        if topic.best_score is None:
            return "brak pokrycia"
        if topic.best_score < GAP_SCORE_THRESHOLD:
            return "brak pokrycia"
        if topic.best_score < 60:
            return "słabe pokrycie"
        return "pokryte"

    def _trend(pair: list[int]) -> dict:
        now30, prev30 = pair[0], pair[1]
        if prev30 == 0:
            direction = "nowe" if now30 else "cisza"
            change = None
        else:
            change = round(100 * (now30 - prev30) / prev30)
            direction = "rośnie" if change > 15 else "maleje" if change < -15 else "stabilne"
        return {"recent_30d": now30, "previous_30d": prev30, "change_pct": change, "direction": direction}

    rows = []
    for t in listed:
        w = window.get(t.id, [0, 0])
        months = monthly.get(t.id, Counter())
        unmet_months = monthly_unmet.get(t.id, Counter())
        rows.append(
            {
                "id": t.id,
                "label": t.label,
                "kind": t.kind,
                "concepts": t.concepts,
                "terms": t.terms,
                "searches": t.searches,
                "unmet_searches": t.unmet_searches,
                "unmet_share": round(100 * t.unmet_searches / t.searches) if t.searches else 0,
                "askers": t.askers,
                "best_score": t.best_score,
                "status": _status(t),
                "first_seen": t.first_seen,
                "last_seen": t.last_seen,
                "days_since_last": (now - t.last_seen).days,
                "window": {"searches": w[0], "unmet": w[1]},
                "monthly": [
                    {"month": m, "count": c, "unmet": unmet_months.get(m, 0)}
                    for m, c in sorted(months.items())
                ],
                "trend": _trend(recent.get(t.id, [0, 0])),
                "powiats": [
                    {"powiat": p, "count": c}
                    for p, c in sorted((t.powiats or {}).items(), key=lambda x: -x[1])[:5]
                ],
                "samples": (t.samples or [])[:3],
            }
        )

    rows.sort(key=lambda r: (r["unmet_searches"], r["searches"], r["askers"]), reverse=True)

    askers = set()
    for t in topics:
        askers.update(t.clients or [])

    totals = {
        "topics": len(topics),
        "listed": len(rows[:limit]),
        "unmet_topics": sum(1 for t in topics if t.unmet_searches),
        "repeated_topics": sum(1 for t in topics if t.searches > 1),
        "searches": sum(t.searches for t in topics),
        "unmet_searches": sum(t.unmet_searches for t in topics),
        "askers": len(askers),
        "window_searches": sum(w[0] for w in window.values()),
        "window_unmet": sum(w[1] for w in window.values()),
    }
    totals["unmet_share"] = (
        round(100 * totals["unmet_searches"] / totals["searches"]) if totals["searches"] else 0
    )
    # Ile razy jedno zapytanie wraca - miara „to nie przypadek, to potrzeba”.
    totals["repeat_rate"] = (
        round(totals["searches"] / totals["topics"], 1) if totals["topics"] else 0
    )

    return Response(
        {
            "period_days": days,
            "scope": scope,
            "generated_at": now,
            "totals": totals,
            "series_monthly": [
                {"month": m, "count": c, "unmet": all_months_unmet.get(m, 0)}
                for m, c in sorted(all_months.items())
            ],
            "topics": rows[:limit],
        }
    )


@api_view(["GET"])
@permission_classes([IsHubmiAdmin])
def summary(request):
    """
    GET /api/admin/summary/ — podsumowanie tygodnia dla ROPS.

    Liczone ze zgłoszeń i zapytań, nie „na oko”: liczba nowych zgłoszeń,
    ile odpowiedziano, najczęstszy wątek, ile luk czeka na ruch.
    """
    since = timezone.now() - timedelta(days=7)
    new_threads = Thread.objects.filter(created_at__gte=since)
    answered = new_threads.filter(status=Thread.Status.ODPOWIEDZIANE).count()
    new_queries = SearchQuery.objects.filter(created_at__gte=since)
    concept_counter: Counter = Counter()
    for concepts in new_queries.values_list("concepts", flat=True):
        for c in concepts or []:
            concept_counter[c.get("label", c.get("id", ""))] += 1
    top = concept_counter.most_common(3)
    open_gaps = Gap.objects.filter(status=Gap.Status.NOWE).count()

    lines = [
        f"W ostatnim tygodniu: {new_queries.count()} zapytań do matchmakingu "
        f"i {new_threads.count()} nowych zgłoszeń.",
        f"Odpowiedzieliśmy na {answered} z nich.",
        "Najczęstsze wątki: "
        + (", ".join(f"{label} ({count}×)" for label, count in top) if top else "brak")
        + ".",
        f"Luki bez rozwiązania: {open_gaps}."
        + (" To są tematy, których Biblioteka nie pokrywa — materiał na nabór." if open_gaps else ""),
    ]

    return Response(
        {
            "period": "7 dni",
            "new_queries": new_queries.count(),
            "new_threads": new_threads.count(),
            "answered": answered,
            "open_gaps": open_gaps,
            "top_concepts": [{"label": l, "count": c} for l, c in top],
            "text": " ".join(lines),
        }
    )


@api_view(["GET"])
@permission_classes([IsHubmiAdmin])
def inbox_stats(request):
    """GET /api/admin/inbox/ — kolejka: co czeka na ruch, kto ile ma na głowie."""
    qs = Thread.objects.all()
    return Response(
        {
            "unread": qs.filter(read=False, status=Thread.Status.NOWE).count(),
            "open": qs.exclude(status=Thread.Status.ZAMKNIETE).count(),
            "waiting_for_author": qs.filter(status=Thread.Status.W_TRAKCIE).count(),
            "recent": ThreadSerializer(
                qs.filter(read=False)[:10].select_related("innovation").prefetch_related(
                    "messages", "votes", "fiszka"
                ),
                many=True,
            ).data,
        }
    )
