"""
Reguły Middlemana — port `app/src/lib/middleman.ts`.

Są jawne i deterministyczne (mnożniki skali, typ kadry, tryb wdrożenia), bo
wójt musi dostać liczby, które da się obronić przed radą gminy, nie prozę.
Model językowy dopisuje kontekst i ryzyka, ale koszty i harmonogram
liczy matematyka — to się nie zmienia z humor modelu.
"""
from __future__ import annotations

import re

UNIT_COST = {
    "cyfrowe": (18_000, 60_000),
    "metoda / usługa": (6_000, 24_000),
    "przedmiot": (3_000, 15_000),
    "mieszane": (8_000, 30_000),
}

SIZE_MULT = {"do 5 tys.": 1, "5–20 tys.": 1.8, "20–100 tys.": 3.2, "powyżej 100 tys.": 6}

SIZE_REACH = {
    "do 5 tys.": "1 punkt, 10–20 odbiorców miesięcznie",
    "5–20 tys.": "1–2 punkty, 25–50 odbiorców miesięcznie",
    "20–100 tys.": "3–4 punkty, 80–150 odbiorców miesięcznie",
    "powyżej 100 tys.": "sieć 5+ punktów, 200+ odbiorców miesięcznie",
}

STAFFING = {
    "gmina wiejska": "pracownik socjalny OPS w ramach obowiązków (0,25 etatu) + animator na umowę zlecenie",
    "gmina miejska": "koordynator w CUS (0,5 etatu) + 1 osoba do obsługi bieżącej",
    "CUS / OPS": "organizator usług społecznych + pracownik socjalny jako prowadzący",
    "powiat (PCPR)": "koordynator powiatowy + współpraca z gminami na porozumienie",
    "NGO / fundacja": "koordynator projektu (0,5 etatu) + wolontariusze",
    "DPS / placówka": "terapeuta zajęciowy lub opiekun, w ramach planu wsparcia",
}

DIGITAL = re.compile(r"aplikacj|platform|portal|system|online|wirtualn|vr|ar\b|cyfrow")
METHOD = re.compile(r"szkoleni|warsztat|metod|model|procedur|standard|kurs|terapi")
OBJECT = re.compile(r"tablic|drewnian|mata|ścieżk|zestaw|pudeł|urządzeni|prototyp|mebl")
DATA_RE = re.compile(r"dane|aplikacj|platform|rejestr|ankiet|zgłoszeni")
HEALTH_RE = re.compile(r"lek|medyczn|pacjent|rehabilitacj|terapi|zdrowi")
CHILD_RE = re.compile(r"dzieci|młodzież|uczni|szkoł")


def _text(innovation: dict, *keys: str) -> str:
    return " ".join(str(innovation.get(k) or "") for k in keys).lower()


def unit_cost(innovation: dict) -> tuple[int, int, str]:
    t = _text(innovation, "name", "description")
    if DIGITAL.search(t):
        low, high = UNIT_COST["cyfrowe"]
        return low, high, "cyfrowe"
    if METHOD.search(t):
        low, high = UNIT_COST["metoda / usługa"]
        return low, high, "metoda / usługa"
    if OBJECT.search(t):
        low, high = UNIT_COST["przedmiot"]
        return low, high, "przedmiot"
    low, high = UNIT_COST["mieszane"]
    return low, high, "mieszane"


def adaptations_for(innovation: dict, profile: dict) -> list[str]:
    out: list[str] = []
    t = _text(innovation, "name", "description", "problem")
    p_type = profile.get("org_type", "")

    if p_type == "gmina wiejska":
        out.append(
            "Rozproszona zabudowa — zamiast jednego stałego punktu zaplanuj formę "
            "mobilną albo dyżury rotacyjne po sołectwach."
        )
        if re.search(r"aplikacj|online|internet|smartfon|platform", t):
            out.append(
                "Rozwiązanie zakłada sprawny internet i obsługę urządzenia. Dołóż "
                "wariant offline oraz asystę pierwszego uruchomienia — inaczej "
                "wykluczysz tę część odbiorców, dla której to powstało."
            )
        out.append("Dowóz uczestników bywa większym kosztem niż samo rozwiązanie — policz go osobno.")
    if p_type == "DPS / placówka":
        out.append("Wpisz działanie w indywidualne plany wsparcia mieszkańców, nie jako osobny projekt.")
        out.append("Uzgodnij z pielęgniarką/fizjoterapeutą przeciwwskazania dla konkretnych osób.")
    if p_type == "NGO / fundacja":
        out.append(
            "Bez zaplecza lokalowego — uzgodnij użyczenie pomieszczenia od gminy "
            "albo biblioteki, zanim policzysz budżet."
        )
    if p_type == "powiat (PCPR)":
        out.append(
            "Poziom powiatu działa przez gminy — potrzebne porozumienie i wskazanie "
            "koordynatora w każdej uczestniczącej gminie."
        )
    if int(profile.get("staff") or 0) <= 1:
        out.append(
            "Przy jednej osobie do obsługi zacznij od wersji minimalnej (jeden punkt, "
            "jedna grupa) i zaplanuj zastępstwo na czas urlopu — inaczej usługa "
            "zatrzyma się na pierwszym zwolnieniu."
        )
    if profile.get("size_band") in ("powyżej 100 tys.", "20–100 tys."):
        out.append("Przy tej skali od razu zaplanuj listę zapisów i kryteria kwalifikacji odbiorców.")
    return out


def legal_for(innovation: dict, profile: dict) -> list[str]:
    out: list[str] = []
    t = _text(innovation, "name", "description", "benef")

    if DATA_RE.search(t):
        out.append("RODO: podstawa przetwarzania, klauzula informacyjna, retencja danych odbiorców.")
    if HEALTH_RE.search(t):
        out.append("Sprawdź granicę świadczenia zdrowotnego — może wymagać podmiotu leczniczego.")
    if CHILD_RE.search(t):
        out.append("Standardy ochrony małoletnich (ustawa z 2023 r.) — wymagane przed startem.")
    if profile.get("org_type") != "NGO / fundacja":
        out.append("Zamówienia publiczne: przy progu poniżej 130 tys. zł wystarczy regulamin wewnętrzny.")
    if innovation.get("license"):
        out.append(
            "Licencja innowacji to CC BY 4.0 — można wdrażać i modyfikować, "
            "wymagane podanie autorstwa."
        )
    return out


def adapt(innovation: dict, profile: dict) -> dict:
    """Karta wdrożenia: usługa, zasoby, koszt, harmonogram, ryzyka (moduł VII)."""
    low, high, kind = unit_cost(innovation)
    mult = SIZE_MULT.get(profile.get("size_band", "do 5 tys."), 1)
    cost_low = round(low * mult / 500) * 500
    cost_high = round(high * mult / 500) * 500
    p_type = profile.get("org_type", "gmina wiejska")
    place = profile.get("powiat") or "wskazany obszar"

    steps = [
        "Pobierz materiały innowacji z Biblioteki ROPS i przejrzyj je z zespołem.",
        (
            "Zdiagnozuj skalę potrzeby u siebie: ilu odbiorców, w których sołectwach/dzielnicach."
            if p_type in ("gmina wiejska", "CUS / OPS")
            else "Zdiagnozuj skalę potrzeby wśród swoich odbiorców i wskaż grupę pilotażową."
        ),
        f"Wskaż osobę prowadzącą: {STAFFING[p_type]}.",
        f"Uruchom pilotaż na jednej grupie (3 miesiące), budżet ok. {round(cost_low / 3 / 500) * 500} zł.",
        "Zmierz efekt tym samym wskaźnikiem, którego użył autor innowacji (pole „Czy to działa?”).",
        "Po pilotażu zdecyduj o skali docelowej albo o rezygnacji — i zgłoś wynik do Hubu.",
    ]

    risks: list[str] = []
    budget = int(profile.get("budget") or 0)
    if budget and budget < cost_low:
        risks.append(
            f"Budżet {budget:,} zł nie pokrywa dolnej granicy ({cost_low:,} zł). "
            "Realne opcje: pilotaż na jednej grupie, grant ROPS do 120 tys. zł "
            "albo partnerstwo z sąsiednią gminą i podział kosztu."
        )
    if int(profile.get("staff") or 0) == 0:
        risks.append("Brak wskazanej osoby prowadzącej — bez tego usługa nie wystartuje.")
    if not innovation.get("evidence"):
        risks.append(
            "Ta karta nie ma opisanych wyników testu — traktuj jako pomysł do sprawdzenia, "
            "nie jako rozwiązanie gotowe do wdrożenia."
        )
    risks.append("Po zakończeniu finansowania projektowego usługa musi mieć źródło w budżecie bieżącym.")

    from catalog.text_pl import snippet

    return {
        "title": f"{innovation.get('name', '')} — wersja dla: {p_type}, {profile.get('size_band', '')} mieszkańców",
        "summary": (
            f"{snippet(innovation.get('description', ''), 220)} W tym profilu działa jako "
            f"usługa własna instytucji (typ: {kind}), prowadzona przez "
            f"{STAFFING[p_type].split(' + ')[0]}."
        ),
        "scale": SIZE_REACH.get(profile.get("size_band", ""), ""),
        "staffing": STAFFING[p_type],
        "cost_low": cost_low,
        "cost_high": cost_high,
        "affordable": not budget or budget >= cost_low,
        "steps": [{"no": i + 1, "text": t} for i, t in enumerate(steps)],
        "risks": risks,
        "adaptations": adaptations_for(innovation, profile),
        "legal": legal_for(innovation, profile),
        "context": f"Profil: {p_type}, {profile.get('size_band', '')}, powiat {place}.",
    }
