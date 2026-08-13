"""routers/pricing.py — Pricing Engine endpoint internal (Phase 9 / B1).

Dipakai Booking wizard untuk auto-hitung harga (rincian transparan) sebelum simpan.
Sumber tarif = settings.pricing_rules (services.pricing). Akses: semua user login.
"""
from fastapi import APIRouter, Depends

from db import get_db
from dependencies import get_current_user
from schemas import PricingQuoteRequest
from services.pricing import compute_quote, get_pricing_rules

router = APIRouter(prefix="/api", tags=["pricing"])


async def _holidays(db):
    op = await db.settings.find_one({"key": "operational"}, {"_id": 0})
    if op and isinstance(op.get("value"), dict):
        return op["value"].get("holidays", []) or []
    return []


@router.get("/pricing/rules")
async def get_rules(user=Depends(get_current_user)):
    """Aturan harga aktif (gabungan DB + default)."""
    return await get_pricing_rules(get_db())


@router.post("/pricing/quote")
async def quote(body: PricingQuoteRequest, user=Depends(get_current_user)):
    """Hitung rincian harga ber-item + DP saran. Resolusi tipe armada via vehicle_id bila perlu."""
    db = get_db()
    rules = await get_pricing_rules(db)
    vtype = body.vehicle_type
    if body.vehicle_id and not vtype:
        v = await db.vehicles.find_one({"id": body.vehicle_id}, {"_id": 0, "type": 1})
        vtype = v.get("type") if v else None
    return compute_quote(
        rules,
        vehicle_type=vtype,
        days=body.days,
        distance_km=body.distance_km,
        when=body.start_date,
        holidays=await _holidays(db),
        include_travel=True,
    )
