import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck, ArrowRight, ShieldCheck, Wrench, BadgeCheck, Navigation,
  Calculator, MessageCircle, Bus,
} from "lucide-react";
import { useResource } from "@/hooks/useResource";
import PageHero from "@/components/public/PageHero";
import Reveal from "@/components/public/Reveal";
import SectionHeading from "@/components/public/SectionHeading";
import FleetCard from "@/components/public/FleetCard";
import GlassCard from "@/components/public/GlassCard";
import TripEstimatorInline from "@/components/public/TripEstimatorInline";
import VehicleTypeCompare from "@/components/public/VehicleTypeCompare";
import AirportRouteStrip from "@/components/public/AirportRouteStrip";
import PromoStrip from "@/components/public/PromoStrip";
import FaqBlock from "@/components/public/FaqBlock";
import CtaBand from "@/components/public/CtaBand";
import { getBookingConfig } from "@/services/bookingApi";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import useSEO from "@/hooks/useSEO";

const HERO = "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?q=80&w=2000&auto=format&fit=crop";

const STANDARDS = [
  { icon: BadgeCheck, t: "Dokumen aktif", d: "KIR & pajak diperbarui, dicek sebelum unit keluar garasi." },
  { icon: Wrench, t: "Servis terjadwal", d: "Perawatan berkala tercatat per unit di sistem kami." },
  { icon: ShieldCheck, t: "Driver terverifikasi", d: "SIM berlaku, terbiasa rute panjang Jawa–Bali." },
  { icon: Navigation, t: "Pelacakan perjalanan", d: "Posisi & estimasi tiba bisa dipantau saat trip berjalan." },
];

export default function Fleet() {
  const { data, loading, error, reload } = useResource("/public/fleet");
  const [config, setConfig] = useState(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgError, setCfgError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Konfigurasi pemesanan = SUMBER tarif & kebijakan yang NYATA dipakai mesin harga.
  // Halaman ini tidak boleh menulis angka DP/tarif sendiri (nanti beda dengan tagihan).
  useEffect(() => {
    let alive = true;
    getBookingConfig()
      .then((cfg) => { if (alive) setConfig(cfg); })
      .catch(() => { if (alive) setCfgError("gagal"); })
      .finally(() => { if (alive) setCfgLoading(false); });
    return () => { alive = false; };
  }, []);

  const all = Array.isArray(data) ? data : [];
  const rows = typeFilter === "all" ? all : all.filter((v) => v.type === typeFilter);
  const types = config?.vehicle_types || [];
  const dp = config?.dp_percent || 30;
  const hold = config?.hold_hours || 2;

  const FAQS = [
    { q: "Apakah harga sewa sudah termasuk driver?", a: "Sudah. Setiap unit disewakan bersama driver profesional. Tarif dihitung per hari pemakaian, bukan per kilometer." },
    { q: `Berapa DP untuk mengamankan jadwal?`, a: `Pemesanan online cukup DP ${dp}% dari total. Setelah pesanan dibuat, jadwal ditahan ${hold} jam untuk Anda menyelesaikan pembayaran DP dan mengunggah buktinya.` },
    { q: "Bagaimana kalau unit yang saya mau sedang terpakai?", a: "Pencarian di halaman Pesan Online hanya menampilkan unit yang benar-benar bebas pada tanggal Anda — termasuk mengecualikan unit yang sedang dalam perawatan. Jika kosong, tim kami bisa menawarkan tipe setara." },
    { q: "Apakah bisa lihat kondisi kabin sebelum memesan?", a: "Bisa. Unit yang punya tur kabin 360° ditandai pada kartunya — buka detail unit lalu putar tur kabinnya." },
    { q: "Apakah menerima sewa untuk luar Jawa–Bali?", a: "Silakan ajukan lewat Minta Penawaran. Rute khusus kami hitung terpisah bersama kebutuhan menginap driver." },
  ];

  useSEO({
    title: "Armada — Toyota Hiace Premio & Lainnya",
    description: "Unit terawat dengan dokumen lengkap, fitur premium, dan driver profesional — lengkap dengan tur kabin 360°. Sewa armada premium RahazaTrans.",
    image: HERO,
    keywords: "sewa hiace premio, rental armada premium, sewa bus pariwisata, armada travel bandung",
  });

  return (
    <div>
      <PageHero eyebrow="Armada" title="Toyota Hiace Premio & lainnya"
        subtitle="Unit terawat dengan dokumen lengkap, fitur premium, dan driver profesional — lengkap dengan tur kabin 360°."
        image={HERO}
        breadcrumb={[{ label: "Beranda", to: "/" }, { label: "Armada" }]} />

      {/* AKSI CEPAT — hero halaman dalam tidak punya CTA sendiri, padahal inilah halaman
          tempat pengunjung memutuskan. Bar ini juga memajang angka NYATA (unit tayang, tipe
          tersedia, DP) supaya halaman langsung terasa berisi walau unitnya sedikit. */}
      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <GlassCard variant="premium" className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between" data-testid="fleet-quick-actions">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="font-mono text-2xl font-semibold tabular-nums text-foreground" data-testid="fleet-count">{loading ? "–" : all.length}</p>
              <p className="text-[12px] text-muted-foreground">unit tayang</p>
            </div>
            <div className="h-10 w-px bg-border" aria-hidden="true" />
            <div>
              <p className="font-mono text-2xl font-semibold tabular-nums text-foreground" data-testid="fleet-type-count">{cfgLoading ? "–" : types.length}</p>
              <p className="text-[12px] text-muted-foreground">tipe dengan tarif aktif</p>
            </div>
            <div className="h-10 w-px bg-border" aria-hidden="true" />
            <div>
              <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{dp}%</p>
              <p className="text-[12px] text-muted-foreground">DP untuk menahan jadwal</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/booking" data-testid="fleet-hero-booking-button"
              className="cta-shine glow-focus inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
              style={{ background: "var(--gradient-cta)" }}>
              <CalendarCheck size={16} /> Pesan Online
            </Link>
            <Link to="/quotation" data-testid="fleet-hero-quotation-button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-[13.5px] font-semibold text-foreground transition hover:-translate-y-0.5">
              Minta Penawaran <ArrowRight size={15} />
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* KATALOG UNIT + FILTER TIPE */}
      <section className="relative overflow-hidden">
        <div className="glow-orb h-80 w-80 right-[-60px] top-24" style={{ background: "hsla(var(--ring) / 0.14)" }} aria-hidden="true" />
        <div className="glow-orb h-72 w-72 -left-16 bottom-10" style={{ background: "hsla(var(--accent) / 0.12)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Pilihan Armada" title="Semua unit siap jalan" subtitle="Setiap kendaraan dilengkapi fitur premium, dokumen aktif, dan driver profesional untuk perjalanan yang tenang." />

          <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="fleet-filter-bar">
            <span className="text-[12.5px] font-medium text-muted-foreground">Saring tipe</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[240px] bg-card" data-testid="fleet-type-filter">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="fleet-type-filter-opt-all">Semua tipe</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value} data-testid={`fleet-type-filter-opt-${t.value}`}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeFilter !== "all" ? (
              <button onClick={() => setTypeFilter("all")} data-testid="fleet-filter-reset"
                className="text-[12.5px] font-semibold text-primary hover:underline">Tampilkan semua</button>
            ) : null}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="fleet-loading">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" data-testid="fleet-skeleton" />)}
              </div>
            ) : error ? (
              <div className="py-16 text-center" data-testid="fleet-error"><p className="text-muted-foreground">Gagal memuat armada.</p><button onClick={reload} className="mt-3 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">Coba lagi</button></div>
            ) : rows.length === 0 ? (
              /* EMPTY STATE tidak boleh jadi jalan buntu: layanan lain (antar-jemput,
                 penawaran khusus) tetap tersedia walau katalog kosong/terfilter habis. */
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center" data-testid="fleet-empty">
                <span className="icon-chip mx-auto h-12 w-12"><Bus size={20} /></span>
                <p className="mt-4 text-[15px] font-semibold text-foreground">
                  {all.length === 0 ? "Belum ada armada dipublikasikan." : "Tidak ada unit untuk tipe ini."}
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                  Layanan tetap berjalan — kami bisa menyiapkan unit sesuai kebutuhan Anda, termasuk antar-jemput bandara.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link to="/quotation" data-testid="fleet-empty-quote" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground">Minta Penawaran <ArrowRight size={14} /></Link>
                  <button onClick={() => setTypeFilter("all")} data-testid="fleet-empty-reset" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[13px] font-semibold text-foreground">Lihat semua tipe</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="fleet-grid">
                {rows.map((v) => <Reveal key={v.id}><FleetCard v={v} /></Reveal>)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PERBANDINGAN TIPE — mengisi halaman saat unit sedikit & membantu memilih kapasitas */}
      <VehicleTypeCompare types={types} loading={cfgLoading} error={cfgError} dpPercent={dp} />

      {/* STANDAR UNIT + ESTIMASI CEPAT */}
      <section className="section-tint relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div>
            <SectionHeading eyebrow="Standar Kami" title="Yang membuat unit kami layak jalan" subtitle="Bukan janji brosur — keempat hal ini tercatat per unit di sistem operasional kami." />
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="fleet-standards">
              {STANDARDS.map((s, i) => (
                <Reveal key={s.t} delay={i * 0.06}>
                  <GlassCard variant="premium" className="flex h-full items-start gap-3.5 p-5">
                    <span className="icon-chip h-11 w-11 shrink-0"><s.icon size={18} strokeWidth={1.8} /></span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-foreground">{s.t}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.d}</p>
                    </div>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/trip-calculator" data-testid="fleet-to-calculator" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground transition hover:-translate-y-0.5">
                <Calculator size={15} /> Halaman kalkulator
              </Link>
              <Link to="/booking/status" data-testid="fleet-to-status" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-foreground transition hover:-translate-y-0.5">
                Cek pesanan saya
              </Link>
            </div>
          </div>
          <div className="lg:pt-4">
            <TripEstimatorInline idPrefix="fleet-trip-estimator" defaultVehicleType={typeFilter === "all" ? "" : typeFilter} />
          </div>
        </div>
      </section>

      {/* ANTAR-JEMPUT BANDARA (tarif flat nyata) */}
      <AirportRouteStrip routes={config?.routes} loading={cfgLoading} error={cfgError} />

      {/* PROMO AKTIF */}
      <PromoStrip dpPercent={dp} />

      {/* FAQ */}
      <FaqBlock items={FAQS} testId="fleet-faq" eyebrow="FAQ Armada" title="Pertanyaan seputar penyewaan" />

      {/* CTA PENUTUP */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <CtaBand
          testId="fleet-cta-band"
          eyebrow="Pesan Online"
          title="Amankan jadwal armada Anda hari ini"
          subtitle="Pilih tanggal, lihat unit yang benar-benar tersedia, lalu kunci jadwalnya. Semua harga dihitung sistem — tidak berubah saat penagihan."
          note={`DP ${dp}% · jadwal ditahan ${hold} jam`}
          primary={{ to: "/booking", label: "Mulai Pesan Online", icon: CalendarCheck, testId: "fleet-cta-booking" }}
          secondary={{ to: "/quotation", label: "Konsultasi Penawaran", icon: MessageCircle, testId: "fleet-cta-quotation" }}
        />
      </section>
    </div>
  );
}
