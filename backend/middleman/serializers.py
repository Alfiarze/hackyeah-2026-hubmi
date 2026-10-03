from rest_framework import serializers

from catalog.models import Innovation

from .models import ImplementationPlan, InstitutionProfile


class InstitutionProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionProfile
        fields = [
            "id", "name", "org_type", "size_band", "budget", "staff",
            "powiat", "notes", "created_at", "updated_at",
        ]


class ImplementationPlanSerializer(serializers.ModelSerializer):
    innovation_name = serializers.CharField(
        source="innovation.name", read_only=True, default=None
    )
    institution_name = serializers.CharField(
        source="institution.name", read_only=True
    )

    class Meta:
        model = ImplementationPlan
        fields = [
            "id", "institution", "institution_name", "innovation", "innovation_name",
            "title", "summary", "scale", "staffing", "cost_low", "cost_high",
            "affordable", "steps", "risks", "adaptations", "legal", "source",
            "created_at",
        ]
        read_only_fields = fields


class PlanRequestSerializer(serializers.Serializer):
    """Żądanie karty wdrożenia — profil + innowacja, którą instytucja chce wdrożyć."""

    innovation_id = serializers.SlugField(required=True)
    org_type = serializers.ChoiceField(choices=InstitutionProfile.ORG_TYPES)
    size_band = serializers.ChoiceField(choices=InstitutionProfile.SIZE_BANDS)
    budget = serializers.IntegerField(required=False, min_value=0, default=0)
    staff = serializers.IntegerField(required=False, min_value=0, default=1)
    powiat = serializers.CharField(required=False, allow_blank=True, default="")
    use_ai = serializers.BooleanField(required=False, default=True)

    def get_innovation(self):
        return Innovation.objects.filter(
            pk=self.validated_data["innovation_id"]
        ).select_related("category").first()
