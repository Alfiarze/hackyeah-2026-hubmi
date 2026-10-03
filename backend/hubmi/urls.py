"""Router API HubMI — jeden prefiks /api/, po module na zadanie."""
from django.contrib import admin
from django.urls import include, path

from hubmi.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", health),
    path("health/", health),
    path("api/health/", health),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("catalog.urls")),       # II  Zasobnik wiedzy
    path("api/", include("matchmaking.urls")),   # I   Matchmaking + AI
    path("api/", include("hub.urls")),           # III/IV/V zgłoszenia i tablica
    path("api/", include("middleman.urls")),     # VII Middleman
    path("api/", include("analytics.urls")),     # VI  Panel admina
]
