from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Czeka, aż Postgres odpowie (kontener db musi przejść healthcheck)."

    def handle(self, *args, **options):
        import time

        from django.db import connection
        from django.db.utils import OperationalError

        for attempt in range(60):
            try:
                connection.ensure_connection()
                self.stdout.write(self.style.SUCCESS("baza gotowa"))
                return
            except OperationalError as exc:
                time.sleep(1)
                last = str(exc)
        raise CommandError(f"baza nie odpowiada po 60 s: {last}")
