"""Testy integracyjne modułu Middleman i ewaluacji planu wdrożenia z Jev AI."""
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Category, Innovation
from middleman.models import ImplementationPlan


class MiddlemanPlanTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(slug="seniorzy", title="Seniorzy")
        self.inn = Innovation.objects.create(
            id="test-innowacja",
            name="Testowa Innowacja",
            category=self.cat,
            problem="Problem seniorów",
            description="Opis innowacji testowej",
        )

    def test_plan_with_jev_ai(self):
        """POST /api/institutions/plan/ powinien wygenerować plan z uwagami Jev AI."""
        resp = self.client.post(
            "/api/institutions/plan/",
            {
                "innovation_id": "test-innowacja",
                "org_type": "CUS / OPS",
                "size_band": "do 5 tys.",
                "budget": 100000,
                "staff": 5,
                "powiat": "krakowski",
                "use_ai": True,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("risks", data)
        self.assertIn("source", data)
        self.assertIn(data["source"], ("jev", "regula"))
        self.assertTrue(ImplementationPlan.objects.filter(pk=data["id"]).exists())
