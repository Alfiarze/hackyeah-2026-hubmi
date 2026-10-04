from django.contrib import admin

from .models import DemandTopic, Gap, RelevanceCheck, SearchQuery


@admin.register(DemandTopic)
class DemandTopicAdmin(admin.ModelAdmin):
    list_display = (
        "label", "kind", "searches", "unmet_searches",
        "best_score", "first_seen", "last_seen",
    )
    list_filter = ("kind", "last_seen")
    search_fields = ("label", "key")
    readonly_fields = ("key", "first_seen", "last_seen", "clients")


@admin.register(SearchQuery)
class SearchQueryAdmin(admin.ModelAdmin):
    list_display = ("text", "top_score", "result_count", "is_gap", "ai_source", "created_at")
    list_filter = ("is_gap", "ai_source", "created_at")
    search_fields = ("text",)


@admin.register(Gap)
class GapAdmin(admin.ModelAdmin):
    list_display = ("query", "status", "thread", "created_at")
    list_filter = ("status",)


@admin.register(RelevanceCheck)
class RelevanceCheckAdmin(admin.ModelAdmin):
    list_display = (
        "label", "related", "noul", "confidence",
        "source", "jev_model", "latency_ms", "created_at",
    )
    list_filter = ("related", "source", "created_at")
    search_fields = ("text", "context", "label")
    readonly_fields = (
        "related", "noul", "confidence", "powod",
        "source", "jev_model", "latency_ms", "created_at", "updated_at",
    )
