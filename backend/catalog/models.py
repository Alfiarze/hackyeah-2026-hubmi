"""
Moduł II (Zasobnik wiedzy) i baza, na której stoi matchmaking.

Dwa źródła wiedzy:
  * `Innovation`     — 115 kart Biblioteki Innowacji Społecznych (baza dopasowań)
  * `LibraryItem`    — 76 dokumentów ROPS: raporty, Mapa Wyzwań, Canwy, nabór

Wszystko importowane z `data/` i `app/src/data/` — tu jest kopia robocza,
którą administrator może edytować bez ruszania plików w repo.
"""
from __future__ import annotations

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models

from pgvector.django import VectorField


class Category(models.Model):
    """9 kategorii Biblioteki Innowacji Społecznych."""

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)

    class Meta:
        ordering = ["title"]
        verbose_name = "kategoria"
        verbose_name_plural = "kategorie"

    def __str__(self) -> str:
        return self.title


class Innovation(models.Model):
    """
    Karta innowacji. `id` to slug z ROPS-a, bo takie linki są już w materiałach.

    Trzy pola wyszukiwania (wszystkie wykorzystywane, nie dekoracyjne):
      * `search_vector` — tsvector po polsku, indeks GIN, szukanie frazowe
      * `embedding`     — wektor 48D (LSA z scripts/build_embeddings.py) w pgvector
      * silnik Pythona  — BM25 + wątki pojęciowe, wynik wytłumaczalny dla jury
    """

    id = models.SlugField(primary_key=True, max_length=120)
    name = models.CharField(max_length=300)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="innovations"
    )
    problem = models.TextField(blank=True)  # czego dotyczy ← strona „problem”
    description = models.TextField(blank=True)
    target = models.TextField(blank=True)  # grupa docelowa
    beneficiaries = models.TextField(blank=True)  # kto może skorzystać
    evidence = models.TextField(blank=True)  # wyniki testu
    authors = models.JSONField(default=list, blank=True)
    badges = models.JSONField(default=list, blank=True)
    raw_text = models.TextField(blank=True)
    video = models.URLField(max_length=500, blank=True, null=True)
    pdf = models.URLField(max_length=500, blank=True, null=True)
    zip = models.URLField(max_length=500, blank=True, null=True)
    license = models.CharField(max_length=80, blank=True, null=True)
    url = models.URLField(max_length=500, blank=True)
    # kiedy ostatnio edytował administrator (moduł VI: „szybka aktualizacja”)
    updated_by = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- wyszukiwanie -------------------------------------------------------
    search_vector = SearchVectorField(null=True, blank=True)
    embedding = VectorField(dimensions=48, null=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "innowacja"
        verbose_name_plural = "innowacje"
        indexes = [GinIndex(fields=["search_vector"], name="catalog_search_gin")]

    def __str__(self) -> str:
        return self.name

    @property
    def cat_slug(self) -> str:
        return self.category.slug if self.category_id else ""

    @property
    def cat_name(self) -> str:
        return self.category.title if self.category_id else ""


class Deployment(models.Model):
    """
    Gdzie innowacja już działa (pinezki na mapie).

    Uwaga: geografia wdrożeń to dane DEMO — ROPS nie publikuje listy wdrożeń,
    dlatego `demo=True` przy każdym rekordzie i tak jest widoczne w API.
    """

    innovation = models.ForeignKey(
        Innovation, on_delete=models.CASCADE, related_name="deployments"
    )
    powiat = models.CharField(max_length=60)
    org = models.CharField(max_length=200, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    demo = models.BooleanField(default=True)

    class Meta:
        ordering = ["powiat", "org"]
        verbose_name = "wdrożenie"
        verbose_name_plural = "wdrożenia"

    def __str__(self) -> str:
        return f"{self.innovation_id} → {self.powiat}"


class LibraryItem(models.Model):
    """
    Dokument z Zasobnika wiedzy (76 sztuk): raporty, Mapa Wyzwań Społecznych,
    Canwy Innowacji Społecznych, wzory wniosków do naboru IWS 2.0.
    """

    section = models.CharField(max_length=120, db_index=True)  # raporty | publikacje | nabory | ocena
    title = models.CharField(max_length=400)
    year = models.CharField(max_length=10, blank=True, null=True)
    type = models.CharField(max_length=80, blank=True)
    url = models.URLField(max_length=500, blank=True)
    desc = models.TextField(blank=True)
    bytes = models.BigIntegerField(null=True, blank=True)
    # wyróżnienie na górze Biblioteki (Mapa Wyzwań Społecznych — wymóg modułu II)
    featured = models.BooleanField(default=False)
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        ordering = ["section", "title"]
        verbose_name = "dokument"
        verbose_name_plural = "dokumenty"
        indexes = [GinIndex(fields=["search_vector"], name="library_search_gin")]

    def __str__(self) -> str:
        return self.title
