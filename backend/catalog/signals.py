"""Po każdej zmianie karty: odśwież wektor wyszukiwania i indeks silnika."""
from django.contrib.postgres.search import SearchVector
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Innovation, LibraryItem


def _drop_engine_index():
    try:
        from matchmaking.engine import invalidate

        invalidate()
    except Exception:  # noqa: BLE001 — silnik przebuduje się przy pierwszym zapytaniu
        pass


@receiver(post_save, sender=Innovation)
def innovation_saved(sender, instance, **kwargs):  # noqa: ARG001
    # tsvector liczony z `simple`: Postgres nie ma polskiego stemmera, a rdzenie
    # dopina zapytanie prefiksowe (zob. catalog/search.prefix_query)
    Innovation.objects.filter(pk=instance.pk).update(
        search_vector=SearchVector(
            "name", "problem", "description", "target",
            "beneficiaries", "evidence", "raw_text", config="simple",
        )
    )
    # nowa karta ma być od razu w dopasowywaniu, nie dopiero po restarcie
    _drop_engine_index()


@receiver(post_delete, sender=Innovation)
def innovation_deleted(sender, instance, **kwargs):  # noqa: ARG001
    _drop_engine_index()


@receiver(post_save, sender=LibraryItem)
def libraryitem_saved(sender, instance, **kwargs):  # noqa: ARG001
    LibraryItem.objects.filter(pk=instance.pk).update(
        search_vector=SearchVector("title", "desc", config="simple")
    )
