import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, SearchX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PageHero from "@/components/public/PageHero";
import StepIndicator from "@/components/public/booking/StepIndicator";
import BookingSearchForm, { defaultSearchState } from "@/components/public/booking/BookingSearchForm";
import UnitOptionCard, { UnavailableUnitRow } from "@/components/public/booking/UnitOptionCard";
import QuoteBreakdown from "@/components/public/booking/QuoteBreakdown";
import BookerForm from "@/components/public/booking/BookerForm";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { getAttribution } from "@/utils/attribution";
import { trackBeginCheckout, trackLead } from "@/lib/tracking";
import {
  SERVICE_TRANSFER, getBookingConfig, getQuote, newIdempotencyKey, rememberBooking,
  searchUnits, submitBooking,
} from "@/services/bookingApi";

// BookingWizard — alur pemesanan online 3 langkah: Cari → Pilih Unit → Data & Konfirmasi.
//
// Kenapa wizard (bukan satu formulir panjang seperti sebelumnya): pengunjung baru boleh
// memasukkan data pribadi SETELAH melihat unit yang benar-benar tersedia beserta harga
// finalnya. Formulir lama meminta semua data lebih dulu untuk kemudian dijawab "maaf armada
// penuh" — itu membuang waktu pengunjung dan mematikan kepercayaan.
const STEPS = ["Cari", "Pilih Unit", "Data & Konfirmasi"];

export default function BookingWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState("");
  const [search, setSearch] = useState(null);
  const [step, setStep] = useState(0);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [picked, setPicked] = useState(null);
  const [quote, setQuote] = useState(null);
  const [promo, setPromo] = useState({ code: "", error: "" });
  const [applying, setApplying] = useState(false);
  const [booker, setBooker] = useState({ name: "", phone: "", email: "", pickup_address: "", message: "", hp: "" });
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey] = useState(newIdempotencyKey);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError("");
    try {
      const cfg = await getBookingConfig();
      setConfig(cfg);
      const base = defaultSearchState(cfg);
      const wanted = params.get("service");
      const type = params.get("type");
      // `route` dipakai kartu rute di halaman Armada/Kalkulator: tamu yang mengklik
      // "Bandung → CGK" harus mendarat di wizard dengan rute ITU sudah terpilih, bukan
      // rute pertama. Nilainya divalidasi terhadap daftar rute dari server.
      const routeId = params.get("route");
      const routeValid = (cfg.routes || []).some((r) => r.id === routeId);
      setSearch({
        ...base,
        service: (cfg.services || []).some((s) => s.value === wanted)
          ? wanted
          : (routeValid ? SERVICE_TRANSFER : base.service),
        vehicle_type: type || base.vehicle_type,
        route_id: routeValid ? routeId : base.route_id,
        destination: params.get("destination") || base.destination,
      });
    } catch (e) {
      setConfigError(e?.response?.data?.detail || "Gagal memuat pilihan layanan.");
    } finally { setLoadingConfig(false); }
  }, [params]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { trackBeginCheckout({ value: 0 }); }, []);

  const isTransfer = search?.service === SERVICE_TRANSFER;
  const activeRoute = useMemo(
    () => (config?.routes || []).find((r) => r.id === search?.route_id) || null,
    [config, search?.route_id]);

  const searchPayload = useCallback((extra = {}) => ({
    service: search.service,
    start_datetime: new Date(search.start).toISOString(),
    end_datetime: isTransfer ? "" : new Date(search.end).toISOString(),
    pax: Number(search.pax) || 1,
    vehicle_type: isTransfer ? "" : (search.vehicle_type || ""),
    route_id: isTransfer ? search.route_id : "",
    origin: search.origin || "",
    destination: search.destination || "",
    ...extra,
  }), [search, isTransfer]);

  const runSearch = async () => {
    if (!search?.start || (!isTransfer && !search?.end)) {
      toast.error("Lengkapi tanggal & jam perjalanan"); return;
    }
    if (isTransfer && !search.route_id) { toast.error("Pilih rute antar-jemput"); return; }
    setSearching(true);
    try {
      const data = await searchUnits(searchPayload({ promo_code: promo.code || "" }));
      setResult(data);
      setPicked(null);
      setQuote(null);
      setStep(1);
      if (data?.promo?.error) setPromo((p) => ({ ...p, error: data.promo.error }));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Pencarian gagal. Periksa tanggal Anda.");
    } finally { setSearching(false); }
  };

  const pickUnit = async (option, code = promo.code) => {
    setPicked(option);
    setQuote(option.quote);
    setStep(2);
    try {
      const data = await getQuote({
        service: search.service, vehicle_id: option.vehicle.id,
        start_datetime: new Date(search.start).toISOString(),
        end_datetime: isTransfer ? "" : new Date(search.end).toISOString(),
        route_id: isTransfer ? search.route_id : "",
        pax: Number(search.pax) || 1, promo_code: code || "",
      });
      setQuote(data.quote);
      setPromo((p) => ({ ...p, error: "" }));
    } catch (e) {
      // Promo bermasalah: harga tetap tampil tanpa potongan + alasan penolakan dijelaskan.
      if (code) {
        setPromo({ code: "", error: e?.response?.data?.detail || "Kode promo tidak bisa dipakai." });
        if (code !== "") pickUnit(option, "");
      } else {
        toast.error(e?.response?.data?.detail || "Gagal menghitung harga");
      }
    }
  };

  const applyPromo = async (code) => {
    if (!picked) return;
    setApplying(true);
    setPromo({ code, error: "" });
    await pickUnit(picked, code);
    setApplying(false);
  };

  const clearPromo = async () => {
    setPromo({ code: "", error: "" });
    if (picked) await pickUnit(picked, "");
  };

  const submit = async () => {
    if (!picked) { toast.error("Pilih unit dulu"); return; }
    if (!booker.name.trim() || !booker.phone.trim()) {
      toast.error("Nama & nomor WhatsApp wajib diisi"); return;
    }
    setSubmitting(true);
    try {
      const res = await submitBooking({
        service: search.service, vehicle_id: picked.vehicle.id,
        route_id: isTransfer ? search.route_id : "",
        start_datetime: new Date(search.start).toISOString(),
        end_datetime: isTransfer ? "" : new Date(search.end).toISOString(),
        pax: Number(search.pax) || 1,
        name: booker.name.trim(), phone: booker.phone.trim(), email: booker.email,
        origin: search.origin, destination: search.destination,
        pickup_address: booker.pickup_address, message: booker.message,
        promo_code: promo.code || "", marketing_consent: consent,
        attribution: getAttribution(), idempotency_key: idemKey, hp: booker.hp,
      });
      if (!res?.code) { toast.error("Pesanan tidak tersimpan. Coba lagi."); return; }
      rememberBooking({ code: res.code, token: res.token });
      trackLead({ eventKey: `booking_${res.code}`, source: "booking_online" });
      toast.success(res.message || "Pesanan dibuat");
      navigate(`/booking/status?code=${encodeURIComponent(res.code)}&token=${encodeURIComponent(res.token)}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal membuat pesanan");
    } finally { setSubmitting(false); }
  };

  const options = result?.options || [];
  const unavailable = result?.unavailable || [];
  // Baris "Perjalanan" hanya dirender bila ADA isinya. Asal/tujuan adalah kolom OPSIONAL pada
  // sewa harian, dan versi sebelumnya selalu merender `${origin} → ${destination}` sehingga
  // ringkasan memajang "- → -" — terlihat seperti data gagal dimuat, padahal tamu memang
  // belum mengisinya.
  // CATATAN PENTING: `search` bernilai null sampai /booking/config selesai dimuat, jadi akses
  // field WAJIB memakai optional chaining. Versi pertama perbaikan ini memakai `search.origin`
  // dan membuat SELURUH halaman /booking gagal render ("Cannot read properties of null").
  const tripLabel = isTransfer
    ? (activeRoute?.name || "")
    : (search?.origin && search?.destination
      ? `${search.origin} → ${search.destination}`
      : search?.origin ? `Dari ${search.origin}`
        : search?.destination ? `Menuju ${search.destination}` : "");
  const dpNote = quote?.dp_amount
    ? (config?.mode === "hold_dp"
      ? `Unit ditahan untuk Anda setelah pesanan dibuat. Bayar DP ${formatCurrency(quote.dp_amount)} dalam ${config?.hold_hours || 2} jam, lalu unggah bukti transfer.`
      : `Tim kami memeriksa ketersediaan lebih dulu (maks ${config?.approval_sla_hours || 6} jam kerja). Setelah disetujui, Anda diminta membayar DP ${formatCurrency(quote.dp_amount)}.`)
    : "";

  return (
    <div>
      <PageHero eyebrow="Pesan Online" title="Pesan armada, langsung dapat kode booking"
        subtitle="Cek ketersediaan nyata, lihat harga final, dan amankan unit Anda — tanpa menunggu balasan chat."
        image="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2000&auto=format&fit=crop"
        breadcrumb={[{ label: "Beranda", to: "/" }, { label: "Pesan Online" }]} />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <StepIndicator steps={STEPS} current={step} onJump={setStep} />

        {loadingConfig ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-20 text-muted-foreground"
            data-testid="booking-config-loading">
            <Loader2 size={18} className="animate-spin" /> Menyiapkan pilihan layanan…
          </div>
        ) : configError ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center" data-testid="booking-config-error">
            <p className="text-[14px] text-foreground">{configError}</p>
            <button onClick={loadConfig} className="mt-3 rounded-lg border border-border px-4 py-2 text-[13px] font-semibold"
              data-testid="booking-config-retry">Coba lagi</button>
          </div>
        ) : (
          <div className="mt-6">
            {step === 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_.8fr]">
                <BookingSearchForm config={config} value={search} onChange={setSearch}
                  onSubmit={runSearch} loading={searching} />
                <aside className="glass rounded-2xl p-6" data-testid="booking-why">
                  <h3 className="flex items-center gap-2 font-fraunces text-xl text-foreground">
                    <Sparkles size={17} className="text-primary" /> Kenapa pesan di sini
                  </h3>
                  <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed tabular-nums text-muted-foreground">
                    <li><b className="text-foreground">Ketersediaan nyata.</b> Yang tampil hanya unit yang benar-benar bebas pada tanggal Anda.</li>
                    <li><b className="text-foreground">Harga final &amp; terbuka.</b> Sudah termasuk driver, tol &amp; parkir — rinciannya dapat Anda lihat sebelum bayar.</li>
                    <li><b className="text-foreground">DP {config?.dp_percent || 30}% saja.</b> Sisanya dilunasi mendekati keberangkatan.</li>
                    <li><b className="text-foreground">Tanpa buat akun.</b> Cek pesanan pakai kode booking + nomor WhatsApp.</li>
                  </ul>
                  {config?.terms ? (
                    <p className="mt-4 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
                      {config.terms}
                    </p>
                  ) : null}
                </aside>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Pencarian Anda</p>
                    <p className="text-[14px] font-semibold text-foreground">
                      {isTransfer ? (activeRoute?.name || "Antar-jemput bandara") : "Sewa harian + driver"}
                      {" · "}{formatDateTime(search.start)}
                      {!isTransfer ? ` → ${formatDateTime(search.end)}` : ""}
                      {` · ${search.pax} orang`}
                    </p>
                  </div>
                  <button onClick={() => setStep(0)} data-testid="booking-change-search"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-foreground transition hover:-translate-y-0.5">
                    <ArrowLeft size={14} /> Ubah pencarian
                  </button>
                </div>

                {searching ? (
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="booking-results-loading">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-secondary" />
                    ))}
                  </div>
                ) : options.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-16 text-center" data-testid="booking-results-empty">
                    <SearchX size={30} className="mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-fraunces text-2xl text-foreground">Tidak ada unit bebas di tanggal itu</h3>
                    <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted-foreground">
                      Semua unit yang cocok sudah dipesan atau sedang perawatan. Coba geser tanggal,
                      kurangi jumlah penumpang, atau minta penawaran khusus — kami bisa mencarikan unit mitra.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button onClick={() => setStep(0)} className="rounded-lg border border-border px-4 py-2.5 text-[13px] font-semibold text-foreground"
                        data-testid="booking-empty-back">Ubah tanggal</button>
                      <a href="/quotation" className="cta-shine rounded-lg px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
                        style={{ background: "var(--gradient-cta)" }} data-testid="booking-empty-quote">Minta penawaran khusus</a>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-6 text-[13px] text-muted-foreground" data-testid="booking-results-count">
                      <b className="text-foreground">{options.length} unit</b> tersedia · harga sudah final untuk tanggal ini
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="booking-results">
                      {options.map((o) => (
                        <UnitOptionCard key={o.vehicle.id} option={o} onPick={pickUnit}
                          picked={picked?.vehicle?.id === o.vehicle.id} />
                      ))}
                    </div>
                  </>
                )}

                {unavailable.length ? (
                  <div className="mt-8">
                    <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Tidak tersedia di tanggal ini
                    </p>
                    <div className="mt-2 space-y-2">
                      {unavailable.map((u) => <UnavailableUnitRow item={u} key={u.id} />)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 && picked ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_.85fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-5" data-testid="booking-summary">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Unit dipilih</p>
                        <h3 className="font-fraunces text-xl text-foreground">{picked.vehicle.name}</h3>
                        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                          {picked.vehicle.type_label} · {picked.vehicle.capacity} kursi
                        </p>
                      </div>
                      <button onClick={() => setStep(1)} data-testid="booking-change-unit"
                        className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-foreground">
                        Ganti unit
                      </button>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                      {tripLabel ? (
                        <div><dt className="text-muted-foreground">{isTransfer ? "Rute" : "Perjalanan"}</dt>
                          <dd className="font-medium text-foreground" data-testid="booking-summary-trip">
                            {tripLabel}
                          </dd></div>
                      ) : null}
                      <div><dt className="text-muted-foreground">Penumpang</dt>
                        <dd className="font-medium text-foreground">{search.pax} orang</dd></div>
                      <div><dt className="text-muted-foreground">{isTransfer ? "Penjemputan" : "Mulai"}</dt>
                        <dd className="font-medium text-foreground">{formatDateTime(search.start)}</dd></div>
                      {!isTransfer ? (
                        <div><dt className="text-muted-foreground">Selesai</dt>
                          <dd className="font-medium text-foreground">{formatDateTime(search.end)}</dd></div>
                      ) : null}
                    </dl>
                  </div>
                  <BookerForm value={booker} onChange={setBooker} onSubmit={submit} submitting={submitting}
                    consent={consent} onConsent={setConsent} showPickup
                    ctaLabel={config?.mode === "hold_dp" ? "Amankan unit & lanjut bayar DP" : "Kirim pesanan untuk dikonfirmasi"}
                    note="Dengan menekan tombol ini Anda menyetujui ketentuan layanan & kebijakan pembatalan." />
                </div>
                <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                  <QuoteBreakdown quote={quote} promo={promo} onApplyPromo={applyPromo}
                    onClearPromo={clearPromo} applying={applying}
                    promoContext={picked ? {
                      service: search.service, vehicle_id: picked.vehicle.id,
                      start_datetime: new Date(search.start).toISOString(),
                      end_datetime: isTransfer ? "" : new Date(search.end).toISOString(),
                      route_id: isTransfer ? search.route_id : "",
                      pax: Number(search.pax) || 1,
                    } : null}
                    policy={config?.cancellation_policy} dpNote={dpNote} />
                </div>
              </div>
            ) : null}

            {step === 2 && !picked ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center" data-testid="booking-no-pick">
                <p className="text-[14px] text-muted-foreground">Belum ada unit dipilih.</p>
                <button onClick={() => setStep(0)} className="mt-3 rounded-lg border border-border px-4 py-2 text-[13px] font-semibold"
                  data-testid="booking-no-pick-back">Mulai pencarian</button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
