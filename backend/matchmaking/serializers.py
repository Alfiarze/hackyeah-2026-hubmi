from rest_framework import serializers

from .models import Gap, RelevanceCheck, SearchQuery


class SearchQuerySerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = SearchQuery
        fields = [
            "id", "text", "powiat", "category", "author", "created_at",
            "concepts", "unknown", "top_score", "result_count", "is_gap",
            "gap_reason", "ai_source", "results",
        ]


class GapSerializer(serializers.ModelSerializer):
    query_text = serializers.CharField(source="query.text", read_only=True)
    thread_title = serializers.CharField(source="thread.title", read_only=True, default=None)

    class Meta:
        model = Gap
        fields = ["id", "query", "query_text", "thread", "thread_title", "status", "created_at"]


class RelevanceCheckSerializer(serializers.ModelSerializer):
    """
    CRUD oceny „czy powiązane”.

    Do API idzie tylko to, co wpisuje użytkownik (`text`, `context`, `label`,
    `threshold`) — wynik Jev (`related`, `noul`, `confidence`, `powod`,
    `source`) jest liczony na serwerze i zawsze tylko do odczytu.
    """

    author = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = RelevanceCheck
        fields = [
            "id", "label", "text", "context", "threshold",
            "related", "noul", "confidence", "powod",
            "source", "jev_model", "latency_ms",
            "author", "created_at", "updated_at",
        ]
        read_only_fields = [
            "related", "noul", "confidence", "powod",
            "source", "jev_model", "latency_ms",
            "author", "created_at", "updated_at",
        ]
