"""
Moduł I — Matchmaking społeczny (obowiązkowy) i dopięty do niego AI.

`SearchQuery` to „zapis każdego zapytania jako sygnału potrzeby” — z tego
potem powstają trendy w panelu admina i lista luk bez rozwiązań.
`Gap` to zgłoszenie, że Biblioteka nie pokrywa tematu: problem bez rozwiązania
staje się zadaniem dla Hubu, a nie pustą listą dla użytkownika.
`RelevanceCheck` to natomiast osobny CRUD ocen „czy powiązane” robionych
przez Jev — patrz `/api/relevance/`.
"""
from django.conf import settings
from django.db import models


class SearchQuery(models.Model):
    text = models.TextField()
    powiat = models.CharField(max_length=60, blank=True)
    category = models.CharField(max_length=120, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="search_queries",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # co silnik rozpoznał w zapytaniu
    concepts = models.JSONField(default=list, blank=True)
    unknown = models.JSONField(default=list, blank=True)
    top_score = models.PositiveSmallIntegerField(null=True, blank=True)
    result_count = models.PositiveSmallIntegerField(default=0)
    is_gap = models.BooleanField(default=False)
    gap_reason = models.CharField(max_length=40, blank=True)
    # kto rozstrzygnął „czy powiązane”: llm | fallback
    ai_source = models.CharField(max_length=20, blank=True)
    # wynik do odtworzenia w panelu admina: [{id, score, tier, related, reason}]
    results = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "zapytanie"
        verbose_name_plural = "zapytania"

    def __str__(self) -> str:
        return f"{self.text[:60]} ({self.top_score})"


class Gap(models.Model):
    """Niepasujący temat → zgłoszenie luki (I → VI)."""

    class Status(models.TextChoices):
        NOWE = "nowe", "Nowe"
        W_TRAKCIE = "w trakcie", "W trakcie"
        ZAMKNIETE = "zamknięte", "Zamknięte"

    query = models.OneToOneField(
        SearchQuery, on_delete=models.CASCADE, related_name="gap"
    )
    thread = models.OneToOneField(
        "hub.Thread",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="gap",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NOWE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "luka"
        verbose_name_plural = "luki"

    def __str__(self) -> str:
        return f"luka: {self.query.text[:50]}"


class RelevanceCheck(models.Model):
    """
    Pojedyncza ocena „czy to, co wpisuje użytkownik, jest powiązane”
    — rekord pod CRUD `/api/relevance/`.

    `text` to treść wpisana na stronie, `context` to z czym ją porównujemy
    (np. opis karty innowacji albo treść programu). Werdykt liczy Jev
    (`noul` 0..1) i tu zostaje zapisany razem z pewnością oraz źródłem:
    `jev` = model, `fallback` = brak klucza/sieci, liczone z nakładania słów.
    """

    text = models.TextField()
    context = models.TextField(blank=True)
    label = models.CharField(max_length=120, blank=True)
    # noul >= threshold → related; próg można zmienić per rekord
    threshold = models.FloatField(default=0.5)

    # wynik oceny — zapisywany przy utworzeniu i przy edycji treści
    related = models.BooleanField(null=True, blank=True)
    noul = models.FloatField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    powod = models.CharField(max_length=400, blank=True)
    source = models.CharField(max_length=20, blank=True)  # jev | fallback
    jev_model = models.CharField(max_length=40, blank=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="relevance_checks",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "ocena powiązania"
        verbose_name_plural = "oceny powiązań"

    def __str__(self) -> str:
        return f"{self.label or self.text[:60]} ({self.source or 'bez oceny'})"
