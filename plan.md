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

## 1) Objectives

- Tambahkan **alur pemesanan publik ala Traveloka rentcar/airport transfer**: cari → pilih unit → review → booking dibuat (hold/pending sesuai mode) → instruksi DP + unggah bukti → ops verifikasi → otomatis confirmed.
- Pastikan **harga dihitung ulang di server** (uang = integer rupiah), **tanpa komponen jarak/BBM** (keputusan K1/K4), dan harga tampil = harga tersimpan.
- Perbaiki sumber data & relasi agar tidak salah collection/kosong: fleet/availability/pricing/promo/airport routes.
- Perkuat guardrail & gate untuk mencegah regresi (pricing + booking-public invariants).
- Fix temuan LOW: **menu “Media Library” tampil untuk marketing_admin**.

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
  - **Hapus komponen jarak/BBM** dari compute (fuel_per_km dll tidak dipakai)
  - Surcharge weekend/holiday tetap ada (settings.operational.holidays)
  - Promo tervalidasi server (schema baru promos; minimal: active, valid_until/from, discount_type, value, min_days, vehicle_types, max_uses)
  - Output: breakdown + total + dp_amount (single DP source)
- Endpoint POC (minimal):
  - `POST /api/public/booking/search` → unit list + quoted pricing
  - `POST /api/public/booking/create` → membuat booking pending/hold sesuai mode
  - `POST /api/public/booking/upload-proof` → upload media + attach ke booking
  - `POST /api/bookings/{id}/approve` (ops_approval) → pending→hold + hold_expires_at
  - `POST /api/bookings/{id}/verify-proof` (ops) → create payment record (routers/payments) → auto promote
  - `POST /api/public/booking/status` (code+phone) + share-link token
- Implement **POC script** untuk memverifikasi 10 poin Fase 1 (sesuai brief) + adversarial no-5xx.
- Wajib: POC PASS sebelum lanjut UI.

Web research (best practice):
- Ringkas praktik “rentcar checkout flow”: hold inventory + deposit, no-trust client totals, idempotency keys, and concurrency locks.

---

### Phase 2 — V1 App Development (Backend + Frontend) — ✅ SELESAI (publik + ops diverifikasi di browser)

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
4. Sebagai owner, saya mengatur `booking_flow` (mode, jam hold/approval, instruksi DP, rekening/QRIS).
5. Sebagai owner, saya mengatur tarif per unit (`day_rate`) dan toggle `web_published`.

Backend work:
- Finalisasi endpoint publik booking v1 (search, create, status, upload-proof).
- Tambah koleksi `airport_routes` (origin/destination labels + price per vehicle_type/day_rate override) + CRUD di ERP.
- Migrasi & seed:
  - set `vehicles.web_published` default false kecuali unit owned+available;
  - set `vehicles.day_rate` null (fallback ke day_rates) atau isi untuk contoh;
  - promos schema upgrade + seed contoh promo yang enforceable.
- Samakan DP: hapus DP source ganda → satu sumber dari settings.booking_flow atau pricing_rules (pilih satu, lalu adapt semua pemakai).

Frontend work:
- Public wizard 4 langkah (data-testid): layanan → detail perjalanan → pilih unit/rute → review → sukses.
- Halaman `/booking/:code` atau `/booking-status` untuk cek status + upload bukti + countdown.
- Update TripCalculator: hilangkan slider jarak, hanya days + vehicle_type + trip_date; CTA ke booking.
- ERP screens minimal:
  - Booking detail: panel bukti bayar (thumbnail media) + tombol “Verifikasi DP”.
  - Settings: tab “Alur Booking”.
  - VehicleForm: field day_rate + toggle web_published.
  - Airport routes CRUD.

Phase-end testing:
- Panggil `testing_agent_v3` untuk 1 putaran E2E: public booking (2 produk) + ops flow + driver RBAC + regressi halaman publik/LP.

---

### Phase 3 — Guardrails + Regression + Gate — ✅ SELESAI (INV-PRICE-01 · INV-BOOK-02 · INV-STR-01 + self-test mutasi; gate HIJAU 38/38)

User stories:
1. Sebagai maintainer, tidak ada lagi harga hardcode di luar pricing engine.
2. Sebagai maintainer, harga tidak pernah memakai komponen jarak.
3. Sebagai ops, booking publik selalu melewati availability check + mutex.
4. Sebagai QA, tamper total dari klien tidak berpengaruh.
5. Sebagai tim, gate selalu hijau sebelum merge.

Steps:
- Tambah guardrail:
  - **INV-PRICE-01**: single DP source + no distance component + display==stored
  - **INV-BOOK-02**: public booking must recompute + availability + mutex; forbid client totals
- Tambah self-test mutasi untuk keduanya; wire ke `scripts/gate.sh` + `memory/INVARIANTS.md`.
- Jalankan `bash scripts/gate.sh` sampai HIJAU 0 FAIL 0 SKIP.
- Testing agent E2E lintas peran + anti-regresi Media Library + landing `/lp/:slug`.

---

### Phase 4 — Docs + Handoff — ✅ SELESAI (docs 03/04/05 + BUG_REGISTRY + DELIVERY_MANIFEST + test_credentials + HANDOFF)

User stories:
1. Sebagai dev baru, saya tahu koleksi/relasi untuk booking/pricing/airport routes.
2. Sebagai QA, saya punya contract API dan test credentials terbaru.
3. Sebagai ops, SOP verifikasi DP jelas.
4. Sebagai owner, setting booking_flow terdokumentasi.
5. Sebagai maintainer, changelog & manifest rapi.

Steps:
- Update `docs/03_DATA_MODEL.md`, `docs/04_API_CONTRACT.md`, `docs/05_NAVIGATION_MAP.md`.
- Update `memory/SESSION_LOG.md`, `memory/SESSION_HANDOFF.md`, `memory/DELIVERY_MANIFEST.md`, `memory/BUG_REGISTRY.md`, `memory/test_credentials.md`.
- Update `plan.md` (phase status).

## 3) Next Actions (sisa backlog setelah Fase 0–6 selesai)

0. ✅ **SELESAI 2026-08-13 — Kebersihan data uji (BUG-0127) + verifikasi alur end-to-end.**
   User stories yang dipenuhi:
   1. Sebagai pemilik, saya membuka Customer 360 dan hanya melihat **pelanggan sungguhan/demo** —
      tidak ada nama "aaaaaaaa…" 60.000 karakter yang merusak tabel. ✅
   2. Sebagai admin ops, Inbox saya bersih dari percakapan uji ("Penjaga INV-*", "Smoke Customer",
      "Guard Lead") dan lonceng notifikasi tidak berisi pengingat pesanan hantu. ✅
   3. Sebagai pemilik, Jejak Audit bisa dibaca — tidak ada baris sepanjang 60.016 karakter. ✅
   4. Sebagai admin marketing, angka konversi dasbor tidak membengkak oleh trafik uji
      (`conversion_events` kini ikut di-reset seed + dibersihkan purge). ✅
   5. Sebagai pemilik, **data demo tetap ada** sesudah pembersihan (4 customer, BK-0001..BK-0010,
      4 armada, 2 sopir, konten web) — purge mengecualikan dokumen bersumber `seed`. ✅
   6. Sebagai maintainer, saya punya jaring pengaman otomatis: gate MERAH bila ada skrip uji yang
      bocor lagi (**INV-CLEAN-01**, dijalankan paling akhir) + alat perbaikan sekali jalan
      (`python scripts/purge_test_pollution.py`). ✅
   7. Sebagai pemilik, alur **awal→akhir** terbukti aman: situs publik → pesan online → hold →
      unggah bukti DP → ops verifikasi → confirmed → dispatch/assign → keberangkatan → enroute →
      arrived → driver check-in/out (odometer, 260 km) → completed → keuangan & laporan. ✅
      (testing agent `iteration_90` + `iteration_91`, keduanya 100%.)

1. **Uji beban konkuren tinggi (load test)** — belum pernah dijalankan (P1 lama).
2. **Kredensial nyata** WhatsApp Cloud / Meta Ads / Google Ads / GA4 → semua LIVE-READY tapi MOCK.
3. **Promo di halaman publik non-wizard** — daftar promo aktif sudah bisa diklik DI DALAM wizard
   `/booking` (Fase 6); halaman `/promo` khusus + kartu promo di beranda belum ada.
4. **Rute antar-jemput nyata** — katalog tambah-cepat + arah balik sudah siap (Fase 6);
   pemilik tetap harus mengisi TARIF per tipe unit (sistem sengaja tidak menebak harga).
5. **Notifikasi ops untuk hold hangus** — laporan sudah ada (Fase 6); dorongan proaktif
   (WA/email harian ke ops saat ada hold hangus dengan bukti terunggah) belum dibuat.

---

### Phase 5 — Rapikan Navbar Publik + Onboarding Pemesanan (permintaan user) — ✅ SELESAI

User stories:
1. Sebagai tamu di layar 1920px, saya melihat menu utama **satu baris** yang bisa dibaca sekali
   pandang (5 item), bukan 14 target klik yang pecah dua baris.
2. Sebagai tamu yang ingin memesan, saya melihat **satu** tombol aksi utama "Pesan Online"
   (bukan dua label bersaing "Pesan Online" + "Pesan Sekarang").
3. Sebagai tamu yang BARU transfer DP, saya tetap menemukan **Cek Pesanan** dengan cepat
   (bar pengumuman) dan melihat chip **"Lanjutkan pesanan BK-00xx"** tanpa mengingat kode.
4. Sebagai tamu di ponsel, drawer memberi grup kedua **"Layanan & Bantuan"** (Cek Pesanan,
   Penawaran, Tentang, Kontak, Masuk ERP) — footer terlalu jauh di ponsel.
5. Sebagai tamu baru di beranda, saya paham **alur DP** sebelum masuk wizard
   (section "Pesan online dalam 3 langkah", angka DP & lama hold dari server).
6. Sebagai pengiklan, halaman `/lp/:slug` TETAP tanpa menu & tanpa utilitas (INV-LP).
7. Sebagai QA, `data-testid` lama tetap ada (dipindah, tidak dihapus).

Bukti: header 90,75 px (1 baris) · `iteration_83.json` · docs/05_NAVIGATION_MAP §1a (SSOT baru).

---

### Phase 6 — 3 Fitur Backlog (pilihan user) — ✅ SELESAI

User stories:
1. Sebagai tamu, saya **melihat daftar promo aktif** di rincian harga dan cukup **klik "Pakai"**
   (tidak perlu hafal kode); promo yang belum memenuhi syarat tampil **beserta alasannya**.
2. Sebagai maintainer, kelayakan & besar potongan promo **dihitung server** memakai aturan yang
   sama dengan checkout — klien tidak bisa mengirim `subtotal` palsu (dikawal INV-BOOK-02).
3. Sebagai ops/owner, saya punya **laporan "Hold Hangus"** di Laporan: jumlah, potensi hilang,
   **berapa yang hangus padahal bukti transfer sudah diunggah**, tingkat hangus, unit yang paling
   sering terkunci sia-sia, + CSV dan tombol **Hubungi** (wa.me) untuk menawarkan ulang.
4. Sebagai owner, saya bisa menambah **rute antar-jemput** dengan cepat dari katalog bandara
   (nama/label/IATA/durasi terisi otomatis) lalu mengisi **tarif per tipe unit**; tombol
   **Arah balik** menyalin tarif agar dua arah tidak beda harga karena salah ketik.
5. Sebagai owner, rute yang baru dibuat **langsung bisa dijual** di wizard publik dengan tarif
   FLAT per tipe unit (bukan tarif harian).

Bukti: `iteration_84.json` (backend 14/14, frontend 100 %, 0 bug) · endpoint terdokumentasi di
`docs/04_API_CONTRACT.md` · BUG-0120 ditutup · gate HIJAU penuh.

---

### Phase 7 — Readability & Kedalaman Halaman Publik + Rename Brand (permintaan user 2026-08-12) — ✅ SELESAI

Permintaan user (7 poin, dari 4 screenshot): (1) UI kurang readable — "kalau font putih maka
elemen visual background-nya harus disesuaikan"; (2) halaman **Armada** terlalu sepi; (3) halaman
**Destinasi** juga (usul user: FAQ, fun fact wisata, narasi + CTA di akhir); (4) halaman
**Kalkulator** juga; (5) CTA di `/blog/:slug` **rusak**; (6) **posisi chat** terlalu di atas;
(7) ganti brand menjadi **RahazaTrans** di semua tempat.

User stories:
1. Sebagai tamu di **mode gelap**, dialog & daftar pilihan (Select) tetap terbaca — latar ikut
   gelap, teks terang. Tidak ada lagi putih-di-atas-putih.
2. Sebagai tamu di **mode terang** yang melihat kartu estimasi di atas foto hero, semua label &
   placeholder terbaca (tidak tersapu efek kaca).
3. Sebagai tamu di halaman **Armada**, walau unit hanya 3 saya tetap mendapat informasi berguna:
   jumlah unit tayang & tipe bertarif aktif, filter tipe, **perbandingan tipe + tarif nyata**,
   standar kelaikan unit, kalkulator cepat, **rute antar-jemput bertarif flat**, promo aktif,
   FAQ penyewaan, dan satu ajakan memesan yang jelas.
4. Sebagai tamu di halaman **Destinasi**, saya mendapat **fun fact yang diturunkan dari data
   panduan** (highlight + waktu terbaik + jumlah tahap perjalanan), **paket wisata** dengan harga
   mulai nyata, narasi alasan memilih jalan darat, **FAQ yang dirangkum dari FAQ tiap destinasi**,
   lalu CTA penutup.
5. Sebagai tamu di halaman **Kalkulator**, sebelum menghitung saya sudah paham cara harga dibentuk
   dan melihat **tarif nyata per tipe** (bisa diklik untuk mengisi formulir); setelah menghitung
   saya melihat **perkiraan DP** dan bisa langsung cek ketersediaan.
6. Sebagai pembaca **blog**, panel ajakan di akhir artikel tampil utuh (judul, penjelasan, dua
   tombol) di light maupun dark.
7. Sebagai tamu, **panel chat tidak menutupi navbar** dan di ponsel tidak menutupi tombol
   "Pesan Online"/"WhatsApp".
8. Sebagai pemilik, seluruh permukaan menyebut **RahazaTrans** — navbar, footer, preloader, judul
   halaman, JSON-LD, teks WhatsApp, email, pemegang rekening bank, dan sidebar ERP.
9. Sebagai maintainer, kelas bug "terlihat rusak tapi tidak ada error" ini **dijaga otomatis**
   supaya tidak kembali di sesi berikutnya.

Yang dikerjakan:
- **Kontrak keterbacaan di `index.css`**: `.glass-modal` tidak lagi memaku putih; `.glass-3d`
  refraksi diturunkan (opacity .22 + `soft-light`/`normal` + `mask` ke tepi atas); kelas baru
  `.glass-on-hero` & `.hero-scrim`; token `--glass-edge*` diturunkan di `.dark`; SSOT offset
  elemen mengapung (`--header-h`, `--sticky-cta-h`, `--fab-bottom`, `--panel-bottom`, z-index).
- **`ThemeContext`** memasang `data-surface`/`data-theme` di `<html>` (agar konten Radix yang
  di-portal ikut bertema) + membersihkannya saat unmount; `public-themes.css` diberi selector
  kembar `[…].dark` untuk 4 preset.
- **Komponen baru**: `CtaBand`, `VehicleTypeCompare`, `AirportRouteStrip`, `PromoStrip`,
  `PackageStrip`, `DestinationFacts`, `FaqBlock` — semuanya berbasis endpoint publik NYATA
  (`/public/booking/config`, `/public/promos`, `/public/packages`, `/public/destinations`)
  dengan loading + empty state.
- **BookingWizard** menerima query `route` → kartu rute bandara bisa deep-link ke rute yang tepat.
- **Rename brand** di 30 berkas FE/BE + `scripts/seed_data.py` + dokumen DB (settings
  `company_info`, `booking_flow.payment.bank_accounts[].holder`, articles, landing_pages).
- **Guardrail baru `INV-THEME-01`** (`verify_theme_contrast.py` + `selftest_theme_contrast.py`,
  7 mutasi MERAH↔HIJAU) — mencegah gradient token triplet, kaca dipaku putih, refraksi menyapu
  teks, jebakan custom property, offset mengapung hardcode, dan tema portal yang tidak diwarisi.

Bukti: `bash scripts/gate.sh` **HIJAU 40/40 (0 FAIL, 0 SKIP)** · `ux_audit --strict` **0 ERROR
0 WARN** · testing agent `iteration_86.json` (7/8 item lolos, 1 bug CRITICAL ditemukan),
`iteration_87.json` (**100 %**, bug itu terverifikasi tertutup, isolasi ERP aman),
`iteration_88.json` (anti-regresi inti: `/booking` end-to-end → BK-0068 + promo GATHERING500
menurunkan total, STORY H dua arah, panel Hold Hangus cocok dengan API — **0 bug**).
Bug ditutup: **BUG-0121 … BUG-0126**.

## 4) Success Criteria

- Phase 0: marketing_admin melihat menu Media Library; driver tetap tidak.
- Phase 1 (POC): `python scripts/test_core_booking_v1.py` **PASS 100%** (10 checks), termasuk concurrency (1/16 sukses).
- Phase 2: public booking 2 produk berjalan end-to-end; bukti bayar tersimpan (media_assets) dan verifikasi ops memicu hold→confirmed.
- Phase 3: `bash scripts/gate.sh` **HIJAU 0 FAIL 0 SKIP** + invariants terdaftar; E2E testing_agent_v3 PASS.
- Phase 4: docs & memory/handoff lengkap; tidak ada koleksi salah/kosong yang dipakai pada flow booking/pricing.