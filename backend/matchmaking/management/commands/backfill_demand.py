"""
Przelicza tematy popytu z istniejącego logu zapytań.

Potrzebne w dwóch sytuacjach: po wdrożeniu (log jest, liczników jeszcze nie)
oraz po zmianie zasad sklejania tematów w `demand.py` - wtedy stare kubełki
trzeba zbudować od nowa, bo inaczej panel pokazywałby mieszankę dwóch reguł.

    python manage.py backfill_demand --reset
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from matchmaking import demand
from matchmaking.models import DemandTopic, SearchQuery


class Command(BaseCommand):
    help = "Liczy DemandTopic z zapisanych zapytań (SearchQuery)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Skasuj dotychczasowe tematy przed liczeniem (po zmianie reguł klucza).",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            removed = DemandTopic.objects.count()
            with transaction.atomic():
                SearchQuery.objects.update(topic=None)
                DemandTopic.objects.all().delete()
            self.stdout.write(f"Skasowano tematów: {removed}")

        # Od najstarszego, żeby first_seen/last_seen wyszły zgodnie z historią.
        queries = SearchQuery.objects.order_by("created_at").iterator()
        counted = skipped = 0
        for q in queries:
            # Pytania do Zasobnika wiedzy („[pytanie] …”) nie są szukaniem
            # rozwiązania - w zestawieniu popytu tylko by je rozmywały.
            if q.text.startswith("[pytanie]"):
                skipped += 1
                continue
            if demand.record(q) is None:
                skipped += 1
            else:
                counted += 1

        topics = DemandTopic.objects.count()
        unmet = DemandTopic.objects.filter(unmet_searches__gt=0).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Zapytań policzonych: {counted} (pominiętych: {skipped}). "
                f"Tematów: {topics}, w tym bez pokrycia: {unmet}."
            )
        )
