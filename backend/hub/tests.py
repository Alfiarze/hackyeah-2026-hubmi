"""Testy modułu hub (asystent kreatora i digest) z Jev AI."""
from django.test import TestCase
from rest_framework.test import APIClient

from hub import ai as kreator_ai
from hub.models import Thread, Message


class HubAiTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_develop_idea_jev(self):
        """Asystent kreatora powinien zwrócić ustrukturyzowane sugestie i obszar."""
        out = kreator_ai.develop_idea(
            "Sąsiedzkie dyżury opieki nad samotnymi seniorami",
            {},
            [],
            None,
        )
        self.assertIn("source", out)
        self.assertIn("obszar", out)
        self.assertIn("sugestie", out)
        self.assertTrue(len(out["sugestie"]) >= 1)

    def test_thread_digest_jev(self):
        """Streszczenie wątku powinno diagnozować stan i pilność."""
        thread = Thread.objects.create(
            title="Brak windy w urzędzie",
            body="Schody uniemożliwiają wjazd wózkiem.",
            author_name="Jan",
        )
        Message.objects.create(
            thread=thread,
            author_name="Jan",
            role="mieszkaniec",
            text="Kiedy będzie zamontowany podjazd?",
        )
        Message.objects.create(
            thread=thread,
            author_name="Koordynator",
            role="rops",
            text="Wniosek do PFRON został złożony, czekamy na decyzję.",
        )
        resp = self.client.get(f"/api/threads/{thread.id}/digest/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("summary", data)
        self.assertIn("source", data)
