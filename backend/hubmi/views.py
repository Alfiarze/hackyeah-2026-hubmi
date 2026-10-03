"""Endpointy systemowe HubMI."""
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from hubmi import ai


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """
    GET /api/health/ — czy kontenery stoją i co jest załadowane.

    To jest pierwsze wywołanie przy starcie demo: sprawdza bazę, dane
    i gotowość modelu, więc od razu widać, czy któryś kontener się nie uruchomił.
    """
    counts = {}
    db_ok = True
    try:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT (SELECT count(*) FROM catalog_innovation), "
                "(SELECT count(*) FROM catalog_libraryitem), "
                "(SELECT count(*) FROM hub_thread)"
            )
            counts = dict(
                zip(["innovations", "library_items", "threads"], cur.fetchone())
            )
    except Exception as exc:  # noqa: BLE001
        db_ok = False
        counts = {"error": str(exc)[:200]}

    return Response(
        {
            "status": "ok" if db_ok else "degraded",
            "database": db_ok,
            "data": counts,
            "ai": ai.available(),
        }
    )
