from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("institutions", views.InstitutionViewSet, basename="institution")

urlpatterns = [
    path("middleman/options/", views.options),
    path("", include(router.urls)),
]
