"""routers/seo.py — CMS-02 SEO Toolkit endpoints (publik, tanpa auth).

Endpoint:
- GET /api/sitemap.xml  → XML sitemap dinamis (destinations, articles, packages, halaman statis)
- GET /api/robots.txt   → robots.txt dgn referensi sitemap

Base URL diambil dari header host request (auto-detect: preview vs prod) supaya URL
kanonik selalu benar tanpa hardcoding domain. Env `PUBLIC_SITE_URL` bila diset (mis.
"https://rahaza.travel") akan override — berguna saat serving via CDN/proxy.
"""
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse, Response

from db import get_db

router = APIRouter(prefix="/api", tags=["seo"])

# Halaman statis publik (App routes). `changefreq` & `priority` — hint SEO umum.
STATIC_PAGES: List[Dict[str, Any]] = [
    {"path": "/", "changefreq": "weekly", "priority": 1.0},
    {"path": "/destinations", "changefreq": "weekly", "priority": 0.9},
    {"path": "/fleet", "changefreq": "weekly", "priority": 0.9},
    {"path": "/blog", "changefreq": "daily", "priority": 0.8},
    {"path": "/quotation", "changefreq": "monthly", "priority": 0.7},
    {"path": "/about", "changefreq": "monthly", "priority": 0.5},
    {"path": "/contact", "changefreq": "monthly", "priority": 0.5},
]


def _base_url(request: Request) -> str:
    """Prioritas: env PUBLIC_SITE_URL > header X-Forwarded-Host > request URL.

    Selalu output tanpa trailing slash. Skema HTTPS bila di belakang HTTPS proxy
    (X-Forwarded-Proto). Menghindari domain "localhost" dari container internal.
    """
    env = os.environ.get("PUBLIC_SITE_URL", "").strip().rstrip("/")
    if env:
        return env
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    host = host.split(",")[0].strip()
    if not host or host.startswith("localhost") or host.startswith("127."):
        # Fallback aman: base_url dari request
        b = str(request.base_url).rstrip("/")
        return b if b else "https://example.com"
    return f"{proto}://{host}"


def _xml_escape(s: Any) -> str:
    """Escape karakter reserved XML."""
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _fmt_lastmod(v: Any) -> str:
    """Format lastmod ISO8601 (W3C). Fallback = hari ini."""
    if isinstance(v, str) and v:
        # Ambil bagian tanggal (YYYY-MM-DD) dari ISO string bila ada
        try:
            return v[:10] if len(v) >= 10 and v[4] == "-" and v[7] == "-" else datetime.now(timezone.utc).date().isoformat()
        except Exception:
            return datetime.now(timezone.utc).date().isoformat()
    return datetime.now(timezone.utc).date().isoformat()


@router.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    """CMS-02: sitemap XML dinamis (destinations aktif, artikel published, paket aktif, halaman statis).

    Standar: https://www.sitemaps.org/protocol.html — kompatibel dgn Google Search Console.
    Response headers: Content-Type application/xml; charset=utf-8, Cache-Control 10 menit.
    """
    base = _base_url(request)
    db = get_db()

    # Kumpulkan URL dinamis dari DB.
    dests = await db.destinations.find({}, {"_id": 0, "slug": 1, "canonical": 1, "updated_at": 1, "created_at": 1}).to_list(500)
    arts = await db.articles.find({"published": True}, {"_id": 0, "slug": 1, "canonical": 1, "published_at": 1, "updated_at": 1}).to_list(1000)
    pkgs = await db.packages.find({"active": True}, {"_id": 0, "slug": 1, "canonical": 1, "updated_at": 1, "created_at": 1}).to_list(500)

    urls: List[Dict[str, Any]] = []

    # Statis
    today = datetime.now(timezone.utc).date().isoformat()
    for pg in STATIC_PAGES:
        urls.append({"loc": f"{base}{pg['path']}", "lastmod": today,
                     "changefreq": pg["changefreq"], "priority": pg["priority"]})

    # Destinasi (route publik SPA: /destinations/{slug})
    for d in dests:
        slug = (d.get("slug") or "").strip()
        if not slug:
            continue
        loc = (d.get("canonical") or "").strip() or f"{base}/destinations/{slug}"
        urls.append({"loc": loc, "lastmod": _fmt_lastmod(d.get("updated_at") or d.get("created_at")),
                     "changefreq": "monthly", "priority": 0.8})

    # Artikel (route publik SPA: /blog/{slug})
    for a in arts:
        slug = (a.get("slug") or "").strip()
        if not slug:
            continue
        loc = (a.get("canonical") or "").strip() or f"{base}/blog/{slug}"
        urls.append({"loc": loc,
                     "lastmod": _fmt_lastmod(a.get("updated_at") or a.get("published_at")),
                     "changefreq": "monthly", "priority": 0.7})

    # Paket (route publik SPA: /paket/{slug})
    for p in pkgs:
        slug = (p.get("slug") or "").strip()
        if not slug:
            continue
        loc = (p.get("canonical") or "").strip() or f"{base}/paket/{slug}"
        urls.append({"loc": loc, "lastmod": _fmt_lastmod(p.get("updated_at") or p.get("created_at")),
                     "changefreq": "monthly", "priority": 0.7})

    # Rakit XML
    # FASE F8 — halaman iklan HANYA masuk sitemap bila pemiliknya sengaja mematikan `noindex`.
    # Default halaman iklan adalah noindex supaya tidak berebut kata kunci dengan halaman utama.
    lp_rows = await db.landing_pages.find(
        {"status": "published"}, {"_id": 0, "slug": 1, "updated_at": 1, "seo": 1}).to_list(200)
    landing_urls = [(f"/lp/{r['slug']}", r.get("updated_at"))
                    for r in lp_rows if not (r.get("seo") or {}).get("noindex", True)]
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, lastmod in landing_urls:
        parts.append(f"<url><loc>{base}{path}</loc>"
                     + (f"<lastmod>{str(lastmod)[:10]}</lastmod>" if lastmod else "")
                     + "<changefreq>weekly</changefreq><priority>0.6</priority></url>")
    for u in urls:
        parts.append("  <url>")
        parts.append(f"    <loc>{_xml_escape(u['loc'])}</loc>")
        parts.append(f"    <lastmod>{_xml_escape(u['lastmod'])}</lastmod>")
        parts.append(f"    <changefreq>{_xml_escape(u['changefreq'])}</changefreq>")
        parts.append(f"    <priority>{u['priority']:.1f}</priority>")
        parts.append("  </url>")
    parts.append("</urlset>")

    body = "\n".join(parts)
    return Response(
        content=body,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=600, s-maxage=600"},
    )


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt(request: Request):
    """CMS-02: robots.txt sederhana + referensi sitemap.

    Publik penuh (allow all) — kecuali `/app/` (admin panel SPA) & `/api/`
    (endpoint teknis). Sitemap absolut agar crawler bisa langsung fetch.
    """
    base = _base_url(request)
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /app/",
        "Disallow: /api/",
        "",
        f"Sitemap: {base}/api/sitemap.xml",
        "",
    ]
    return PlainTextResponse(
        "\n".join(lines),
        headers={"Cache-Control": "public, max-age=3600, s-maxage=3600"},
    )
