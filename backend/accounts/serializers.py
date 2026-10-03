from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="get_role_display", read_only=True)
    role_id = serializers.CharField(source="role", read_only=True)

    class Meta:
        model = Profile
        fields = ["role", "role_id", "display_name", "organization", "powiat", "is_expert"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_superuser", "role", "profile"]

    def get_role(self, obj) -> str:
        from .permissions import role_of

        return role_of(obj)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs["username"], password=attrs["password"]
        )
        if user is None:
            raise serializers.ValidationError("Nieprawidłowa nazwa użytkownika lub hasło.")
        attrs["user"] = user
        return attrs
