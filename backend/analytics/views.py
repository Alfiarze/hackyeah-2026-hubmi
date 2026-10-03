"""
Moduł VI — Panel administratora: agregaty dla pracownika ROPS.

Bez własnych modeli — wszystko liczone z danych, które i tak już mamy:
  * zapytania do matchmakingu → sygnały potrzeb i trendy
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
from matchmaking.models import Gap, SearchQuery


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
