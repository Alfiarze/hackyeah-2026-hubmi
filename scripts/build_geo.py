# -*- coding: utf-8 -*-
"""Wycina 22 powiaty wojewodztwa malopolskiego z polska-geojson, upraszcza
geometrie (Douglas-Peucker) i rzutuje na wspolrzedne SVG.

Zrodlo geometrii: https://github.com/ppatrzyk/polska-geojson (powiaty-medium)
Wyjscie: app/src/data/malopolska.json
"""
import json, math, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "src" / "data" / "malopolska.json"
SRC_URL = ("https://raw.githubusercontent.com/ppatrzyk/polska-geojson/"
           "master/powiaty/powiaty-medium.geojson")
CACHE = ROOT / "data" / "raw" / "powiaty-medium.geojson"

# 19 powiatow ziemskich + 3 miasta na prawach powiatu
MALOPOLSKA = [
    "bocheński", "brzeski", "chrzanowski", "dąbrowski", "gorlicki", "krakowski",
    "limanowski", "miechowski", "myślenicki", "nowosądecki", "nowotarski",
    "olkuski", "oświęcimski", "proszowicki", "suski", "tarnowski", "tatrzański",
    "wadowicki", "wielicki", "Kraków", "Nowy Sącz", "Tarnów",
]
CITIES = {"Kraków", "Nowy Sącz", "Tarnów"}
# ramka Malopolski - odsiewa imienniki z innych wojewodztw (np. powiat brzeski w opolskim)
BBOX = (18.9, 48.9, 21.6, 50.7)   # lon_min, lat_min, lon_max, lat_max

SVG_W, SVG_H, PAD = 1000.0, 680.0, 14.0


def load():
    if CACHE.exists() and CACHE.stat().st_size > 1_000_000:
        return json.loads(CACHE.read_text(encoding="utf-8"))
    print("pobieram geojson...")
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(SRC_URL, timeout=180) as r:
        raw = r.read()
    CACHE.write_bytes(raw)
    return json.loads(raw.decode("utf-8"))


def rings(geom):
    """Normalizuje Polygon/MultiPolygon do listy pierscieni zewnetrznych."""
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]]
    if t == "MultiPolygon":
        return [poly[0] for poly in c]
    raise ValueError(t)


def centroid(rs):
    pts = [p for r in rs for p in r]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def in_bbox(c):
    return BBOX[0] <= c[0] <= BBOX[2] and BBOX[1] <= c[1] <= BBOX[3]


def perp_dist(p, a, b):
    if a == b:
        return math.dist(p, a)
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.dist((x, y), (x1 + t * dx, y1 + t * dy))


def simplify(pts, eps):
    """Douglas-Peucker, iteracyjnie (bez rekursji - pierscienie maja tysiace punktow)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        dmax, idx = 0.0, i
        for k in range(i + 1, j):
            d = perp_dist(pts[k], pts[i], pts[j])
            if d > dmax:
                dmax, idx = d, k
        if dmax > eps:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(pts, keep) if k]


def main():
    g = load()
    picked = {}
    for f in g["features"]:
        nazwa = f["properties"]["nazwa"]
        bare = nazwa.replace("powiat ", "").strip()
        if bare not in MALOPOLSKA:
            continue
        rs = rings(f["geometry"])
        if not in_bbox(centroid(rs)):
            continue          # imiennik z innego wojewodztwa
        if bare in picked:
            print(f"!! duplikat w ramce: {bare}", file=sys.stderr)
        picked[bare] = rs

    missing = [m for m in MALOPOLSKA if m not in picked]
    if missing:
        print(f"!! brak powiatow: {missing}", file=sys.stderr)
        sys.exit(1)

    # wspolna ramka + projekcja: lon/lat -> SVG, z korekta na szerokosc geogr.
    pts = [p for rs in picked.values() for r in rs for p in r]
    lon0, lon1 = min(p[0] for p in pts), max(p[0] for p in pts)
    lat0, lat1 = min(p[1] for p in pts), max(p[1] for p in pts)
    latm = math.radians((lat0 + lat1) / 2)
    kx = math.cos(latm)                      # 1 deg lon jest krotszy niz 1 deg lat
    w_deg, h_deg = (lon1 - lon0) * kx, (lat1 - lat0)
    s = min((SVG_W - 2 * PAD) / w_deg, (SVG_H - 2 * PAD) / h_deg)
    ox = (SVG_W - w_deg * s) / 2
    oy = (SVG_H - h_deg * s) / 2

    def proj(p):
        x = ox + (p[0] - lon0) * kx * s
        y = oy + (lat1 - p[1]) * s          # odwrocenie osi Y
        return (round(x, 1), round(y, 1))

    out, before, after = [], 0, 0
    for bare, rs in picked.items():
        paths = []
        for r in rs:
            before += len(r)
            pr = [proj(p) for p in r]
            sp = simplify(pr, 1.1)           # eps w pikselach SVG
            if len(sp) < 4:
                continue
            after += len(sp)
            paths.append("M" + "L".join(f"{x},{y}" for x, y in sp) + "Z")
        cx, cy = proj(centroid(rs))
        out.append({
            "id": bare,
            "name": ("m. " + bare) if bare in CITIES else ("pow. " + bare),
            "city": bare in CITIES,
            "d": " ".join(paths),
            "cx": cx, "cy": cy,
        })

    out.sort(key=lambda r: r["id"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {"viewBox": f"0 0 {int(SVG_W)} {int(SVG_H)}",
         "source": SRC_URL, "units": out},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} jednostek; punkty {before} -> {after} "
          f"({100 * after / before:.1f}%); {OUT.stat().st_size / 1024:.0f} KB -> {OUT}")


if __name__ == "__main__":
    main()
