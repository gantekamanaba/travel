import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, X } from "lucide-react";
import { denyConsent, getConsent, grantConsent, onTrackingReady, trackingStatus } from "@/lib/tracking";

/**
 * ConsentBanner — gerbang persetujuan pelacakan (Google Consent Mode v2 + Meta).
 *
 * Muncul hanya bila: pelacakan diaktifkan pemilik, banner dinyalakan, dan pengunjung
 * belum memilih. Menolak = tidak ada cookie iklan yang dipasang (bukan sekadar disembunyikan).
 */
export default function ConsentBanner() {
  const [choice, setChoice] = useState(getConsent());
  const [status, setStatus] = useState(trackingStatus());

  // Ikut notifikasi dari lib/tracking (konfigurasi datang dari server, waktunya tak bisa ditebak).
  useEffect(() => onTrackingReady(setStatus), []);

  const relevant = status.loaded && status.bannerEnabled && status.requireConsent && (status.meta || status.google);
  if (!relevant || choice) return null;

  const accept = () => { grantConsent(); setChoice("granted"); };
  const reject = () => { denyConsent(); setChoice("denied"); };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-[420px]"
      role="dialog" aria-label="Persetujuan pelacakan" data-testid="consent-banner">
      <div className="rounded-2xl border border-[#e3e6ee] bg-white p-4 shadow-[0_18px_50px_rgba(16,25,53,0.18)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3a4a8c]">
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-[#101935]">Izinkan pengukuran iklan?</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#5b6478]">
              {status.bannerText || "Kami memakai cookie untuk mengukur efektivitas iklan."}{" "}
              <Link to={status.privacyUrl || "/about"} className="font-semibold text-[#101935] underline">
                Selengkapnya
              </Link>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={accept} data-testid="consent-accept"
                className="rounded-lg bg-[#101935] px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#1c2a52]">
                Izinkan
              </button>
              <button onClick={reject} data-testid="consent-reject"
                className="rounded-lg border border-[#dfe1e8] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#3a3f4a] transition hover:bg-[#f6f7fb]">
                Tolak
              </button>
            </div>
          </div>
          <button onClick={reject} aria-label="Tutup" data-testid="consent-close"
            className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#9aa0ad] transition hover:bg-[#f2f3f7]">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
