# 10 — CODEBASE MAP (Living Reference)
## Travel & Fleet Management Ecosystem

> Cek di sini SEBELUM membuat file/fungsi/komponen — cegah duplikat. Update tiap ada file/endpoint/komponen baru.

**Batas ukuran file (NON-NEGOTIABLE):** Router `.py` ≤ 800 · Komponen `.jsx`/`.js` ≤ 500 · Util/hook/config `.js` ≤ 300 · `.css` ≤ 400.

---

## 🐍 BACKEND (status: Phase 5 — Keuangan & Laporan COMPLETED)
| File | Fungsi | Status |
|------|--------|--------|
| `server.py` | app factory, startup index, router registration, CORS | ✅ |
| `db.py` | Motor client + `get_db()` + `close()` | ✅ |
| `core_utils.py` | `now_iso()`, `new_id(prefix)`, `safe_doc()`, `hash_password()` | ✅ |
| `dependencies.py` | `get_current_user()`, `require_role()`, `require_permission()`, `require_section()` | ✅ |
| `permissions_config.py` | matrix RBAC + `SECTION_ACCESS` (owner/ops_admin/driver) | ✅ |
| `schemas.py` | Pydantic: Login/User, Booking(Create/Update), Location, Vehicle/Driver/Customer (Create/Update), PaymentCreate | ✅ |
| `routers/auth.py` | login, me, logout | ✅ |
| `routers/users.py` | CRUD user (owner) | ✅ |
| `routers/dashboard.py` | metrik role-aware + reminders due-soon + recent + AR/revenue (INV-9) | ✅ |
| `routers/vehicles.py` | CRUD armada + guard DELETE (FK booking) | ✅ |
| `routers/drivers.py` | CRUD driver + guard DELETE (booking aktif) | ✅ |
| `routers/customers.py` | CRUD customer + **Customer 360** (bookings+stats) | ✅ |
| `routers/bookings.py` | list/calendar/availability/create/{id}/PATCH/confirm/cancel/complete (INV-1/4/10) | ✅ |
| `routers/payments.py` | GET/POST payments (INV-2/INV-3) | ✅ |
| `routers/leads.py` | CRM leads: list/pipeline/detail/stage/assign/activities/convert/reminders/agents (INV-7) | ✅ (Phase 4) |
| `routers/broadcasts.py` | CRM broadcast list/create/send (WA SIMULASI) | ✅ (Phase 4) |
| `routers/public.py` | situs publik (fleet/destinations/articles/testimonials/company/trip-estimate/quotation→lead) | ✅ (Phase 3) |
| `routers/expenses.py` | pengeluaran CRUD + FK guard (recompute trip.profit, INV-5) | ✅ (Phase 5) |
| `routers/invoices.py` | invoice dari booking + nomor unik (INV-8) + export PDF/Excel + status | ✅ (Phase 5) |
| `routers/finance.py` | laba-rugi periodik/per-trip + piutang(AR) + summary | ✅ (Phase 5) |
| `routers/reports.py` | laporan agregat (tren/kategori/status/top-customer/utilisasi) + export Excel | ✅ (Phase 5) |
| `routers/locations.py` `routers/trips.py` `routers/driver.py` | GPS ingest/live, trips+ETA+track, driver checkin | ✅ (Phase 1) |
| `services/crm.py` | auto-assign round-robin, log_activity, pipeline stats | ✅ (Phase 4) |
| `services/finance.py` | INV-2/INV-3 + profit_loss/accounts_receivable/next_invoice_number (INV-8) | ✅ (Phase 2/5) |
| `services/reports.py` | agregasi laporan (read-only) | ✅ (Phase 5) |
| `services/exporter.py` | invoice PDF (reportlab) + invoice/laporan Excel (openpyxl) | ✅ (Phase 5) |
| `services/availability.py` | `overlaps()`, `find_conflicts()` (INV-4) | ✅ |
| `services/finance.py` | `derive_payment_status()` (INV-3), `recompute_booking_payment()` (INV-2) | ✅ |
| `services/geo.py` `services/osrm.py` | parse_iso/haversine/valid_coord, route ETA (adapter) | ✅ (Phase 1) |
| `routers/inbox.py` | Inbox conversations/messages; **E1**: kanal whatsapp kirim via provider (cost/status) + opt-in/out + template | ✅ (Phase 7 / E1) |
| `routers/automation.py` | **E1** Automation API: rules CRUD + runs/events log + stats + event-types + reset-defaults (section 'automation') | ✅ (E1) |
| `routers/whatsapp.py` | **E1** WA Adapter API: config/templates (owner) + simulate-inbound + webhook publik (verify+ingest) | ✅ (E1) |
| `services/events.py` | **E1** Event Bus: `emit()` (idempotent, defensif) + `render_template()`; koleksi `events` | ✅ (E1) |
| `services/automation.py` | **E1** Automation Engine: match kondisi → aksi (send_wa/notif/task/assign/followup) + `default_rules()`; koleksi `automation_rules`/`automation_runs` | ✅ (E1) |
| `services/whatsapp.py` | **E1** provider-agnostic (MockProvider aktif, MetaCloudProvider stub E6) + `send_wa`/`handle_inbound`/session-window/cost | ✅ (E1) |
| `services/notifications.py` | scheduler scan; **E1**: emit `booking.departure_due`/`invoice.overdue`/`doc.expiring` | ✅ (Phase 7 / E1) |
| `routers/growth.py` | **E2** Growth API: scoreboard/aging/rfm/recompute + growth-config + segments CRUD + preview | ✅ (E2) |
| `routers/campaigns.py` | **E2** Sequences (CRUD + enroll + enrollments + stop) + Campaigns (CRUD + send broadcast WA tersegmentasi) | ✅ (E2) |
| `services/growth.py` `services/segments.py` `services/sequences.py` `services/campaigns.py` | **E2** lead scoring/SLA + RFM/LTV; segment builder (criteria→query, preview reachable); sequence nurturing+enroll; campaign send (WA MOCK + cost/stats + recipients) | ✅ (E2) |
| `routers/dispatch.py` | **E3** Dispatch Ops Cockpit: `/dispatch/today` + `/{booking_id}/assign` (+geocode tujuan) + `/{booking_id}/confirm-departure` + `/trips/{id}/enroute|arrived|pod` (section 'dispatch'; WA via Event Bus E1) | ✅ (E3) |
| `services/geocode.py` | **E3** geocoding tujuan via OSM Nominatim (gratis, adapter) + cache `geocode_cache` (perbaiki gap G1) | ✅ (E3) |
| `routers/analytics.py` | **E4** BI & Management Cockpit (read-only): `/analytics/summary` `/funnel` `/channels` `/fleet` `/drivers` `/ar-aging` `/retention` `/forecast` `/ad-spend`(GET+PUT) `/export`(pdf/excel). Section 'analytics' (owner/ops_admin) | ✅ (E4) |
| `services/analytics.py` `services/analytics_export.py` | **E4** agregasi read-only (KPI+delta, funnel cohort, channel ROAS/CPL/CAC pakai `settings.marketing_spend`, fleet ROI, driver perf, AR aging, retensi, forecast moving-average) + export PDF (reportlab) & Excel (openpyxl) | ✅ (E4) |
| `routers/finance.py (E5)` | **E5** extend: `/finance/pl-full` `/reconciliation` `/reconciliation/sync` `/cashflow` `/ar/overdue` `/ar/{id}/remind` `/ar/remind-all` `/export`(pdf/excel). Section 'finance' (owner/ops_admin) | ✅ (E5) |
| `services/finance_automation.py` | **E5** Finance Automation: `pl_full` (G4 maintenance→P&L total+per-unit), `reconciliation`+`sync_invoice_statuses` (G5 idempotent), `cashflow`+proyeksi MA, `ar_overdue`/`send_ar_reminder`/`send_bulk_ar_reminders` (emit `invoice.overdue`→automation→WA mock), `assemble_finance_report` | ✅ (E5) |
| `services/finance_export.py` | **E5** laporan keuangan: `finance_report_pdf` (reportlab) + `finance_report_xlsx` (openpyxl) | ✅ (E5) |
| `services/attribution.py` `services/ads.py` | **E-ADS** atribusi: `derive_channel` (UTM/gclid/fbclid/ttclid→channel kanonik), `build_attribution` (first+last touch), `channel_label`; `ads.create_ad_lead` (Lead Ads mock → lead ber-atribusi + parse envelope Meta `field_data`). Dipakai `public.py` (quotation+webhook) & `analytics.channels_roi` | ✅ (E-ADS) |
| `routers/public.py (E-ADS)` `services/whatsapp.py (E6)` | **E-ADS** `POST /public/lead-ads/{provider}` + quotation simpan attribution/consent/channel; `analytics.channels_roi` group-by `channel`; `segments` kriteria `channel`/`marketing_consent`. **E6** `MetaCloudProvider` kirim NYATA Graph API (httpx, graceful) + `send_template(body=)`; `routers/whatsapp.py` `POST /wa/test-send` | ✅ (E-ADS/E6) |

## ⚛️ FRONTEND (status: Phase 5 — Keuangan & Laporan COMPLETED)
| File | Fungsi | Status |
|------|--------|--------|
| `App.js` | routing publik `/` + ERP `/app/*` (ProtectedRoute+AppShell) | ✅ |
| `services/apiClient.js` | axios instance + `setAuthToken` + interceptor | ✅ |
| `hooks/useResource.js` | fetch list/detail + loading/error/reload | ✅ |
| `config/navigationConfig.js` | nav + role allowlist + section | ✅ |
| `utils/formatters.js` | formatCurrency/formatQty/formatDate/formatDateTime | ✅ |
| `context/AuthContext.js` | user/token state + login/logout | ✅ |
| `components/shared/*` | `DataTable`, `DataStates` (Loading/Empty/Error), `StatusPill`/`PaymentPill`, `ConfirmDialog` | ✅ |
| `components/app/*` | `AppShell`, `ProtectedRoute`, `LiveMap`, `BookingFormDialog`, `BookingEditDialog`, `VehicleFormDialog`, `DriverFormDialog`, `CustomerFormDialog`, `CustomerDetailDialog`, `PaymentDialog` | ✅ |
| `features/app/*` | `Login`, `Dashboard`, `Bookings`, `Vehicles`, `Drivers`, `Customers`, `Users`, `GpsTracking`, `DriverCheckin`, `Crm`(Phase4), `Finance`(Phase5), `Reports`(Phase5), `PlaceholderPage`(maintenance/settings) | ✅ |
| `components/app/* (Phase4/5)` | `CrmKanban`, `LeadDetailDrawer`, `CrmReminders`, `LeadFormDialog`, `ExpenseFormDialog`, `InvoiceFormDialog` | ✅ |
| `components/app/* (E2 CRM Growth)` | `CrmScoreboard` (skor+SLA), `CrmRfm` (RFM/LTV), `CrmSegments` (segment builder+preview), `CrmSequences` (nurturing+enroll), `CrmCampaigns` (broadcast WA tersegmentasi) — dirender sbg tab di `Crm.jsx`. `CrmBroadcast.jsx` lama TIDAK lagi dirender di CRM (digantikan tab Campaign). | ✅ (E2) |
| `features/app/Dispatch.jsx` + `components/app/* (E3 Dispatch)` | **E3** Ops Cockpit "Hari Ini" (KPI + tabel keberangkatan + pemilih tanggal + aksi assign/konfirmasi/berangkat/tiba/POD). `AssignTripDialog` (driver+unit→geocode), `PodDialog` (Bukti Layanan lokal: foto+penerima+catatan). Menu `nav-dispatch` di grup Operasional (owner/ops_admin). | ✅ (E3) |
| `features/app/Dashboard.jsx` + `components/app/* (E4 BI)` | **E4** Beranda jadi tab [Ringkasan | BI Cockpit]. `BiCockpit` (range picker 30/90/365/kustom + KPI eksekutif +delta + export PDF/Excel), `BiCharts` (funnel/channel/forecast Recharts), `BiTables` (fleet ROI/driver/AR aging/retensi), `AdSpendDialog` (atur belanja iklan per channel). Tab BI hanya owner/ops_admin. | ✅ (E4) |
| `features/app/Finance.jsx` + `components/app/* (E5)` | **E5** Keuangan jadi 6 tab (Laba-Rugi · Pengeluaran · Invoice · Piutang · **Rekonsiliasi** · **Arus Kas**). Laba-Rugi pakai `pl-full` (Biaya Perawatan + tabel per-unit), tombol Export PDF/Excel (per periode), Piutang + tombol Ingatkan Semua/Ingatkan (WA mock) + badge usia, status invoice 'Sebagian'. `FinanceReconciliation.jsx` (tabel rekonsiliasi + chips + Sinkronkan Status), `FinanceCashflow.jsx` (KPI kas + chart Recharts arus kas+proyeksi + tabel). | ✅ (E5) |
| `utils/attribution.js` + `features/public/Quotation.jsx` + `components/public/PublicLayout.jsx` | **E-ADS** capture UTM/gclid/fbclid/ttclid (first+last touch di localStorage, dipanggil tiap route di PublicLayout); form Quotation kirim `attribution` + checkbox **consent** marketing. | ✅ (E-ADS) |
| `components/app/LeadDetailDrawer.jsx` + `components/app/BiCharts.jsx` | **E-ADS** LeadDetailDrawer: panel **Atribusi Akuisisi** (channel, kampanye, first-touch, badge consent). BiCharts `ChannelsCard`: pakai label channel backend + kolom **Menang** & **CAC** (CPL/CAC/ROAS per channel) di BI Cockpit. | ✅ (E-ADS) |
| `components/app/WhatsAppSettings.jsx (E6)` | **E6 prep** field **API Version** + badge **'Siap kirim'** + blok **Test Kirim** (POST `/wa/test-send`, kirim nyata via provider aktif; mock→sukses, meta_cloud tanpa kredensial→gagal rapi). | ✅ (E6) |
| `features/public/*` | 12 halaman publik (Home/Fleet/FleetDetail/Destinations/DestinationDetail/TripCalculator/Quotation/ThankYou/Blog/BlogDetail/About/Contact) | ✅ (Phase 3) |
| `features/app/Automation.jsx` | **E1** menu Otomasi: KPI + tab Aturan (toggle) · Riwayat Eksekusi · Event Stream | ✅ (E1) |
| `features/app/Inbox.jsx` | **E1** upgrade: WA session-window pill + cost + opt-in/out + kirim template + tombol simulasi WA masuk | ✅ (E1) |
| `components/app/AutomationSettings.jsx` `components/app/WhatsAppSettings.jsx` | **E1** konfigurasi rules (CRUD + reset) & WA provider/templates di Pengaturan | ✅ (E1) |

## 🔑 UTILITY — JANGAN RE-IMPLEMENT
```
Backend core_utils: now_iso(), new_id(prefix), safe_doc(doc), hash_password(pw)
Backend dependencies: get_current_user(), require_role(*roles), require_permission(), require_section(name)
Backend services.finance: derive_payment_status(paid,total,status), recompute_booking_payment(db,booking_id)
Backend services.availability: find_conflicts(db,vehicle_id,start,end,exclude_id)
Frontend formatters: formatCurrency(v)→"Rp 185.000", formatQty(v), formatDate(v), formatDateTime(v)
Frontend apiClient: default export (axios), setAuthToken(token)
Frontend hooks: useResource(path) → {data,loading,error,reload}
Frontend shared: DataTable, LoadingState/EmptyState/ErrorState, StatusPill/PaymentPill, ConfirmDialog
```

## 📡 ENDPOINT INDEX
Lihat `04_API_CONTRACT.md` (sinkron dgn kode). Endpoint kritis terdaftar di `scripts/health_check.py`.

**Versi:** 5.0 (Phase 5 — Keuangan & Laporan) · **Update wajib:** tiap file/endpoint/komponen baru. · **Gap & konsolidasi:** lihat `plan.md` §0.5.
