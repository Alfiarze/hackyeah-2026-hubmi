"""
Mostek między językiem potocznym a językiem Biblioteki ROPS.

To samo co `app/src/lib/concepts.ts` — ta sama lista wątków i te same terminy,
bo inaczej wyniki z backendu różniłyby się od wyników z frontu.

Powód istnienia: mieszkanka napisze „mama mieszka sama na wsi i nie ma z kim
pogadać". W kartach ROPS to samo zjawisko nazywa się „osamotnienie”,
„izolacja społeczna”, „obszary wiejskie”, „osoby w podeszłym wieku”.
Bez tej warstwy dopasowanie leksykalne nie znajduje niczego.

Terminy dobrane pod rzeczywiste słownictwo 115 kart (zob. scripts/scrape_rops.py).
"""
from __future__ import annotations

from catalog.text_pl import stem

CONCEPTS: list[dict] = [
    {"id": "samotnosc", "label": "samotność i izolacja", "terms": [
        "sama", "sam", "samotny", "samotna", "samotność", "osamotnienie", "izolacja",
        "izolowany", "odosobnienie", "towarzystwo", "pogadać", "rozmowa", "rozmawiać",
        "kontakt", "nikogo", "opuszczony", "wykluczenie", "wyklucz"]},
    {"id": "senior", "label": "osoby starsze", "terms": [
        "senior", "seniorka", "starszy", "starsza", "starsze", "emeryt", "emerytka",
        "mama", "tata", "babcia", "dziadek", "babci", "dziadka", "podeszły", "wiek",
        "starość", "osiemdziesiąt", "siedemdziesiąt"]},
    {"id": "wies", "label": "obszary wiejskie", "terms": [
        "wieś", "wsi", "wiejski", "wiejska", "wiejskich", "gmina", "sołectwo",
        "miejscowość", "peryferie", "oddalony", "daleko", "prowincja", "popegeerowski"]},
    {"id": "demencja", "label": "demencja i pamięć", "terms": [
        "demencja", "dementywny", "otępienie", "otępienny", "alzheimer", "zapomina",
        "pamięć", "pamięciowy", "zaburzenia", "dezorientacja", "udar", "wylew"]},
    {"id": "psyche", "label": "zdrowie psychiczne", "terms": [
        "depresja", "depresyjny", "antydepresyjny", "lęk", "lękowy", "psychiczny",
        "psychika", "psychiatra", "psycholog", "kryzys", "przygnębienie", "stres",
        "wypalenie", "samobójczy", "nastrój"]},
    # Celowo rozdzielone od "bariery": ktoś na wózku może nie mieć problemu
    # z dostępem do budynku, a ktoś z wózkiem dziecięcym — odwrotnie.
    # Nie ma tu słowa "niepełnosprawność" — występuje w 101 z 115 kart,
    # więc jako wyzwalacz wątku jest bezwartościowe.
    {"id": "ruch", "label": "ograniczona mobilność", "terms": [
        "wózek", "wózkach", "wózkowy", "ruchowy", "ruchowa", "mobilność", "poruszanie",
        "chodzenie", "sparaliżowany", "proteza", "kule", "kończyna", "niesprawny",
        "unieruchomiony", "rehabilitant"]},
    {"id": "bariery", "label": "bariery architektoniczne", "terms": [
        "schody", "schodach", "podjazd", "winda", "próg", "progi", "rampa",
        "krawężnik", "pochylnia", "architektoniczny", "bariera", "bariery",
        "wejście", "wejścia", "wjechać", "wejść", "piętro", "stopień", "wysoki",
        "dostępność", "przystosowany", "nieprzystosowany"]},
    {"id": "wzrok", "label": "niepełnosprawność wzroku", "terms": [
        "niewidomy", "niewidome", "niewidzący", "słabowidzący", "wzrok", "wzroku",
        "ślepy", "braille", "brajl", "audiodeskrypcja", "tyflo"]},
    {"id": "sluch", "label": "niepełnosprawność słuchu", "terms": [
        "głuchy", "głuche", "niesłyszący", "słabosłyszący", "słuch", "słuchu",
        "migowy", "pjm", "niedosłuch", "implant", "napisy"]},
    {"id": "intelekt", "label": "niepełnosprawność intelektualna", "terms": [
        "intelektualny", "intelektualna", "upośledzenie", "umiarkowany", "znaczny",
        "stopień", "etr", "łatwy", "prosty", "zrozumiały"]},
    {"id": "autyzm", "label": "autyzm i spektrum", "terms": [
        "autyzm", "autystyczny", "spektrum", "asd", "asperger", "sensoryczny",
        "nadwrażliwość", "stymulacja"]},
    {"id": "dzieci", "label": "dzieci i młodzież", "terms": [
        "dziecko", "dzieci", "młodzież", "nastolatek", "uczeń", "uczniowie", "szkoła",
        "szkolny", "przedszkole", "świetlica", "rówieśnik", "nauczyciel"]},
    {"id": "rodzina", "label": "rodzina i piecza zastępcza", "terms": [
        "rodzina", "rodzic", "rodzice", "piecza", "zastępcza", "opiekuńczo",
        "wychowawczy", "dom", "dziecka", "adopcja", "wielodzietny"]},
    {"id": "opieka", "label": "opieka długoterminowa", "terms": [
        "opieka", "opiekun", "opiekuńczy", "pielęgnacja", "całodobowy", "dps",
        "zamieszkania", "środowiskowy", "leżący", "niesamodzielny", "wytchnieniowy"]},
    {"id": "bezdomnosc", "label": "kryzys bezdomności", "terms": [
        "bezdomny", "bezdomność", "noclegownia", "schronisko", "ulica", "pustostan",
        "eksmisja", "ubóstwo", "ubogi", "bieda"]},
    {"id": "cudzoziemcy", "label": "cudzoziemcy i integracja", "terms": [
        "cudzoziemiec", "obcokrajowiec", "migrant", "uchodźca", "ukraiński",
        "ukrainka", "język", "tłumacz", "kulturowy", "międzykulturowy", "integracja"]},
    {"id": "praca", "label": "rynek pracy", "terms": [
        "praca", "pracy", "bezrobocie", "bezrobotny", "zatrudnienie", "zawodowy",
        "aktywizacja", "staż", "pracodawca", "kwalifikacje", "zarobek", "etat"]},
    {"id": "cyfrowe", "label": "wykluczenie cyfrowe", "terms": [
        "komputer", "internet", "smartfon", "telefon", "aplikacja", "cyfrowy",
        "online", "obsługa", "technologia", "urządzenie", "qr", "sms", "e-usługa"]},
    {"id": "zdrowie", "label": "zdrowie i medycyna", "terms": [
        "lekarz", "przychodnia", "rehabilitacja", "rehabilitacyjny", "pacjent",
        "leczenie", "lek", "leki", "szpital", "choroba", "chory", "terapia",
        "terapeutyczny", "profilaktyka", "dieta", "żywienie"]},
    {"id": "transport", "label": "dojazd i dostępność", "terms": [
        "dojazd", "transport", "dowóz", "komunikacja", "odległość", "dotarcie",
        "autobus", "przystanek", "podróż", "mobilny", "dostępność", "dostęp"]},
    {"id": "aktywnosc", "label": "aktywność i kultura", "terms": [
        "zajęcia", "aktywność", "aktywny", "kultura", "kulturalny", "hobby",
        "wolontariat", "wolontariusz", "spotkanie", "warsztat", "klub", "sport",
        "gra", "zabawa", "muzeum", "teatr", "międzypokoleniowy", "sąsiedzki"]},
    {"id": "instytucje", "label": "instytucje i samorząd", "terms": [
        "gmina", "powiat", "urząd", "urzędowy", "samorząd", "cus", "ops", "mops",
        "gops", "pcpr", "ngo", "stowarzyszenie", "fundacja", "wtz", "śds",
        "formalność", "wniosek", "procedura", "biurokracja"]},
]

STEM_TO_CONCEPTS: dict[str, list[str]] = {}
CONCEPT_STEMS: dict[str, list[str]] = {}
CONCEPT_LABEL: dict[str, str] = {}

for _c in CONCEPTS:
    CONCEPT_LABEL[_c["id"]] = _c["label"]
    _stems: list[str] = []
    for _t in _c["terms"]:
        _s = stem(_t.lower())
        if _s not in _stems:
            _stems.append(_s)
        ids = STEM_TO_CONCEPTS.setdefault(_s, [])
        if _c["id"] not in ids:
            ids.append(_c["id"])
    CONCEPT_STEMS[_c["id"]] = _stems
