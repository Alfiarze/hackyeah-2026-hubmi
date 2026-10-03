"""Testy integracyjne modułu matchmaking i transportu Jev AI."""
from django.test import TestCase
from rest_framework.test import APIClient

from hubmi import ai as transport
from matchmaking import ai as ai_service
from matchmaking.models import RelevanceCheck


class JevTransportTest(TestCase):
    def test_jev_ping_or_fallback(self):
        """Sprawdza, czy evaluate() zwraca słownik z odpowiedziami lub None (bez rzucania wyjątków)."""
        res = transport.evaluate(
            "test",
            {
                "is_test": {
                    "type": "noul",
                    "instructions": "Czy to test jednostkowy?",
                    "criteria": {"true": "Tak", "false": "Nie"},
                }
            },
        )
        if res is not None:
            self.assertIn("answers", res)
            noul = transport.noul_answer(res, "is_test")
            self.assertIsNotNone(noul)
            self.assertGreaterEqual(noul, 0.0)
            self.assertLessEqual(noul, 1.0)


class RelevanceApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_relevance_create_and_eval(self):
        """POST /api/relevance/ powinien utworzyć rekord i policzyć werdykt."""
        resp = self.client.post(
            "/api/relevance/",
            {
                "text": "Potrzebujemy wsparcia dla seniorów z demencją w domu opieki",
                "context": "Opieka wytchnieniowa dla opiekunów osób starszych",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("related", data)
        self.assertIn("noul", data)
        self.assertIn("source", data)
        self.assertIn(data["source"], ("jev", "fallback"))
        self.assertTrue(RelevanceCheck.objects.filter(pk=data["id"]).exists())

    def test_match_search_ai(self):
        """POST /api/match/search/ zwraca analizę, wyniki i werdykty AI."""
        resp = self.client.post(
            "/api/match/search/",
            {"q": "mama mieszka sama na wsi i nie ma z kim porozmawiać"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertIn("ai", data)
        self.assertIn("gap", data)

    def test_ask_ai(self):
        """POST /api/ai/ask/ zwraca odpowiedź z oceną źródeł przez Jev."""
        resp = self.client.post(
            "/api/ai/ask/",
            {"question": "Jakie są zasady wykorzystania innowacji?"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("answer", data)
        self.assertIn("sources", data)
        self.assertIn("source", data)
        self.assertIn(data["source"], ("jev", "fallback", "brak"))
