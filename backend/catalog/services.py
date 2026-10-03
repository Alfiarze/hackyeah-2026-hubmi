"""
Import danych ROPS do bazy — idempotentny, uruchamiany przy każdym starcie
kontenera (entrypoint.sh). Źródła:

  app/src/data/innovations.json  — 115 kart z wyliczonymi polami (bundle frontu)
  app/src/data/library.json      — 76 dokumentów Zasobnika wiedzy
  data/innovations.json          — te same karty + raw_text (pełny tekst karty)
  data/resources.json            — metadane dokumentów (fallback dla library.json)
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from django.conf import settings

from .models import Category, Deployment, Innovation, LibraryItem

log = logging.getLogger("hubmi.import")


def _load(path: Path):
    if not path.exists():
        log.warning("brak pliku %s", path)
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _optional_url(value) -> str | None:
    return value if isinstance(value, str) and value.startswith("http") else None


def import_innovations() -> dict:
    bundle = _load(settings.APP_DATA_DIR / "innovations.json")
    if not bundle:
        return {"innovations": 0, "warning": "brak app/src/data/innovations.json"}

    raw = _load(settings.ROPS_DATA_DIR / "innovations.json") or {}
    raw_by_slug = {i.get("slug"): i for i in raw.get("innovations", [])}

    categories = {
        c["slug"]: c for c in bundle.get("categories", [])
    }
    cat_objs = {}
    for slug, cat in categories.items():
        cat_objs[slug], _ = Category.objects.get_or_create(
            slug=slug, defaults={"title": cat.get("title", slug)}
        )

    created = updated = 0
    deployments = 0
    for item in bundle.get("innovations", []):
        slug = item["id"]
        raw_item = raw_by_slug.get(slug, {})
        cat = cat_objs.get(item.get("cat")) or next(iter(cat_objs.values()))
        defaults = {
            "name": item.get("name", slug),
            "category": cat,
            "problem": item.get("problem", ""),
            "description": item.get("desc", ""),
            "target": item.get("target", ""),
            "beneficiaries": item.get("benef", ""),
            "evidence": item.get("evidence", ""),
            "authors": item.get("authors") or [],
            "badges": item.get("badges") or [],
            "raw_text": raw_item.get("raw_text", ""),
            "video": _optional_url(item.get("video")),
            "pdf": _optional_url(item.get("pdf")),
            "zip": _optional_url(item.get("zip")),
            "license": item.get("license") or None,
            "url": item.get("url", ""),
        }
        _, was_created = Innovation.objects.update_or_create(id=slug, defaults=defaults)
        created += int(was_created)
        updated += int(not was_created)

        for dep in item.get("deployments") or []:
            Deployment.objects.update_or_create(
                innovation_id=slug,
                powiat=dep.get("powiat", ""),
                org=dep.get("org", ""),
                defaults={
                    "year": dep.get("year"),
                    "email": dep.get("email", ""),
                    "phone": dep.get("phone", ""),
                    "demo": bool(dep.get("demo", True)),
                },
            )
            deployments += 1

    return {
        "categories": len(cat_objs),
        "innovations": len(bundle.get("innovations", [])),
        "created": created,
        "updated": updated,
        "deployments": deployments,
    }


def _section_slug(title: str) -> str:
    keep = {"Raporty i diagnozy": "raporty", "Publikacje i materiały prototypingowe": "publikacje",
            "Nabór grantowy i wzory": "nabory", "Ocena zasobów pomocy społecznej": "ocena"}
    return keep.get(title, title)


def import_library() -> dict:
    bundle = _load(settings.APP_DATA_DIR / "library.json")
    items = (bundle or {}).get("items")

    if items is None:
        # awaryjnie budujemy listę z surowego resources.json
        res = _load(settings.ROPS_DATA_DIR / "resources.json") or {}
        items = []
        for section, rows in res.items():
            for row in rows if isinstance(rows, list) else []:
                items.append(
                    {
                        "section": section,
                        "title": row.get("title", ""),
                        "year": row.get("year"),
                        "type": row.get("type", ""),
                        "url": row.get("url", ""),
                        "desc": row.get("description", ""),
                        "bytes": row.get("bytes"),
                    }
                )

    count = 0
    featured = 0
    for item in items:
        title = item.get("title", "")
        # Mapa Wyzwań Społecznych ma być na wierzchu Biblioteki (wymóg §2.II)
        is_featured = "mapa wyzwa" in title.lower()
        featured += int(is_featured)
        _, _ = LibraryItem.objects.update_or_create(
            section=_section_slug(item.get("section", "")),
            title=title,
            defaults={
                "year": item.get("year"),
                "type": item.get("type", ""),
                "url": item.get("url", ""),
                "desc": item.get("desc", ""),
                "bytes": item.get("bytes"),
                "featured": is_featured,
            },
        )
        count += 1
    return {"library_items": count, "featured": featured}
