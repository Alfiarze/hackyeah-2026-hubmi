"""
Moduł III — generator wniosków grantowych.

Struktura odwzorowuje realny formularz aplikacyjny ROPS z naboru „Inkubator
Włączenia Społecznego 2.0" oraz karty oceny formalnej i merytorycznej
(data/resources.json → nabor_grantowy_iws20): grant do 120 000 zł, bez wkładu
własnego, mogą aplikować też grupy nieformalne.

Najważniejszy element: sekcja o innowacyjności korzysta z wyniku matchmakingu.
ROPS wymaga, by rozwiązanie było NOWE w skali Polski, więc lista najbliższych
istniejących innowacji to materiał dowodowy, że wnioskodawca nie powtarza
cudzej pracy. Ten sam silnik, który szuka gotowych rozwiązań, pilnuje tu nowości.
"""
from __future__ import annotations

from catalog.text_pl import snippet

MAX_GRANT = 120_000
MONTHS = ["1–2", "3–4", "5–7", "8–9", "10–12"]

# `demo=True` przy drugim naborze = dane przykładowe, nie oficjalny nabór ROPS.
GRANTS = [
    {
        "id": "iws20",
        "name": "Inkubator Włączenia Społecznego 2.0 — nabór główny",
        "max_amount": MAX_GRANT,
        "own_contribution": False,
        "informal_groups": True,
        "demo": False,
        "url": "https://rops.krakow.pl/innowacje-spoleczne/nabory-i-wydarzenia",
        "description": (
            "Grant na opracowanie, przygotowanie i przetestowanie innowacji "
            "społecznej. Formularz i karty oceny są w Zasobniku wiedzy."
        ),
    },
    {
        "id": "nabor-tematyczny",
        "name": "Nabór tematyczny — innowacje dla seniorów (dane przykładowe)",
        "max_amount": 60_000,
        "own_contribution": False,
        "informal_groups": True,
        "demo": True,
        "url": "https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych",
        "description": (
            "Przykładowy nabór pokazujący, że generator jest parametryzowany — "
            "zmienia się limit, kryteria i sekcje, a nie kod."
        ),
    },
]


def budget_for(amount: int) -> list[dict]:
    """Proporcje typowego budżetu testu innowacji — największą pozycją jest praca ludzi."""
    split = [
        ("Opracowanie i wykonanie prototypu", 0.30),
        ("Koordynacja i prowadzenie testu", 0.26),
        ("Wsparcie specjalistyczne (ekspert, superwizja)", 0.14),
        ("Praca z grupą testową (dojazdy, materiały, catering)", 0.14),
        ("Ewaluacja i opis wyników", 0.10),
        ("Upowszechnianie (opis, zdjęcia, film)", 0.06),
    ]
    rows = [{"item": item, "amount": round(amount * p / 100) * 100} for item, p in split]
    diff = amount - sum(r["amount"] for r in rows)
    rows[0]["amount"] += diff
    return rows


def _section(no: int, heading: str, body: str, criterion: str | None = None) -> dict:
    row = {"no": no, "heading": heading, "body": body}
    if criterion:
        row["criterion"] = criterion
    return row


def generate_grant(
    *,
    title: str,
    problem: str,
    fiszka: dict,
    nearest: list[dict],
    amount: int,
    powiat: str | None = None,
    grant_id: str = "iws20",
) -> dict:
    grant = next((g for g in GRANTS if g["id"] == grant_id), GRANTS[0])
    amount = min(int(amount or 0), grant["max_amount"])
    title = (title or "").strip() or "(uzupełnij nazwę innowacji)"
    place = f"powiat {powiat}" if powiat else "wskazany obszar Małopolski"
    fiszka = fiszka or {}
    istota = fiszka.get("istota", "")
    adresat = fiszka.get("adresat", "")
    etap = fiszka.get("etap", "pomysł")
    obszar = fiszka.get("obszar", "")

    closest = [n for n in (nearest or [])][:3]
    if closest:
        lines = [
            f"  • {n['name']} ({n.get('cat_name', '')}, dopasowanie {n['score']}/100) — "
            f"{snippet(n.get('description', ''), 140)}"
            for n in closest
        ]
        novelty = (
            f"Przegląd Biblioteki Innowacji Społecznych ROPS wskazał {len(closest)} "
            f"najbliższych istniejących rozwiązań:\n" + "\n".join(lines) +
            "\n\nRóżnica wobec nich: [UZUPEŁNIJ — to pole komisja czyta najuważniej. "
            "Napisz konkretnie, co Twoje rozwiązanie robi inaczej: inna grupa odbiorców, "
            "inny mechanizm, niższy koszt, mniejszy próg wejścia. Samo „nasze będzie "
            "lepsze” nie przechodzi oceny merytorycznej.]"
        )
    else:
        novelty = (
            "Przegląd Biblioteki Innowacji Społecznych ROPS (115 przetestowanych "
            "rozwiązań) nie wykazał innowacji odpowiadającej na ten problem. To mocny "
            "argument za nowością rozwiązania w skali regionu — warto go w tej sekcji "
            "wprost powołać."
        )

    sections = [
        _section(1, "Nazwa innowacji", title),
        _section(
            2,
            "Problem społeczny i jego skala",
            f"{(problem or '').strip() or istota}\n\nObszar oddziaływania: {place}.\n\n"
            "[UZUPEŁNIJ danymi liczbowymi — ilu osób dotyczy problem na tym terenie. "
            "Źródła w Zasobniku wiedzy HubMI: „Usługi społeczne w Małopolsce — deficyty, "
            "potrzeby, potencjał rozwojowy” (ROPS 2025) oraz Ocena Zasobów Pomocy "
            "Społecznej WM.]",
            "Ocena merytoryczna: trafność diagnozy problemu",
        ),
        _section(
            3,
            "Istota rozwiązania",
            f"{istota}\n\nObszar: {obszar}. Etap zaawansowania na dziś: {etap}.",
            "Ocena merytoryczna: jasność i wykonalność pomysłu",
        ),
        _section(
            4,
            "Grupa docelowa",
            f"{adresat}\n\nNabór kieruje wsparcie do osób wykluczonych społecznie lub "
            "zagrożonych wykluczeniem — m.in. osób z niepełnosprawnością, osób starszych, "
            "osób w kryzysie bezdomności, ubogich. [SPRAWDŹ, czy Twój adresat mieści się "
            "w tym katalogu — to kryterium formalne.]",
            "Ocena formalna: zgodność z grupą docelową naboru",
        ),
        _section(
            5,
            "Na czym polega nowość (w skali Polski)",
            novelty,
            "Ocena merytoryczna: innowacyjność — kryterium rozstrzygające",
        ),
        _section(
            6,
            "Plan testu innowacji",
            "Grupa testowa: [UZUPEŁNIJ liczbę i sposób rekrutacji uczestników].\n"
            f"Czas testu: 9–12 miesięcy.\nMiejsce: {place}.\n"
            "Partnerzy lokalni: [UZUPEŁNIJ — CUS/OPS, szkoła, biblioteka, NGO. "
            "Potwierdzony partner realnie podnosi ocenę wykonalności.]",
            "Ocena merytoryczna: realność planu testowania",
        ),
        _section(
            7,
            "Jak zmierzymy, czy to działa",
            "Wskaźnik główny: [UZUPEŁNIJ — jedna liczba, którą zmierzysz przed i po].\n"
            "Sposób pomiaru: [ankieta / obserwacja / test standaryzowany / dane instytucji].\n\n"
            "Wskazówka: każda ze 115 kart ma pole „Czy to działa?” — użyj wskaźnika "
            "porównywalnego z nimi, wtedy da się zestawić wynik z innymi innowacjami.",
            "Ocena merytoryczna: mierzalność efektu",
        ),
        _section(
            8,
            "Budżet",
            f"Wnioskowana kwota: {amount:,} zł. Wkład własny nie jest wymagany — grant "
            "pokrywa 100% kosztów opracowania, przygotowania i testowania innowacji.\n\n"
            "Rozbicie poniżej jest propozycją startową opartą na typowych proporcjach "
            "testu innowacji. Dopasuj do swojego rozwiązania.",
            "Ocena formalna: kwalifikowalność i limit naboru",
        ),
        _section(
            9,
            "Harmonogram",
            "\n".join(
                [
                    f"Miesiące {MONTHS[0]}: dopracowanie koncepcji, konsultacje, rekrutacja grupy testowej",
                    f"Miesiące {MONTHS[1]}: wykonanie prototypu / opracowanie metody",
                    f"Miesiące {MONTHS[2]}: test z grupą docelową, bieżące poprawki",
                    f"Miesiące {MONTHS[3]}: ewaluacja, opis wyników",
                    f"Miesiące {MONTHS[4]}: upowszechnienie, przekazanie materiałów do Biblioteki ROPS",
                ]
            ),
        ),
        _section(
            10,
            "Trwałość i skalowanie",
            "Po zakończeniu grantu: [UZUPEŁNIJ — kto przejmie prowadzenie i z jakich środków]. "
            "Najmocniejsza odpowiedź to instytucja, która wpisze działanie w budżet bieżący.\n\n"
            "Gotowość do upowszechnienia: materiały na licencji CC BY 4.0, przekazane do "
            "Biblioteki Innowacji Społecznych.",
            "Ocena merytoryczna: potencjał upowszechnienia",
        ),
    ]

    warnings: list[str] = []
    if amount and amount > grant["max_amount"]:
        warnings.append(
            f"Kwota {amount:,} zł przekracza maksimum naboru "
            f"({grant['max_amount']:,} zł) — wniosek zostanie odrzucony formalnie."
        )
    if not title.strip() or title.startswith("("):
        warnings.append("Brak nazwy innowacji.")
    if not istota.strip():
        warnings.append("Brak opisu istoty rozwiązania (sekcja 3).")
    if not adresat.strip():
        warnings.append("Brak wskazanego adresata (sekcja 4).")
    if not (problem or "").strip():
        warnings.append("Brak opisu problemu (sekcja 2).")
    if closest and closest[0]["score"] >= 70:
        warnings.append(
            f"Uwaga: „{closest[0]['name']}” dopasowuje się do Twojego opisu na "
            f"{closest[0]['score']}/100. Komisja oceni nowość w skali Polski — sekcja 5 "
            "musi jasno pokazać różnicę, albo rozważ zgłoszenie się jako tester "
            "istniejącej innowacji zamiast nowego grantu."
        )

    return {
        "grant": grant,
        "title": title,
        "sections": sections,
        "warnings": warnings,
        "budget": budget_for(amount),
        "amount": amount,
    }
