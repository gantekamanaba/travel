"""routers/content.py — Light CMS (Phase 9 / B3 + G1-G10 enhancement).

CRUD admin generik untuk entitas konten website:
destinations, packages, articles, testimonials, promos.
Section RBAC 'cms' (owner & ops_admin). Pembacaan publik tetap via /api/public/*.

Pendekatan generik + whitelist field per-resource agar ringkas namun aman
(hanya field terdaftar yang ditulis; ko-ersi tipe int/num/bool sesuai konfigurasi).
Setiap mutasi tercatat di Audit Log (A1).

Enhancement G1-G10 (2026-07-03):
- G1: Validasi unik slug per resource (409 saat duplikat).
- G3: POST /uploads/cms — upload gambar (jpg/png/webp <=6MB) ke uploads/cms/.
- G4: Destinations tambah field intro/route_points/faqs (sudah ada di whitelist, dieskpos ke FE).
- G6: SEO metadata (meta_title/meta_description/og_image) untuk destinations/packages/articles/promos.
- G8: POST /content/{resource}/{id}/duplicate — clone item dgn slug/kode auto-suffix.
- G9: testimonials +field `approved` (moderasi manual sebelum tampil di publik).
- G10: sort/reorder manual via field `position` (int). ContentManager mengurutkan naik jika ada.
- Search: `q` param di list — filter case-insensitive pada judul/nama/kode.
"""
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, Response, UploadFile

from core_utils import new_id, now_iso, safe_doc
from db import get_db
from dependencies import require_section
from services import media_lib as ml
from services import media_store as ms
from services.audit import record

router = APIRouter(prefix="/api", tags=["content"])
CMS = require_section("cms")

# SEO fields tersedia utk 4 resource public (kecuali testimonials).
# CMS-02: +canonical URL (opsional, override URL kanonik utk SEO)
_SEO = ["meta_title", "meta_description", "og_image", "canonical"]

RESOURCES = {
    "destinations": {"prefix": "dst", "sort": ("position", 1), "sort_fallback": ("name", 1),
        "slug_field": "slug", "search_fields": ["name", "slug", "region"],
        "fields": ["slug", "name", "region", "description", "intro", "hero_image", "gallery",
                   "hotel_recommendations", "highlights", "itinerary", "route_points",
                   "faqs", "best_time", "lat", "lng", "tour_scenes", "popular",
                   "position", *_SEO],
        "int": ["position"], "num": ["lat", "lng"], "bool": ["popular"]},
    "packages": {"prefix": "pkg", "sort": ("position", 1), "sort_fallback": ("name", 1),
        "slug_field": "slug", "search_fields": ["name", "slug", "destination"],
        "fields": ["slug", "name", "description", "destination", "destination_id", "vehicle_type",
                   "pax_min", "pax_max", "days", "price_from",
                   "includes", "image_url", "active", "position", *_SEO],
        "int": ["days", "price_from", "pax_min", "pax_max", "position"], "bool": ["active"]},
    "articles": {"prefix": "art", "sort": ("position", 1), "sort_fallback": ("published_at", -1),
        "slug_field": "slug", "search_fields": ["title", "slug", "category", "author"],
        "fields": ["slug", "title", "excerpt", "cover_image", "body", "author", "tags",
                   "category", "featured", "read_minutes", "published", "published_at",
                   "position", *_SEO],
        "int": ["read_minutes", "position"], "bool": ["published", "featured"]},
    "testimonials": {"prefix": "tst", "sort": ("position", 1), "sort_fallback": ("created_at", -1),
        "search_fields": ["name", "role", "quote"],
        "fields": ["name", "role", "quote", "rating", "avatar", "approved", "position"],
        "int": ["rating", "position"], "bool": ["approved"]},
    "promos": {"prefix": "pro", "sort": ("position", 1), "sort_fallback": ("created_at", -1),
        "slug_field": "code", "search_fields": ["code", "title", "description"],
        # Syarat promo WAJIB berupa data agar bisa ditegakkan server saat checkout
        # (dulu hanya tertulis di deskripsi → diskon bocor di luar niat pemilik).
        "fields": ["code", "title", "description", "discount_type", "discount_value",
                   "valid_from", "valid_until", "min_days", "min_amount", "vehicle_types",
                   "services", "weekend_only", "max_uses", "active", "position", *_SEO],
        "num": ["discount_value", "min_amount"],
        "int": ["position", "min_days", "max_uses"],
        "bool": ["active", "weekend_only"]},
}


def _cfg(resource: str):
    cfg = RESOURCES.get(resource)
    if not cfg:
        raise HTTPException(status_code=404, detail="Jenis konten tidak dikenal")
    return cfg


def _clean(cfg, data: dict) -> dict:
    out = {}
    for f in cfg["fields"]:
        if f not in data:
            continue
        v = data[f]
        # R6-5 fix: field angka diisi non-numerik (mis. "abc") dulu bikin int()/float() melempar
        # → HTTP 500. Tangkap & ubah jadi 400 yang jelas menyebut field yang salah.
        try:
            if f in cfg.get("int", []):
                v = int(v or 0)
            elif f in cfg.get("num", []):
                v = float(v or 0)
            elif f in cfg.get("bool", []):
                v = bool(v)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Field '{f}' harus berupa angka")
        out[f] = v
    return out


def _label(doc: dict) -> str:
    return doc.get("name") or doc.get("title") or doc.get("code") or doc.get("id") or "konten"


async def _ensure_unique_slug(db, resource: str, cfg: dict, data: dict, exclude_id: Optional[str] = None):
    """G1: pastikan slug (atau kode utk promo) unik dlm koleksi resource."""
    sf = cfg.get("slug_field")
    if not sf:
        return
    slug = (data.get(sf) or "").strip()
    if not slug:
        return
    q = {sf: slug}
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    dup = await db[resource].find_one(q, {"_id": 0, "id": 1, sf: 1})
    if dup:
        raise HTTPException(status_code=409, detail=f"{sf.capitalize()} '{slug}' sudah dipakai — gunakan yang lain")


@router.get("/content/{resource}")
async def list_content(
    resource: str,
    response: Response,
    q: Optional[str] = Query(default=None, description="Cari (case-insensitive) di judul/nama/kode"),
    limit: int = Query(default=100, ge=1, le=500, description="Batas item per halaman (1..500)"),
    offset: int = Query(default=0, ge=0, description="Offset paginasi (0-based)"),
    user=Depends(CMS),
):
    cfg = _cfg(resource)
    # G10: sort utama pd `position` (asc); fallback ke sort default resource.
    primary = cfg["sort"]
    fallback = cfg.get("sort_fallback") or primary
    db = get_db()
    query = {}
    # Search (case-insensitive) di search_fields.
    if q and q.strip():
        import re
        pattern = re.escape(q.strip())
        query["$or"] = [{f: {"$regex": pattern, "$options": "i"}} for f in cfg.get("search_fields", [])]
    # CMS-D3: paginasi (limit + offset) + total count via header agar FE bisa "Muat Lebih Banyak".
    total = await db[resource].count_documents(query)
    docs = await (
        db[resource]
        .find(query, {"_id": 0})
        .sort([primary, fallback])
        .skip(offset)
        .limit(limit)
        .to_list(limit)
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)
    return safe_doc(docs)


@router.post("/content/{resource}")
async def create_content(resource: str, body: dict = Body(...), user=Depends(CMS)):
    cfg = _cfg(resource)
    db = get_db()
    doc = _clean(cfg, body)
    await _ensure_unique_slug(db, resource, cfg, doc)  # G1
    doc["id"] = new_id(cfg["prefix"])
    doc["created_at"] = now_iso()
    if resource == "articles" and not doc.get("published_at"):
        doc["published_at"] = now_iso()
    await db[resource].insert_one(doc)
    await record(db, actor=user, action="create", entity_type=resource, entity_id=doc["id"],
                 after=doc, summary=f"Buat {resource}: {_label(doc)}")
    return safe_doc(doc)


@router.put("/content/{resource}/{item_id}")
async def update_content(resource: str, item_id: str, body: dict = Body(...), user=Depends(CMS)):
    cfg = _cfg(resource)
    db = get_db()
    existing = await db[resource].find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Konten tidak ditemukan")
    updates = _clean(cfg, body)
    # G1: cek unik slug kalau slug/code ikut ter-update.
    if cfg.get("slug_field") in updates:
        await _ensure_unique_slug(db, resource, cfg, updates, exclude_id=item_id)
    if updates:
        updates["updated_at"] = now_iso()
        await db[resource].update_one({"id": item_id}, {"$set": updates})
    after = await db[resource].find_one({"id": item_id}, {"_id": 0})
    await record(db, actor=user, action="update", entity_type=resource, entity_id=item_id,
                 before=existing, after=after, summary=f"Ubah {resource}: {_label(after)}")
    return safe_doc(after)


@router.delete("/content/{resource}/{item_id}")
async def delete_content(resource: str, item_id: str, user=Depends(CMS)):
    cfg = _cfg(resource)
    db = get_db()
    existing = await db[resource].find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Konten tidak ditemukan")
    await db[resource].delete_one({"id": item_id})
    await record(db, actor=user, action="delete", entity_type=resource, entity_id=item_id,
                 before=existing, summary=f"Hapus {resource}: {_label(existing)}")
    return {"ok": True}


@router.post("/content/{resource}/{item_id}/duplicate")
async def duplicate_content(resource: str, item_id: str, user=Depends(CMS)):
    """G8: clone konten. Slug/code diberi suffix `-copy` (dan `-copy-2`, dst) supaya unik."""
    cfg = _cfg(resource)
    db = get_db()
    src = await db[resource].find_one({"id": item_id}, {"_id": 0})
    if not src:
        raise HTTPException(status_code=404, detail="Konten sumber tidak ditemukan")
    new_doc = {k: v for k, v in src.items() if k not in {"id", "created_at", "updated_at"}}
    # Auto-suffix slug/code utk hindari konflik.
    sf = cfg.get("slug_field")
    if sf and new_doc.get(sf):
        base = str(new_doc[sf])
        candidate = f"{base}-copy"
        i = 2
        while await db[resource].find_one({sf: candidate}, {"_id": 0, "id": 1}):
            candidate = f"{base}-copy-{i}"; i += 1
        new_doc[sf] = candidate
    # Nama/judul juga diberi tanda salinan (opsional).
    for name_key in ("name", "title"):
        if new_doc.get(name_key):
            new_doc[name_key] = f"{new_doc[name_key]} (Salinan)"
            break
    # Testimonials: reset moderation state; Articles/Packages/Promos: nonaktifkan default.
    if resource == "testimonials":
        new_doc["approved"] = False
    elif "published" in new_doc:
        new_doc["published"] = False
    elif "active" in new_doc:
        new_doc["active"] = False
    new_doc["id"] = new_id(cfg["prefix"])
    new_doc["created_at"] = now_iso()
    await db[resource].insert_one(new_doc)
    await record(db, actor=user, action="duplicate", entity_type=resource, entity_id=new_doc["id"],
                 after=new_doc, summary=f"Duplikat {resource}: {_label(new_doc)}")
    return safe_doc(new_doc)


# ── G3: CMS Image Upload ─────────────────────────────────────────────────────
_UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(Path(__file__).resolve().parent.parent / "uploads")))
_CMS_DIR = _UPLOAD_DIR / "cms"
_CMS_DIR.mkdir(parents=True, exist_ok=True)
_ALLOWED_IMG = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
# Batas ukuran & jenis kini SATU PINTU di services/media_store (dulu 6 MB khusus CMS, berbeda dari
# Media Library 10 MB — pengguna yang sama dengan dua aturan berbeda hanya membuat bingung).


@router.post("/uploads/cms")
async def upload_cms_image(image: UploadFile = File(...), user=Depends(CMS)):
    """Unggah gambar CMS — kini DISATUKAN ke Media Library v2.

    Dulu endpoint ini menulis berkas ke `uploads/cms/` tanpa satu pun catatan di database:
    gambar tidak bisa dicari, tidak punya teks alternatif, tidak bisa dipakai ulang, dan tidak
    pernah muncul di Media Library — sementara halaman iklan punya library lengkap. Dua dunia
    media untuk satu bisnis yang sama.

    Sekarang berkas ditulis lewat `services/media_store` (pagar MIME/ukuran/path yang sama dengan
    Media Library) dan didaftarkan sebagai `media_assets`, sehingga langsung terlihat & bisa dipakai
    ulang di seluruh aplikasi. Bentuk respons LAMA dipertahankan (`url`, `size_bytes`,
    `content_type`, `filename`) agar pemanggil lama tidak rusak; URL lama `/api/uploads/cms/*`
    yang sudah tersimpan di konten tayang tetap disajikan seperti biasa.
    """
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="File gambar wajib diunggah")
    ctype = (image.content_type or "").lower().split(";")[0].strip()
    if ctype not in _ALLOWED_IMG:
        raise HTTPException(status_code=415, detail="Format tidak didukung — gunakan JPG/PNG/WEBP/GIF")
    blob = await image.read()
    if len(blob) == 0:
        raise HTTPException(status_code=400, detail="File kosong")
    if len(blob) > ms.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413,
                            detail=f"Ukuran melebihi {ms.MAX_IMAGE_BYTES // (1024 * 1024)}MB")
    info = ms.storage_info()
    if not info["ready"]:
        raise HTTPException(status_code=400,
                            detail=f"Penyimpanan media belum siap: {info['reason'] or 'tidak diketahui'}")
    try:
        meta = ms.upload_bytes(blob, ctype, filename=image.filename, folder="cms")
    except ms.MediaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    db = get_db()
    doc = await ml.register_asset(db, meta, user, folder_id="", alt="", source="cms")
    public = ml.public_doc(doc)
    await record(db, actor=user, action="upload", entity_type="cms_image", entity_id=doc["id"],
                 summary=f"Upload gambar CMS: {doc['original_filename']} ({len(blob) // 1024}KB)")
    return {"url": public["url"], "size_bytes": len(blob), "content_type": ctype,
            "filename": doc["original_filename"], "id": doc["id"], "media_id": doc["id"],
            "thumb_url": public["thumb_url"], "width": meta.get("width") or 0,
            "height": meta.get("height") or 0}
