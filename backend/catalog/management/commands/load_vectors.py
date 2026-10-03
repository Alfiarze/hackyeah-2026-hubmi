"""
Ładuje wektory LSA (115 kart) z `app/src/data/vectors.json` do kolumny
`embedding` w Postgresie — po to, żeby ranking liczył SQL, a nie pętla.

Karty dodane w panelu administratora dostają wektor przy zapisie
(`catalog.serializers.InnovationWriteSerializer`), więc tu ładujemy tylko
to, czego jeszcze nie ma.
"""
import numpy as np
from django.core.management.base import BaseCommand

from catalog.models import Innovation
from catalog import vectors


class Command(BaseCommand):
    help = "Wczytuje wektory kart do pgvector (bezpieczne przy każdym starcie)."

    def handle(self, *args, **options):
        if not vectors.available():
            self.stdout.write("brak vectors.json — pomijam")
            return

        doc_vectors = vectors.doc_vectors()
        if not doc_vectors:
            self.stdout.write("brak wektorów w pliku — pomijam")
            return

        missing = list(
            Innovation.objects.filter(embedding__isnull=True).values_list("id", flat=True)
        )
        if not missing:
            self.stdout.write("wszystkie karty mają wektor")
            return

        updated = 0
        for pk in missing:
            vec = doc_vectors.get(pk)
            if vec is None:
                continue
            Innovation.objects.filter(pk=pk).update(
                embedding=np.asarray(vec, dtype=np.float32)
            )
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"wektory: {updated}/{len(missing)} kart"))
