from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("innovations", views.InnovationViewSet, basename="innovation")
router.register("library", views.LibraryViewSet, basename="library")

urlpatterns = [
    path("categories/", views.categories),
    path("search/", views.quick_search),
    path("", include(router.urls)),
]
