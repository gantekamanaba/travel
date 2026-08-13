import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowRight, Home as HomeIcon } from "lucide-react";

export default function ThankYou() {
  const { state } = useLocation();
  const name = state?.name;
  const isBooking = state?.kind === "booking";
  const code = state?.code;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-5 pt-20" data-testid="thankyou-page">
      <div className="w-full max-w-lg rounded-3xl border border-[#e7e9ef] bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(46,155,87,0.12)]"><CheckCircle2 className="h-9 w-9 text-[#2e9b57]" /></div>
        <h1 className="mt-5 font-display text-3xl text-[#101935]">Terima kasih{name ? `, ${name}` : ""}!</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[#6b7180]">
          {isBooking
            ? "Permintaan pemesanan Anda sudah kami terima. Tim RahazaTrans akan mengonfirmasi ketersediaan unit & harga via WhatsApp dalam waktu singkat."
            : "Permintaan penawaran Anda sudah kami terima. Tim RahazaTrans akan menghubungi Anda via WhatsApp dalam waktu singkat."}
        </p>
        {isBooking && code ? (
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#f3f4f7] px-4 py-2 text-[13px] font-semibold text-[#101935]" data-testid="thankyou-code">
            No. Pesanan: <span className="tabular-nums">{code}</span>
          </div>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-[#101935] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#1c2a52]"><HomeIcon size={16} /> Kembali ke Beranda</Link>
          <Link to="/destinations" className="inline-flex items-center gap-2 rounded-full border border-[#d8dae2] px-5 py-3 text-[14px] font-semibold text-[#101935] hover:bg-[#f3f4f7]">Jelajahi Destinasi <ArrowRight size={15} /></Link>
        </div>
      </div>
    </div>
  );
}
