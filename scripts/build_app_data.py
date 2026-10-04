# -*- coding: utf-8 -*-
"""Buduje kompaktowy bundle dla frontu z data/innovations.json + data/resources.json.

Wyjscie:
  app/src/data/innovations.json  - 115 kart, pola obcięte do potrzebnych
  app/src/data/library.json      - raporty/publikacje do Zasobnika wiedzy

Geografia wdrozen i kontakty realizatorow sa DANYMI DEMO (deterministycznie
generowanymi z slug), bo Biblioteka ROPS nie publikuje lokalizacji wdrozen.
Zadanie zabrania uzywania prawdziwych danych osobowych - kontakty sa fikcyjne
(domena example.org), instytucje opisowe, bez nazwisk.
"""
import json, hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "app" / "src" / "data"
APP.mkdir(parents=True, exist_ok=True)

POWIATY = ["bocheński","brzeski","chrzanowski","dąbrowski","gorlicki","krakowski",
           "limanowski","miechowski","myślenicki","nowosądecki","nowotarski","olkuski",
           "oświęcimski","proszowicki","suski","tarnowski","tatrzański","wadowicki",
           "wielicki","Kraków","Nowy Sącz","Tarnów"]
# powiaty o przewazajacym charakterze wiejskim / gorskim - dla innowacji "wiejskich"
RURAL = ["dąbrowski","proszowicki","miechowski","limanowski","nowotarski","gorlicki",
         "tatrzański","suski","nowosądecki","brzeski","bocheński"]
URBAN = ["Kraków","Nowy Sącz","Tarnów","krakowski","wielicki","oświęcimski","chrzanowski"]

INSTYTUCJE = ["Centrum Usług Społecznych", "Ośrodek Pomocy Społecznej",
              "Fundacja (podmiot testujący)", "Stowarzyszenie lokalne",
              "Dzienny Dom Pomocy", "Warsztat Terapii Zajęciowej",
              "Powiatowe Centrum Pomocy Rodzinie"]


def rng(seed: str):
    """Deterministyczny generator 0..1 z seeda - ten sam bundle przy kazdym buildzie."""
    h = hashlib.sha256(seed.encode()).digest()
    i = 0
    while True:
        yield int.from_bytes(h[i:i + 4], "big") / 2**32
        i += 4
        if i + 4 > len(h):
            h = hashlib.sha256(h).digest()
            i = 0


def slug_ascii(s):
    tr = str.maketrans("ąćęłńóśźż", "acelnoszz")
    return re.sub(r"[^a-z0-9]+", "-", s.lower().translate(tr)).strip("-")


def deployments(inn):
    """Demo: 1-4 powiaty wdrozenia, obciazone charakterem innowacji."""
    txt = ((inn.get("problem") or "") + (inn.get("description") or "")
           + (inn.get("target_group") or "")).lower()
    pool = POWIATY
    if any(k in txt for k in ("wiejsk", " wsi", "wieś", "małych miejscowoś")):
        pool = RURAL + POWIATY
    elif any(k in txt for k in ("miast", "miejsk", "aglomerac")):
        pool = URBAN + POWIATY
    g = rng(inn["slug"])
    n = 1 + int(next(g) * 4)
    out, seen = [], set()
    while len(out) < n:
        p = pool[int(next(g) * len(pool))]
        if p in seen:
            continue
        seen.add(p)
        out.append({
            "powiat": p,
            "org": INSTYTUCJE[int(next(g) * len(INSTYTUCJE))],
            "year": 2019 + int(next(g) * 7),
            "email": f"kontakt@{slug_ascii(p)}.example.org",
            "phone": "12 000 00 00",
            "demo": True,
        })
    return out


# --- innowacje z baz spoza Malopolski ------------------------------------
# Kategorie ROPS sa jedynym slownikiem, jaki rozumie front, wiec karty z innych
# baz trzeba w nie wpasowac. Mapowanie po slowach kluczowych (PL + EN, bo czesc
# zrodel jest angielska) - pierwsze trafienie wygrywa, dlatego kolejnosc idzie
# od najbardziej szczegolowych grup do najszerszych.
EXT_CAT_RULES = [
    ("dla-osob-z-niepelnosprawnoscia-sensoryczna",
     ("niewidom", "słabowidz", "niedowidz", "głuch", "niesłysz", "słabosłysz",
      "sensoryczn", "braille", "migow", "blind", "deaf", "hearing impair",
      "visually impair", "sign language")),
    ("dla-osob-z-niepelnosprawnoscia-intelektualna",
     ("intelektualn", "autyz", "spektrum autyzmu", "asd", "zespołem downa",
      "zespół downa", "intellectual disab", "autis", "down syndrome",
      "learning disab")),
    ("dla-osob-o-ograniczonej-mobilnosci",
     ("ograniczonej mobilnoś", "ruchow", "wózk", "protez", "bariery architektoniczn",
      "poruszan", "wheelchair", "mobility impair", "reduced mobility")),
    ("dla-cudzoziemcow",
     ("cudzoziem", "migrant", "uchodź", "ukraiń", "repatri", "refugee",
      "migrat", "foreigner", "newcomer")),
    ("dla-osob-w-kryzysie-bezdomnosci",
     ("bezdomn", "noclegowni", "housing first", "homeless")),
    ("dla-seniorow",
     ("senior", "starsz", "demencj", "otępien", "alzheim", "podeszłym wieku",
      "elderly", "older people", "older adult", "ageing", "aging", "dementia")),
    ("dla-dzieci-mlodziezy-i-rodziny",
     ("dzieci", "dziecko", "młodzie", "rodzin", "uczni", "szkoł", "przedszkol",
      "piecza zastępcza", "nastolat", "children", "youth", "famil", "pupil",
      "school", "adolescen", "foster care")),
    ("dla-rynku-pracy",
     ("rynku pracy", "zatrudnien", "zawodow", "bezrobot", "pracodaw",
      "employment", "labour market", "labor market", "job", "vocational",
      "unemploy", "workplace")),
    ("dla-zdrowia-i-medycyny",
     ("zdrowi", "pacjent", "szpital", "psychiatr", "terapeut", "rehabilitac",
      "opieki medyczn", "health", "patient", "hospital", "mental health",
      "care", "therapy")),
]
EXT_CAT_FALLBACK = ("inne-obszary", "Inne obszary wsparcia")


def _trim(text, limit):
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def ext_category(rec):
    hay = " ".join(str(rec.get(k) or "") for k in
                   ("name", "lead", "problem", "description", "target_group",
                    "beneficiaries")).lower()
    hay += " " + " ".join(rec.get("tags") or []).lower()
    for slug, keys in EXT_CAT_RULES:
        if any(k in hay for k in keys):
            return slug
    return EXT_CAT_FALLBACK[0]


def external_innovations(cats):
    """Karty z innych baz -> ten sam kształt rekordu, ale z blokiem `origin`
    i bez `deployments`: geografia demo dotyczy powiatów Małopolski, a te
    innowacje tam nie powstały i mapa nie ma prawa ich pokazywać."""
    path = ROOT / "data" / "external_innovations.json"
    if not path.exists():
        return []
    src = json.load(open(path, encoding="utf-8"))
    out = []
    for i in src.get("innovations", []):
        o = i.get("origin") or {}
        cat = ext_category(i)
        if cat == EXT_CAT_FALLBACK[0]:
            cats.setdefault(*EXT_CAT_FALLBACK)
        files = (i.get("links") or {}).get("files") or []
        pdf = next((f["url"] for f in files if (f.get("url") or "").lower().endswith(".pdf")), None)
        # Bundle frontu jest wczytywany statycznie przy starcie, a kart z innych
        # baz jest kilkaset - teksty ida przyciete. Pelna tresc zostaje w
        # data/external_innovations.json i w bazie backendu, ktora liczy wyniki.
        desc = _trim(i.get("description") or i.get("lead") or "", 900)
        evidence = _trim(i.get("evidence") or "", 600)
        out.append({
            "id": i["slug"],
            "name": i["name"],
            "cat": cat,
            "catName": cats.get(cat, cat),
            "problem": _trim(i.get("problem") or "", 700),
            "desc": desc,
            "target": _trim(i.get("target_group") or "", 500),
            "benef": _trim(i.get("beneficiaries") or "", 500),
            "evidence": evidence,
            "authors": i.get("authors") or [],
            "badges": [],
            "video": None,
            "pdf": pdf,
            "zip": None,
            "license": o.get("license"),
            "url": i["url"],
            "deployments": [],
            # Znacznik dla frontu: karta spoza Biblioteki ROPS Małopolska.
            "ext": True,
            "origin": {
                "source": o.get("source"),
                "sourceUrl": o.get("source_url"),
                "scope": o.get("scope"),
                "region": o.get("region"),
                "malopolska": False,
            },
            "lang": i.get("lang") or "pl",
            "files": [{"title": f.get("title"), "url": f.get("url")} for f in files[:4]],
        })
    return out


def external_library():
    path = ROOT / "data" / "external_resources.json"
    if not path.exists():
        return []
    src = json.load(open(path, encoding="utf-8"))
    out = []
    for it in src.get("items", []):
        o = it.get("origin") or {}
        out.append({
            "section": "Materiały z baz poza Małopolską",
            "title": it["title"],
            "year": it.get("year"),
            "type": it.get("type") or "www",
            "url": it["url"],
            "desc": (it.get("desc") or "")[:900],
            "bytes": it.get("bytes"),
            "ext": True,
            "origin": {"source": o.get("source"), "sourceUrl": o.get("source_url"),
                       "region": o.get("region"), "malopolska": False},
        })
    return out


def main():
    src = json.load(open(ROOT / "data" / "innovations.json", encoding="utf-8"))
    cats = {c["slug"]: c["title"] for c in src["categories"]}

    inns = []
    for i in src["innovations"]:
        inns.append({
            "id": i["slug"],
            "name": i["name"],
            "cat": i["category_slug"],
            "catName": cats.get(i["category_slug"], i["category_slug"]),
            "problem": i.get("problem") or "",
            "desc": i.get("description") or "",
            "target": i.get("target_group") or "",
            "benef": i.get("beneficiaries") or "",
            "evidence": i.get("evidence") or "",
            "authors": i.get("authors") or [],
            "badges": [b for b in i.get("badges", []) if len(b) > 12],
            "video": i["links"].get("video"),
            "pdf": i["links"].get("pdf"),
            "zip": i["links"].get("materials_zip"),
            "license": i["links"].get("license"),
            "url": i["url"],
            "deployments": deployments(i),
            "ext": False,
            "origin": {"source": "Biblioteka Innowacji Społecznych ROPS Kraków",
                       "sourceUrl": "https://rops.krakow.pl/innowacje-spoleczne/"
                                    "biblioteka-innowacji-spolecznych/kategorie",
                       "scope": "regionalna", "region": "Małopolska",
                       "malopolska": True},
        })

    ext = external_innovations(cats)
    # Karty zewnetrzne NIE wchodza do bundle'a frontu: jest ich kilkaset, a plik
    # jest wczytywany statycznie przy starcie aplikacji (2,9 MB zamiast 0,5 MB
    # to realny koszt dla gminy na slabym laczu). Front startuje na Malopolsce,
    # a pelny katalog dociaga z backendu (`loadCatalogFromBackend`). Backend
    # importuje te karty z osobnego pliku ponizej.
    (APP / "innovations.json").write_text(json.dumps(
        {"categories": [{"slug": s, "title": t} for s, t in cats.items()
                        if any(i["cat"] == s for i in inns)],
         "innovations": inns,
         "sources": {
             "malopolska": len(inns),
             "zewnetrzne": 0,
             "note": "Ten bundle to wylacznie Biblioteka ROPS Malopolska. Karty "
                     "spoza regionu sa w innovations_external.json i dociagaja "
                     "sie z backendu.",
         },
         "note": "Pola deployments[] to dane DEMO - ROPS nie publikuje lokalizacji wdrozen."},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    (APP / "innovations_external.json").write_text(json.dumps(
        {"categories": [{"slug": s, "title": t} for s, t in cats.items()],
         "innovations": ext,
         "note": "Karty spoza Malopolski (origin.malopolska=false). Zrodlo importu "
                 "dla backendu; front dostaje je przez API, nie w bundle."},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # --- Zasobnik wiedzy ---
    res = json.load(open(ROOT / "data" / "resources.json", encoding="utf-8"))
    SEC = {"raporty_z_badan": "Raporty i diagnozy",
           "nabor_grantowy_iws20": "Nabór grantowy i wzory",
           "publikacje_innowacje": "Publikacje i materiały prototypingowe",
           "ocena_zasobow": "Ocena zasobów pomocy społecznej"}
    lib, seen = [], set()
    for key, label in SEC.items():
        for it in res.get(key, {}).get("items", []):
            u = it["url"]
            if u in seen:
                continue
            seen.add(u)
            d = (it.get("description") or "").strip()
            lib.append({
                "section": label,
                "title": it["title"],
                "year": it.get("year"),
                "type": it.get("type") or "pdf",
                "url": u,
                "desc": d[:900] + ("…" if len(d) > 900 else ""),
                "bytes": it.get("bytes"),
            })
    ext_lib = [it for it in external_library() if it["url"] not in seen]
    lib.sort(key=lambda r: (r["section"], -(int(r["year"]) if r["year"] else 0), r["title"]))
    lib += ext_lib
    (APP / "library.json").write_text(json.dumps(
        {"items": lib}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for f in ("innovations.json", "innovations_external.json", "library.json"):
        print(f"  {f}: {(APP / f).stat().st_size / 1024:.0f} KB")
    print(f"{len(inns)} innowacji Małopolska w bundle frontu + {len(ext)} spoza "
          f"regionu w pliku importu, {len(lib)} dokumentów ({len(ext_lib)} spoza "
          f"regionu), {sum(len(i['deployments']) for i in inns)} wdrożeń demo")


if __name__ == "__main__":
    main()
