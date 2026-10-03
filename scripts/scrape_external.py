# -*- coding: utf-8 -*-
"""Innowacje spoza Biblioteki ROPS Malopolska -> data/external_innovations.json

Kazdy rekord ma blok `origin` z nazwa zrodla, zasiegiem i jawnym znacznikiem
`malopolska: false` - te karty NIE pochodza z malopolskiej Biblioteki Innowacji
Spolecznych i front musi je oznaczac, bo inaczej wprowadzalyby jury w blad
(zadanie UMWM dotyczy innowacji przetestowanych w Malopolsce).

Adaptery (`--source`):
  powerbase  innowacjespoleczne.pl/lista-innowacji - baza PO WER / Katalizator (PL)
  poznan     innowacje.rops.poznan.pl/znajdz-innowacje - ROPS Poznan (Wielkopolska)
  esfplus    european-social-fund-plus.ec.europa.eu/en/social-innovation-match (UE)
  biblioteka innowacjespoleczne.pl/biblioteka -> data/external_resources.json
  zenodo     zenodo.org/records/16901521 -> data/external_resources.json (dataset)

Cache HTML w data/raw/external/ czyni skrypt idempotentnym - ponowne
uruchomienie nie bombarduje zrodel.
"""
import argparse, json, pathlib, re, time, sys
import requests
from bs4 import BeautifulSoup

# Konsola Windows domyslnie koduje cp1250 - bez tego jeden polski znak
# w nazwie zrodla wywala caly scrape na UnicodeEncodeError przy print().
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "external"
OUT_INN = ROOT / "data" / "external_innovations.json"
OUT_RES = ROOT / "data" / "external_resources.json"
RAW.mkdir(parents=True, exist_ok=True)

S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "pl,en;q=0.8",
})
DELAY = 0.4
# Portal Komisji limituje tempo ostrzej niz polskie serwisy - wlasny odstep.
SLOW_HOSTS = ("european-social-fund-plus.ec.europa.eu",)


def get(url, cache_name, force=False, tries=6):
    """Pobranie z cache i z szacunkiem dla zrodla: portal ESF+ odpowiada 429
    po kilkuset zapytaniach, wiec czekamy i probujemy ponownie, zamiast
    przerywac caly scrape."""
    f = RAW / cache_name
    if f.exists() and f.stat().st_size > 800 and not force:
        return f.read_bytes()
    wait = 5.0
    for attempt in range(1, tries + 1):
        r = S.get(url, timeout=60)
        if r.status_code in (429, 503) and attempt < tries:
            # Portal ESF+ odsyla Retry-After: 0, czyli bez dolnego progu
            # wpadlibysmy w petle natychmiastowych ponowien.
            try:
                pause = max(float(r.headers.get("Retry-After") or 0), wait)
            except ValueError:
                pause = wait
            print(f"   {r.status_code} - czekam {pause:.0f}s ({url.rsplit('/', 1)[-1]})")
            time.sleep(pause)
            wait *= 2
            continue
        r.raise_for_status()
        f.write_bytes(r.content)
        time.sleep(1.2 if any(h in url for h in SLOW_HOSTS) else DELAY)
        return r.content
    raise RuntimeError(f"nie udalo sie pobrac {url}")


def collect(slugs, fetch, label):
    """Mapuje slugi na rekordy, nie wywracajac sie na jednej stronie."""
    out, bad = [], []
    for n, slug in enumerate(slugs, 1):
        try:
            rec = fetch(slug)
            if rec:
                out.append(rec)
        except Exception as exc:  # noqa: BLE001 - jedna strona nie moze zabic calosci
            bad.append(f"{slug}: {type(exc).__name__}")
        if n % 25 == 0 or n == len(slugs):
            print(f"  {label}: {n}/{len(slugs)} (pominieto {len(bad)})")
    if bad:
        print(f"  {label}: nieudane {len(bad)} -> {', '.join(bad[:5])}")
    return out


def soup(raw):
    return BeautifulSoup(raw, "lxml")


def clean(s):
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"\n{3,}", "\n\n", (s or "").strip()))


def txt(node, sep="\n"):
    if node is None:
        return ""
    return clean(node.get_text(sep, strip=True))


def slugify(s, prefix=""):
    tr = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")
    s = re.sub(r"[^a-z0-9]+", "-", s.translate(tr).lower()).strip("-")[:60]
    return f"{prefix}{s}" if prefix else s


def main_node(s):
    m = s.select_one("main") or s.body or s
    for t in m(["script", "style", "noscript", "nav", "header", "footer", "form"]):
        t.decompose()
    return m


# --------------------------------------------------------------------------
# 1. innowacjespoleczne.pl - baza PO WER / Katalizator Innowacji Spolecznych
# --------------------------------------------------------------------------
PB_BASE = "https://innowacjespoleczne.pl"
# Etykiety kart tej bazy -> pola naszego schematu (te same, co w Bibliotece ROPS)
PB_MAP = {
    "problem, na który odpowiada innowacja": "problem",
    "jak działa innowacja?": "description",
    "komu służy innowacja?": "target_group",
    "kto może wdrażać innowację?": "beneficiaries",
    "rezultaty osiągnięte w wyniku testowania": "evidence",
    "produkty powstałe w wyniku testowania": "products",
    "charakter innowacji": "kind",
    "imię i nazwisko lub nazwa innowatora": "author",
    "imię i nazwisko lub nazwa innowatora/ów": "author",
    "podmiot prawny": "author_org",
    "typ innowatora": "author_type",
    "koszt wdrożenia innowacji": "cost",
    "czas wdrożenia innowacji": "duration",
    "miejsce testowania innowacji": "test_site",
    "miejscowość, w której znajduje się miejsce zamieszkania lub siedziby "
    "innowatora/ów": "innovator_city",
    "instytucja wspierająca rozwój innowacji": "incubator",
    "strona internetowa": "website",
}
# Pola z danymi kontaktowymi osob fizycznych NIE wchodza do zbioru - zadanie
# zabrania uzywania prawdziwych danych osobowych, a e-mail i telefon innowatora
# nie sa potrzebne do dopasowania. Nazwa/nazwisko autora zostaje, bo to
# atrybucja wymagana licencja CC BY.
PB_SKIP = {"kontakt w sprawie innowacji", "kontakt", "dane kontaktowe"}
# "Miejscowosc, w ktorej znajduje sie miejsce zamieszkania ... innowatora" bywa
# wypelniona pelnym adresem domowym. Miejscowosc wystarczy do mapy, adres jest
# danymi osobowymi - wiec ulice i kody pocztowe wycinamy przy zapisie.
STREET_RE = re.compile(r"(ul\.|al\.|os\.|pl\.)\s*[^,;]*|\d{2}-\d{3}", re.I)


def city_only(text):
    out = []
    for part in re.split(r"[,;]", STREET_RE.sub("", text or "")):
        part = part.strip(" .-–—")
        if part and not re.fullmatch(r"\d[\d\s/-]*", part):
            out.append(part)
    return ", ".join(dict.fromkeys(out))


def pb_list(pages=6, on_page=64):
    slugs = []
    for p in range(1, pages + 1):
        url = f"{PB_BASE}/lista-innowacji/?on_page={on_page}" + (f"&strona={p}" if p > 1 else "")
        html = get(url, f"pb-list-{p}.html").decode("utf-8", "replace")
        found = re.findall(r"/innowacja/([a-z0-9\-]+)", html)
        new = [s for s in dict.fromkeys(found) if s not in slugs]
        slugs += new
        print(f"  lista {p}: +{len(new)} (razem {len(slugs)})")
        if not new:
            break
    return slugs


def pb_detail(slug):
    raw = get(f"{PB_BASE}/innowacja/{slug}", f"pb-{slug}.html")
    s = soup(raw)
    m = main_node(s)
    # W h1 siedzi tez link powrotu z tekstem dla czytnikow ekranu ("Wstecz"),
    # wiec bierzemy ostatni span - nazwe karty.
    spans = m.select("h1.post__title > span")
    h1 = spans[-1] if spans else m.select_one("h1")
    name = re.sub(r"^\s*Wstecz\s*", "", txt(h1, " ")).strip()
    if not name or name.lower() == "innowacja":
        return None
    fields, sections = {}, []
    for grid in m.select("section.info div.grid"):
        kids = grid.find_all("div", recursive=False)
        i = 0
        while i < len(kids) - 1:
            th, td = kids[i], kids[i + 1]
            if "th" in (th.get("class") or []) and "td" in (td.get("class") or []):
                label = txt(th, " ")
                value = txt(td)
                if value and label.lower().strip() not in PB_SKIP:
                    sections.append({"question": label, "answer": value})
                    key = PB_MAP.get(label.lower().strip())
                    if key and not fields.get(key):
                        fields[key] = value
                i += 2
            else:
                i += 1
    tags = [txt(a, " ") for a in m.select("section.categories .tags a, section.categories .tags span")]
    tags = [t for t in dict.fromkeys(tags) if t]
    files = []
    for a in m.select("section.files-to-download a[href]"):
        href = a.get("href") or ""
        if href.startswith("http") and "/regulamin" not in href and "creativecommons" not in href \
                and "gnu.org" not in href:
            files.append({"title": txt(a, " ")[:120] or href.rsplit("/", 1)[-1], "url": href})
    cover = None
    img = m.select_one("section.container.top img")
    if img:
        cover = img.get("src")
    authors = [a for a in (fields.get("author"), fields.get("author_org")) if a]
    lead = txt(m.select_one("section.container.top .description"), " ")
    return {
        "slug": slugify(slug, "pb-"),
        "name": name,
        "lead": lead,
        "url": f"{PB_BASE}/innowacja/{slug}",
        "problem": fields.get("problem", ""),
        "description": fields.get("description", "") or lead,
        "target_group": fields.get("target_group", ""),
        "beneficiaries": fields.get("beneficiaries", ""),
        "evidence": fields.get("evidence", "") or fields.get("products", ""),
        "authors": list(dict.fromkeys(authors)),
        "tags": tags,
        "cost": fields.get("cost", ""),
        "duration": fields.get("duration", ""),
        "test_site": city_only(fields.get("test_site", "")),
        "innovator_city": city_only(fields.get("innovator_city", "")),
        "incubator": fields.get("incubator", ""),
        "website": fields.get("website", ""),
        "sections": sections,
        "links": {"files": files[:8]},
        "media": {"cover": cover},
        "raw_text": clean("\n".join([name] + [f"{x['question']}\n{x['answer']}" for x in sections]))[:9000],
        "origin": {
            "source": "Baza Innowacji Społecznych (PO WER / Katalizator Innowacji Społecznych)",
            "source_url": f"{PB_BASE}/lista-innowacji/",
            "scope": "krajowa",
            "region": "Polska — baza ogólnopolska",
            "malopolska": False,
            "license": "https://creativecommons.org/licenses/by/4.0/deed.pl",
        },
    }


# --------------------------------------------------------------------------
# 2. ROPS Poznan - innowacje.rops.poznan.pl
# --------------------------------------------------------------------------
PZ_BASE = "https://innowacje.rops.poznan.pl"
# Strony Poznania stoja na Divi: pola nie maja wlasnych klas ani naglowkow -
# etykiety sa przyciskami rozwijajacymi tresc. Jedyne stabilne zaczepienie to
# linia etykiety w tekscie strony, wiec dzielimy tekst po markerach.
PZ_MARKERS = ["Co to?", "Odbiorca", "Dla kogo?", "Użytkownik", "Przez kogo?",
              "krok po kroku", "Jak to zrobić?", "Powiązane innowacje",
              "Pamietaj o", "Pamiętaj o", "Produkty", "Jak poszło?", "Efekty",
              "Rezultaty", "Materiały", "Koszt", "Czas trwania"]
PZ_MAP = {
    "Co to?": "description",
    "Dla kogo?": "target_group",
    "Przez kogo?": "beneficiaries",
    "Jak to zrobić?": "howto",
    "Jak poszło?": "evidence",
    "Efekty": "evidence",
    "Rezultaty": "evidence",
    "Produkty": "products",
    "Pamietaj o": "caveats",
    "Pamiętaj o": "caveats",
}


def pz_list():
    html = get(f"{PZ_BASE}/znajdz-innowacje/", "pz-list.html").decode("utf-8", "replace")
    return list(dict.fromkeys(re.findall(r"/project/([a-z0-9\-]+)/", html)))


def pz_segments(page_text):
    """Tekst strony -> {etykieta: tresc}. Divi renderuje warianty desktop
    i mobile, wiec ten sam marker wypada kilka razy - bierzemy najdluzszy."""
    pat = "|".join(re.escape(m) for m in PZ_MARKERS)
    parts = re.split(rf"^\s*({pat})\s*:?\s*$", page_text, flags=re.M)
    out = {}
    for i in range(1, len(parts) - 1, 2):
        label, body = parts[i].strip(), clean(parts[i + 1])
        if len(body) > len(out.get(label, "")):
            out[label] = body[:4000]
    return out


def pz_detail(slug):
    raw = get(f"{PZ_BASE}/project/{slug}/", f"pz-{slug}.html")
    m = main_node(soup(raw))
    heads = [txt(h, " ") for h in m.select("h1, h2, h3")]
    heads = [h for h in heads if h and h.lower() not in ("znajdź innowację", "aktualności")]
    name = heads[0] if heads else ""
    if not name:
        return None
    page = txt(m)
    seg = pz_segments(page)
    fields = {}
    for label, body in seg.items():
        key = PZ_MAP.get(label)
        if key and len(body) > len(fields.get(key, "")):
            fields[key] = body
    author = re.search(r"Autor(?:zy|ka|ki)?:\s*([^\n]{3,120})", page)
    place = re.search(r"Miejsce testowania:\s*([^\n]{3,160})", page)
    year = re.search(r"Czas:\s*([^\n]{2,40})", page)
    files = [{"title": txt(a, " ")[:120] or (a.get("href") or "").rsplit("/", 1)[-1],
              "url": a.get("href")}
             for a in m.select("a[href$='.pdf'], a[href$='.docx'], a[href$='.zip']")
             if (a.get("href") or "").startswith("http")]
    img = m.select_one("article img, .project img, img")
    return {
        "slug": slugify(slug, "pz-"),
        "name": name,
        "lead": heads[1] if len(heads) > 1 else "",
        "url": f"{PZ_BASE}/project/{slug}/",
        "problem": "",
        "description": fields.get("description", ""),
        "target_group": fields.get("target_group", ""),
        "beneficiaries": fields.get("beneficiaries", ""),
        "evidence": fields.get("evidence", "") or fields.get("products", ""),
        "authors": [author.group(1).strip()] if author else [],
        "tags": [],
        "test_site": place.group(1).strip() if place else "",
        "test_year": year.group(1).strip() if year else "",
        "howto": fields.get("howto", ""),
        "caveats": fields.get("caveats", ""),
        "sections": [{"question": k, "answer": v} for k, v in seg.items()
                     if k not in ("Powiązane innowacje",)],
        "links": {"files": files[:8]},
        "media": {"cover": img.get("src") if img else None},
        "raw_text": clean("\n".join([name] + [f"{k}\n{v}" for k, v in seg.items()]))[:9000],
        "origin": {
            "source": "Baza innowacji ROPS Poznań (Włącznik / Inkubator Innowacji Społecznych)",
            "source_url": f"{PZ_BASE}/znajdz-innowacje/",
            "scope": "regionalna",
            "region": "Wielkopolska",
            "malopolska": False,
            "license": None,
        },
    }


# --------------------------------------------------------------------------
# 3. ESF+ Social Innovation Match (case studies UE, w tym SIMPACT)
# --------------------------------------------------------------------------
EU_BASE = "https://european-social-fund-plus.ec.europa.eu"
EU_IDX = EU_BASE + "/en/social-innovation-match/case-study"
EU_HEAD = {
    "problem addressed": "problem",
    "innovative solution": "description",
    "key results and benefits": "evidence",
    "lessons learned": "lessons",
    "funding": "funding",
}


def eu_list(pages):
    slugs = []
    for p in range(pages):
        url = EU_IDX if p == 0 else f"{EU_IDX}?page={p}"
        html = get(url, f"eu-idx-{p}.html").decode("utf-8", "replace")
        found = re.findall(r"/social-innovation-match/case-study/([a-z0-9\-]+)", html)
        new = [s for s in dict.fromkeys(found) if s not in slugs]
        slugs += new
        if not new:
            break
        print(f"  index {p}: +{len(new)} (razem {len(slugs)})")
    return slugs


def eu_detail(slug):
    raw = get(f"{EU_BASE}/en/social-innovation-match/case-study/{slug}", f"eu-{slug}.html")
    s = soup(raw)
    m = main_node(s)
    name = txt(s.select_one("h1"), " ") or slug.replace("-", " ").title()
    fields = {}
    for h in m.select("h2, h3, .ecl-u-type-heading-2, .ecl-u-type-heading-3"):
        key = EU_HEAD.get(txt(h, " ").lower().strip())
        if not key:
            continue
        parts = []
        for sib in h.find_all_next():
            if sib.name in ("h1", "h2", "h3"):
                break
            if sib.name in ("p", "li") and sib.find(["p", "li"]) is None:
                t = txt(sib, " ")
                if t and t not in parts:
                    parts.append(t)
        if parts and not fields.get(key):
            fields[key] = clean("\n".join(parts))[:4000]
    meta = {}
    for dl in m.select("dl"):
        for dt in dl.select("dt"):
            dd = dt.find_next_sibling("dd")
            if dd is not None:
                meta[txt(dt, " ").lower()] = txt(dd, ", ")
    lead = meta.get("lead organisation and partners", "")
    countries = meta.get("countries", "")
    return {
        "slug": slugify(slug, "eu-"),
        "name": name,
        "lead": lead,
        "url": f"{EU_BASE}/en/social-innovation-match/case-study/{slug}",
        "problem": fields.get("problem", ""),
        "description": fields.get("description", ""),
        "target_group": meta.get("target groups", ""),
        "beneficiaries": lead,
        "evidence": fields.get("evidence", ""),
        "authors": [lead] if lead else [],
        "tags": [t.strip() for t in (meta.get("themes", "") or "").split(",") if t.strip()],
        "lessons": fields.get("lessons", ""),
        "sections": [{"question": k.title(), "answer": v} for k, v in fields.items()],
        "links": {"files": []},
        "media": {"cover": None},
        "lang": "en",
        "raw_text": clean("\n".join([name] + list(fields.values())))[:9000],
        "origin": {
            "source": "Social Innovation Match — ESF+ (Komisja Europejska)",
            "source_url": EU_IDX,
            "scope": "europejska",
            "region": countries or "Unia Europejska",
            "malopolska": False,
            "license": "https://commission.europa.eu/legal-notice_en",
        },
    }


# --------------------------------------------------------------------------
# 4. Zenodo - dataset 121 case studies (kraje rozwijajace sie)
#
# UWAGA: ten rekord to tabela KODOWANA do badania (kolumny: Case Number,
# Regions of the world, Initial/Final Pathway of Change, Initial/Final
# Innovation Level) - nie ma w niej ani nazw, ani opisow innowacji. Jako karty
# katalogu dawalaby 121 pustych "Case 1..121", wiec trafia do zasobnika wiedzy
# jako jedno zrodlo badawcze, nie do matchmakingu.
# --------------------------------------------------------------------------
ZEN_REC = "16901521"


def zenodo_resource():
    rec = json.loads(get(f"https://zenodo.org/api/records/{ZEN_REC}", "zenodo-rec.json"))
    meta = rec.get("metadata", {})
    f = rec["files"][0]
    desc = re.sub(r"<[^>]+>", " ", meta.get("description", "") or "")
    return [{
        "title": meta.get("title", "Zenodo dataset"),
        "url": f"https://zenodo.org/records/{ZEN_REC}",
        "year": (meta.get("publication_date") or "")[:4] or None,
        "type": "dataset",
        "desc": clean(re.sub(r"\s+", " ", desc))[:900],
        "bytes": f.get("size"),
        "origin": {
            "source": "Zenodo — Social Innovation Pathways Dataset (121 przypadków)",
            "source_url": f"https://zenodo.org/records/{ZEN_REC}",
            "scope": "globalna",
            "region": "kraje rozwijające się",
            "malopolska": False,
            "license": "https://creativecommons.org/licenses/by/4.0/",
        },
    }]


# --------------------------------------------------------------------------
# 5. innowacjespoleczne.pl/biblioteka -> zasoby wiedzy
# --------------------------------------------------------------------------
def biblioteka_items(pages=5, on_page=64):
    items = []
    for p in range(1, pages + 1):
        url = f"{PB_BASE}/biblioteka/?on_page={on_page}" + (f"&strona={p}" if p > 1 else "")
        m = main_node(soup(get(url, f"pb-bib-{p}.html")))
        new = 0
        for art in m.select("article"):
            a = art.select_one("a[href]")
            if not a:
                continue
            u = a.get("href")
            title = txt(art.select_one("h2, h3, .title") or a, " ")
            if not u or not title or any(x["url"] == u for x in items):
                continue
            items.append({
                "title": title[:220],
                "url": u,
                "desc": txt(art.select_one("p, .description"), " ")[:900],
                "type": "pdf" if u.lower().endswith(".pdf") else "www",
                "origin": {
                    "source": "Biblioteka — innowacjespoleczne.pl",
                    "source_url": f"{PB_BASE}/biblioteka/",
                    "scope": "krajowa",
                    "region": "Polska — baza ogólnopolska",
                    "malopolska": False,
                    "license": "https://creativecommons.org/licenses/by/4.0/deed.pl",
                },
            })
            new += 1
        print(f"  biblioteka {p}: +{new}")
        if not new:
            break
    return items


# --------------------------------------------------------------------------
ADAPTERS = {
    "powerbase": lambda a: collect(pb_list(a.pages), pb_detail, "powerbase"),
    "poznan": lambda a: collect(pz_list(), pz_detail, "poznan"),
    "esfplus": lambda a: collect(eu_list(a.pages), eu_detail, "esfplus"),
}
# Zrodla, ktore nie daja kart innowacji, tylko pozycje do zasobnika wiedzy.
RESOURCE_ADAPTERS = {
    "biblioteka": lambda a: biblioteka_items(a.pages),
    "zenodo": lambda a: zenodo_resource(),
}


def load(path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True,
                    choices=list(ADAPTERS) + list(RESOURCE_ADAPTERS) + ["all"])
    ap.add_argument("--pages", type=int, default=6)
    a = ap.parse_args()

    names = (list(ADAPTERS) + list(RESOURCE_ADAPTERS)) if a.source == "all" else [a.source]
    for name in names:
        print(f"== {name}")
        try:
            if name in RESOURCE_ADAPTERS:
                data = load(OUT_RES, {"sources": {}, "items": []})
                items = RESOURCE_ADAPTERS[name](a)
                urls = {i["origin"]["source_url"] for i in items}
                data["items"] = [i for i in data.get("items", [])
                                 if i.get("origin", {}).get("source_url") not in urls] + items
                data.setdefault("sources", {})[name] = {"count": len(items)}
                OUT_RES.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"   {len(items)} dokumentów -> {OUT_RES.name}")
                continue
            inns = ADAPTERS[name](a)
            data = load(OUT_INN, {"note": "Innowacje spoza Biblioteki ROPS Małopolska — "
                                          "każdy rekord ma origin.malopolska = false.",
                                  "sources": {}, "innovations": []})
            keep = [i for i in data.get("innovations", []) if i.get("_adapter") != name]
            for i in inns:
                i["_adapter"] = name
            data["innovations"] = keep + inns
            data.setdefault("sources", {})[name] = {
                "count": len(inns),
                "source": inns[0]["origin"]["source"] if inns else None,
                "source_url": inns[0]["origin"]["source_url"] if inns else None,
            }
            OUT_INN.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"   {len(inns)} innowacji -> {OUT_INN.name} (razem {len(data['innovations'])})")
        except Exception as e:
            print(f"   BŁĄD {type(e).__name__}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
