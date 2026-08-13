"""routers/leads.py — CRM Internal (Phase 4).

Akses owner/ops_admin (section 'crm'). Pipeline berbasis koleksi `leads`;
timeline di `lead_activities`. Auto-assignment round-robin via services.crm.
Invarian INV-7 (lead.stage ∈ himpunan sah) dijaga di endpoint stage/create.
Catatan urutan rute: sub-path statis (/pipeline,/agents,/reminders) DIDEKLARASIKAN
SEBELUM /leads/{lead_id} agar tidak ditangkap route berparameter.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from core_utils import new_id, now_iso, safe_doc
from db import get_db
from dependencies import require_section
from schemas import (LeadActivityCreate, LeadAssign, LeadConvert, LeadCreate,
                     LeadStageUpdate, LeadUpdate)
from services.crm import (LEAD_STAGE_SET, LEAD_STAGES, OPEN_STAGES, STAGE_LABEL,
                          assignable_agents, auto_assign_agent, log_activity)
from services.events import emit
from services.growth import apply_lead_growth
from services.identity import ensure_customer, find_customer_by_identity, normalize_phone

router = APIRouter(prefix="/api", tags=["leads"])
CRM = require_section("crm")


async def _users_map(db):
    docs = await db.users.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    return {u["id"]: u.get("name") for u in docs}


def _enrich(lead, umap):
    lead = safe_doc(lead)
    aid = lead.get("assigned_to")
    lead["assignee_name"] = umap.get(aid) if aid else None
    return lead


@router.get("/leads")
async def list_leads(stage: str = Query(default=None), source: str = Query(default=None),
                     assigned: str = Query(default=None), q: str = Query(default=None),
                     limit: int = Query(default=500, le=1000), skip: int = Query(default=0, ge=0),
                     user=Depends(CRM)):
    db = get_db()
    query = {}
    if stage:
        query["stage"] = stage
    if source:
        query["source"] = source
    if assigned:
        query["assigned_to"] = None if assigned == "unassigned" else assigned
    if q:
        query["$or"] = [{"customer_name": {"$regex": q, "$options": "i"}},
                        {"phone": {"$regex": q, "$options": "i"}},
                        {"destination": {"$regex": q, "$options": "i"}}]
    docs = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    umap = await _users_map(db)
    return [_enrich(d, umap) for d in docs]


@router.get("/leads/pipeline")
async def lead_pipeline(user=Depends(CRM)):
    db = get_db()
    docs = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    umap = await _users_map(db)
    cols = {s: [] for s in LEAD_STAGES}
    for d in docs:
        s = d.get("stage") if d.get("stage") in LEAD_STAGE_SET else "new"
        cols[s].append(_enrich(d, umap))
    stages = [{"key": s, "label": STAGE_LABEL[s], "count": len(cols[s]),
               "value": sum(float(x.get("value", 0) or 0) for x in cols[s]),
               "leads": cols[s]} for s in LEAD_STAGES]
    won, lost = len(cols["won"]), len(cols["lost"])
    closed = won + lost
    summary = {
        "total": len(docs), "open": len(docs) - closed, "won": won, "lost": lost,
        "conversion": round(won / closed * 100, 1) if closed else 0.0,
        "pipeline_value": sum(float(x.get("value", 0) or 0) for s in OPEN_STAGES for x in cols[s]),
        "won_value": sum(float(x.get("value", 0) or 0) for x in cols["won"]),
    }
    return {"stages": stages, "summary": summary}


@router.get("/leads/agents")
async def lead_agents(user=Depends(CRM)):
    return safe_doc(await assignable_agents(get_db()))


@router.get("/leads/reminders")
async def lead_reminders(limit: int = Query(default=2000, le=2000), user=Depends(CRM)):
    db = get_db()
    docs = await db.leads.find(
        {"stage": {"$in": list(OPEN_STAGES)}, "trip_date": {"$ne": None}}, {"_id": 0}).to_list(limit)
    umap = await _users_map(db)
    today = datetime.now(timezone.utc).date()
    out = []
    for d in docs:
        try:
            dt = datetime.fromisoformat(str(d.get("trip_date")).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days = (dt.date() - today).days
        if days < 0:
            bucket = "overdue"
        elif days <= 1:
            bucket = "h1"
        elif days <= 3:
            bucket = "h3"
        elif days <= 7:
            bucket = "h7"
        else:
            continue
        e = _enrich(d, umap)
        e["days_left"], e["bucket"] = days, bucket
        out.append(e)
    out.sort(key=lambda x: x["days_left"])
    return out


@router.post("/leads")
async def create_lead(body: LeadCreate, user=Depends(CRM)):
    db = get_db()
    stage = body.stage if body.stage in LEAD_STAGE_SET else "new"
    assigned = body.assigned_to
    if assigned:
        if not await db.users.find_one({"id": assigned}):
            raise HTTPException(status_code=400, detail="Agen tidak ditemukan")
    else:
        assigned = await auto_assign_agent(db)
    val = float(body.value or 0)
    # B4 Identity: normalisasi nomor + auto-link ke customer yang sudah ada (bila cocok).
    norm = normalize_phone(body.phone)
    linked = await find_customer_by_identity(db, phone=body.phone, email=body.email)
    doc = {
        "id": new_id("led"), "customer_name": body.customer_name.strip(),
        "phone": body.phone or "", "phone_normalized": norm, "email": body.email or "",
        "source": body.source or "manual", "stage": stage, "assigned_to": assigned,
        "destination": body.destination or "", "trip_date": body.trip_date,
        "pax": int(body.pax or 0), "message": body.message or "",
        "value": val, "quotation_amount": val, "converted_customer_id": None,
        "linked_customer_id": linked["id"] if linked else None,
        "created_at": now_iso(), "last_activity_at": now_iso(),
    }
    await db.leads.insert_one(doc)
    await log_activity(db, doc["id"], user.get("id"), "created",
                       text=f"Lead dibuat — tahap {STAGE_LABEL.get(stage)}")
    if linked:
        await log_activity(db, doc["id"], user.get("id"), "note",
                           text=f"Auto-link ke customer: {linked.get('name')}")
    await emit(db, "lead.created", {
        "lead_id": doc["id"], "customer_name": doc["customer_name"], "phone": doc["phone"],
        "destination": doc["destination"], "source": doc["source"], "value": val,
        "assigned_to": assigned,
    }, source="leads", ref_type="lead", ref_id=doc["id"], dedupe_key=f"lead.created:{doc['id']}")
    await apply_lead_growth(db, doc["id"])
    doc = await db.leads.find_one({"id": doc["id"]}, {"_id": 0})
    umap = await _users_map(db)
    return _enrich(doc, umap)


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user=Depends(CRM)):
    db = get_db()
    doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    umap = await _users_map(db)
    out = _enrich(doc, umap)
    acts = await db.lead_activities.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    acts = safe_doc(acts)
    for a in acts:
        a["user_name"] = umap.get(a.get("user_id"))
    out["activities"] = acts
    if doc.get("converted_customer_id"):
        out["customer"] = safe_doc(await db.customers.find_one({"id": doc["converted_customer_id"]}, {"_id": 0}))
    return out


@router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user=Depends(CRM)):
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates.get("assigned_to") and not await db.users.find_one({"id": updates["assigned_to"]}):
        raise HTTPException(status_code=400, detail="Agen tidak ditemukan")
    if "value" in updates:
        updates["value"] = float(updates["value"] or 0)
    if updates:
        updates["last_activity_at"] = now_iso()
        await db.leads.update_one({"id": lead_id}, {"$set": updates})
        if updates.get("assigned_to") and updates["assigned_to"] != lead.get("assigned_to"):
            umap = await _users_map(db)
            await log_activity(db, lead_id, user.get("id"), "assignment",
                               text=f"Ditugaskan ke {umap.get(updates['assigned_to'], '—')}")
    await apply_lead_growth(db, lead_id)
    doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return _enrich(doc, await _users_map(db))


@router.post("/leads/{lead_id}/stage")
async def move_stage(lead_id: str, body: LeadStageUpdate, user=Depends(CRM)):
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    if body.stage not in LEAD_STAGE_SET:
        raise HTTPException(status_code=400, detail="Tahap tidak valid")
    prev = lead.get("stage")
    updates = {"stage": body.stage, "last_activity_at": now_iso()}
    if body.stage == "contacted" and not lead.get("contacted_at"):
        updates["contacted_at"] = now_iso()
    if body.stage == "won":
        updates["won_at"] = now_iso()
    if body.stage == "lost":
        updates["lost_at"] = now_iso()
        updates["lost_reason"] = body.lost_reason or ""
    await db.leads.update_one({"id": lead_id}, {"$set": updates})
    await log_activity(db, lead_id, user.get("id"), "stage_change",
                       text=(f"Alasan: {body.lost_reason}" if body.stage == "lost" and body.lost_reason else None),
                       from_stage=prev, to_stage=body.stage)
    await apply_lead_growth(db, lead_id, mark_response=(prev == "new"))
    doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return _enrich(doc, await _users_map(db))


@router.post("/leads/{lead_id}/assign")
async def assign_lead(lead_id: str, body: LeadAssign, user=Depends(CRM)):
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    target = body.assigned_to
    if target:
        if not await db.users.find_one({"id": target}):
            raise HTTPException(status_code=400, detail="Agen tidak ditemukan")
    else:
        target = await auto_assign_agent(db)
    await db.leads.update_one({"id": lead_id}, {"$set": {"assigned_to": target, "last_activity_at": now_iso()}})
    umap = await _users_map(db)
    await log_activity(db, lead_id, user.get("id"), "assignment", text=f"Ditugaskan ke {umap.get(target, '—')}")
    await apply_lead_growth(db, lead_id)
    doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return _enrich(doc, umap)


@router.post("/leads/{lead_id}/activities")
async def add_activity(lead_id: str, body: LeadActivityCreate, user=Depends(CRM)):
    db = get_db()
    if not await db.leads.find_one({"id": lead_id}):
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    act = safe_doc(await log_activity(db, lead_id, user.get("id"), body.type or "note", text=body.text))
    await db.leads.update_one({"id": lead_id}, {"$set": {"last_activity_at": now_iso()}})
    await apply_lead_growth(db, lead_id, mark_response=True)
    act["user_name"] = user.get("name")
    return act


@router.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: str, body: LeadConvert, user=Depends(CRM)):
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead tidak ditemukan")
    if lead.get("converted_customer_id"):
        raise HTTPException(status_code=400, detail="Lead sudah dikonversi ke customer")
    # B4 Dedupe: pakai customer yang ada (cocok nomor/email) atau buat baru.
    cust, created = await ensure_customer(
        db, name=lead.get("customer_name") or "Customer", phone=lead.get("phone") or "",
        email=lead.get("email") or "",
        notes=f"Dari lead {lead_id}" + (f" — {body.note}" if body.note else ""),
    )
    await db.leads.update_one({"id": lead_id}, {"$set": {
        "converted_customer_id": cust["id"], "linked_customer_id": cust["id"], "stage": "won",
        "won_at": now_iso(), "last_activity_at": now_iso()}})
    label = "customer baru" if created else f"customer existing ({cust['name']})"
    await log_activity(db, lead_id, user.get("id"), "converted", text=f"Dikonversi ke {label}: {cust['name']}")
    return {"lead_id": lead_id, "customer": safe_doc(cust), "created": created, "status": "converted"}
