"""Role użytkowników HubMI — 4 grupy odbiorców z zadania + admin."""
from django.conf import settings
from django.db import models


class Role(models.TextChoices):
    MIESZKANIEC = "mieszkaniec", "Mieszkaniec / NGO"
    JST = "jst", "JST (samorząd)"
    EKSPERT = "ekspert", "Ekspert branżowy"
    ROPS = "rops", "Pracownik ROPS"
    ADMIN = "admin", "Administrator"


# role, które widzą panel administratora i trendy
STAFF_ROLES = {Role.ROPS, Role.ADMIN}


class Profile(models.Model):
    """
    Profil obok `auth.User` — rola, instytucja i plakietka eksperta.

    W demo logowanie jest trywialne (seed kont), ale model jest prawdziwy:
    przy wdrożeniu dochodzi LDAP/SSO ROPS i nic tu nie trzeba zmieniać.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MIESZKANIEC)
    display_name = models.CharField(max_length=120, blank=True)
    organization = models.CharField(max_length=160, blank=True)
    powiat = models.CharField(max_length=60, blank=True)
    is_expert = models.BooleanField(default=False)

    class Meta:
        verbose_name = "profil"
        verbose_name_plural = "profile"

    def __str__(self) -> str:
        return f"{self.label} ({self.get_role_display()})"

    @property
    def label(self) -> str:
        return (
            self.display_name
            or self.user.get_full_name()
            or self.user.username
        )

    @property
    def is_staff_role(self) -> bool:
        return self.role in STAFF_ROLES or self.user.is_superuser
