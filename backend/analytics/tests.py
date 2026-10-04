"""
Testy zestawienia popytu (moduł VI).

Sprawdzamy to, na czym stoi cała wartość tej sekcji: że warianty tego samego
pytania lądują w jednym temacie (inaczej „rynek” rozsypie się na listę
jednorazowych zdań), że liczy się brak pokrycia, i że zestawienia nie widzi
ktoś bez roli ROPS.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile, Role
from matchmaking import demand
from matchmaking.models import DemandTopic, SearchQuery


def make_query(text, *, unknown=(), concepts=(), is_gap=False, top_score=None, days_ago=0, powiat=""):
    q = SearchQuery.objects.create(
        text=text,
        powiat=powiat,
        concepts=list(concepts),
        unknown=list(unknown),
        is_gap=is_gap,
        top_score=top_score,
    )
    if days_ago:
        # created_at ma auto_now_add, więc datę cofamy po zapisie
        SearchQuery.objects.filter(pk=q.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
        q.refresh_from_db()
    return q


class DemandTopicTest(TestCase):
    def test_warianty_tego_samego_pytania_to_jeden_temat(self):
        """Odmiana i brak polskich znaków nie mogą tworzyć osobnych potrzeb."""
        for text, unknown in [
            ("hodowla pstrąga w stawie", ["hodowla", "pstrąga", "stawie"]),
            ("hodowla pstraga w stawie", ["hodowla", "pstraga", "stawie"]),
            ("potrzebuję pomysłu na hodowlę pstrąga", ["potrzebuję", "pomysłu", "hodowlę", "pstrąga"]),
        ]:
            demand.record(make_query(text, unknown=unknown, is_gap=True), client_id="c1")

        self.assertEqual(DemandTopic.objects.count(), 1)
        topic = DemandTopic.objects.get()
        self.assertEqual(topic.searches, 3)
        self.assertEqual(topic.unmet_searches, 3)
        self.assertEqual(topic.askers, 1, "ta sama przeglądarka to jeden pytający")

    def test_rozne_potrzeby_zostaja_osobno(self):
        demand.record(make_query("hodowla pstrąga", unknown=["hodowla", "pstrąga"], is_gap=True))
        demand.record(make_query("kurs koparki", unknown=["kurs", "koparki"], is_gap=True))
        self.assertEqual(DemandTopic.objects.count(), 2)

    def test_watki_decyduja_przed_slowami_spoza_bazy(self):
        concepts = [{"id": "seniorzy", "label": "osoby starsze"}]
        demand.record(make_query("mama mieszka sama", concepts=concepts, top_score=71))
        demand.record(make_query("samotny dziadek na wsi", concepts=concepts, top_score=64))
        topic = DemandTopic.objects.get()
        self.assertEqual(topic.kind, "wątki")
        self.assertEqual(topic.searches, 2)
        self.assertEqual(topic.unmet_searches, 0)
        self.assertEqual(topic.best_score, 71)

    def test_rozni_pytajacy_sa_liczeni_osobno(self):
        for client in ("a", "b", "b"):
            demand.record(
                make_query("kurs koparki", unknown=["kurs", "koparki"], is_gap=True),
                client_id=client,
            )
        self.assertEqual(DemandTopic.objects.get().askers, 2)


class DemandApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        demand.record(
            make_query("hodowla pstrąga", unknown=["hodowla", "pstrąga"], is_gap=True, days_ago=40),
            client_id="c1",
        )
        demand.record(
            make_query("hodowla pstraga w stawie", unknown=["hodowla", "pstraga", "stawie"], is_gap=True),
            client_id="c2",
        )
        demand.record(
            make_query(
                "mama mieszka sama",
                concepts=[{"id": "seniorzy", "label": "osoby starsze"}],
                top_score=70,
            ),
            client_id="c1",
        )

    def test_bez_roli_rops_brak_dostepu(self):
        # 401 albo 403 - zależnie od tego, czy DRF zdążył poprosić o token;
        # dla nas liczy się, że anonim nie dostaje zestawienia.
        self.assertIn(self.client.get("/api/admin/demand/").status_code, (401, 403))

    def _login_rops(self):
        user = User.objects.create_user("rops-test", password="x")
        Profile.objects.update_or_create(user=user, defaults={"role": Role.ROPS.value})
        # Sygnał zakłada profil przy tworzeniu użytkownika, więc instancja w
        # pamięci trzyma jeszcze starą rolę - bez odczytu na świeżo test
        # sprawdzałby uprawnienia mieszkańca.
        self.client.force_authenticate(user=User.objects.get(pk=user.pk))

    def test_zestawienie_liczy_powtorzenia_i_czas(self):
        self._login_rops()
        data = self.client.get("/api/admin/demand/?days=180").json()

        self.assertEqual(data["totals"]["searches"], 3)
        self.assertEqual(data["totals"]["unmet_searches"], 2)
        # udział liczony z całości okresu, nie z samych tematów bez pokrycia
        self.assertEqual(data["totals"]["unmet_share"], 67)
        self.assertEqual(data["totals"]["askers"], 2)

        self.assertEqual(len(data["topics"]), 1, "domyślnie tylko tematy bez pokrycia")
        topic = data["topics"][0]
        self.assertEqual(topic["searches"], 2)
        self.assertEqual(topic["unmet_searches"], 2)
        self.assertEqual(topic["status"], "brak pokrycia")
        # pierwsze pytanie 40 dni temu (okno „poprzednie 30 dni”), drugie dziś
        self.assertEqual(topic["trend"]["recent_30d"], 1)
        self.assertEqual(topic["trend"]["previous_30d"], 1)
        self.assertEqual(topic["trend"]["direction"], "stabilne")
        self.assertTrue(topic["monthly"], "musi być rozkład w czasie")

    def test_scope_all_pokazuje_rowniez_tematy_pokryte(self):
        self._login_rops()
        data = self.client.get("/api/admin/demand/?days=180&scope=all").json()
        self.assertEqual(len(data["topics"]), 2)
        self.assertIn("pokryte", [t["status"] for t in data["topics"]])
