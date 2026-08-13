import { useMemo } from "react";
import { CalendarClock, MapPin, Search, Users, Plane, Bus, Loader2 } from "lucide-react";
import SelectField from "@/components/shared/SelectField";
import { formatCurrency } from "@/utils/formatters";
import { SERVICE_DAILY, SERVICE_TRANSFER } from "@/services/bookingApi";

// BookingSearchForm — langkah 1 wizard: pilih layanan + detail perjalanan.
//
// Semua PILIHAN berasal dari `config` (API), bukan daftar di dalam kode. Ini menutup cacat
// lama: formulir publik pernah menawarkan "Alphard" & "Hiace Commuter" yang tidak punya tarif
// maupun unitnya, sehingga harga jatuh diam-diam ke tarif default dan ops tidak bisa memenuhi
// pesanannya.
const ICONS = { [SERVICE_DAILY]: Bus, [SERVICE_TRANSFER]: Plane };

function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultSearchState(config) {
  const start = new Date(Date.now() + Math.max(config?.min_lead_hours || 4, 4) * 3600 * 1000 + 3600 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 2 * 86400 * 1000);
  return {
    service: (config?.services || [{}])[0]?.value || SERVICE_DAILY,
    start: toLocalInput(start),
    end: toLocalInput(end),
    pax: 4,
    vehicle_type: "",
    route_id: (config?.routes || [{}])[0]?.id || "",
    origin: "",
    destination: "",
    pickup_address: "",
  };
}

export default function BookingSearchForm({ config, value, onChange, onSubmit, loading, compact }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const isTransfer = value.service === SERVICE_TRANSFER;
  const services = config?.services || [];

  const typeOptions = useMemo(() => ([
    { value: "", label: "Semua tipe unit" },
    ...(config?.vehicle_types || []).map((t) => ({
      value: t.value,
      label: `${t.label} · s/d ${t.max_capacity} orang · dari ${formatCurrency(t.from_price)}`,
    })),
  ]), [config]);

  const routeOptions = useMemo(() => (config?.routes || []).map((r) => ({
    value: r.id,
    label: `${r.name} · dari ${formatCurrency(r.from_price)}`,
  })), [config]);

  const field = "mt-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3";
  const input = "w-full bg-transparent py-2.5 text-[14px] text-foreground outline-none";
  const label = "text-[12.5px] font-medium text-foreground/80";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} data-testid="booking-search-form"
      className={compact ? "" : "rounded-2xl border border-border bg-card p-5 sm:p-6"}>
      {services.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Jenis layanan">
          {services.map((s) => {
            const Icon = ICONS[s.value] || Bus;
            const active = value.service === s.value;
            return (
              <button key={s.value} type="button" role="tab" aria-selected={active}
                onClick={() => set("service", s.value)}
                data-testid={`booking-service-${s.value}`}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left transition ${
                  active ? "border-transparent text-primary-foreground shadow-[var(--shadow-lift)]"
                    : "border-border bg-card text-foreground hover:-translate-y-0.5"}`}
                style={active ? { background: "var(--gradient-cta)" } : undefined}>
                <Icon size={16} />
                <span>
                  <span className="block text-[13.5px] font-semibold">{s.label}</span>
                  <span className={`block text-[11.5px] ${active ? "opacity-85" : "text-muted-foreground"}`}>
                    {s.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isTransfer ? (
          <div className="sm:col-span-2">
            <label className={label} htmlFor="bk-route">Rute antar-jemput *</label>
            <div className="mt-1">
              <SelectField value={value.route_id} onChange={(v) => set("route_id", v)}
                testId="booking-route" ariaLabel="Rute antar-jemput"
                className="h-[44px] w-full rounded-lg text-[14px] tabular-nums"
                placeholder="Pilih rute" options={routeOptions} />
            </div>
          </div>
        ) : null}

        <div>
          <label className={label}>{isTransfer ? "Waktu penjemputan *" : "Mulai *"}</label>
          <div className={field}>
            <CalendarClock size={15} className="text-muted-foreground" />
            <input type="datetime-local" value={value.start} onChange={(e) => set("start", e.target.value)}
              className={input} data-testid="booking-start" />
          </div>
        </div>

        {isTransfer ? (
          <div>
            <label className={label}>Jumlah penumpang</label>
            <div className={field}>
              <Users size={15} className="text-muted-foreground" />
              <input type="number" min="1" max="60" value={value.pax}
                onChange={(e) => set("pax", e.target.value)} className={input} data-testid="booking-pax" />
            </div>
          </div>
        ) : (
          <div>
            <label className={label}>Selesai *</label>
            <div className={field}>
              <CalendarClock size={15} className="text-muted-foreground" />
              <input type="datetime-local" value={value.end} onChange={(e) => set("end", e.target.value)}
                className={input} data-testid="booking-end" />
            </div>
          </div>
        )}

        {!isTransfer ? (
          <>
            <div>
              <label className={label}>Jumlah penumpang</label>
              <div className={field}>
                <Users size={15} className="text-muted-foreground" />
                <input type="number" min="1" max="60" value={value.pax}
                  onChange={(e) => set("pax", e.target.value)} className={input} data-testid="booking-pax" />
              </div>
            </div>
            <div>
              <label className={label}>Tipe unit (opsional)</label>
              <div className="mt-1">
                <SelectField value={value.vehicle_type} onChange={(v) => set("vehicle_type", v)}
                  testId="booking-vehicle-type" ariaLabel="Tipe unit"
                  className="h-[44px] w-full rounded-lg text-[14px] tabular-nums"
                  placeholder="Semua tipe unit" options={typeOptions} />
              </div>
            </div>
            {!compact ? (
              <>
                <div>
                  <label className={label}>Titik jemput / kota asal</label>
                  <div className={field}>
                    <MapPin size={15} className="text-muted-foreground" />
                    <input value={value.origin} onChange={(e) => set("origin", e.target.value)}
                      placeholder="Bandung" className={input} data-testid="booking-origin" />
                  </div>
                </div>
                <div>
                  <label className={label}>Tujuan</label>
                  <div className={field}>
                    <MapPin size={15} className="text-muted-foreground" />
                    <input value={value.destination} onChange={(e) => set("destination", e.target.value)}
                      placeholder="Bromo, Bali, …" className={input} data-testid="booking-destination" />
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <button type="submit" disabled={loading} data-testid="booking-search-submit"
        className="cta-shine glow-focus mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--gradient-cta)" }}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        Cari unit tersedia
      </button>
      <p className="mt-2.5 text-center text-[11.5px] text-muted-foreground">
        Harga yang tampil sudah final untuk tanggal itu — termasuk driver, tol &amp; parkir.
        {config?.min_lead_hours ? ` Pemesanan online minimal ${config.min_lead_hours} jam sebelum jalan.` : ""}
      </p>
    </form>
  );
}
