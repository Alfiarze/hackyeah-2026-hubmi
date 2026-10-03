"""Logowanie demo + podgląd roli.

Sens funkcjonalny: jury musi zobaczyć ścieżkę każdej z 4 grup, więc
wystarczy przełączyć konto, a nie klikać w role w `<select>`.
"""
from django.contrib.auth import login, logout
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .permissions import role_of
from .serializers import LoginSerializer, UserSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """POST /api/auth/login/ {username, password} → {token, user}"""
    ser = LoginSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    user = ser.validated_data["user"]
    token, _ = Token.objects.get_or_create(user=user)
    if request.session:
        login(request, user)
    return Response({"token": token.key, "user": UserSerializer(user).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/auth/logout/ — kasuje token bieżącego użytkownika."""
    Token.objects.filter(user=request.user).delete()
    logout(request)
    return Response({"detail": "Wylogowano."})


@api_view(["GET"])
@permission_classes([AllowAny])
def me(request):
    """GET /api/auth/me/ — kto pyta i w jakiej roli (bez logowania: mieszkaniec)."""
    if not request.user.is_authenticated:
        return Response({"authenticated": False, "role": role_of(None), "user": None})
    return Response(
        {"authenticated": True, "role": role_of(request.user), "user": UserSerializer(request.user).data}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def demo_accounts(request):
    """GET /api/auth/demo/ — konta z seeda, żeby przełączać role w demo."""
    from django.contrib.auth.models import User

    rows = User.objects.select_related("profile").filter(is_active=True)
    return Response(
        [
            {
                "username": u.username,
                "role": role_of(u),
                "label": u.profile.label,
                "organization": u.profile.organization,
                "is_expert": u.profile.is_expert,
            }
            for u in rows
        ]
    )
