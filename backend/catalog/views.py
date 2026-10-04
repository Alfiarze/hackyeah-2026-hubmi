"""
Moduł II — Zasobnik wiedzy: katalog, dokumenty, szybkie wyszukiwanie.

Wymogi z zadania, które tu realizujemy:
  * „szybkie pozyskanie konkretnej informacji”      → GET /api/search/
  * „sprawna i szybka aktualizacja danych” (admin)  → POST/PATCH /api/innovations/
  * „materiały edukacyjne + Canwy do pobrania”      → GET /api/library/
  * agregacja danych o potrzeby → trendy (tylko admin) → moduł analytics
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsHubmiAdmin

from . import search as search_service
from . import vectors
from .models import Category, Innovation, LibraryItem
from .serializers import (
    CategorySerializer,
    InnovationSerializer,
    InnovationWriteSerializer,
    LibraryItemSerializer,
)


def _filter_by_query(qs, q: str):
    """Filtr frazowy prefiksami rdzeni (postgreSQL nie ma polskiego stemmera)."""
    sq = search_service.prefix_query(q) if q else None
    if sq is not None:
        qs = qs.filter(search_vector=sq)
    return qs


@api_view(["GET"])
@permission_classes([AllowAny])
def categories(request):
    """GET /api/categories/ — 9 kategorii Biblioteki."""
    return Response(CategorySerializer(Category.objects.all(), many=True).data)


class InnovationViewSet(viewsets.ModelViewSet):
    """
    GET    /api/innovations/                 lista + filtry (category, q, has_evidence, powiat, ext)
    GET    /api/innovations/{id}/            karta innowacji
    POST   /api/innovations/                 ADMIN: nowa karta (auto-wektor)
    PATCH  /api/innovations/{id}/            ADMIN: edycja (przeliczenie wektora)
    DELETE /api/innovations/{id}/            ADMIN: usunięcie
    GET    /api/innovations/{id}/similar/    podobne karty (pgvector / LSA)
    """

    lookup_field = "pk"

    def get_permissions(self):
        # „szybka modyfikacja, weryfikacja i udostępnianie wiedzy” (§2.VI)
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsHubmiAdmin()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return InnovationWriteSerializer
        return InnovationSerializer

    def get_queryset(self):
        qs = Innovation.objects.select_related("category").prefetch_related("deployments")
        params = self.request.query_params
        # Karty z baz spoza Malopolski to ~900 rekordow i ~3 MB JSON-a, a aplikacja
        # wola te liste przy starcie. Domyslnie wiec oddajemy Malopolske;
        # `ext=1` to same karty zewnetrzne, `ext=all` komplet.
        ext = (params.get("ext") or "").lower()
        if ext in ("1", "true", "tylko"):
            qs = qs.filter(ext=True)
        elif ext not in ("all", "wszystkie"):
            qs = qs.filter(ext=False)
        if params.get("category"):
            qs = qs.filter(category__slug=params["category"])
        if params.get("has_evidence") in ("1", "true", "yes"):
            qs = qs.exclude(evidence="")
        if params.get("powiat"):
            qs = qs.filter(deployments__powiat=params["powiat"]).distinct()
        return _filter_by_query(qs, (params.get("q") or "").strip())

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user.username)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.username)

    @action(detail=True, methods=["get"])
    def similar(self, request, pk=None):
        """GET /api/innovations/{id}/similar/ — co jeszcze jest blisko tego tematu."""
        instance = self.get_object()
        vec = instance.embedding
        if vec is None:
            vec = vectors.encode_document(
                {
                    "name": instance.name,
                    "problem": instance.problem,
                    "description": instance.description,
                    "target": instance.target,
                    "beneficiaries": instance.beneficiaries,
                    "evidence": instance.evidence,
                    "cat_name": instance.cat_name,
                }
            )
        hits = search_service.vector_search(vec, limit=7) if vec is not None else []
        ids = [slug for slug, _ in hits if slug != instance.pk]
        found = {
            i.id: i
            for i in Innovation.objects.select_related("category").filter(id__in=ids)
        }
        out = []
        for slug, score in hits:
            if slug == instance.pk or slug not in found:
                continue
            data = InnovationSerializer(found[slug]).data
            data["similarity"] = score
            out.append(data)
        return Response(out)


class LibraryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/library/ — 76 dokumentów ROPS (raporty, Mapa Wyzwań, Canwy, nabór).
    Filtry: `section`, `q`, `featured=1` (wyróżnione na górze Biblioteki).
    """

    serializer_class = LibraryItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LibraryItem.objects.all()
        params = self.request.query_params
        if params.get("section"):
            qs = qs.filter(section=params["section"])
        if params.get("featured") in ("1", "true", "yes"):
            qs = qs.filter(featured=True)
        return _filter_by_query(qs, (params.get("q") or "").strip())


@api_view(["GET"])
@permission_classes([AllowAny])
def quick_search(request):
    """
    GET /api/search/?q=...&mode=hybrid|text|vector

    „Szybkie pozyskanie konkretnej informacji” (§2.II). Domyślnie hybryda:
    wektor łapie synonimy, tsvector pilnuje dosłownych fraz z dokumentów.
    """
    q = (request.query_params.get("q") or "").strip()
    if not q:
        return Response({"detail": "Podaj frazę q."}, status=status.HTTP_400_BAD_REQUEST)

    mode = request.query_params.get("mode", "hybrid")
    limit = min(int(request.query_params.get("limit", "10")), 50)

    if mode == "text":
        hits = [
            {"id": i, "score": s, "vector": None, "text": s}
            for i, s in search_service.text_search(q, limit)
        ]
    elif mode == "vector":
        hits = [
            {"id": i, "score": s, "vector": s, "text": None}
            for i, s in search_service.vector_search(vectors.encode_query(q), limit)
        ]
    else:
        hits = search_service.hybrid_search(q, limit)

    found = {
        i.id: i
        for i in Innovation.objects.select_related("category").filter(
            id__in=[h["id"] for h in hits]
        )
    }
    out = []
    for h in hits:
        inn = found.get(h["id"])
        if not inn:
            continue
        row = InnovationSerializer(inn).data
        row["match"] = h
        out.append(row)
    return Response({"query": q, "mode": mode, "results": out})
