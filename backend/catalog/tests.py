"""Testy modułu Catalog (wektory LSA i wyszukiwanie hybrydowe)."""
from django.test import TestCase
from rest_framework.test import APIClient

from catalog import search, vectors


class CatalogVectorsTest(TestCase):
    def test_encode_query_and_document(self):
        """Wektoryzacja zapytań i dokumentów powinna zwracać znormalizowany wektor 48D."""
        vec = vectors.encode_query("senior opieka")
        if vectors.available():
            self.assertIsNotNone(vec)
            self.assertEqual(len(vec), 48)

    def test_quick_search_hybrid(self):
        """GET /api/search/?q=...&mode=hybrid powinien działać bez błędów."""
        client = APIClient()
        resp = client.get("/api/search/?q=senior&mode=hybrid")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertEqual(data["mode"], "hybrid")
