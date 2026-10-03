"""
Seed demo — 9 wątków, żeby skrzynka admina, tablica, głosy i trendy nie były
puste przy pierwszym wejściu. Idempotentne (klucz = uuid5 od nazwy).

⚠️ Wyłącznie dane DEMO: pseudonimy, „(demo)” w nazwach, żadnych danych
osobowych z materiałów ROPS — tego zabrania §9 zadania.
"""
from __future__ import annotations

import uuid

from django.contrib.auth.models import User

from accounts.models import Role

from .models import Fiszka, Message, Notification, Rating, Thread, Vote

NAMESPACE_SEED = "hubmi"


def _key(key: str) -> uuid.UUID:
    """Stały klucz — ten sam seed daje ten sam identyfikator przy każdym starcie."""
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"{NAMESPACE_SEED}:{key}")


SEED_THREADS = [
    # 1 — luka: opiekunowie bez wytchnienia (matchmaking nie znalazł pokrycia)
    dict(
        key="seed-1",
        kind=Thread.Kind.LUKA,
        title="Brak wsparcia dla opiekunów rodzinnych osób z demencją",
        body=(
            "Opiekuję się mamą z demencją. Nie ma nikogo, kto by mnie zastąpił "
            "na kilka godzin. Nie wiem, gdzie szukać pomocy."
        ),
        author_name="Mieszkanka (demo)",
        powiat="limanowski",
        status=Thread.Status.NOWE,
        concepts=["demencja i pamięć", "opieka długoterminowa"],
        unknown_terms=["zastąpił", "wytchnienie"],
        top_score=28,
        age_hours=2,
    ),
    # 2 — luka: młodzież po szkole
    dict(
        key="seed-2",
        kind=Thread.Kind.LUKA,
        title="Młodzież po szkole nie ma gdzie się podziać, sięga po alkohol",
        body=(
            "W gminie nie ma świetlicy ani klubu. Młodzież spotyka się na "
            "przystanku, zdarza się alkohol. Szukamy sprawdzonego modelu."
        ),
        author_name="Pracownik CUS (demo)",
        powiat="dąbrowski",
        status=Thread.Status.NOWE,
        concepts=["dzieci i młodzież", "obszary wiejskie"],
        unknown_terms=["alkohol", "świetlica", "przystanek"],
        top_score=31,
        age_hours=5,
    ),
    # 3 — pomysł z odpowiedzią ROPS (pętla komunikacji dla jury)
    dict(
        key="seed-3",
        kind=Thread.Kind.POMYSŁ,
        title="Sąsiedzka skrzynka leków",
        body=(
            "Punkt w sołectwie, gdzie sąsiedzi zostawiają niewykorzystane, "
            "nieotwarte leki OTC, a pielęgniarka środowiskowa je wydaje."
        ),
        author_name="Grupa nieformalna (demo)",
        powiat="nowosądecki",
        status=Thread.Status.ODPOWIEDZIANE,
        read=True,
        stage=Thread.Stage.WALIDOWANY,
        age_hours=30,
        fiszka=dict(
            istota="Obieg niewykorzystanych leków OTC w małej społeczności.",
            adresat="Mieszkańcy sołectw, pielęgniarki środowiskowe.",
            etap="pomysł",
            obszar="zdrowie i medycyna",
        ),
        votes={"mam_to": 3, "chce_testowac": 2, "moge_pomoc": 1},
        messages=[
            dict(
                role="rops",
                author_name="Koordynator innowacji (demo)",
                text=(
                    "Dziękujemy za zgłoszenie. Pomysł jest ciekawy, ale wymaga "
                    "sprawdzenia pod kątem prawa farmaceutycznego. Proponujemy "
                    "konsultację specjalistyczną — czy pasuje Państwu termin w "
                    "przyszłym tygodniu?"
                ),
                age_hours=26,
            )
        ],
    ),
    # 4 — pytanie do ROPS
    dict(
        key="seed-4",
        kind=Thread.Kind.PYTANIE,
        title="Czy na grant może aplikować grupa nieformalna?",
        body="Jesteśmy w trójkę, bez stowarzyszenia. Możemy składać wniosek?",
        author_name="Mieszkaniec (demo)",
        status=Thread.Status.ODPOWIEDZIANE,
        read=True,
        age_hours=50,
        messages=[
            dict(
                role="rops",
                author_name="Mentor (demo)",
                text=(
                    "Tak. Zgodnie z zasadami naboru aplikować mogą również grupy "
                    "nieformalne złożone z kilku osób fizycznych. Wkład własny nie "
                    "jest wymagany."
                ),
                age_hours=48,
            )
        ],
    ),
    # 5 — pomysł w testach z dyskusją
    dict(
        key="seed-5",
        kind=Thread.Kind.POMYSŁ,
        title="Klub sąsiedzki przy bibliotece wiejskiej",
        body=(
            "Dwie godziny dziennie sala biblioteki otwarta dla sąsiadów: kawa, "
            "pomoc z drukowaniem, wzajemne lekcje obsługi telefonu."
        ),
        author_name="Bibliotekarka (demo)",
        powiat="limanowski",
        status=Thread.Status.ODPOWIEDZIANE,
        read=True,
        stage=Thread.Stage.W_TESTACH,
        age_hours=72,
        fiszka=dict(
            istota="Regularne, niskoobciążające spotkania sąsiedzkie w istniejącym budynku.",
            adresat="Seniorzy z obszarów wiejskich, wykluczeni cyfrowo.",
            etap="testowanie",
            obszar="aktywność i kultura",
        ),
        votes={"mam_to": 5, "chce_testowac": 3, "moge_pomoc": 2},
        messages=[
            dict(
                role="mieszkaniec",
                author_name="Sołtys (demo)",
                text="U nas biblioteka ma wolne popołudnia, mogę zorganizować kawę.",
                age_hours=70,
            ),
            dict(
                role="rops",
                author_name="Koordynator innowacji (demo)",
                text=(
                    "Świetnie — opiszcie po miesiącu, ilu nowych osób przyszło i czy "
                    "zostały. To jest wskaźnik, który da się zestawić z kartami "
                    "w Bibliotece."
                ),
                age_hours=66,
            ),
        ],
    ),
    # 6 — pomysł bez odpowiedzi (do ogarnięcia w skrzynce)
    dict(
        key="seed-6",
        kind=Thread.Kind.POMYSŁ,
        title="Dyżur sąsiedzki — zastępstwo dla opiekunów",
        body=(
            "Lista sąsiadek i sąsiadów gotowych odebrać seniora na kilka godzin "
            "w tygodniu. Koordynacja przez telefon gminny."
        ),
        author_name="Grupa nieformalna (demo)",
        powiat="tarnowski",
        status=Thread.Status.NOWE,
        stage=Thread.Stage.ZGLOSZONY,
        age_hours=8,
        fiszka=dict(
            istota="Oddolna lista zastępstw czasowych dla osób opiekujących się bliskimi.",
            adresat="Opiekunowie rodzinni, seniorzy wymagający wsparcia.",
            etap="pomysł",
            obszar="usługi społeczne",
        ),
        votes={"mam_to": 4, "moge_pomoc": 1},
    ),
    # 7 — tester: ocena istniejącej innowacji
    dict(
        key="seed-7",
        kind=Thread.Kind.TEST,
        title="Testujemy BaWita w warsztacie terapii zajęciowej",
        body=(
            "Tablica sprawdziła się w zajęciach z pamięci — uczestniczki i uczestnicy "
            "donoszą, że chcą więcej. Chcemy zgłosić wnioski z testu."
        ),
        author_name="Terapeuta (demo)",
        powiat="krakowski",
        status=Thread.Status.ODPOWIEDZIANE,
        read=True,
        innovation_id="bawita",
        rating=5,
        age_hours=20,
        votes={"chce_testowac": 2},
        messages=[
            dict(
                role="rops",
                author_name="Koordynator innowacji (demo)",
                text="Prosimy o opis efektu w tym samym formacie co karta — dopiszemy do wersji roboczej.",
                age_hours=18,
            )
        ],
    ),
    # 8 — partnerstwo JST ↔ NGO (moduł V)
    dict(
        key="seed-8",
        kind=Thread.Kind.PARTNER,
        title="Szukamy NGO do wspólnego projektu: seniorzy + cyfryzacja",
        body=(
            "Urząd ma salę, komputery i wolontariuszy, brakuje organizacji, która "
            "poprowadzi cykl zajęć dla seniorów. Szukamy partnera do wspólnego "
            "zgłoszenia."
        ),
        author_name="Urząd Gminy (demo)",
        organization="Gmina wiejska (demo)",
        powiat="nowosądecki",
        status=Thread.Status.NOWE,
        age_hours=12,
        votes={"moge_pomoc": 3},
    ),
    # 9 — poproś eksperta (moduł V)
    dict(
        key="seed-9",
        kind=Thread.Kind.EKSPERT,
        title="Poproś eksperta: ile realnie kosztuje wdrożenie takiej metody?",
        body=(
            "Zanim pokażemy pomysł wójtowi, potrzebujemy widełek kosztu rocznego "
            "i tego, kto to obsługuje etatowo."
        ),
        author_name="Pracownik CUS (demo)",
        powiat="dąbrowski",
        status=Thread.Status.NOWE,
        age_hours=6,
    ),
]

SEED_RATINGS = [
    dict(key="rating-1", innovation_id="bawita", score=5,
         comment="Sprawdziła się w zajęciach z pamięci — prosta w obsłudze, łatwa do zmycia."),
    dict(key="rating-2", innovation_id="senior-cuder", score=4,
         comment="Dobrze działa w grupie 6–8 osób; przy większej potrzebny drugi prowadzący."),
]


def seed_threads() -> dict:
    from datetime import timedelta

    from django.utils import timezone

    now = timezone.now()
    created_threads = created_messages = created_votes = created_ratings = 0

    for spec in SEED_THREADS:
        thread, was_created = Thread.objects.get_or_create(
            id=_key(spec["key"]),
            defaults=dict(
                kind=spec["kind"],
                title=spec["title"],
                body=spec["body"],
                author_name=spec.get("author_name", "Mieszkaniec (demo)"),
                author_role=spec.get("author_role", Role.MIESZKANIEC),
                organization=spec.get("organization", ""),
                powiat=spec.get("powiat", ""),
                status=spec.get("status", Thread.Status.NOWE),
                read=spec.get("read", False),
                stage=spec.get("stage", ""),
                concepts=spec.get("concepts", []),
                unknown_terms=spec.get("unknown_terms", []),
                top_score=spec.get("top_score"),
                innovation_id=spec.get("innovation_id"),
                rating=spec.get("rating"),
            ),
        )
        if not was_created:
            continue
        created_threads += 1

        Thread.objects.filter(pk=thread.pk).update(
            created_at=now - timedelta(hours=spec.get("age_hours", 1))
        )

        if spec.get("fiszka"):
            Fiszka.objects.create(thread=thread, **spec["fiszka"])

        for msg in spec.get("messages", []):
            if not Message.objects.filter(thread=thread, text=msg["text"]).exists():
                m = Message.objects.create(
                    thread=thread,
                    author_name=msg.get("author_name", "Koordynator ROPS (demo)"),
                    role=msg.get("role", "rops"),
                    text=msg["text"],
                )
                Message.objects.filter(pk=m.pk).update(
                    created_at=now - timedelta(hours=msg.get("age_hours", 1))
                )
                created_messages += 1

        for value, count in (spec.get("votes") or {}).items():
            for i in range(count):
                _, was_vote = Vote.objects.get_or_create(
                    thread=thread,
                    value=value,
                    client_id=f"seed:{spec['key']}:{i}",
                )
                created_votes += int(was_vote)

    # oceny do modułu IV — po import innowacji, inaczej klucz obcy nie istnieje
    from catalog.models import Innovation

    for spec in SEED_RATINGS:
        if not Innovation.objects.filter(pk=spec["innovation_id"]).exists():
            continue
        _, was_rating = Rating.objects.get_or_create(
            innovation_id=spec["innovation_id"],
            client_id=f"seed:{spec['key']}",
            defaults={
                "score": spec["score"],
                "comment": spec["comment"],
                "author_name": "Tester (demo)",
            },
        )
        created_ratings += int(was_rating)

    # kanał „nabory”: automatyczne powiadomienie o zmianach w naborach (§5)
    Notification.objects.get_or_create(
        channel="nabory",
        title="Trwa nabór IWS 2.0 — do 120 000 zł na test innowacji",
        defaults={
            "body": (
                "Formularz, karty oceny i Mapa Wyzwań Społecznych są w Zasobniku "
                "wiedzy. Generator wniosku dopasowuje treść do tego naboru."
            ),
        },
    )

    return {
        "threads": created_threads,
        "messages": created_messages,
        "votes": created_votes,
        "ratings": created_ratings,
        "threads_total": Thread.objects.count(),
    }
