# Plan — Online Booking Flow (Public Website) + Pricing/Availability Hardening

> **STATUS 2026-08-13 (sesi 4 / KEBERSIHAN DATA + VERIFIKASI ALUR END-TO-END) — SELESAI & TERVERIFIKASI.**
> Repo di-restore dari GitHub ke pod baru. Permintaan user: (1) cek alur dari awal sampai akhir,
> (2) *"ada nama customer aaaaaaaa… itu yang mengganggu"* → seed diperbaiki, **data demo tetap ada**.
> **BUG-0127 ditemukan & ditutup:** penjaga/smoke/POC menulis lewat API sungguhan tetapi hanya
> menghapus dokumen UTAMA — side-effect-nya tidak → **157 dokumen sampah per satu kali `gate.sh`**
> (customer 60.000 karakter "AAAA…", audit 60.016 karakter, percakapan Inbox "Penjaga INV-*"/
> "Smoke Customer", 34 notifikasi hantu, 35/48 event, lead & penawaran ber-karakter NUL, segmen
> "AdvSeg", aset `guard-media-*`, `conversion_events` menumpuk permanen). Semua SENYAP dengan gate
> HIJAU 40/40 — yang menemukan PENGGUNA. Fix: **mesin bersih-bersih bersama**
> `purge_guard_artifacts()` di `scripts/guardrails/_common.py` (cascade penuh + `seed` dikecualikan)
> dipanggil 11 skrip penulis di `finally`; `_clip()` di `backend/services/audit.py`;
> `conversion_events` masuk daftar reset seed. **Guardrail baru INV-CLEAN-01**
> (`verify_no_test_pollution.py` statik+runtime, di-wire PALING AKHIR di gate) + self-test
> **5 mutasi MERAH↔HIJAU**. Alat baru: `scripts/purge_test_pollution.py`, `scripts/db_snapshot.py`.
> **Bukti:** `gate.sh` **HIJAU 42/42 (0 FAIL, 0 SKIP)** **dan database 0 artefak SESUDAH gate** ·
> POC **74/74** & **84/84** · testing agent `iteration_89` (kebersihan data 100% + RBAC 20/20),
> `iteration_90` (alur end-to-end: publik 9 halaman · pemesanan online → hold → bukti DP → ops
> verifikasi → confirmed · keuangan & laporan · 17 modul ERP — semua 100%), `iteration_91`
> (dispatch → keberangkatan → enroute → arrived → driver check-in/out 260 km → completed, 13/13).
> Data demo dipulihkan bersih pasca-uji: 4 customer, BK-0001..BK-0010, 4 armada, 2 sopir, 4 akun.
>
> **STATUS 2026-08-12 (sesi 3 / UI-READABILITY) — Fase 0–7 SELESAI & TERVERIFIKASI.**
> Sesi 3 mengeksekusi 7 permintaan user dari screenshot (keterbacaan mode gelap & di atas foto,
> 3 halaman publik yang "sepi", CTA blog rusak, posisi chat, rename brand **RahazaTrans**) —
> rincian di **Phase 7**. `gate.sh` **HIJAU 40/40** (guardrail baru **INV-THEME-01**),
> `ux_audit --strict` 0 ERROR/0 WARN, testing agent `iteration_86/87/88` (2 ronde terakhir 0 bug).
>
> **STATUS 2026-08-12 (sesi 2 / BOOKING-V2) — Fase 0–6 SELESAI & TERVERIFIKASI.**
> POC `python scripts/test_core_booking_v1.py` **74/74** · `bash scripts/gate.sh` **HIJAU
> (0 FAIL, 0 SKIP)** · `ux_audit --strict` **0 ERROR 0 WARN** · testing agent
> `iteration_83.json` (navbar + STORY H) & `iteration_84.json` (3 fitur baru: backend 100 %, 
> frontend 100 %, 0 bug).
> Sesi 2 menyelesaikan: **STORY H** (toggle "Tayang di web" → sisa verifikasi §0.2 TUNTAS),
> **§0.1 rapikan navbar publik** (14 target klik → 5 menu + 1 aksi utama; header 1 baris,
> 90,75 px), **section beranda "Pesan online dalam 3 langkah"**, **chip "Lanjutkan pesanan"**,
> lalu 3 fitur backlog: **daftar promo di wizard**, **laporan "Hold Hangus"**,
> **rute bandara (katalog tambah-cepat + arah balik, tarif per tipe unit)**.
> Bug baru ditemukan & ditutup: **BUG-0120** (kode rute otomatis simetris `DPS-DPS`).
> Guardrail diperkuat: **INV-BOOK-02** statik kini mengawal SEMUA skema publik (diturunkan
> dari `import` router, bukan daftar manual) — self-test MERAH↔HIJAU.
> Catatan jujur: notifikasi WhatsApp/Meta/Google/GA4 masih **MOCK** (belum ada kredensial);
> tarif rute bandara nyata tetap harus diisi pemilik (sistem sengaja tidak menebak harga).
>
> **STATUS 2026-08-17 (sesi 5 / REQUEST BARU: SITE-WIDE VISUAL PAGE BUILDER) — PLANNING ONLY.**
> User meminta kemampuan **edit SEMUA halaman publik** (Beranda, Tentang, Armada, Destinasi,
> Kontak, Footer, Logo, Typography, cards, dsb) lewat **visual page builder drag-and-drop**
> ala Wix. User eksplisit: **"buatkan plannya saja dulu, jangan eksekusi"**.
> 
> **Audit yang sudah dilakukan (tanpa coding):**
> - CMS `/app/cms` memang ada & berfungsi, tetapi cakupannya terbatas: Destinasi, Paket, Artikel,
>   Testimoni, Promo, Tema Situs (warna).
> - Ditemukan gap: banyak konten publik masih hardcode di JSX (`Home.jsx`, `About.jsx`, bagian
>   tertentu `Fleet.jsx`, `Contact.jsx`, dan Footer). Typography belum punya kontrol.
> - Fondasi paling dekat: **Landing Page Iklan Builder** (`/app/landing`) sudah punya mesin
>   block-based builder matang (renderer + media library + reorder + preview) dan backend
>   `routers/landing.py` + collection `landing_pages`. Rencana: **extend/reuse** mesin ini
>   untuk halaman inti situs, bukan membuat sistem baru dari nol.

## 1) Objectives

### Objectives yang sudah terpenuhi (Phase 0–7)

- Tambahkan **alur pemesanan publik ala Traveloka rentcar/airport transfer**: cari → pilih unit → review → booking dibuat (hold/pending sesuai mode) → instruksi DP + unggah bukti → ops verifikasi → otomatis confirmed.
- Pastikan **harga dihitung ulang di server** (uang = integer rupiah), **tanpa komponen jarak/BBM**, dan harga tampil = harga tersimpan.
- Perbaiki sumber data & relasi agar tidak salah collection/kosong: fleet/availability/pricing/promo/airport routes.
- Perkuat guardrail & gate untuk mencegah regresi (pricing + booking-public invariants).
- Fix temuan LOW: **menu “Media Library” tampil untuk marketing_admin**.
- Fix kebersihan data uji (BUG-0127): tidak ada test pollution; gate 42/42 hijau.

### Objective baru (Phase 8 — PLANNED)

- Bangun **Site-wide Visual Page Builder** untuk **SEMUA halaman publik inti** + elemen global:
  - Halaman inti: **Beranda (/), Tentang (/about), Armada (/fleet), Destinasi (/destinations), Kontak (/contact)**.
  - Elemen global: **Footer**, **Logo**, **Typography (heading/body font)**, dan komponen kartu/CTA.
- Builder harus:
  1. **WYSIWYG preview** desktop/mobile (seperti Landing Page Builder).
  2. Mendukung **blok reusable** (hero, grid armada, FAQ, CTA band, dsb).
  3. Perubahan **aman**: situs tidak pernah blank/500 (fallback ke default blocks).
  4. Menjaga standar desain: kontrol typography dibatasi ke daftar font yang disetujui.
- **Tidak ada implementasi di sesi ini**: hanya rencana.

## 2) Implementation Steps

### Phase 0 — Quick Fix (UI) — ✅ SELESAI

User stories:
1. Sebagai marketing_admin, saya melihat menu **Media Library** di navigasi “Konten Web”.
2. Sebagai marketing_admin, saya bisa membuka `/app/media` dari menu tanpa mengetik URL.
3. Sebagai ops_admin, navigasi tidak berubah/pecah.
4. Sebagai driver, menu Media Library tetap tidak muncul.
5. Sebagai QA, perubahan tidak mengganggu gate/guideline FE.

Steps:
- Audit sumber nav/section mapping FE (AppShell/menu builder + permissions/sections).
- Pastikan section `media` termasuk untuk role marketing_admin (frontend + backend permission_config bila perlu).
- Re-run minimal FE smoke + gate.

---

### Phase 1 — Core POC (Isolated) — `scripts/test_core_booking_v1.py` — ✅ SELESAI (74/74)

Core = “search availability + server-side pricing + booking state machine + concurrency safety”.

User stories:
1. Sebagai tamu publik, saya hanya melihat **unit yang benar-benar available** untuk tanggal yang dipilih.
2. Sebagai tamu, harga yang saya lihat adalah harga final yang tersimpan di booking (tidak bisa ditamper).
3. Sebagai sistem, 8–16 request paralel pada unit+waktu sama menghasilkan **tepat 1 booking sukses**.
4. Sebagai owner, saya bisa memilih mode **hold_dp** atau **ops_approval** via Settings.
5. Sebagai ops_admin, verifikasi pembayaran mengubah booking hold → confirmed otomatis.

POC steps (backend-only, tanpa UI):
- Tambah model Settings baru `booking_flow` (mode, hold_hours, approval_hours, payment_instructions, bank_accounts/QRIS).
- Tambah field fleet canonical:
  - `vehicles.day_rate` (override per unit, integer rupiah)
  - `vehicles.web_published` (bool)
- Buat **availability search** function (services): filter vehicles yang:
  - `web_published==true`, `ownership==owned`, status allowed
  - tidak bentrok booking aktif (hold/confirmed/ongoing) + tidak bentrok maintenance
- Pricing v2 (services):
  - Input: vehicle_id|vehicle_type, start/end (days), trip_date(start), promo_code(optional)
  - Base per hari = `vehicles.day_rate` jika ada else `pricing_rules.day_rates[type]`
  - **Hapus komponen jarak/BBM** dari compute
  - Surcharge weekend/holiday tetap ada (settings.operational.holidays)
  - Promo tervalidasi server
  - Output: breakdown + total + dp_amount (single DP source)
- Endpoint POC (minimal):
  - `POST /api/public/booking/search`
  - `POST /api/public/booking/create`
  - `POST /api/public/booking/upload-proof`
  - `POST /api/bookings/{id}/approve` (ops_approval)
  - `POST /api/bookings/{id}/verify-proof` (ops)
  - `POST /api/public/booking/status` (code+phone)
- Implement **POC script** untuk memverifikasi 10 poin Fase 1.

---

### Phase 2 — V1 App Development (Backend + Frontend) — ✅ SELESAI

User stories (public):
1. Sebagai tamu, saya memilih layanan **Sewa Harian** dan melihat daftar unit available + harga per unit.
2. Sebagai tamu, saya memilih layanan **Airport Transfer** dan melihat harga flat per rute.
3. Sebagai tamu, setelah booking dibuat saya melihat halaman **Instruksi DP + countdown** dan bisa unggah bukti.
4. Sebagai tamu, saya bisa cek status booking dengan **kode + nomor WA** (tanpa akun).
5. Sebagai tamu, saya menerima WA/notifikasi sesuai event (requested/confirmed).

User stories (ERP/ops):
1. Sebagai ops_admin, saya melihat booking source=public dan status (pending/hold/confirmed).
2. Sebagai ops_admin, saya bisa approve (mode ops_approval) dan mengubah pending→hold.
3. Sebagai ops_admin, saya bisa memverifikasi bukti bayar dan otomatis mencatat payment.
4. Sebagai owner, saya mengatur `booking_flow`.
5. Sebagai owner, saya mengatur tarif per unit (`day_rate`) dan toggle `web_published`.

---

### Phase 3 — Guardrails + Regression + Gate — ✅ SELESAI

- Guardrail: **INV-PRICE-01**, **INV-BOOK-02**.
- Self-test mutasi + wiring ke `gate.sh`.
- `gate.sh` hijau.

---

### Phase 4 — Docs + Handoff — ✅ SELESAI

- Update `docs/03_DATA_MODEL.md`, `docs/04_API_CONTRACT.md`, `docs/05_NAVIGATION_MAP.md`.
- Update memory docs + bug registry.

---

### Phase 5 — Rapikan Navbar Publik + Onboarding Pemesanan — ✅ SELESAI

---

### Phase 6 — 3 Fitur Backlog (promo list + hold hangus report + airport routes) — ✅ SELESAI

---

### Phase 7 — Readability + Kedalaman Halaman Publik + Rename Brand — ✅ SELESAI

---

### Phase 8 — **Site-wide Visual Page Builder (ala Wix) untuk semua halaman publik** — 🅿️ PLANNED (BELUM DIEKSEKUSI)

> **Aturan sesi ini:** hanya rencana. Tidak ada perubahan kode, migrasi, atau eksekusi gate.

#### Phase 8.0 — Arsitektur & Scope Lock (Design Doc)

**Keputusan arsitektur (berbasis audit):**
- Reuse & extend engine yang sudah matang di **Landing Page Builder** (`/app/landing`):
  - renderer `LandingRender.jsx` (atau diekstrak jadi `BlockRender` generik)
  - block forms (`LandingBlockForm` pattern)
  - media library
  - preview desktop/mobile
  - reorder blok (naik/turun; drag native opsional)

**Pemisahan domain:**
- Halaman iklan (`/lp/:slug`) tetap memakai `landing_pages` dengan publish/unpublish, readiness, A/B test.
- Halaman inti situs memakai storage terpisah agar tidak tercampur dengan workflow iklan.

**Storage yang direncanakan:**
- `site_pages` (key tetap): `home`, `about`, `fleet_index`, `destinations_index`, `contact`.
- `site_footer` (single document) dipakai semua halaman publik termasuk `/lp/:slug`.
- `settings.branding` (baru): `logo_url`, `heading_font`, `body_font`.

**Kontrak perilaku produksi:**
- Halaman inti route-nya fixed (/, /about, dst) → tidak ada konsep “publish” terpisah.
- UI aksi: **Simpan & Tayang** (langsung live) + optional **riwayat versi** (rollback).

**Catatan risiko drag-and-drop:**
- Engine existing memakai reorder tombol naik/turun (setara fungsional).
- Drag native (seret lepas) butuh library baru (mis. dnd-kit) → risiko & waktu bertambah.

Deliverable:
- Dokumen desain/kontrak blok + daftar blok minimal + mapping halaman→blok.

#### Phase 8.1 — Backend: Model & API

Koleksi:
- `site_pages`: `{ page_key, blocks: [{id,type,hidden,device,props}], updated_at, created_at, versions? }`
- `site_footer`: `{ blocks/structure, updated_at }`
- Extend `settings`: `{ branding: { logo_url, heading_font, body_font } }`

Endpoint internal (ERP):
- `GET/PATCH /api/site-pages/{page_key}`
- `GET/PATCH /api/site-footer`
- `GET/PATCH /api/settings/branding`

Endpoint publik:
- `GET /api/public/site-pages/{page_key}`
- `GET /api/public/site-footer`
- `GET /api/public/branding`

Hardening:
- Fallback default blocks jika dokumen belum ada.
- Validasi schema per blok (deny unknown props, length limits, URL sanitization).

#### Phase 8.2 — Library Blok: Extend dari blok Landing

Blok **baru** (untuk menampung konten hardcode yang ditemukan):
- `home_hero` (judul/subjudul/gambar/chips/CTA)
- `value_props` (kartu icon+judul+deskripsi)
- `trust_signals`
- `faq_accordion`
- `stats_band`
- `cta_band`
- `standards_list` (standar kelaikan armada)
- `contact_channels` (telepon/WA/email/alamat)
- `about_values` (grid value cards ala About)

Blok **reuse** dari Landing (yang sudah ada):
- hero generik
- grid entity (armada/destinasi/testimoni)
- image+text / content blocks
- conversion/CTA blocks

Footer blocks:
- `footer_columns`
- `footer_social`
- `footer_bottom`

#### Phase 8.3 — Frontend: Editor Baru “Page Builder Situs”

Route & menu:
- Menu: **Konten Web → Page Builder Situs** (`/app/site-builder`)
- Role: `owner`, `marketing_admin` (opsional `ops_admin` sesuai kebijakan)

UX editor (reuse LandingBuilder):
- Panel kiri: daftar blok + tombol tambah + reorder
- Tengah: preview desktop/mobile (renderer sama dengan publik)
- Kanan: form edit blok terpilih + MediaLibrary

Sub-modul:
1. **Halaman inti**: Beranda/Tentang/Armada/Destinasi/Kontak
2. **Header & Footer**: edit footer global + opsi header logo/text
3. **Branding & Typography**: logo_url, heading_font, body_font + live preview

#### Phase 8.4 — Migrasi & Kompatibilitas (No visual regression)

Tujuan: saat fitur diaktifkan, tampilan publik **identik** dengan versi hardcode.

Steps:
- Seed `site_pages` dari konstanta hardcode saat ini:
  - `Home.jsx`: HERO, chips, VALUE_PROPS, TRUST, FAQS, CTA band
  - `About.jsx`: seluruh konten
  - `Fleet.jsx`: STANDARDS + FAQ
  - `Contact.jsx`: teks heading/CTA (kontak inti tetap dari `/public/company`)
- Seed `site_footer` dari footer yang sedang ada.
- Refactor halaman publik untuk merender via renderer blok (dan fallback ke hardcode bila fetch gagal selama masa transisi).

#### Phase 8.5 — Guardrails & Testing

Guardrails baru:
- Invariant: endpoint publik site-pages/footer/branding **tidak boleh** membuat halaman blank.
- Invariant: blok wajib tervalidasi schema; batasi panjang text/URL; cegah XSS di rich text.

Testing:
- E2E `testing_agent_v3`: semua halaman publik + footer + /lp/:slug
- ERP smoke: edit blok, reorder, hide, ubah logo/font, update footer → perubahan tampil di publik.
- Gate: tambah invariant ke `scripts/gate.sh` + selftest MERAH↔HIJAU.

Docs:
- Update `docs/03_DATA_MODEL.md`, `docs/04_API_CONTRACT.md`, `docs/05_NAVIGATION_MAP.md`.
- Update BUG_REGISTRY bila ada.

## 3) Next Actions (sisa backlog setelah Fase 0–7 selesai)

0. ✅ **SELESAI 2026-08-13 — Kebersihan data uji (BUG-0127) + verifikasi alur end-to-end.**
1. 🅿️ **Phase 8 — Site-wide Visual Page Builder** (plan dibuat; menunggu izin user untuk eksekusi).
2. **Uji beban konkuren tinggi (load test)** — belum pernah dijalankan (P1 lama).
3. **Kredensial nyata** WhatsApp Cloud / Meta Ads / Google Ads / GA4 → semua LIVE-READY tapi MOCK.
4. **Promo di halaman publik non-wizard** — `/promo` khusus + kartu promo di beranda belum ada.
5. **Notifikasi ops untuk hold hangus** — laporan ada; dorongan proaktif (WA/email) belum dibuat.

## 4) Success Criteria

### Sudah terpenuhi (Phase 0–7)

- Phase 0: marketing_admin melihat menu Media Library; driver tetap tidak.
- Phase 1 (POC): `python scripts/test_core_booking_v1.py` PASS 100% (termasuk concurrency).
- Phase 2: public booking 2 produk berjalan end-to-end; upload proof; ops verify → confirmed.
- Phase 3: `bash scripts/gate.sh` HIJAU 0 FAIL 0 SKIP + invariants terdaftar; E2E PASS.
- Phase 4: docs & handoff lengkap.

### Target Phase 8 (baru)

1. Owner/marketing_admin dapat mengedit **Beranda/Tentang/Armada/Destinasi/Kontak** dari ERP tanpa menyentuh kode.
2. Owner dapat mengedit **Footer, Logo, Typography** (heading/body font) dan perubahan langsung terlihat di publik.
3. Situs publik **tidak pernah blank**: ada fallback blocks jika data belum tersedia/korup.
4. Renderer editor == renderer publik (no surprise): preview identik dengan publik.
5. Guardrail + `gate.sh` tetap hijau setelah implementasi.

