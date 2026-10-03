from rest_framework import serializers

from django.db.models import Count

from accounts.models import Role
from catalog.models import Innovation

from .models import Fiszka, Message, Notification, Rating, Thread, Vote


class FiszkaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fiszka
        fields = ["istota", "adresat", "etap", "obszar"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "author_name", "role", "text", "created_at"]
        read_only_fields = fields


class ThreadSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    fiszka = FiszkaSerializer(read_only=True)
    votes = serializers.SerializerMethodField()
    innovation_name = serializers.CharField(source="innovation.name", read_only=True, default=None)
    stage_label = serializers.CharField(source="get_stage_display", read_only=True, default=None)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    unread_for_admin = serializers.BooleanField(source="is_unread", read_only=True)

    class Meta:
        model = Thread
        fields = [
            "id", "kind", "kind_label", "title", "body",
            "author_name", "author_role", "organization", "powiat",
            "status", "status_label", "read", "unread_for_admin",
            "stage", "stage_label",
            "concepts", "unknown_terms", "top_score", "query_text",
            "innovation", "innovation_name", "rating",
            "fiszka", "votes", "messages", "created_at", "updated_at",
        ]
        read_only_fields = ["read", "created_at", "updated_at"]

    def get_votes(self, obj) -> dict:
        """Liczniki walidacji na tablicy: {mam_to, chce_testowac, moge_pomoc}."""
        out = {v.value: 0 for v in Vote.Value}
        cached = getattr(obj, "_vote_counts", None)
        if cached is None:
            cached = dict(
                obj.votes.values("value").annotate(c=Count("id")).values_list("value", "c")
            )
            obj._vote_counts = cached  # drugie użycie nie robi zapytania
        out.update(cached)
        return out


class ThreadWriteSerializer(serializers.ModelSerializer):
    """Zgłoszenie z dowolnego modułu; fiszka opcjonalnie wjeżdża razem z nim."""

    fiszka = FiszkaSerializer(required=False)
    innovation_id = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Thread
        fields = [
            "kind", "title", "body", "author_name", "powiat", "organization",
            "innovation_id", "rating", "concepts", "unknown_terms",
            "top_score", "query_text", "fiszka",
        ]

    def validate(self, attrs):
        if attrs.get("kind") == Thread.Kind.TEST and not attrs.get("rating"):
            # ocena 1–5 jest warunkiem zgłoszenia na testera (§2.IV)
            return attrs
        return attrs

    def create(self, validated_data):
        fiszka = validated_data.pop("fiszka", None)
        innovation_id = validated_data.pop("innovation_id", None)
        validated_data.pop("innovation", None)

        request = self.context.get("request")
        if request and request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)
            validated_data.setdefault("author", request.user)
            validated_data.setdefault("author_role", profile.role if profile else Role.MIESZKANIEC)
            if profile and not validated_data.get("author_name"):
                validated_data["author_name"] = profile.label

        innovation = None
        if innovation_id:
            innovation = Innovation.objects.filter(pk=innovation_id).first()
        if innovation:
            validated_data["innovation"] = innovation

        thread = Thread.objects.create(**validated_data)
        if fiszka:
            Fiszka.objects.create(thread=thread, **fiszka)
        return thread


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ["id", "thread", "value", "client_id", "created_at"]
        read_only_fields = ["id", "created_at"]


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = [
            "id", "innovation", "score", "comment",
            "author_name", "client_id", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_score(self, value):
        if not 1 <= int(value) <= 5:
            raise serializers.ValidationError("Ocena musi być z zakresu 1–5.")
        return value

    def validate_comment(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError(
                "Komentarz jest wymagany — ocena bez uzasadnienia nic nie wnosi."
            )
        return value


class NotificationSerializer(serializers.ModelSerializer):
    thread_title = serializers.CharField(source="thread.title", read_only=True, default=None)

    class Meta:
        model = Notification
        fields = [
            "id", "channel", "title", "body", "read",
            "thread", "thread_title", "created_at",
        ]
        read_only_fields = fields
