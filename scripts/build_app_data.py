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
        })

    (APP / "innovations.json").write_text(json.dumps(
        {"categories": [{"slug": s, "title": t} for s, t in cats.items()],
         "innovations": inns,
         "note": "Pola deployments[] to dane DEMO - ROPS nie publikuje lokalizacji wdrozen."},
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
    lib.sort(key=lambda r: (r["section"], -(int(r["year"]) if r["year"] else 0), r["title"]))
    (APP / "library.json").write_text(json.dumps(
        {"items": lib}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for f in ("innovations.json", "library.json"):
        print(f"  {f}: {(APP / f).stat().st_size / 1024:.0f} KB")
    print(f"{len(inns)} innowacji, {len(lib)} dokumentów, "
          f"{sum(len(i['deployments']) for i in inns)} wdrożeń demo")


if __name__ == "__main__":
    main()
