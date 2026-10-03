# -*- coding: utf-8 -*-
"""Pobiera zalaczniki innowacji: karty PDF (~32 MB) i okladki (~21 MB).

Paczki ZIP z materialami (lacznie ~82 GB - filmy, assety VR) NIE sa pobierane
domyslnie; ich URL-e i rozmiary trafiaja do data/assets_manifest.json, wiec
mozna je sciagac selektywnie:  python scripts/download_assets.py --zips <slug> ...
"""
import json, pathlib, re, sys, time, argparse
import requests

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "raw" / "assets"
S = requests.Session()
S.headers["User-Agent"] = "Mozilla/5.0 (HackYeah2026 HubMI dataset builder)"


def fetch(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 500:
        return dest.stat().st_size
    r = S.get(url, timeout=300, stream=True)
    r.raise_for_status()
    with open(dest, "wb") as fh:
        for c in r.iter_content(1 << 16):
            fh.write(c)
    time.sleep(0.2)
    return dest.stat().st_size


def head_len(url):
    try:
        return int(S.head(url, timeout=30, allow_redirects=True).headers.get("Content-Length", 0))
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zips", nargs="*", default=None,
                    help="slugi innowacji, dla ktorych pobrac rowniez paczke ZIP")
    ap.add_argument("--no-head", action="store_true", help="nie sprawdzaj rozmiarow ZIP")
    args = ap.parse_args()

    d = json.load(open(ROOT / "data" / "innovations.json", encoding="utf-8"))
    manifest = []
    for i in d["innovations"]:
        slug = i["slug"]
        rec = {"slug": slug, "name": i["name"], "assets": {}}
        for kind, url, sub, ext in (
            ("pdf", i["links"].get("pdf"), "pdf", "pdf"),
            ("cover", i["media"].get("cover"), "covers", None),
        ):
            if not url:
                continue
            e = ext or (re.search(r"\.(\w{3,4})(\?|$)", url).group(1).lower() if re.search(r"\.(\w{3,4})(\?|$)", url) else "bin")
            dest = OUT / sub / f"{slug}.{e}"
            try:
                n = fetch(url, dest)
                rec["assets"][kind] = {"url": url, "local_path": str(dest.relative_to(ROOT)).replace("\\", "/"), "bytes": n}
                print(f" + {kind:6s} {slug} ({n/1e6:.2f} MB)")
            except Exception as ex:
                print(f" !! {kind} {slug}: {ex}", file=sys.stderr)
                rec["assets"][kind] = {"url": url, "local_path": None, "error": str(ex)}

        z = i["links"].get("materials_zip")
        if z:
            entry = {"url": z, "local_path": None,
                     "bytes": None if args.no_head else head_len(z),
                     "downloaded": False,
                     "note": "paczka materialow ROPS (moze zawierac filmy/assety VR)"}
            if args.zips and slug in args.zips:
                dest = OUT / "zip" / f"{slug}.zip"
                try:
                    entry["bytes"] = fetch(z, dest)
                    entry["local_path"] = str(dest.relative_to(ROOT)).replace("\\", "/")
                    entry["downloaded"] = True
                    print(f" + zip    {slug} ({entry['bytes']/1e6:.1f} MB)")
                except Exception as ex:
                    print(f" !! zip {slug}: {ex}", file=sys.stderr)
                    entry["error"] = str(ex)
            rec["assets"]["materials_zip"] = entry
        if i["links"].get("video"):
            rec["assets"]["video"] = {"url": i["links"]["video"], "local_path": None,
                                      "note": "YouTube - tylko link, bez pobierania"}
        manifest.append(rec)

    tot = sum(a.get("bytes") or 0 for r in manifest for k, a in r["assets"].items()
              if a.get("local_path"))
    zip_tot = sum(r["assets"].get("materials_zip", {}).get("bytes") or 0 for r in manifest)
    p = ROOT / "data" / "assets_manifest.json"
    p.write_text(json.dumps({
        "downloaded_bytes": tot,
        "zip_total_bytes_not_downloaded": zip_tot,
        "items": manifest,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\npobrano {tot/1e6:.1f} MB; ZIP-y pominiete: {zip_tot/1e9:.1f} GB -> {p}")


if __name__ == "__main__":
    main()
