from rest_framework import serializers

from .models import Category, Deployment, Innovation, LibraryItem
from .vectors import encode_document


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["slug", "title"]


class DeploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deployment
        fields = ["powiat", "org", "year", "email", "phone", "demo"]


class InnovationSerializer(serializers.ModelSerializer):
    """Czytelny kształt dla frontu — pola po nazwach z bundle'a `app/src/data`."""

    cat = serializers.CharField(source="cat_slug", read_only=True)
    catName = serializers.CharField(source="cat_name", read_only=True)
    desc = serializers.CharField(source="description", read_only=True)
    target_group = serializers.CharField(source="target", read_only=True)
    benef = serializers.CharField(source="beneficiaries", read_only=True)
    deployments = DeploymentSerializer(many=True, read_only=True)
    has_embedding = serializers.SerializerMethodField()

    class Meta:
        model = Innovation
        fields = [
            "id", "name", "cat", "catName", "problem", "desc", "target",
            "target_group", "benef", "evidence", "authors", "badges",
            "video", "pdf", "zip", "license", "url", "deployments",
            "ext", "origin",
            "updated_at", "updated_by", "has_embedding",
        ]

    def get_has_embedding(self, obj) -> bool:
        return obj.embedding is not None


class InnovationWriteSerializer(serializers.ModelSerializer):
    """
    Zapis z panelu administratora (§2.II „sprawna i szybka aktualizacja danych”).

    Przy zapisie liczony jest wektor, więc nowa karta jest od razu wyszukiwalna
    semantycznie — bez przebudowy indeksu i bez ręcznego uruchamiania skryptu.
    """

    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())

    class Meta:
        model = Innovation
        fields = [
            "id", "name", "category", "problem", "description", "target",
            "beneficiaries", "evidence", "authors", "badges", "raw_text",
            "video", "pdf", "zip", "license", "url",
        ]

    def _embedding_for(self, validated_data) -> object:
        cat = validated_data.get("category") or getattr(self.instance, "category", None)
        return encode_document(
            {
                "name": validated_data.get("name", getattr(self.instance, "name", "")),
                "problem": validated_data.get("problem", getattr(self.instance, "problem", "")),
                "description": validated_data.get(
                    "description", getattr(self.instance, "description", "")
                ),
                "target": validated_data.get("target", getattr(self.instance, "target", "")),
                "beneficiaries": validated_data.get(
                    "beneficiaries", getattr(self.instance, "beneficiaries", "")
                ),
                "evidence": validated_data.get("evidence", getattr(self.instance, "evidence", "")),
                "cat_name": cat.title if cat else "",
            }
        )

    def create(self, validated_data):
        emb = self._embedding_for(validated_data)
        return Innovation.objects.create(embedding=emb, **validated_data)

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.embedding = self._embedding_for(validated_data)
        instance.save()
        return instance


class LibraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryItem
        fields = ["id", "section", "title", "year", "type", "url", "desc", "bytes",
                  "featured", "ext", "origin"]
