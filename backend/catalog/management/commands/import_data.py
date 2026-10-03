"""
Pełny stan startowy HubMI w jednym wywołaniu (entrypoint kontenera):

  1. konta demo (4 grupy odbiorców + admin)
  2. 115 innowacji + 76 dokumentów z materiałów ROPS
  3. 8 wątków seed — żeby skrzynka admina, tablica i trendy nie były puste

Wszystko idempotentne: drugie uruchomienie nic nie duplikuje.
"""
from django.core.management.base import BaseCommand

from accounts.services import seed_users
from catalog.services import import_innovations, import_library


class Command(BaseCommand):
    help = "Import danych ROPS, kont demo i seedu wątków (idempotentne)."

    def handle(self, *args, **options):
        users = seed_users()
        inn = import_innovations()
        lib = import_library()

        try:
            from hub.services import seed_threads

            threads = seed_threads()
        except Exception as exc:  # noqa: BLE001 — hub mógł nie zdążyć z migracją
            threads = {"error": str(exc)}

        self.stdout.write(
            self.style.SUCCESS(
                "import: "
                f"użytkownicy+{users}, innowacje={inn.get('innovations')}, "
                f"kategorie={inn.get('categories')}, wdrożenia={inn.get('deployments')}, "
                f"dokumenty={lib.get('library_items')} (wyróżnione: {lib.get('featured')}), "
                f"watki={threads}"
            )
        )
