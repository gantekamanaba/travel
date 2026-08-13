import { User, Phone, Mail, MapPin, MessageSquare, Loader2, ShoppingBag } from "lucide-react";

// BookerForm — data pemesan pada langkah tinjau. Sengaja MINIMAL (nama, WhatsApp, email
// opsional, titik jemput, catatan): setiap kolom tambahan pada formulir checkout menurunkan
// jumlah pesanan yang selesai. Nomor WhatsApp wajib karena seluruh konfirmasi & instruksi
// pembayaran dikirim ke sana, dan menjadi kunci cek pesanan tanpa akun.
export default function BookerForm({ value, onChange, onSubmit, submitting, consent, onConsent,
                                    ctaLabel, note, showPickup = true }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const field = "mt-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3";
  const input = "w-full bg-transparent py-2.5 text-[14px] text-foreground outline-none";
  const label = "text-[12.5px] font-medium text-foreground/80";
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} data-testid="booking-booker-form"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="font-fraunces text-xl text-foreground">Data pemesan</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Nama lengkap *</label>
          <div className={field}>
            <User size={15} className="text-muted-foreground" />
            <input value={value.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Nama / nama instansi" className={input} data-testid="booking-name" />
          </div>
        </div>
        <div>
          <label className={label}>No. WhatsApp *</label>
          <div className={field}>
            <Phone size={15} className="text-muted-foreground" />
            <input value={value.phone} onChange={(e) => set("phone", e.target.value)}
              placeholder="0812xxxxxxx" className={input} data-testid="booking-phone" />
          </div>
        </div>
        <div>
          <label className={label}>Email (opsional)</label>
          <div className={field}>
            <Mail size={15} className="text-muted-foreground" />
            <input type="email" value={value.email} onChange={(e) => set("email", e.target.value)}
              placeholder="email@domain.id" className={input} data-testid="booking-email" />
          </div>
        </div>
        {showPickup ? (
          <div className="sm:col-span-2">
            <label className={label}>Alamat penjemputan</label>
            <div className={field}>
              <MapPin size={15} className="text-muted-foreground" />
              <input value={value.pickup_address} onChange={(e) => set("pickup_address", e.target.value)}
                placeholder="Nama hotel / alamat lengkap titik jemput" className={input}
                data-testid="booking-pickup" />
            </div>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <label className={label}>Catatan untuk tim kami</label>
          <div className="mt-1 flex items-start gap-2 rounded-lg border border-input bg-background px-3">
            <MessageSquare size={15} className="mt-3 text-muted-foreground" />
            <textarea rows={3} value={value.message} onChange={(e) => set("message", e.target.value)}
              placeholder="Itinerary, permintaan khusus, jumlah bagasi…"
              className="w-full resize-none bg-transparent py-2.5 text-[14px] text-foreground outline-none"
              data-testid="booking-message" />
          </div>
        </div>
      </div>

      {/* honeypot: tak terlihat manusia, diisi bot → pesanan diabaikan tanpa pesan error */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, overflow: "hidden" }}>
        <label>Jangan isi kolom ini
          <input type="text" tabIndex={-1} autoComplete="off" value={value.hp}
            onChange={(e) => set("hp", e.target.value)} data-testid="booking-hp" />
        </label>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-secondary p-3 text-[12.5px] text-secondary-foreground"
        data-testid="booking-consent-wrap">
        <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4" data-testid="booking-consent" />
        <span>Saya setuju dihubungi via WhatsApp/email untuk konfirmasi pesanan &amp; informasi promo.</span>
      </label>

      <button type="submit" disabled={submitting} data-testid="booking-submit"
        className="cta-shine glow-focus mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--gradient-cta)" }}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
        {ctaLabel || "Buat pesanan"}
      </button>
      {note ? <p className="mt-2.5 text-center text-[11.5px] text-muted-foreground">{note}</p> : null}
    </form>
  );
}
