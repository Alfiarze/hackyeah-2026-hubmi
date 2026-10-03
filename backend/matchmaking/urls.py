from django.urls import path

from . import views

urlpatterns = [
    path("match/search/", views.match_search),
    path("match/gaps/", views.gaps),
    path("match/queries/", views.query_log),
    path("ai/ask/", views.ask),
    # CRUD ocen Jev „czy powiązane”
    path("relevance/", views.relevance_list),
    path("relevance/<int:pk>/", views.relevance_detail),
]
