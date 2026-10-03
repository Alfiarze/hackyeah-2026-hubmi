from django.urls import path

from . import views

urlpatterns = [
    path("admin/trends/", views.trends),
    path("admin/summary/", views.summary),
    path("admin/inbox/", views.inbox_stats),
]
