"""routers/broadcasts.py — Broadcast WhatsApp (struktur, Phase 4).

Akses owner/ops_admin (section 'crm'). Segmentasi audiens berbasis koleksi `leads`
(stage/source). Pengiriman = SIMULASI (mock): menandai 'sent' + recipients_count
terhitung dari segmen. Integrasi WA nyata = fase lanjutan.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from core_utils import new_id, now_iso, safe_doc
from db import get_db
from dependencies import require_section
from schemas import BroadcastCreate
from services.audit import record

router = APIRouter(prefix="/api", tags=["broadcasts"])
CRM = require_section("crm")


def _segment_query(stage, source):
    q = {}
    if stage:
        q["stage"] = stage
    if source:
        q["source"] = source
    return q


@router.get("/broadcasts")
async def list_broadcasts(limit: int = Query(default=200, le=500), skip: int = Query(default=0, ge=0),
                          user=Depends(CRM)):
    docs = await get_db().broadcasts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return safe_doc(docs)


@router.post("/broadcasts")
async def create_broadcast(body: BroadcastCreate, user=Depends(CRM)):
    db = get_db()
    recipients = await db.leads.count_documents(_segment_query(body.segment_stage, body.segment_source))
    doc = {
        "id": new_id("brd"), "title": body.title.strip(), "message": body.message.strip(),
        "segment": {"stage": body.segment_stage, "source": body.segment_source},
        "scheduled_at": body.scheduled_at, "status": "draft",
        "recipients_count": recipients, "created_by": user.get("id"), "created_at": now_iso(),
    }
    await db.broadcasts.insert_one(doc)
    await record(db, actor=user, action="create", entity_type="broadcast", entity_id=doc["id"],
                 summary=f"Buat broadcast '{doc.get('title')}' ({recipients} penerima)")
    return safe_doc(doc)


@router.post("/broadcasts/{broadcast_id}/send")
async def send_broadcast(broadcast_id: str, user=Depends(CRM)):
    db = get_db()
    b = await db.broadcasts.find_one({"id": broadcast_id})
    if not b:
        raise HTTPException(status_code=404, detail="Broadcast tidak ditemukan")
    if b.get("status") == "sent":
        raise HTTPException(status_code=400, detail="Broadcast sudah dikirim")
    seg = b.get("segment") or {}
    recipients = await db.leads.count_documents(_segment_query(seg.get("stage"), seg.get("source")))
    await db.broadcasts.update_one({"id": broadcast_id}, {"$set": {
        "status": "sent", "recipients_count": recipients, "sent_at": now_iso()}})
    await record(db, actor=user, action="send", entity_type="broadcast", entity_id=broadcast_id,
                 summary=f"Kirim broadcast '{b.get('title')}' ke {recipients} penerima (simulasi)")
    return safe_doc(await db.broadcasts.find_one({"id": broadcast_id}, {"_id": 0}))
