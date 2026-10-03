"""Konta demo — 4 grupy odbiorców z zadania, plus admin do panelu Django."""
from django.contrib.auth.models import User

from .models import Profile, Role

# (username, hasło, rola, imię/pseudonim, instytucja, powiat, ekspert)
DEMO_ACCOUNTS = [
    ("admin", "admin123", Role.ADMIN, "Administrator HubMI", "ROPS Kraków", "", False),
    ("rops", "rops123", Role.ROPS, "Koordynator innowacji", "ROPS Kraków", "", False),
    ("ekspert", "ekspert123", Role.EKSPERT, "Ekspert ds. usług społecznych", "", "krakowski", True),
    ("mieszkaniec", "mieszkaniec123", Role.MIESZKANIEC, "Mieszkanka (demo)", "", "limanowski", False),
    ("jst", "jst123", Role.JST, "Urząd Gminy (demo)", "Gmina wiejska (demo)", "nowosądecki", False),
]


def seed_users() -> int:
    """Tworzy/aktualizuje konta demo. Idempotentne — można wołać przy każdym starcie."""
    created = 0
    for username, password, role, display, org, powiat, expert in DEMO_ACCOUNTS:
        defaults = {
            "role": role.value,
            "display_name": display,
            "organization": org,
            "powiat": powiat,
            "is_expert": expert,
        }
        user, was_created = User.objects.get_or_create(
            username=username,
            defaults={
                "is_staff": role in (Role.ADMIN, Role.ROPS),
                "is_superuser": role == Role.ADMIN,
            },
        )
        if was_created:
            created += 1
        # hasło ustawiane co start — demo, nie produkcja
        user.set_password(password)
        user.is_staff = role in (Role.ADMIN, Role.ROPS)
        user.is_superuser = role == Role.ADMIN
        user.save()
        Profile.objects.update_or_create(user=user, defaults=defaults)
    return created
