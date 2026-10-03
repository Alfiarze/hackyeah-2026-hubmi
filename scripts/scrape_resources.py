# -*- coding: utf-8 -*-
"""Pozostale zasoby ROPS -> data/resources.json (+ pobrane PDF-y do data/raw/pdf)

   - raporty z badan / diagnozy (zrodlo "Mapy wyzwan spolecznych Malopolski")
   - publikacje ze swiata innowacji + Canvy (SOCIAL CANVAS)
   - innowacje w malopolskich modelach
   - oceny zasobow pomocy spolecznej
"""
import json, re, time, pathlib, sys, argparse
import requests
from bs4 import BeautifulSoup

BASE = "https://rops.krakow.pl"
ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "extra"
PDFDIR = ROOT / "data" / "raw" / "pdf"
RAW.mkdir(parents=True, exist_ok=True)

S = requests.Session()
S.headers["User-Agent"] = "Mozilla/5.0 (HackYeah2026 HubMI dataset builder)"

PAGES = {
    "raporty_z_badan": "/badania-analizy-raporty/raporty-z-badan",
    "ocena_zasobow": "/badania-analizy-raporty/ocena-zasobow-pomocy-spolecznej-w-woj-malopolskim/biezaca-ocena",
    "publikacje_innowacje": "/innowacje-spoleczne/publikacje-ze-swiata-innowacji",
    "innowacje_w_modelach": "/innowacje-spoleczne/innowacje-w-malopolskich-modelach",
    # nabor grantowy IWS 2.0: Mapa Wyzwan Spolecznych, wzor wniosku, karty oceny
    "nabor_grantowy_iws20": ("/nabory-szkolenia-granty-dotacje-wizyty-studyjne-studia-"
                             "specjalizacje-superwizje/granty-na-innowacje-spoleczne,"
                             "nabor-aplikacji-wnioskow-na-innowacje-spoleczne-w-ramach-"
                             "projektu-pn-inkubator-wlaczenia-spolecznego-20"),
}

FILE_RE = re.compile(r"\.(pdf|zip|docx?|xlsx?|pptx?)(\?|$)", re.I)


def get_html(url, name):
    f = RAW / name
    if f.exists() and f.stat().st_size > 1000:
        return f.read_bytes()
    r = S.get(url, timeout=60)
    r.raise_for_status()
    f.write_bytes(r.content)
    time.sleep(0.3)
    return r.content


def main_block(raw):
    s = BeautifulSoup(raw, "lxml")
    m = s.select_one(".content__main") or s.select_one("main")
    if m is None:
        return None
    for t in m(["script", "style"]):
        t.decompose()
    return m


def abs_url(u):
    return u if u.startswith("http") else BASE + u


def slugify(s, n=90):
    return re.sub(r"_+", "_", re.sub(r"[^A-Za-z0-9]+", "_", s)).strip("_")[:n]


def download(url, name):
    """Pobiera plik; zwraca (sciezka_relatywna, rozmiar) lub (None, None)."""
    PDFDIR.mkdir(parents=True, exist_ok=True)
    dest = PDFDIR / name
    if dest.exists() and dest.stat().st_size > 1000:
        return str(dest.relative_to(ROOT)).replace("\\", "/"), dest.stat().st_size
    try:
        r = S.get(url, timeout=180, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as fh:
            for chunk in r.iter_content(1 << 16):
                fh.write(chunk)
        time.sleep(0.3)
        return str(dest.relative_to(ROOT)).replace("\\", "/"), dest.stat().st_size
    except Exception as e:
        print(f"   !! download {url}: {e}", file=sys.stderr)
        if dest.exists():
            dest.unlink()
        return None, None


def parse_items(m, key, fetch_files):
    items = []
    for li in m.select(".files__item"):
        a = li.select_one("a[href]")
        if not a:
            continue
        href = a["href"]
        title = a.get_text(" ", strip=True)
        desc = li.select_one(".files__desc")
        info = li.select_one(".files__info")
        ext = None
        if info:
            st = info.find("strong")
            ext = st.get_text(strip=True).lower() if st else None
        if not ext:
            mm = FILE_RE.search(href)
            ext = mm.group(1).lower() if mm else "pdf"
        it = {
            "title": title,
            "year": (re.match(r"(\d{4})", title).group(1) if re.match(r"(\d{4})", title) else None),
            "url": abs_url(href),
            "type": ext,
            "description": desc.get_text("\n", strip=True) if desc else None,
            "info": info.get_text(" ", strip=True) if info else None,
            "local_path": None,
            "bytes": None,
        }
        if fetch_files:
            it["local_path"], it["bytes"] = download(it["url"], f"{key}__{slugify(title)}.{ext}")
            print(f"   + {title[:70]}  ({it['bytes'] or '?'} B)")
        items.append(it)

    # fallback: bezposrednie linki do plikow poza listami .files__item
    # (np. publikacje prezentowane jako okladki-obrazki)
    have = {it["url"] for it in items}
    for a in m.find_all("a", href=True):
        href = a["href"]
        mm = FILE_RE.search(href)
        if not mm or abs_url(href) in have:
            continue
        have.add(abs_url(href))
        title = a.get_text(" ", strip=True) or href.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("_", " ")
        ext = mm.group(1).lower()
        it = {"title": title, "year": None, "url": abs_url(href), "type": ext,
              "description": None, "info": None, "local_path": None, "bytes": None}
        if fetch_files:
            it["local_path"], it["bytes"] = download(it["url"], f"{key}__{slugify(title)}.{ext}")
            print(f"   + [extra] {title[:60]}  ({it['bytes'] or '?'} B)")
        items.append(it)
    return items


def scrape(key, path, fetch_files):
    raw = get_html(BASE + path, f"{key}.html")
    m = main_block(raw)
    if m is None:
        return {"source": BASE + path, "error": "brak kontenera tresci", "items": []}
    return {
        "source": BASE + path,
        "page_text": m.get_text("\n", strip=True),
        "items": parse_items(m, key, fetch_files),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-files", action="store_true", help="tylko metadane, bez pobierania PDF")
    args = ap.parse_args()
    out = {}
    for key, path in PAGES.items():
        print(f"== {key}")
        try:
            out[key] = scrape(key, path, not args.no_files)
        except Exception as e:
            print(f"!! {key}: {e}", file=sys.stderr)
            out[key] = {"source": BASE + path, "error": str(e), "items": []}
        print(f"   {len(out[key]['items'])} pozycji")
    p = ROOT / "data" / "resources.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"-> {p}")


if __name__ == "__main__":
    main()
