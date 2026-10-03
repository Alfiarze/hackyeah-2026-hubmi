"""
Moduł I — Matchmaking społeczny (OBOWIĄZKOWY) + AI przy dopasowaniu.

  POST /api/match/search/    opis problemu → 3–5 wyników z % i „dlaczego pasuje”,
                             rozstrzygnięcie AI „czy powiązane”, flaga luki
  POST /api/match/gaps/      brak dopasowania → zgłoszenie luki na tablicę admina
  GET  /api/match/queries/   ADMIN: log zapytań = sygnały potrzeb (trendy)
  GET  /api/match/gaps/      ADMIN: luki bez rozwiązań
  POST /api/ai/ask/          pytanie do materiałów ROPS ze źródłami (moduł II)

CRUD ocen Jev „czy powiązane” (moduł I, osobny zasób):
  GET    /api/relevance/             lista ocen (filtr: q, related)
  POST   /api/relevance/             utwórz ocenę → werdykt Jev od razu
  GET    /api/relevance/<id>/        jeden rekord
  PUT    /api/relevance/<id>/        podmień treść → przelicz werdykt
  PATCH  /api/relevance/<id>/        to samo, częściowo
  DELETE /api/relevance/<id>/        usuń
  (zmiana i kasowanie: rola ROPS/admin — reszta API jest publiczna do odczytu)
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404

from accounts.permissions import IsHubmiAdmin, is_staff_role, role_of
from catalog.models import Innovation, LibraryItem
from catalog.serializers import InnovationSerializer
from catalog.text_pl import snippet
from catalog import search as hybrid

from . import ai as ai_service
from . import engine
from .models import Gap, RelevanceCheck, SearchQuery
from .serializers import GapSerializer, RelevanceCheckSerializer, SearchQuerySerializer


def _gather_candidates(results: list[dict]) -> list[dict]:
    ids = [r["innovation_id"] for r in results]
    rows = {
        i.id: i
        for i in Innovation.objects.filter(id__in=ids)
    }
    out = []
    for r in results:
        inn = rows.get(r["innovation_id"])
        if not inn:
            continue
        out.append(
            {
                "id": inn.id,
                "name": inn.name,
                "problem": inn.problem,
                "target": inn.target,
                "evidence": inn.evidence,
                "score": r["score"],
                "reasons": r["reasons"],
            }
        )
    return out


def _sources_for(question: str, limit: int = 5) -> list[dict]:
    """Zbiera materiał pod pytanie: dokumenty (76) + karty (115), najlepsze frazowo."""
    from catalog.search import prefix_query

    sources: list[dict] = []
    sq = prefix_query(question)
    docs = LibraryItem.objects.all()
    if sq is not None:
        docs = docs.filter(search_vector=sq)
    docs = docs.order_by("-year")[:limit]
    for d in docs:
        sources.append(
            {
                "title": d.title,
                "type": d.type or "dokument",
                "url": d.url,
                "snippet": snippet(d.desc, 400),
            }
        )
    if len(sources) < limit:
        hits = hybrid.text_search(question, limit=limit)
        rows = Innovation.objects.filter(id__in=[i for i, _ in hits])
        by_id = {r.id: r for r in rows}
        for i, _score in hits:
            inn = by_id.get(i)
            if not inn:
                continue
            sources.append(
                {
                    "title": inn.name,
                    "type": "karta innowacji",
                    "url": inn.url,
                    "snippet": snippet(inn.problem or inn.description, 400),
                }
            )
    return sources[:limit]


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def match_search(request):
    """
    GET/POST /api/match/search/?q=... (&limit, &cat, &powiat, &external)

    Zwraca: analizę zapytania, wyniki z uzasadnieniami i podświetleniami,
    werdykt AI „czy powiązane” oraz flagę luki. Zapytanie zapisuje się jako
    sygnał potrzeby — z tego powstają trendy w panelu admina.
    """
    data = request.data if request.method == "POST" else request.query_params
    query = (data.get("q") or data.get("query") or "").strip()
    if not query:
        return Response(
            {"detail": "Opisz problem — pole q jest puste."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        limit = min(max(int(data.get("limit", 5)), 1), 10)
    except (TypeError, ValueError):
        limit = 5
    cat = data.get("cat") or None
    powiat = (data.get("powiat") or "").strip() or None
    # Bazy spoza Małopolski tylko na wyraźne życzenie — domyślna odpowiedź
    # modułu obowiązkowego zostaje przy innowacjach przetestowanych w regionie.
    external = str(data.get("external", "")).lower() in ("1", "true", "tak", "yes", "on")

    found = engine.search(query, limit=limit, cat=cat, powiat=powiat, external=external)
    candidates = _gather_candidates(found["results"])
    verdicts = ai_service.judge_related(query, candidates) if candidates else {
        "source": "brak-kandydatow",
        "werdykty": [],
    }
    by_id = {w.get("id"): w for w in verdicts["werdykty"]}

    results = []
    for r in found["results"]:
        inn = Innovation.objects.filter(id=r["innovation_id"]).select_related("category").first()
        if not inn:
            continue
        payload = InnovationSerializer(inn).data
        w = by_id.get(r["innovation_id"], {})
        payload.update(
            {
                "match": {
                    "score": r["score"],
                    "tier": r["tier"],
                    "coverage": r["coverage"],
                    "matched": r["matched"],
                    "missed": r["missed"],
                    "reasons": r["reasons"],
                    "highlights": r["highlights"],
                },
                "ai": {
                    "related": w.get("powiazane"),
                    "confidence": w.get("pewnosc"),
                    "reason": w.get("powod", ""),
                    "source": verdicts["source"],
                },
            }
        )
        results.append(payload)

    gap_reason = found["gap_reason"]
    scores = [r["match"]["score"] for r in results]

    sq = SearchQuery.objects.create(
        text=query,
        powiat=powiat or "",
        category=cat or "",
        user=request.user if request.user.is_authenticated else None,
        concepts=found["analysis"]["concepts"],
        unknown=found["analysis"]["unknown"],
        top_score=max(scores) if scores else None,
        result_count=len(results),
        is_gap=gap_reason is not None,
        gap_reason=gap_reason or "",
        ai_source=verdicts["source"],
        results=[
            {
                "id": r["id"],
                "score": r["match"]["score"],
                "tier": r["match"]["tier"],
                "related": r["ai"]["related"],
            }
            for r in results
        ],
    )

    return Response(
        {
            "query_id": sq.id,
            "query": query,
            "analysis": found["analysis"],
            "results": results,
            "gap": {
                "is_gap": gap_reason is not None,
                "reason": gap_reason,
                "text": engine.GAP_REASON_TEXT.get(gap_reason or "", ""),
            },
            "ai": verdicts,
            "role": role_of(request.user),
        }
    )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gaps(request):
    """
    POST /api/match/gaps/ {query_id, title, body, powiat?}
        Brak dopasowania → „Dodaj na tablicę pomysłów”. Tworzy wątek luki
        i wiąże go z zapytaniem, żeby admin widział źródło.

    GET /api/match/gaps/   ADMIN: luki, czyli potrzeby bez rozwiązania.
    """
    if request.method == "GET":
        if not is_staff_role(request.user):
            return Response(
                {"detail": "Wymagana rola pracownika ROPS lub administratora."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Gap.objects.select_related("query", "thread")
        return Response(GapSerializer(qs, many=True).data)
    return _create_gap(request)


def _create_gap(request):
    query_id = request.data.get("query_id")
    query = SearchQuery.objects.filter(pk=query_id).first()
    if query is None:
        return Response(
            {"detail": "Nie ma takiego zapytania (query_id)."},
            status=status.HTTP_404_NOT_FOUND,
        )
    from hub.models import Thread

    thread = Thread.objects.create(
        kind=Thread.Kind.LUKA,
        title=(request.data.get("title") or query.text[:80]),
        body=(request.data.get("body") or query.text),
        author=request.user if request.user.is_authenticated else None,
        author_name=request.data.get("author") or "Mieszkaniec (demo)",
        author_role=role_of(request.user),
        powiat=(request.data.get("powiat") or query.powiat),
        concepts=query.concepts,
        unknown_terms=query.unknown,
        top_score=query.top_score,
        query_text=query.text,
    )
    gap = Gap.objects.create(query=query, thread=thread)
    query.is_gap = True
    query.save(update_fields=["is_gap"])
    return Response(GapSerializer(gap).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsHubmiAdmin])
def query_log(request):
    """GET /api/match/queries/ — ADMIN: każde zapytanie jako sygnał potrzeby."""
    qs = SearchQuery.objects.all()[:200]
    return Response(SearchQuerySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def ask(request):
    """
    POST /api/ai/ask/ {question}

    Moduł II „Pytania do bazy ze źródłami”: odpowiedź złożona z fragmentów
    76 dokumentów i 115 kart, każde z linkiem do źródła. Pytanie trafia
    też do logu — to materiał na trendy.
    """
    question = (request.data.get("question") or request.data.get("q") or "").strip()
    if not question:
        return Response(
            {"detail": "Podaj pytanie (question)."}, status=status.HTTP_400_BAD_REQUEST
        )
    sources = _sources_for(question)
    answer = ai_service.ask(question, sources)

    SearchQuery.objects.create(
        text=f"[pytanie] {question}",
        user=request.user if request.user.is_authenticated else None,
        concepts=[],
        unknown=[],
        result_count=len(sources),
        is_gap=False,
        ai_source=answer["source"],
        results=[{"title": s["title"], "url": s["url"]} for s in sources],
    )
    return Response({"question": question, **answer, "asked_at": timezone.now()})


# --- CRUD ocen Jev „czy powiązane” -----------------------------------------

def _evaluate_check(obj: RelevanceCheck) -> None:
    """Liczy werdykt Jev i zapisuje go w rekordzie (nigdy nie rzuca wyjątku)."""
    verdict = ai_service.check_related(obj.text, obj.context, threshold=obj.threshold)
    obj.related = verdict["related"]
    obj.noul = verdict["noul"]
    obj.confidence = verdict["confidence"]
    obj.powod = verdict["powod"]
    obj.source = verdict["source"]
    obj.jev_model = verdict["model"]
    obj.latency_ms = verdict["latency_ms"]
    obj.save(
        update_fields=[
            "related", "noul", "confidence", "powod",
            "source", "jev_model", "latency_ms", "updated_at",
        ]
    )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def relevance_list(request):
    """
    GET  /api/relevance/?q=&related=&limit=   lista ocen, najnowsze pierwsze
    POST /api/relevance/ {text, context?, label?, threshold?}
         tworzy rekord i od razu przepuszcza go przez Jev — w odpowiedzi
         masz `related`, `noul` (0..1), `confidence` i jednozdaniowy `powod`

    Gdy brak JEV_API_KEY albo sieci, `source=fallback` — ocena leci z nakładania
    się słów, endpoint i tak działa.
    """
    if request.method == "GET":
        qs = RelevanceCheck.objects.all()
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(text__icontains=q) | Q(context__icontains=q) | Q(label__icontains=q)
            )
        related = (request.query_params.get("related") or "").strip().lower()
        if related:
            qs = qs.filter(related=related in ("1", "true", "tak", "yes"))
        try:
            limit = min(max(int(request.query_params.get("limit", 50)), 1), 200)
        except (TypeError, ValueError):
            limit = 50
        return Response(RelevanceCheckSerializer(qs[:limit], many=True).data)

    serializer = RelevanceCheckSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    obj = serializer.save(
        user=request.user if request.user.is_authenticated else None
    )
    _evaluate_check(obj)
    return Response(
        RelevanceCheckSerializer(obj).data, status=status.HTTP_201_CREATED
    )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def relevance_detail(request, pk):
    """
    GET    /api/relevance/<id>/   jeden rekord
    PUT    /api/relevance/<id>/   podmień treść (wymaga pól text i context)
    PATCH  /api/relevance/<id>/   częściowa podmiana
    DELETE /api/relevance/<id>/   usuń rekord

    Każdy zapis przelicza werdykt od nowa — Jev odpowiada w setki milisekund,
    więc nie trzymamy tu żadnej kolejki.
    """
    obj = get_object_or_404(RelevanceCheck, pk=pk)

    if request.method == "GET":
        return Response(RelevanceCheckSerializer(obj).data)

    # odczyt jest publiczny w całym API, ale zmiany i kasowanie pilnujemy rolą
    if not is_staff_role(request.user):
        return Response(
            {"detail": "Wymagana rola pracownika ROPS lub administratora."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = RelevanceCheckSerializer(
        obj, data=request.data, partial=request.method == "PATCH"
    )
    serializer.is_valid(raise_exception=True)
    obj = serializer.save()
    _evaluate_check(obj)
    return Response(RelevanceCheckSerializer(obj).data)
