"""Uprawnienia — tu dzieje się kontrola ról z zadania (§3, tab. „Użytkownicy”)."""
from rest_framework.permissions import BasePermission

from .models import Role, STAFF_ROLES, Profile


def role_of(user) -> str:
    """Rola w API; bez logowania zawsze mieszkaniec (domyślne demo)."""
    if not getattr(user, "is_authenticated", False):
        return Role.MIESZKANIEC
    if user.is_superuser:
        return Role.ADMIN
    profile = getattr(user, "profile", None)
    return profile.role if profile else Role.MIESZKANIEC


def is_staff_role(user) -> bool:
    return role_of(user) in {r.value for r in STAFF_ROLES} or (
        bool(getattr(user, "is_superuser", False))
    )


def profile_of(user) -> Profile | None:
    if not getattr(user, "is_authenticated", False):
        return None
    return getattr(user, "profile", None)


class IsHubmiAdmin(BasePermission):
    """ROPS i administrator — panel admina, trendy, moderacja zgłoszeń."""

    message = "Wymagana rola pracownika ROPS lub administratora."

    def has_permission(self, request, view) -> bool:
        return is_staff_role(request.user)


class IsExpertOrStaff(BasePermission):
    """Ekspert i wyżej — odpowiadanie na pytania, plakietka eksperta."""

    message = "Wymagana rola eksperta, ROPS lub administratora."

    def has_permission(self, request, view) -> bool:
        role = role_of(request.user)
        return role in {Role.EKSPERT, Role.ROPS, Role.ADMIN}


__all__ = [
    "role_of",
    "is_staff_role",
    "profile_of",
    "IsHubmiAdmin",
    "IsExpertOrStaff",
]
