"""
Moduł VII — Middleman Innowacji.

Problem: karta innowacji opisuje rozwiązanie w ogóle, a wójt gminy wiejskiej
do 5 tys. mieszkańców musi wiedzieć, co to znaczy u niego — ile sztuk, za ile,
kto to obsłuży i co trzeba zmienić, żeby się dało.

`InstitutionProfile` to profil zgłaszającej się instytucji, `ImplementationPlan`
to karta wdrożenia: usługa, zasoby, koszt, harmonogram, ryzyka.
"""
from django.conf import settings
from django.db import models


class InstitutionProfile(models.Model):
    ORG_TYPES = [
        "gmina wiejska",
        "gmina miejska",
        "CUS / OPS",
        "powiat (PCPR)",
        "NGO / fundacja",
        "DPS / placówka",
    ]
    SIZE_BANDS = ["do 5 tys.", "5–20 tys.", "20–100 tys.", "powyżej 100 tys."]

    name = models.CharField(max_length=200)
    org_type = models.CharField(max_length=40, choices=[(t, t) for t in ORG_TYPES])
    size_band = models.CharField(max_length=20, choices=[(s, s) for s in SIZE_BANDS])
    budget = models.PositiveIntegerField(default=0, help_text="Budżet roczny na działanie, zł")
    staff = models.PositiveSmallIntegerField(default=1, help_text="Ile osób może to prowadzić")
    powiat = models.CharField(max_length=60, blank=True)
    notes = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="institutions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "profil instytucji"
        verbose_name_plural = "profile instytucji"

    def __str__(self) -> str:
        return f"{self.name} ({self.org_type}, {self.size_band})"


class ImplementationPlan(models.Model):
    institution = models.ForeignKey(
        InstitutionProfile, on_delete=models.CASCADE, related_name="plans"
    )
    innovation = models.ForeignKey(
        "catalog.Innovation",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="plans",
    )
    title = models.CharField(max_length=300)
    summary = models.TextField()
    scale = models.CharField(max_length=240, blank=True)
    staffing = models.CharField(max_length=240, blank=True)
    cost_low = models.PositiveIntegerField(default=0)
    cost_high = models.PositiveIntegerField(default=0)
    affordable = models.BooleanField(default=True)
    steps = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    adaptations = models.JSONField(default=list)
    legal = models.JSONField(default=list)
    # llm = model z kontenera ai dopracował treść; regula = sam deterministyczny port
    source = models.CharField(max_length=20, default="regula")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "plan wdrożenia"
        verbose_name_plural = "plany wdrożeń"

    def __str__(self) -> str:
        return self.title
