import { useState } from "react";
import { Loader2, CalendarCheck, MessageCircle, ArrowRight, Compass, Users, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { useResource } from "@/hooks/useResource";
import PageHero from "@/components/public/PageHero";
import Reveal from "@/components/public/Reveal";
import SectionHeading from "@/components/public/SectionHeading";
import DestCard from "@/components/public/DestCard";
import DestinationFacts from "@/components/public/DestinationFacts";
import PackageStrip from "@/components/public/PackageStrip";
import FaqBlock from "@/components/public/FaqBlock";
import CtaBand from "@/components/public/CtaBand";
import GlassCard from "@/components/public/GlassCard";
import useSEO from "@/hooks/useSEO";

const HERO = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2000&auto=format&fit=crop";

const REGIONS = [
  { v: "all", l: "Semua" },
  { v: "bali", l: "Bali" },
  { v: "jawa_timur", l: "Jawa Timur" },
  { v: "jawa_tengah", l: "Jawa Tengah" },
  { v: "jawa_barat", l: "Jawa Barat" },
];

const NARRATIVE = [
  {
    icon: Compass,
    t: "Satu armada, satu driver, dari pintu rumah",
    d: "Perjalanan lintas provinsi paling melelahkan bukan karena jaraknya, tapi karena berpindah moda: kereta, sewa lokal, lalu ojek. Dengan satu unit dan satu driver yang menemani sejak titik jemput, rombongan tidak perlu bongkar-muat bagasi di tengah jalan.",
  },
  {
    icon: Route,
    t: "Rute disusun dari pengalaman, bukan tebakan",
    d: "Tiap panduan destinasi di halaman ini punya tahapan perjalanan yang kami pakai sehari-hari — termasuk kapan sebaiknya berangkat malam dan di mana rehat yang aman untuk anak & orang tua.",
  },
  {
    icon: Users,
    t: "Cocok untuk keluarga, sekolah, dan korporat",
    d: "Kapasitas bisa dipilih dari 6 sampai puluhan penumpang, dan setiap perjalanan tercatat di sistem operasional kami sehingga jadwal, unit, dan drivernya jelas siapa.",
  },
];

export default function Destinations() {
  const { data, loading, error, reload } = useResource("/public/destinations");
  const [region, setRegion] = useState("all");
  const all = Array.isArray(data) ? data : [];
  const rows = region === "all" ? all : all.filter((d) => d.region === region);

  // FAQ halaman ini DIRANGKUM dari panduan tiap destinasi (`destinations[].faqs`) — kalau
  // pemilik menyunting FAQ Bromo di CMS, halaman indeks ini ikut berubah. Pertanyaan diberi
  // prefiks nama destinasi supaya jawabannya tidak terbaca lepas konteks.
  const faqs = [];
  [...all]
    .sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)))
    .forEach((d) => {
      (Array.isArray(d.faqs) ? d.faqs : []).slice(0, 2).forEach((f) => {
        if (f?.q && f?.a) faqs.push({ q: `${d.name} — ${f.q}`, a: f.a });
      });
    });

  useSEO({
    title: "Destinasi Wisata Jawa–Bali",
    description: "Jelajahi tujuan favorit lintas Jawa–Bali — dari sunrise Bromo hingga pura Bali. Lengkap dengan rute perjalanan, rekomendasi, dan estimasi biaya.",
    image: HERO,
    keywords: "destinasi wisata bali, wisata jawa, paket tour bromo, tempat wisata jawa bali",
  });

  return (
    <div>
      <PageHero eyebrow="Destinasi" title="Tujuan favorit lintas Jawa–Bali"
        subtitle="Dari sunrise Bromo hingga pura Bali — setiap destinasi dilengkapi rute perjalanan, rekomendasi, dan estimasi biaya."
        image={HERO}
        breadcrumb={[{ label: "Beranda", to: "/" }, { label: "Destinasi" }]} />

      <section className="relative overflow-hidden">
        <div className="glow-orb h-80 w-80 right-[-50px] top-16" style={{ background: "hsla(var(--accent) / 0.14)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Jelajahi" title="Inspirasi destinasi terbaik" subtitle="Pilih wilayah dan temukan tujuan favorit untuk perjalanan berikutnya." />
          <div className="mt-8 flex flex-wrap gap-2" data-testid="dest-filters">
            {REGIONS.map((r) => {
              const count = r.v === "all" ? all.length : all.filter((d) => d.region === r.v).length;
              return (
                <button key={r.v} onClick={() => setRegion(r.v)} data-testid={`dest-filter-${r.v}`}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${region === r.v ? "text-primary-foreground shadow-[var(--shadow-lift)]" : "border border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-[hsla(var(--glass-border))]"}`}
                  style={region === r.v ? { background: "var(--gradient-cta)" } : undefined}>
                  {r.l}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${region === r.v ? "bg-primary-foreground/20" : "bg-secondary text-secondary-foreground"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mt-8 flex justify-center py-16 text-muted-foreground" data-testid="dest-loading"><Loader2 className="mr-2 animate-spin" /> Memuat destinasi…</div>
          ) : error ? (
            <div className="mt-8 py-16 text-center" data-testid="dest-error"><p className="text-muted-foreground">Gagal memuat destinasi.</p><button onClick={reload} className="mt-3 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">Coba lagi</button></div>
          ) : rows.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center" data-testid="dest-empty">
              <p className="text-[15px] font-semibold text-foreground">Belum ada destinasi untuk wilayah ini.</p>
              <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">Kami tetap bisa menyusun rute khusus — ceritakan tujuan Anda dan kami hitung kebutuhan armadanya.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/quotation" data-testid="dest-empty-quote" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground">Minta Penawaran <ArrowRight size={14} /></Link>
                <button onClick={() => setRegion("all")} data-testid="dest-empty-reset" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[13px] font-semibold text-foreground">Lihat semua wilayah</button>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:232px]" data-testid="dest-grid">
              {rows.map((d, i) => (
                <Reveal key={d.id} className={i === 0 ? "h-full sm:col-span-2 lg:row-span-2" : "h-full"}>
                  <DestCard d={d} big={i === 0} showDesc={i === 0} className="h-full min-h-[232px]" />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FUN FACT — diturunkan dari data panduan destinasi */}
      <DestinationFacts destinations={all} loading={loading} />

      {/* PAKET WISATA (harga mulai nyata dari CMS) */}
      <PackageStrip />

      {/* NARASI — alasan memilih perjalanan dengan armada sendiri, ditutup CTA */}
      <section className="relative overflow-hidden">
        <div className="glow-orb h-72 w-72 -left-16 top-10" style={{ background: "hsla(var(--ring) / 0.12)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            center
            eyebrow="Cerita Perjalanan"
            title="Kenapa rombongan memilih jalan darat bersama kami"
            subtitle="Tiga hal yang paling sering disebut tamu setelah trip mereka selesai."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="dest-narrative">
            {NARRATIVE.map((n, i) => (
              <Reveal key={n.t} delay={i * 0.08}>
                <GlassCard variant="premium" className="h-full p-7">
                  <span className="icon-chip h-12 w-12"><n.icon size={20} strokeWidth={1.8} /></span>
                  <h3 className="mt-5 font-fraunces text-xl leading-snug text-foreground">{n.t}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">{n.d}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ dirangkum dari panduan destinasi */}
      <FaqBlock
        items={faqs}
        loading={loading}
        testId="dest-faq"
        eyebrow="FAQ Destinasi"
        title="Yang biasa ditanyakan sebelum berangkat"
        subtitle="Dirangkum dari panduan tiap destinasi."
      />

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <CtaBand
          testId="dest-cta-band"
          eyebrow="Siap jalan"
          title="Sudah menemukan tujuannya? Kunci tanggalnya."
          subtitle="Cek unit yang tersedia pada tanggal Anda, atau minta itinerary khusus bila rombongan Anda punya kebutuhan tersendiri."
          primary={{ to: "/booking", label: "Pesan Online", icon: CalendarCheck, testId: "dest-cta-booking" }}
          secondary={{ to: "/quotation", label: "Minta Itinerary Khusus", icon: MessageCircle, testId: "dest-cta-quotation" }}
        />
      </section>
    </div>
  );
}
