"""routers/invoices.py — invoice/faktur dari booking + export PDF/Excel (Phase 5).

Koleksi kanonik: `invoices`. FK: booking_id→bookings (wajib), customer_id→customers.
INV-8: number unik berurutan (INV-0001, ...). Akses section 'finance'.
Urutan route: literal & sub-path didefinisikan sebelum param generik.
"""
from io import BytesIO
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from core_utils import money, new_id, now_iso, safe_doc
from db import get_db
from dependencies import require_section
from schemas import InvoiceCreate, InvoiceStatusUpdate
from services.audit import record
from services.exporter import invoice_pdf, invoice_xlsx
from services.finance import next_invoice_number

router = APIRouter(prefix="/api", tags=["invoices"])
FIN = require_section("finance")
VALID_STATUS = {"draft", "sent", "partial", "paid"}


@router.get("/invoices")
async def list_invoices(status: str = Query(default=None), limit: int = Query(default=300, le=1000),
                        skip: int = Query(default=0, ge=0), user=Depends(FIN)):
    query = {}
    if status:
        query["status"] = status
    docs = await get_db().invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return safe_doc(docs)


@router.post("/invoices")
async def create_invoice(body: InvoiceCreate, user=Depends(FIN)):
    db = get_db()
    booking = await db.bookings.find_one({"id": body.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=400, detail="Booking tidak ditemukan")
    amount = float(body.amount) if body.amount is not None else float(booking.get("total_amount", 0) or 0)
    issued = now_iso()
    due = body.due_at or (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    doc = {
        "id": new_id("inv"),
        "number": await next_invoice_number(db),
        "booking_id": body.booking_id,
        "customer_id": booking.get("customer_id"),
        "customer_name": booking.get("customer_name"),
        "booking_code": booking.get("code"),
        "amount": money(amount),
        "status": "draft",
        "issued_at": issued,
        "due_at": due,
        "notes": body.notes or "",
        "created_by": user.get("id"),
        "created_at": now_iso(),
    }
    await db.invoices.insert_one(doc)
    await record(db, actor=user, action="create", entity_type="invoice", entity_id=doc["id"],
                 after=doc,
                 summary=f"Terbitkan invoice {doc['number']} (Rp {int(doc['amount']):,})".replace(",", "."))
    return safe_doc(doc)


@router.get("/invoices/{invoice_id}/export")
async def export_invoice(invoice_id: str, format: str = Query(default="pdf"), user=Depends(FIN)):
    inv = await get_db().invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    number = inv.get("number", "invoice")
    if format == "excel":
        data = invoice_xlsx(inv)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fname = f"{number}.xlsx"
    else:
        data = invoice_pdf(inv)
        media = "application/pdf"
        fname = f"{number}.pdf"
    return StreamingResponse(BytesIO(data), media_type=media,
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@router.patch("/invoices/{invoice_id}")
async def update_invoice_status(invoice_id: str, body: InvoiceStatusUpdate, user=Depends(FIN)):
    if body.status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail="Status invoice tidak sah")
    db = get_db()
    res = await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    await record(db, actor=user, action="update", entity_type="invoice", entity_id=invoice_id,
                 after={"status": body.status},
                 summary=f"Ubah status invoice {inv.get('number')} → {body.status}")
    return safe_doc(inv)


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user=Depends(FIN)):
    inv = await get_db().invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    return safe_doc(inv)
