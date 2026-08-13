import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calculator, Loader2, ArrowRight, Info, CalendarCheck, MessageCircle,
  ServerCog, CalendarClock, BadgePercent, ShieldCheck, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import PageHero from "@/components/public/PageHero";
import Reveal from "@/components/public/Reveal";
import SectionHeading from "@/components/public/SectionHeading";
import GlassCard from "@/components/public/GlassCard";
import VehicleTypeCompare from "@/components/public/VehicleTypeCompare";
import AirportRouteStrip from "@/components/public/AirportRouteStrip";
import PromoStrip from "@/components/public/PromoStrip";
import FaqBlock from "@/components/public/FaqBlock";
import CtaBand from "@/components/public/CtaBand";
import { formatCurrency } from "@/utils/formatters";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { getBookingConfig } from "@/services/bookingApi";
import useSEO from "@/hooks/useSEO";

const HERO = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2000&auto=format&fit=crop";

export default function TripCalculator() {
  const location = useLocation();
  const [form, setForm] = useState({
    vehicle_type: location.state?.vehicle_type || "hiace_premio",
    days: 2, origin: "", destination: location.state?.destination || "", pax: "",
  });
  // Pilihan tipe unit diambil dari DATA (unit yang benar-benar ada & tayang), bukan daftar
  // di dalam kode: dulu kalkulator menawarkan tipe yang tak punya tarif & tak punya unit,
  // sehingga estimasinya jatuh diam-diam ke tarif default.
  const [types, setTypes] = useState([]);
  const [config, setConfig] = useState(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgError, setCfgError] = useState("");
  useEffect(() => {
    getBookingConfig()
      .then((cfg) => {
        setConfig(cfg);
        const list = cfg?.vehicle_types || [];
        setTypes(list);
        if (list.length && !list.some((x) => x.value === form.vehicle_type)) {
          set("vehicle_type", list[0].value);
        }
      })
      .catch(() => { setTypes([]); setCfgError("gagal"); })
      .finally(() => setCfgLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dp = config?.dp_percent || 30;
  const hold = config?.hold_hours || 2;
  const maxDays = config?.max_days || 30;

  const calc = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiClient.post("/public/trip-estimate", {
        vehicle_type: form.vehicle_type, days: Number(form.days) || 1,
        origin: form.origin, destination: form.destination,
        pax: Number(form.pax) || 1,
      });
      setResult(data);
    } catch (err) {
      toast.error("Gagal menghitung estimasi. Coba lagi.");
    } finally { setLoading(false); }
  };

  const inputCls = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[14px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

  // Penjelasan mekanisme harga. Angkanya (DP, lama hold, batas hari) DIBACA dari server
  // supaya halaman ini tidak pernah menjanjikan kebijakan yang berbeda dari mesin harga.
  const HOW = [
    { icon: ServerCog, t: "Dihitung di server, bukan di browser", d: "Total selalu dihitung ulang oleh sistem memakai tarif unit yang berlaku. Angka yang Anda lihat = angka yang tersimpan pada pesanan." },
    { icon: CalendarClock, t: "Basis jumlah hari pemakaian", d: `Tidak ada komponen "perkiraan kilometer" yang harus Anda tebak. Durasi bisa 1 sampai ${maxDays} hari, dan hari akhir pekan/hari besar dihitung sesuai kebijakan tarif.` },
    { icon: BadgePercent, t: "Promo diverifikasi saat memesan", d: `Kode promo dinilai ulang oleh server terhadap syaratnya. Jika layak, potongan langsung masuk total sebelum Anda membayar DP ${dp}%.` },
  ];

  const FAQS = [
    { q: "Apa yang termasuk dalam estimasi ini?", a: "Estimasi mencakup unit armada beserta driver dan fee operasional dasar sesuai tarif tipe unit yang dipilih. Komponen di luar itu (tiket masuk objek wisata, penginapan driver untuk rute jauh, ferry) dihitung terpisah pada penawaran resmi." },
    { q: "Apakah BBM, tol, dan parkir sudah termasuk?", a: "Untuk perjalanan reguler, kebutuhan operasional dasar sudah diperhitungkan pada tarif harian. Untuk rute khusus/luar area layanan, komponen tersebut dirinci di penawaran agar tidak ada kejutan biaya." },
    { q: `Kenapa harus DP ${dp}%?`, a: `DP mengunci unit dan tanggal Anda supaya tidak diambil pemesan lain. Setelah pesanan dibuat, jadwal ditahan ${hold} jam untuk penyelesaian DP dan unggah bukti transfer; setelah diverifikasi tim ops, status berubah menjadi terkonfirmasi.` },
    { q: "Apakah estimasi ini harga final?", a: "Estimasi bersifat indikatif untuk perencanaan. Harga final muncul saat Anda memilih unit pada halaman Pesan Online (dengan ketersediaan nyata) atau pada penawaran resmi yang dikirim tim kami." },
    { q: "Bagaimana kalau saya butuh lebih dari satu unit?", a: "Silakan gunakan Minta Penawaran dan sebutkan jumlah rombongan. Kami akan menyusun kombinasi unit yang paling efisien beserta rinciannya." },
  ];

  useSEO({
    title: "Kalkulator Estimasi Biaya Trip",
    description: `Hitung perkiraan biaya sewa armada berdasarkan tipe unit dan lama pemakaian. Tarif sama dengan yang dipakai saat memesan, cukup DP ${dp}% untuk mengamankan jadwal.`,
    image: HERO,
    keywords: "kalkulator sewa hiace, estimasi biaya sewa bus, hitung biaya trip jawa bali",
  });

  return (
    <div>
      <PageHero eyebrow="Kalkulator" title="Estimasi biaya trip, transparan"
        subtitle="Hitung perkiraan biaya sewa berdasarkan unit dan lama pemakaian — tarif yang sama dengan yang dipakai saat memesan."
        image={HERO}
        breadcrumb={[{ label: "Beranda", to: "/" }, { label: "Kalkulator" }]} />

      {/* CARA KERJA — dulu halaman ini langsung menyodorkan form, sehingga separuh layar
          kosong sebelum ada hasil dan pengunjung tidak tahu apakah angkanya bisa dipercaya. */}
      <section className="relative overflow-hidden">
        <div className="glow-orb h-72 w-72 right-[-40px] top-8" style={{ background: "hsla(var(--ring) / 0.12)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading center eyebrow="Cara kerja" title="Kenapa estimasi ini bisa dipegang"
            subtitle="Tiga aturan yang berlaku sama di kalkulator maupun saat pesanan benar-benar dibuat." />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="calc-how-it-works">
            {HOW.map((h, i) => (
              <Reveal key={h.t} delay={i * 0.07}>
                <GlassCard variant="premium" className="h-full p-6">
                  <span className="icon-chip h-12 w-12"><h.icon size={20} strokeWidth={1.8} /></span>
                  <h3 className="mt-5 font-fraunces text-lg leading-snug text-foreground">{h.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{h.d}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <form onSubmit={calc} className="card-premium rounded-2xl p-6" data-testid="calculator-form">
            <h2 className="flex items-center gap-2 font-fraunces text-2xl text-foreground"><Calculator size={20} /> Hitung Estimasi</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-foreground">Tipe Unit</label>
                <Select value={form.vehicle_type} onValueChange={(v) => set("vehicle_type", v)}>
                  <SelectTrigger className="mt-1" data-testid="calc-vehicle-type"><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                  <SelectContent>
                    {(types.length ? types : [{ value: form.vehicle_type, label: "Memuat…" }])
                      .map((t) => <SelectItem key={t.value} value={t.value} data-testid={`calc-vehicle-type-opt-${t.value}`}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[13px] font-semibold text-foreground">Durasi (hari)</label><input type="number" min="1" max="60" value={form.days} onChange={(e) => set("days", e.target.value)} className={inputCls} data-testid="calc-days" /></div>
                <div><label className="text-[13px] font-semibold text-foreground">Jumlah penumpang</label><input type="number" min="1" max="60" value={form.pax} onChange={(e) => set("pax", e.target.value)} placeholder="10" className={inputCls} data-testid="calc-pax" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[13px] font-semibold text-foreground">Asal</label><input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Bandung" className={inputCls} data-testid="calc-origin" /></div>
                <div><label className="text-[13px] font-semibold text-foreground">Tujuan</label><input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Bromo" className={inputCls} data-testid="calc-destination" /></div>
              </div>
              <button type="submit" disabled={loading} className="cta-shine glow-focus flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 disabled:opacity-60" style={{ background: "var(--gradient-cta)" }} data-testid="calc-submit">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />} Hitung Estimasi
              </button>
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                <ShieldCheck size={13} className="mt-0.5 shrink-0" /> Tanpa perlu data pribadi. Nomor Anda baru diminta saat benar-benar memesan.
              </p>
            </div>
          </form>

          <div className="glass rounded-2xl p-6" data-testid="calculator-result">
            <h3 className="font-fraunces text-2xl text-foreground">Rincian Estimasi</h3>
            {!result ? (
              /* EMPTY STATE yang tetap berguna: bukan sekadar ikon abu-abu, tapi tarif nyata
                 per tipe + kebijakan DP supaya pengunjung dapat sesuatu sebelum menghitung. */
              <div data-testid="calc-empty">
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  Belum ada hasil — isi formulir lalu klik Hitung. Sementara itu, ini tarif awal yang berlaku hari ini:
                </p>
                {cfgLoading ? (
                  <div className="mt-4 space-y-2" data-testid="calc-empty-loading">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />)}
                  </div>
                ) : types.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center text-[13px] text-muted-foreground">
                    Belum ada tipe unit dengan tarif aktif. Silakan minta penawaran khusus.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-border" data-testid="calc-empty-rates">
                    {types.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set("vehicle_type", t.value)}
                        data-testid={`calc-rate-${t.value}`}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-80"
                      >
                        <span>
                          <span className="block text-[13.5px] font-semibold text-foreground">{t.label}</span>
                          <span className="block text-[11.5px] tabular-nums text-muted-foreground">sampai {t.max_capacity} penumpang · {t.units} unit</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-[14px] font-semibold tabular-nums text-foreground">{formatCurrency(t.from_price)}</span>
                          <span className="block text-[11px] text-muted-foreground">/hari</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-[12px] leading-relaxed text-secondary-foreground">
                  <Lightbulb size={13} className="mt-0.5 shrink-0" /> Tip: klik salah satu baris untuk memakai tipe itu di formulir.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="divide-y divide-border">
                  {result.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-3 text-[14px]"><span className="text-muted-foreground">{b.label}</span><span className="font-mono font-semibold tabular-nums text-foreground">{formatCurrency(b.amount)}</span></div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3.5 text-primary-foreground" style={{ background: "var(--gradient-cta)" }}><span className="text-[13.5px] font-medium opacity-90">Estimasi Total</span><span className="font-mono text-2xl font-semibold tabular-nums" data-testid="calc-total">{formatCurrency(result.total)}</span></div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3 text-[13px]">
                  <span className="font-medium text-secondary-foreground">Perkiraan DP {dp}%</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground" data-testid="calc-dp">{formatCurrency(Math.round((result.total * dp) / 100))}</span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"><Info size={14} className="mt-0.5 flex-shrink-0" /> {result.note}</p>
                <Link to={`/booking?type=${encodeURIComponent(form.vehicle_type)}&destination=${encodeURIComponent(form.destination || "")}`} className="cta-shine mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[14px] font-semibold text-primary-foreground transition hover:opacity-90" style={{ background: "var(--gradient-cta)" }} data-testid="calc-to-booking">Cek Ketersediaan &amp; Pesan <ArrowRight size={15} /></Link>
                <Link to="/quotation" state={{ destination: form.destination, message: `Estimasi total ${formatCurrency(result.total)} untuk ${result.days} hari` }} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-[13px] font-semibold text-foreground" data-testid="calc-to-quote">Minta Penawaran Khusus</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TARIF PER TIPE (data nyata) */}
      <VehicleTypeCompare
        types={types}
        loading={cfgLoading}
        error={cfgError}
        dpPercent={dp}
        eyebrow="Tarif berlaku"
        title="Tarif awal per tipe unit"
        subtitle="Angka inilah yang dipakai kalkulator dan mesin pemesanan — sama, tanpa versi berbeda untuk brosur."
      />

      {/* ANTAR-JEMPUT: tarif FLAT, bukan per hari — sering disalahpahami di kalkulator */}
      <AirportRouteStrip routes={config?.routes} loading={cfgLoading} error={cfgError} />

      {/* PROMO yang bisa dipakai */}
      <PromoStrip dpPercent={dp} eyebrow="Promo" title="Bisa menurunkan estimasi Anda" subtitle="Masukkan kodenya saat memesan online — sistem yang memverifikasi kelayakannya." />

      <FaqBlock items={FAQS} testId="calc-faq" eyebrow="FAQ Harga" title="Pertanyaan seputar biaya" />

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <CtaBand
          testId="calc-cta-band"
          eyebrow="Langkah berikutnya"
          title="Sudah cocok dengan estimasinya?"
          subtitle="Lanjut ke pemesanan online untuk melihat unit yang benar-benar tersedia pada tanggal Anda beserta harga finalnya."
          note={`DP ${dp}% · jadwal ditahan ${hold} jam`}
          primary={{ to: "/booking", label: "Cek Ketersediaan", icon: CalendarCheck, testId: "calc-cta-booking" }}
          secondary={{ to: "/quotation", label: "Minta Penawaran", icon: MessageCircle, testId: "calc-cta-quotation" }}
        />
      </section>
    </div>
  );
}
