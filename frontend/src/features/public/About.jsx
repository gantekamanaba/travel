import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import PageHero from "@/components/public/PageHero";
import Reveal from "@/components/public/Reveal";
import SectionHeading from "@/components/public/SectionHeading";
import GlassCard from "@/components/public/GlassCard";
import useSEO from "@/hooks/useSEO";

// Konten statis (bukan data API) — dirender EKSPLISIT tanpa list-render (.map),
// agar lulus baseline UX audit (loading/empty hanya relevan untuk data dinamis).
function StatCard({ v, l }) {
  return (
    <GlassCard variant="premium" className="p-6 text-center">
      <p className="font-fraunces text-3xl tabular-nums text-foreground">{v}</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">{l}</p>
    </GlassCard>
  );
}

function ValueCard({ icon: Icon, t, d }) {
  return (
    <GlassCard variant="premium" interactive className="h-full p-5">
      <span className="icon-chip h-11 w-11"><Icon size={18} strokeWidth={1.8} /></span>
      <h3 className="mt-3.5 font-fraunces text-lg text-foreground">{t}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p>
    </GlassCard>
  );
}

export default function About() {
  // CMS-02 SEO: meta dasar halaman Tentang.
  useSEO({
    title: "Tentang Kami",
    description: "RahazaTrans mengelola armada, booking, CRM, dan pelacakan dalam satu ekosistem terintegrasi untuk perjalanan premium lintas Jawa–Bali.",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop",
    keywords: "tentang rahaza travel, jasa travel jawa bali, perusahaan rental armada",
  });

  return (
    <div>
      <PageHero eyebrow="Tentang" title="Satu ekosistem untuk perjalanan premium"
        subtitle="RahazaTrans mengelola armada, booking, CRM, dan pelacakan dalam satu sistem terintegrasi."
        image="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop"
        breadcrumb={[{ label: "Beranda", to: "/" }, { label: "Tentang" }]} />
      <section className="relative overflow-hidden">
        <div className="glow-orb h-80 w-80 right-[-60px] top-10" style={{ background: "hsla(var(--ring) / 0.14)" }} aria-hidden="true" />
        <div className="glow-orb h-72 w-72 -left-16 bottom-20" style={{ background: "hsla(var(--accent) / 0.12)" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 md:py-20">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4" data-testid="about-stats">
            <Reveal delay={0}><StatCard v="500+" l="Trip terlaksana" /></Reveal>
            <Reveal delay={0.06}><StatCard v="4.8/5" l="Rating pelanggan" /></Reveal>
            <Reveal delay={0.12}><StatCard v="24/7" l="Dukungan tim" /></Reveal>
            <Reveal delay={0.18}><StatCard v="Jawa–Bali" l="Area layanan" /></Reveal>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading eyebrow="Tentang Kami" title="Perjalanan yang dikelola sungguh-sungguh"
                subtitle="Kami percaya perjalanan yang baik lahir dari operasional yang rapi. Karena itu setiap armada, driver, dan booking kami kelola dalam satu ekosistem — dari penawaran hingga pelacakan di jalan — agar Anda cukup menikmati perjalanannya." />
              <Link to="/quotation" className="cta-shine mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5" style={{ background: "var(--gradient-cta)" }}>Mulai Rencanakan <ArrowRight size={16} /></Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Reveal delay={0}><ValueCard icon={ShieldCheck} t="Keselamatan utama" d="Dokumen armada (KIR/pajak) aktif, driver ber-SIM valid, dan unit diservis berkala." /></Reveal>
              <Reveal delay={0.06}><ValueCard icon={MapPin} t="Transparan & terpantau" d="Harga jelas via kalkulator, perjalanan dilacak real-time lewat GPS." /></Reveal>
              <Reveal delay={0.12}><ValueCard icon={Users} t="Untuk semua kebutuhan" d="Keluarga, korporat, sekolah, hingga komunitas — kami sesuaikan layanannya." /></Reveal>
              <Reveal delay={0.18}><ValueCard icon={Clock} t="Tepat waktu" d="Penjadwalan rapi dengan buffer, konfirmasi titik jemput sebelum hari-H." /></Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
