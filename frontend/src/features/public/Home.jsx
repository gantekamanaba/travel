import { Link } from "react-router-dom";
import {
  ArrowRight, ShieldCheck, MapPin, Headset, Star, Bus, BadgeCheck,
  Wrench, Navigation, Calculator, Globe2, Clock, Quote, Sparkles, Check,
} from "lucide-react";
import { useResource } from "@/hooks/useResource";
import useSEO, { absUrl } from "@/hooks/useSEO";
import ParallaxHero from "@/components/public/ParallaxHero";
import TripEstimatorInline from "@/components/public/TripEstimatorInline";
import Reveal from "@/components/public/Reveal";
import GlassCard from "@/components/public/GlassCard";
import SectionHeading from "@/components/public/SectionHeading";
import StatCounter from "@/components/public/StatCounter";
import FleetCard from "@/components/public/FleetCard";
import DestCard from "@/components/public/DestCard";
import BookingStepsSection from "@/components/public/BookingStepsSection";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

const HERO = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2000&auto=format&fit=crop";

const VALUE_PROPS = [
  { icon: ShieldCheck, t: "Armada Terawat", d: "KIR, pajak, dan servis terjadwal. Setiap unit dipantau kelaikannya sebelum jalan.", tag: "Kelaikan terjaga" },
  { icon: MapPin, t: "Pelacakan Real-time", d: "Pantau posisi & estimasi tiba perjalanan Anda langsung dari peta, kapan saja.", tag: "GPS live" },
  { icon: Headset, t: "Layanan Responsif", d: "Tim operasional siap membantu penawaran, penjadwalan, dan kebutuhan trip Anda.", tag: "Support 24/7" },
];

const STAT_ICONS = { fleet: Bus, destinations: Globe2, rating: Star, service: Clock };

const TRUST = [
  { icon: BadgeCheck, t: "Sertifikasi CHSE", d: "Protokol kebersihan & keselamatan" },
  { icon: ShieldCheck, t: "KIR & Pajak Aktif", d: "Legalitas unit selalu diperbarui" },
  { icon: Wrench, t: "Servis Terjadwal", d: "Perawatan berkala tiap armada" },
  { icon: Navigation, t: "GPS Tracking", d: "Pelacakan rute & ETA real-time" },
];

const HERO_CHIPS = ["Driver berpengalaman", "CHSE / KIR", "Harga transparan"];

const FAQS = [
  { q: "Apa saja yang termasuk dalam harga sewa?", a: "Harga mencakup unit armada, driver berpengalaman, dan fee operasional dasar. Komponen BBM, tol, dan parkir dihitung sesuai rute pada estimasi." },
  { q: "Bagaimana cara memesan armada?", a: "Hitung estimasi di halaman ini atau di Kalkulator, lalu klik Minta Penawaran. Tim kami akan mengirim penawaran final & konfirmasi ketersediaan via WhatsApp." },
  { q: "Apakah tersedia pelacakan perjalanan?", a: "Ya. Untuk perjalanan korporat kami sediakan tautan pelacakan real-time sehingga posisi dan estimasi tiba dapat dipantau." },
  { q: "Area layanan mana saja?", a: "Kami berbasis di Bandung dan melayani perjalanan ke seluruh Jawa hingga Bali, untuk keluarga, korporat, maupun institusi." },
];

function Stars({ n = 5 }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} className={i < n ? "fill-[hsl(var(--ring))] text-[hsl(var(--ring))]" : "text-border"} />
      ))}
    </span>
  );
}

export default function Home() {
  const { data: fleet, loading: fleetLoading } = useResource("/public/fleet");
  const { data: destinations, loading: destLoading } = useResource("/public/destinations");
  const { data: testimonials } = useResource("/public/testimonials");
  const { data: statsData, loading: statsLoading } = useResource("/public/stats");

  const fleetRows = (Array.isArray(fleet) ? fleet : []).slice(0, 3);
  const destAll = Array.isArray(destinations) ? destinations : [];
  const destRows = (destAll.filter((d) => d.popular).length ? destAll.filter((d) => d.popular) : destAll).slice(0, 3);
  const tRows = Array.isArray(testimonials) ? testimonials : [];
  const stats = Array.isArray(statsData?.stats) ? statsData.stats : [];

  // CMS-02 SEO: meta dasar + Organization JSON-LD (identitas brand utk mesin pencari).
  useSEO({
    title: "RahazaTrans — Rental Armada Premium & Paket Wisata Jawa–Bali",
    description: "Sewa Hiace Premio & armada premium dengan driver profesional. Paket wisata Jawa–Bali, harga transparan, pelacakan real-time, dan layanan responsif.",
    image: HERO,
    keywords: "sewa hiace, rental armada premium, paket wisata jawa bali, sewa mobil bandung, travel bandung",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "RahazaTrans",
      url: absUrl("/"),
      logo: absUrl("/logo.png"),
      image: HERO,
      description: "Rental armada premium & paket wisata Jawa–Bali dengan pendamping profesional.",
      email: "halo@rahazatrans.id",
      telephone: "+62-811-2000-300",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Jl. Asia Afrika No. 1",
        addressLocality: "Bandung",
        addressRegion: "Jawa Barat",
        addressCountry: "ID",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+62-811-2000-300",
        contactType: "customer service",
        areaServed: "ID",
        availableLanguage: ["id", "en"],
      },
      sameAs: [
        "https://www.instagram.com/rahazatrans",
        "https://www.facebook.com/rahazatrans",
      ],
    },
  });

  return (
    <div>
      {/* HERO */}
      <ParallaxHero image={HERO}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm">
              <Sparkles size={13} /> Premium Hiace &middot; Wisata Jawa&ndash;Bali
            </span>
            <h1 className="mt-5 max-w-2xl font-fraunces text-4xl leading-[1.04] text-white sm:text-5xl lg:text-6xl text-balance">Perjalanan Premium, Tanpa Ribet.</h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/85">Sewa Hiace Premio &amp; bus pariwisata dari Bandung untuk Jawa&ndash;Bali. Driver profesional, harga transparan, dan pelacakan perjalanan real-time.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/quotation" data-testid="home-cta-quote" className="cta-shine inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-primary shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5">Minta Penawaran <ArrowRight size={16} /></Link>
              <Link to="/trip-calculator" data-testid="home-cta-calc" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"><Calculator size={16} /> Halaman Kalkulator</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {HERO_CHIPS.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur-sm">
                  <Check size={13} className="text-[hsl(var(--ring))]" /> {c}
                </span>
              ))}
            </div>
          </div>
          <TripEstimatorInline idPrefix="hero-trip-estimator" />
        </div>
      </ParallaxHero>

      {/* PESAN ONLINE DALAM 3 LANGKAH \u2014 ditaruh persis setelah hero karena inilah aksi utama
          situs sesudah navbar dirapikan (permintaan user: "Pesan Online bisa button atau
          section dari beranda"). */}
      <BookingStepsSection />

      {/* VALUE PROPS */}
      <section className="relative overflow-hidden">
        <div className="glow-orb h-72 w-72 -left-20 top-10" style={{ background: "hsla(var(--ring) / 0.16)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <SectionHeading eyebrow="Kenapa RahazaTrans" title="Standar premium di setiap perjalanan" subtitle="Bukan sekadar sewa kendaraan — kami pastikan kenyamanan, keamanan, dan transparansi dari awal hingga tiba di tujuan." />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((v, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <GlassCard variant="premium" interactive className="group h-full p-7">
                  <span className="icon-chip h-12 w-12"><v.icon className="h-5 w-5" strokeWidth={1.8} /></span>
                  <span className="mt-5 inline-block rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-secondary-foreground">{v.tag}</span>
                  <h3 className="mt-3 font-fraunces text-xl text-foreground">{v.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{v.d}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS \u2014 premium frosted cards on a deep band */}
      <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06]" aria-hidden="true" />
        <div className="glow-orb h-80 w-80 right-0 -top-16" style={{ background: "hsla(var(--ring) / 0.22)" }} aria-hidden="true" />
        <div className="glow-orb h-72 w-72 -left-10 bottom-0" style={{ background: "hsla(var(--accent) / 0.18)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--ring))]" /> Angka yang bisa dipercaya</span>
            <h2 className="mt-3 font-fraunces text-3xl text-white sm:text-4xl">Performa yang berbicara</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" data-testid="home-stats">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/10" data-testid="home-stats-skeleton" />)
            ) : stats.length === 0 ? (
              <div className="col-span-full text-center text-[13px] text-primary-foreground/70" data-testid="home-stats-empty">Belum ada statistik untuk ditampilkan.</div>
            ) : (
              stats.map((s, i) => {
                const Icon = STAT_ICONS[s.key] || Sparkles;
                return (
                  <Reveal key={s.key} delay={i * 0.07}>
                    <div className="h-full rounded-2xl glass-strong p-6 text-center text-foreground lift">
                      <span className="icon-chip mx-auto h-12 w-12"><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
                      <div className="mt-4">
                        <StatCounter value={s.value} decimals={s.decimals} suffix={s.suffix} label={s.label} testId={`home-stat-${s.key}`} />
                      </div>
                    </div>
                  </Reveal>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* FEATURED FLEET */}
      <section className="bg-secondary/40 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Armada" title="Unit pilihan, siap jalan" subtitle="Toyota Hiace Premio & bus pariwisata terawat dengan fitur lengkap untuk kenyamanan maksimal." to="/fleet" linkLabel="Lihat semua armada" testId="home-fleet-all" />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="home-fleet-grid">
            {fleetLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" data-testid="home-fleet-skeleton" />)
            ) : fleetRows.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-card py-16 text-center text-[14px] text-muted-foreground" data-testid="home-fleet-empty">Belum ada armada untuk ditampilkan saat ini.</div>
            ) : (
              fleetRows.map((v) => <Reveal key={v.id}><FleetCard v={v} /></Reveal>)
            )}
          </div>
        </div>
      </section>

      {/* DESTINATIONS BENTO */}
      <section className="relative overflow-hidden">
        <div className="glow-orb h-80 w-80 right-[-60px] top-20" style={{ background: "hsla(var(--accent) / 0.16)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-24">
          <SectionHeading eyebrow="Destinasi" title="Tujuan populer pilihan tamu" subtitle="Inspirasi rute terbaik di Jawa & Bali, lengkap dengan estimasi dan rekomendasi." to="/destinations" linkLabel="Semua destinasi" testId="home-dest-all" />
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12" data-testid="home-dest-grid">
            {destLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted lg:col-span-4" data-testid="home-dest-skeleton" />)
            ) : destRows.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-card py-16 text-center text-[14px] text-muted-foreground" data-testid="home-dest-empty">Belum ada destinasi populer untuk ditampilkan.</div>
            ) : (
              <>
                <DestCard d={destRows[0]} big className="min-h-[320px] lg:col-span-7 lg:min-h-[460px]" />
                <div className="flex flex-col gap-5 lg:col-span-5">
                  {destRows.slice(1, 3).map((d) => <DestCard key={d.id} d={d} className="min-h-[210px] flex-1" />)}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {tRows.length ? (
        <section className="bg-secondary/40 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Testimoni" title="Dipercaya keluarga & korporat" subtitle="Pengalaman nyata dari tamu yang telah menempuh perjalanan bersama kami." />
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="home-testimonials">
              {tRows.slice(0, 3).map((t, i) => (
                <Reveal key={t.id} delay={i * 0.08}>
                  <GlassCard variant="premium" interactive className="relative h-full p-7">
                    <Quote className="absolute right-6 top-6 h-8 w-8 text-[hsl(var(--ring))] opacity-25" />
                    <Stars n={t.rating || 5} />
                    <p className="mt-4 text-[14.5px] leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <div className="h-11 w-11 rounded-full bg-secondary bg-cover bg-center ring-2 ring-[hsla(var(--glass-border))]" style={t.avatar ? { backgroundImage: `url('${t.avatar}')` } : undefined} />
                      <div><p className="text-[13.5px] font-semibold text-foreground">{t.name}</p><p className="text-[12px] text-muted-foreground">{t.role}</p></div>
                    </div>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* TRUST SIGNALS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-20">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" data-testid="trust-signals">
          {TRUST.map((t, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <GlassCard variant="premium" className="flex h-full items-start gap-3.5 p-5">
                <span className="icon-chip h-11 w-11 shrink-0"><t.icon size={18} strokeWidth={1.8} /></span>
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">{t.t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{t.d}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        <SectionHeading center eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
        <GlassCard variant="premium" className="mt-8 px-6 py-2">
          <Accordion type="single" collapsible data-testid="home-faq">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-b-0">
                <AccordionTrigger className="text-left text-[15px] font-medium text-foreground hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[13.5px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* CTA BAND */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative flex flex-col items-center justify-between gap-7 overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground shadow-[var(--shadow-glass)] md:flex-row md:text-left md:px-14">
          <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06]" aria-hidden="true" />
          <div className="glow-orb h-72 w-72 right-[-40px] -top-20" style={{ background: "hsla(var(--ring) / 0.30)" }} aria-hidden="true" />
          <div className="relative max-w-xl">
            <h2 className="font-fraunces text-3xl leading-tight sm:text-4xl">Siap merencanakan perjalanan?</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed opacity-85">Dapatkan penawaran transparan dalam hitungan menit. Tim kami siap membantu rute, jadwal, dan armada terbaik.</p>
          </div>
          <div className="relative flex flex-wrap justify-center gap-3">
            <Link to="/quotation" className="cta-shine inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-primary shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5">Minta Penawaran <ArrowRight size={16} /></Link>
            <Link to="/fleet" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"><Bus size={16} /> Lihat Armada</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
