from django.urls import path

from . import views

urlpatterns = [
    path("match/search/", views.match_search),
    path("match/gaps/", views.gaps),
    # dobor emotek do opisu problemu — decyduje wylacznie Jev
    path("match/emojis/", views.emoji_pick),
    # ostatnia szansa: Jev przeglada cala baze, gdy zwykle szukanie zwrocilo zero
    path("match/scan/", views.deep_scan),
    path("match/queries/", views.query_log),
    path("ai/ask/", views.ask),
    # CRUD ocen Jev „czy powiązane”
    path("relevance/", views.relevance_list),
    path("relevance/<int:pk>/", views.relevance_detail),
]
