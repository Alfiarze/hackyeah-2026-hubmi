from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("threads", views.ThreadViewSet, basename="thread")
router.register("ratings", views.RatingViewSet, basename="rating")
router.register("notifications", views.NotificationViewSet, basename="notification")

urlpatterns = [
    path("grants/", views.grants_list),
    path("grants/generate/", views.grant_generate),
    path("ideas/develop/", views.idea_develop),
    path("", include(router.urls)),
]
