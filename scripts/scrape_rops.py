# -*- coding: utf-8 -*-
"""Scraper Biblioteki Innowacji Spolecznych ROPS Krakow -> data/innovations.json

Zrodlo: https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie
Dane publiczne (CC BY 4.0 dla wiekszosci kart innowacji). Brak danych osobowych
poza jawnie publikowanymi nazwiskami autorow innowacji.
"""
import json, re, time, pathlib, sys
import requests
from bs4 import BeautifulSoup

BASE = "https://rops.krakow.pl"
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "biblioteka"
RAW.mkdir(parents=True, exist_ok=True)

S = requests.Session()
S.headers["User-Agent"] = "Mozilla/5.0 (HackYeah2026 HubMI dataset builder)"

CATEGORIES = [
    "dla-seniorow",
    "dla-dzieci-mlodziezy-i-rodziny",
    "dla-osob-o-ograniczonej-mobilnosci",
    "dla-osob-z-niepelnosprawnoscia-sensoryczna",
    "dla-zdrowia-i-medycyny",
    "dla-rynku-pracy",
    "dla-cudzoziemcow",
    "dla-osob-w-kryzysie-bezdomnosci",
    "dla-osob-z-niepelnosprawnoscia-intelektualna",
]
PREFIX = "/innowacje-spoleczne/biblioteka-innowacji-spolecznych/"


def get(url, cache_name):
    f = RAW / cache_name
    if f.exists() and f.stat().st_size > 1000:
        return f.read_bytes()
    r = S.get(url, timeout=60)
    r.raise_for_status()
    f.write_bytes(r.content)
    time.sleep(0.4)
    return r.content


def soup(raw):
    return BeautifulSoup(raw, "lxml")


def main_block(s):
    return s.select_one(".content__main") or s.select_one("main")


def abs_url(u):
    if not u:
        return None
    return u if u.startswith("http") else BASE + u


def parse_sections(txt):
    """Rozbija tekst karty na numerowane sekcje '1. Pytanie' -> odpowiedz."""
    txt = re.sub(r"\n(Powr(ó|o)t|Drukuj)\s*$", "", txt).strip()
    parts = re.split(r"\n(?=\d{1,2}\.\s)", txt)
    head, sections = parts[0], []
    for p in parts[1:]:
        m = re.match(r"(\d{1,2})\.\s*([^\n]+)\n?(.*)", p, re.S)
        if m:
            sections.append({
                "no": int(m.group(1)),
                "question": m.group(2).strip(),
                "answer": re.sub(r"\n+", "\n", m.group(3)).strip(),
            })
    return head, sections


def scrape_category(cat):
    raw = get(f"{BASE}{PREFIX}{cat}", f"cat_{cat}.html")
    s = soup(raw)
    m = main_block(s)
    h1 = m.find(["h1", "h2"])
    title = h1.get_text(strip=True) if h1 else cat
    slugs = []
    for a in m.find_all("a", href=True):
        h = a["href"]
        if h.startswith(PREFIX + cat + ",") :
            slug = h.split(",", 1)[1]
            if slug not in slugs:
                slugs.append(slug)
    return title, slugs


def scrape_innovation(cat, slug):
    url = f"{BASE}{PREFIX}{cat},{slug}"
    raw = get(url, f"inn_{cat}__{slug}.html")
    s = soup(raw)
    m = main_block(s)
    h1 = m.find(["h1", "h2"])
    name = h1.get_text(strip=True) if h1 else slug
    links, media = {}, {}
    for a in m.find_all("a", href=True):
        h = a["href"]
        low = h.lower()
        if low.endswith(".pdf"):
            links.setdefault("pdf", abs_url(h))
        elif "youtube.com" in low or "youtu.be" in low or "vimeo" in low:
            links.setdefault("video", h)
        elif low.endswith(".zip"):
            links.setdefault("materials_zip", abs_url(h))
        elif "creativecommons.org" in low:
            links.setdefault("license", h)
    for i in m.find_all("img", src=True):
        src = i["src"]
        if "iKONY_na_www" not in src:
            media.setdefault("cover", abs_url(src))
    for t in m(["script", "style"]):
        t.decompose()
    txt = m.get_text("\n", strip=True)
    head, sections = parse_sections(txt)
    flags = [l for l in head.split("\n") if l.strip() and l.strip().lower() != name.lower()]
    sec = {s_["question"]: s_["answer"] for s_ in sections}

    def pick(*keys):
        for k in keys:
            for q, a in sec.items():
                if k.lower() in q.lower():
                    return a
        return None

    return {
        "slug": slug,
        "name": name,
        "category_slug": cat,
        "url": url,
        "badges": flags,
        "description": pick("Na czym polega"),
        "problem": pick("Jakich problem"),
        "target_group": pick("Grupa docelowa"),
        "beneficiaries": pick("Kto mo"),
        "evidence": pick("Czy to dzia"),
        "authors": [x.strip("- ").strip() for x in (pick("Autor") or "").split("\n") if x.strip()],
        "sections": sections,
        "links": links,
        "media": media,
        "raw_text": txt,
    }


def main():
    out = {"source": BASE + PREFIX + "kategorie", "categories": [], "innovations": []}
    seen = set()
    for cat in CATEGORIES:
        try:
            title, slugs = scrape_category(cat)
        except Exception as e:
            print(f"!! kategoria {cat}: {e}", file=sys.stderr)
            continue
        out["categories"].append({"slug": cat, "title": title, "count": len(slugs)})
        print(f"[{cat}] {title} -> {len(slugs)} innowacji")
        for slug in slugs:
            key = (cat, slug)
            if key in seen:
                continue
            seen.add(key)
            try:
                out["innovations"].append(scrape_innovation(cat, slug))
                print(f"   + {slug}")
            except Exception as e:
                print(f"   !! {slug}: {e}", file=sys.stderr)
    p = ROOT / "data" / "innovations.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nZapisano {len(out['innovations'])} innowacji w {len(out['categories'])} kategoriach -> {p}")


if __name__ == "__main__":
    main()
