import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Menu, X, MessageCircle, Phone, Mail, MapPin, Sun, Moon, ChevronDown, CalendarCheck, LifeBuoy } from "lucide-react";
import apiClient from "@/services/apiClient";
import { useResource } from "@/hooks/useResource";
import { captureAttribution } from "@/utils/attribution";
import { initTracking, trackPageView } from "@/lib/tracking";
import ConsentBanner from "@/components/public/ConsentBanner";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import ChatWidget from "@/components/public/ChatWidget";
import Logo from "@/components/public/Logo";
import MegaMenu from "@/components/public/MegaMenu";
import Preloader from "@/components/public/Preloader";
import PageTransition from "@/components/public/PageTransition";
import StickyMobileCTA from "@/components/public/StickyMobileCTA";
import ExitIntentModal from "@/components/public/ExitIntentModal";
import ResumeBookingChip from "@/components/public/ResumeBookingChip";

// NAV = halaman yang dipakai tamu saat MEMILIH (5 item, terbaca sekali pandang).
//
// Kenapa hanya 5? Versi sebelumnya memuat 9 menu + 5 utilitas = 14 target klik dalam satu baris,
// dan pada layar 1920px label "Pesan Online / Cek Pesanan / Masuk ERP / Pesan Sekarang" sudah
// PECAH menjadi dua baris (terbukti di screenshot sesi 2026-08-12). Lebih parah: `Pesan Online`
// (menu) dan `Pesan Sekarang` (tombol) menuju tujuan yang SAMA (`/booking`) sehingga aksi utama
// tidak punya pemenang yang jelas.
//
// Yang dipindah TIDAK dihapus (dan `data-testid`-nya juga tidak):
//   Pesan Online   -> satu tombol aksi utama `nav-booking-cta` + tautan footer `public-nav-booking`
//   Cek Pesanan    -> bar pengumuman `public-nav-booking-status` (SELALU terlihat: di sanalah
//                     tamu mengunggah bukti DP; menaruhnya hanya di footer menaikkan risiko
//                     hold hangus) + drawer ponsel
//   Masuk ERP      -> bar pengumuman `public-nav-login` + footer + drawer
//   Tentang/Kontak -> footer `public-nav-about` / `public-nav-contact` + drawer
const NAV = [
  { to: "/", label: "Beranda", id: "home", end: true },
  { to: "/fleet", label: "Armada", id: "fleet" },
  { to: "/destinations", label: "Destinasi", id: "destinations", mega: true },
  { to: "/trip-calculator", label: "Kalkulator", id: "trip-calculator" },
  { to: "/blog", label: "Blog", id: "blog" },
];

// Grup KEDUA drawer ponsel. Di ponsel footer itu jauh (butuh scroll seluruh halaman), jadi
// tautan "sesudah tertarik" wajib tetap terjangkau dari drawer.
const HELP_NAV = [
  { to: "/booking", label: "Pesan Online", id: "booking" },
  { to: "/booking/status", label: "Cek Pesanan", id: "booking-status" },
  { to: "/quotation", label: "Minta Penawaran", id: "quotation" },
  { to: "/about", label: "Tentang", id: "about" },
  { to: "/contact", label: "Kontak", id: "contact" },
  { to: "/app/login", label: "Masuk ERP", id: "login" },
];

const DEFAULT_COMPANY = {
  whatsapp: "6281120003000", phone: "0811-2000-300", email: "halo@rahazatrans.id",
  address: "Bandung", name: "RahazaTrans", service_area: "Jawa & Bali", city: "Bandung",
};

function PublicShell() {
  const { preset, mode, toggleMode } = useTheme();
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const location = useLocation();
  const { data: destinations, loading: destLoading } = useResource("/public/destinations");

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pelacakan iklan: muat tag sekali (ID dari server, gerbang consent), lalu kirim
  // page_view MANUAL tiap perubahan URL (SPA tidak boleh menghitung ganda).
  useEffect(() => { initTracking(); }, []);
  useEffect(() => {
    setMenuOpen(false); setMegaOpen(false); window.scrollTo(0, 0); captureAttribution();
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    apiClient.get("/public/company").then((r) => {
      if (r.data && r.data.name) setCompany((c) => ({ ...c, ...r.data }));
    }).catch(() => {});
  }, []);

  const solid = !atTop;
  // FASE F8 — halaman iklan (`/lp/:slug`) memakai header RINGKAS: hanya logo + telepon + WhatsApp.
  // Alasannya bisnis, bukan estetika: pengunjung dari iklan berbayar datang untuk SATU tindakan.
  // Delapan tautan menu di halaman tujuan iklan adalah delapan jalan keluar dari formulir, dan
  // setiap klik yang keluar tetap dibayar penuh. Layout publik tetap dipakai (bukan layout
  // terpisah) supaya inisialisasi pixel, banner consent, dan widget chat tidak ikut hilang.
  const isLanding = location.pathname.startsWith("/lp/");
  const waLink = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent("Halo RahazaTrans, saya ingin bertanya tentang sewa armada.")}`;
  const navText = solid ? "text-foreground" : "text-white";
  const navMuted = solid ? "text-muted-foreground" : "text-white/80";

  return (
    <div data-surface="public" data-theme={preset} className="min-h-screen bg-background text-foreground">
      <Preloader />

      <header className="fixed inset-x-0 top-0 z-50" data-testid="public-header">
        {/* BAR PENGUMUMAN \u2014 dulu hanya hiasan teks; sekarang jadi rumah tautan UTILITAS.
            Pola umum situs travel Indonesia: utilitas (cek pesanan / login / telepon) di bar
            tipis paling atas, sehingga slot menu utama tetap lega untuk halaman jualan.
            Pada `/lp/:slug` utilitas DISEMBUNYIKAN \u2014 halaman iklan berbayar hanya boleh punya
            satu tindakan (INV-LP: tiap tautan keluar adalah klik yang tetap dibayar penuh). */}
        <div className={`w-full text-[11.5px] tracking-wide transition-colors ${solid ? "bg-primary text-primary-foreground/85" : "bg-black/30 text-white/90 backdrop-blur-sm"}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-1.5" data-testid="public-announcement-bar">
            {/* Teks pemasaran disembunyikan di layar sangat kecil: pada 390px ia hanya jadi
                "Melayani Jawa ..." yang terpotong dan justru mengalahkan tautan utilitas
                (Cek Pesanan) yang benar-benar dipakai tamu. */}
            <span className={`truncate ${isLanding ? "" : "hidden sm:block"}`}>Melayani {company.service_area || "Jawa\u2013Bali"} &middot; <span className="hidden sm:inline">Konsultasi &amp; penawaran gratis &middot; </span>WhatsApp 24/7</span>
            {isLanding ? null : (
              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <ResumeBookingChip variant="bar" />
                <Link to="/booking/status" data-testid="public-nav-booking-status"
                  className="inline-flex items-center gap-1 font-semibold underline-offset-2 transition hover:underline">
                  <LifeBuoy size={12} className="shrink-0" /> Cek Pesanan
                </Link>
                <a href={`tel:${company.phone}`} data-testid="nav-phone-cta"
                  className="hidden items-center gap-1 underline-offset-2 transition hover:underline sm:inline-flex">
                  <Phone size={12} className="shrink-0" /> {company.phone}
                </a>
                <Link to="/app/login" data-testid="public-nav-login"
                  className="hidden underline-offset-2 transition hover:underline lg:inline">Masuk ERP</Link>
              </div>
            )}
          </div>
        </div>

        <div className={`transition-all duration-300 ${solid ? "glass-strong border-b border-[hsla(var(--glass-border))]" : "bg-transparent"}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link to="/" data-testid="public-nav-home" className={navText}>
              <Logo name={company.name || "RahazaTrans"} />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {(isLanding ? [] : NAV).map((n) => (
                n.mega ? (
                  <div key={n.id} className="relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
                    <NavLink to={n.to} end={n.end} data-testid={`public-nav-${n.id}`}
                      className={({ isActive }) => `flex items-center gap-1 text-[13.5px] font-medium transition-colors ${isActive ? navText : navMuted} hover:${navText}`}>
                      {n.label} <ChevronDown size={14} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
                    </NavLink>
                    <AnimatePresence>
                      {megaOpen ? (
                        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
                          <MegaMenu destinations={destinations} loading={destLoading} onNavigate={() => setMegaOpen(false)} />
                        </div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink key={n.id} to={n.to} end={n.end} data-testid={`public-nav-${n.id}`}
                    className={({ isActive }) => `text-[13.5px] font-medium transition-colors ${isActive ? navText : navMuted} hover:${navText}`}>
                    {n.label}
                  </NavLink>
                )
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <button onClick={toggleMode} aria-label="Ganti tema terang/gelap" data-testid="nav-theme-switch"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${solid ? "text-foreground hover:bg-secondary" : "text-white hover:bg-white/15"}`}>
                {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              {/* SATU aksi utama. Menggantikan sekaligus menu "Pesan Online" DAN tombol
                  "Pesan Sekarang" yang dulu bersaing untuk tujuan yang sama. */}
              <Link to="/booking" data-testid="nav-booking-cta"
                className={`cta-shine inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 ${isLanding ? "hidden" : ""}`}
                style={{ background: "var(--gradient-cta)" }}>
                <CalendarCheck size={15} /> Pesan Online
              </Link>
              {/* WhatsApp = aksi SEKUNDER (tetap ada: kanal utama pasar Indonesia). */}
              <a href={waLink} target="_blank" rel="noreferrer" data-testid="nav-whatsapp-cta"
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${solid ? "border border-border text-foreground hover:bg-secondary" : "border border-white/40 text-white hover:bg-white/15"}`}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            </div>

            <button className={`lg:hidden ${navText} ${isLanding ? "hidden" : ""}`} onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" data-testid="public-menu-toggle">
              {menuOpen ? <X /> : <Menu />}
            </button>
            {isLanding ? (
              <a href={waLink} target="_blank" rel="noreferrer" data-testid="lp-nav-whatsapp"
                className="cta-shine inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] lg:hidden"
                style={{ background: "var(--gradient-cta)" }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            ) : null}
          </div>

          {menuOpen ? (
            <div className="glass-strong max-h-[calc(100vh-6rem)] overflow-y-auto border-t border-[hsla(var(--glass-border))] px-5 py-3 lg:hidden" data-testid="public-mobile-menu">
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink key={n.id} to={n.to} end={n.end} data-testid={`mnav-${n.id}`}
                    className="rounded-lg px-2 py-2.5 text-[14px] font-medium text-foreground hover:bg-secondary">{n.label}</NavLink>
                ))}

                {/* GRUP KEDUA \u2014 wajib ada sejak menu utama dipangkas: di ponsel footer terlalu
                    jauh, dan "Cek Pesanan" adalah tempat unggah bukti DP (tidak boleh susah dicari). */}
                <div className="mt-3 border-t border-border pt-3" data-testid="public-mobile-help-group">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Layanan &amp; Bantuan</p>
                  {HELP_NAV.map((n) => (
                    <Link key={n.id} to={n.to} data-testid={`mnav-${n.id}`}
                      className="block rounded-lg px-2 py-2.5 text-[14px] font-medium text-foreground hover:bg-secondary">{n.label}</Link>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={toggleMode} data-testid="nav-theme-switch-mobile" aria-label="Ganti tema terang/gelap" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground">
                    {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                  <Link to="/booking" data-testid="mnav-booking-cta" className="cta-shine flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-center text-[13px] font-semibold text-primary-foreground" style={{ background: "var(--gradient-cta)" }}>
                    <CalendarCheck size={15} /> Pesan Online
                  </Link>
                  <a href={waLink} target="_blank" rel="noreferrer" data-testid="mnav-whatsapp" className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-center text-[13px] font-semibold text-foreground">
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>
              </nav>
            </div>
          ) : null}
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}><Outlet /></PageTransition>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border bg-primary text-primary-foreground dark:bg-card dark:text-card-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-14 md:flex-row md:flex-wrap md:justify-between">
          <div className="md:max-w-xs">
            <Logo name={company.name || "RahazaTrans"} wordmarkClass="text-current" />
            <p className="mt-3 text-[13px] leading-relaxed opacity-75">Perjalanan korporat &amp; wisata premium dengan armada Toyota Hiace Premio, driver profesional, dan pelacakan real-time.</p>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider opacity-55">Jelajahi</h4>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              <li><Link to="/fleet" className="opacity-80 transition hover:opacity-100">Armada</Link></li>
              <li><Link to="/destinations" className="opacity-80 transition hover:opacity-100">Destinasi</Link></li>
              <li><Link to="/trip-calculator" className="opacity-80 transition hover:opacity-100">Kalkulator Biaya</Link></li>
              <li><Link to="/blog" className="opacity-80 transition hover:opacity-100">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider opacity-55">Layanan</h4>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              <li><Link to="/booking" data-testid="public-nav-booking" className="opacity-80 transition hover:opacity-100">Pesan Online</Link></li>
              <li><Link to="/booking/status" data-testid="footer-nav-booking-status" className="opacity-80 transition hover:opacity-100">Cek Status Pesanan</Link></li>
              <li><Link to="/quotation" className="opacity-80 transition hover:opacity-100">Minta Penawaran</Link></li>
              <li><Link to="/about" data-testid="public-nav-about" className="opacity-80 transition hover:opacity-100">Tentang Kami</Link></li>
              <li><Link to="/contact" data-testid="public-nav-contact" className="opacity-80 transition hover:opacity-100">Kontak</Link></li>
              <li><Link to="/app/login" data-testid="footer-nav-login" className="opacity-80 transition hover:opacity-100">Konsol Internal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider opacity-55">Kontak</h4>
            <ul className="mt-3 space-y-2.5 text-[13.5px]">
              <li className="flex items-center gap-2"><Phone size={14} className="opacity-60" /> {company.phone}</li>
              <li className="flex items-center gap-2"><Mail size={14} className="opacity-60" /> {company.email}</li>
              <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 opacity-60" /> {company.address}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-current/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-[12.5px] opacity-60 sm:flex-row">
            <span>© {new Date().getFullYear()} {company.name || "RahazaTrans"}. Semua hak dilindungi.</span>
            <span>{company.city} · Melayani {company.service_area || "Jawa–Bali"}</span>
          </div>
        </div>
      </footer>

      <ChatWidget />
      <StickyMobileCTA waLink={waLink} />
      <ExitIntentModal waLink={waLink} />
      <ConsentBanner />
    </div>
  );
}

export default function PublicLayout() {
  return (
    <ThemeProvider>
      <PublicShell />
    </ThemeProvider>
  );
}
