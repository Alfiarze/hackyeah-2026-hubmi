"""
Moduły III, IV, V i zaplecze VI.

Jeden model `Thread` obsługuje wszystkie kanały zgłoszeń: pomysł (III),
lukę z matchmakingu (I → VI), pytanie do ROPS i eksperta (V), zgłoszenie
na testera (IV) oraz ogłoszenie partnerskie (V). Dzięki temu panel
administratora ma jedną skrzynkę, a nie sześć.

Do tego osobne modele tam, gdzie dane mają własny kształt:
  `Fiszka`    — karta pomysłu z 4 kroków (moduł III)
  `Vote`      — walidacja społeczna na tablicy (moduł IV)
  `Rating`    — ocena 1–5 istniejących innowacji (moduł IV)
  `Notification` — dzwoneczek (moduł V + VI)

⚠️ Zakaz danych osobowych z materiałów ROPS: `author_name` to zawsze
pseudonim/lub „demo”, a konta demo nie mają imion i nazwisk.
"""
import uuid

from django.conf import settings
from django.db import models

from accounts.models import Role


class Thread(models.Model):
    class Kind(models.TextChoices):
        POMYSŁ = "pomysł", "Pomysł"
        LUKA = "luka", "Luka"
        PYTANIE = "pytanie", "Pytanie"
        TEST = "test", "Testowanie"
        PARTNER = "partner", "Szukam partnera"
        EKSPERT = "ekspert", "Pytanie do eksperta"

    class Status(models.TextChoices):
        NOWE = "nowe", "Nowe"
        W_TRAKCIE = "w trakcie", "W trakcie"
        ODPOWIEDZIANE = "odpowiedziane", "Odpowiedziane"
        ZAMKNIETE = "zamknięte", "Zamknięte"

    class Stage(models.TextChoices):
        ZGLOSZONY = "zgłoszony", "Zgłoszony"
        WALIDOWANY = "walidowany", "Walidowany"
        W_TESTACH = "w testach", "W testach"
        WDROZONY = "wdrożony", "Wdrożony"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    title = models.CharField(max_length=240)
    body = models.TextField()

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="threads",
    )
    author_name = models.CharField(max_length=120, default="Mieszkaniec (demo)")
    author_role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.MIESZKANIEC
    )
    organization = models.CharField(max_length=160, blank=True)
    powiat = models.CharField(max_length=60, blank=True, db_index=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NOWE, db_index=True
    )
    # czy administrator już to widział (kropka w skrzynce)
    read = models.BooleanField(default=False)
    # cykl życia pomysłu na tablicy: zgłoszony → walidowany → w testach → wdrożony
    stage = models.CharField(
        max_length=20, choices=Stage.choices, blank=True, db_index=True
    )

    # kontekst dopasowania (przy luce) — po co to trafiło do Hubu
    concepts = models.JSONField(default=list, blank=True)
    unknown_terms = models.JSONField(default=list, blank=True)
    top_score = models.PositiveSmallIntegerField(null=True, blank=True)
    query_text = models.TextField(blank=True)

    # powiązana karta innowacji (test, pytanie o konkretną kartę)
    innovation = models.ForeignKey(
        "catalog.Innovation",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="threads",
    )
    rating = models.PositiveSmallIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "wątek"
        verbose_name_plural = "watki"

    def __str__(self) -> str:
        return f"[{self.kind}] {self.title}"

    @property
    def is_unread(self) -> bool:
        return not self.read and self.status == self.Status.NOWE


class Fiszka(models.Model):
    """Fiszka pomysłu w 4 krokach (moduł III)."""

    class Etap(models.TextChoices):
        POMYSŁ = "pomysł", "Pomysł"
        PROTOTYP = "prototyp", "Prototyp"
        TESTOWANIE = "testowanie", "Testowanie"
        SKALOWANIE = "gotowe do skalowania", "Gotowe do skalowania"

    thread = models.OneToOneField(Thread, on_delete=models.CASCADE, related_name="fiszka")
    istota = models.TextField()  # na czym polega rozwiązanie
    adresat = models.TextField()  # kogo dotyczy
    etap = models.CharField(max_length=32, choices=Etap.choices, default=Etap.POMYSŁ)
    obszar = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = "fiszka"
        verbose_name_plural = "fiszki"

    def __str__(self) -> str:
        return f"fiszka: {self.thread.title}"


class Message(models.Model):
    """Wiadomość w wątku — pytanie, odpowiedź ROPS/eksperta, dyskusja."""

    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="messages",
    )
    author_name = models.CharField(max_length=120, default="Mieszkaniec (demo)")
    role = models.CharField(max_length=20, default="mieszkaniec")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "wiadomość"
        verbose_name_plural = "wiadomości"

    def __str__(self) -> str:
        return f"{self.author_name}: {self.text[:40]}"


class Vote(models.Model):
    """Walidacja na tablicy: „mam ten problem” / „chcę testować” / „mogę pomóc”."""

    class Value(models.TextChoices):
        MAM_TO = "mam_to", "Mam ten problem"
        CHCE_TESTOWAC = "chce_testowac", "Chcę testować"
        MOGE_POMOC = "moge_pomoc", "Mogę pomóc"

    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="votes")
    value = models.CharField(max_length=24, choices=Value.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="votes",
    )
    # bez logowania też można — identyfikator przeglądarki (bez danych osobowych)
    client_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["thread", "value", "client_id"],
                name="hub_vote_unique_per_client",
            )
        ]
        verbose_name = "głos"
        verbose_name_plural = "głosy"

    def __str__(self) -> str:
        return f"{self.value} → {self.thread_id}"


class Rating(models.Model):
    """Ocena 1–5 istniejącej innowacji + wymagany komentarz (moduł IV)."""

    innovation = models.ForeignKey(
        "catalog.Innovation", on_delete=models.CASCADE, related_name="ratings"
    )
    score = models.PositiveSmallIntegerField()
    comment = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ratings",
    )
    client_id = models.CharField(max_length=64, blank=True, default="")
    author_name = models.CharField(max_length=120, default="Tester (demo)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["innovation", "client_id"],
                name="hub_rating_unique_per_client",
            )
        ]
        verbose_name = "ocena"
        verbose_name_plural = "oceny"

    def __str__(self) -> str:
        return f"{self.innovation_id}: {self.score}/5"

    def clean(self):
        from django.core.exceptions import ValidationError

        if not 1 <= int(self.score) <= 5:
            raise ValidationError({"score": "Ocena musi być z zakresu 1–5."})
        if not (self.comment or "").strip():
            raise ValidationError({"comment": "Komentarz jest wymagany przy ocenie."})


class Notification(models.Model):
    """
    Powiadomienie w aplikacji (dzwoneczek).

    `user=None` = kanał administracyjny (nowe zgłoszenie), do tego kanał
    „nabory” — automatyczne powiadomienia o zmianach w naborach (§5).
    """

    CHANNELS = [
        ("zgloszenia", "Zgłoszenia"),
        ("nabory", "Nabory grantowe"),
        ("odpowiedzi", "Odpowiedzi"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    thread = models.ForeignKey(
        Thread, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications"
    )
    channel = models.CharField(max_length=24, choices=CHANNELS, default="zgloszenia")
    title = models.CharField(max_length=240)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "powiadomienie"
        verbose_name_plural = "powiadomienia"

    def __str__(self) -> str:
        return self.title
