import { Link } from "react-router-dom";
import { PlaneTakeoff, Clock, ArrowRight, MoveRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import SectionHeading from "@/components/public/SectionHeading";
import Reveal from "@/components/public/Reveal";

// AirportRouteStrip.jsx — rute antar-jemput bandara dengan TARIF FLAT per rute.
// Sumber: `GET /api/public/booking/config` → `routes[]` (tarif diisi pemilik; sistem
// sengaja tidak menebak harga). Tiap kartu menautkan langsung ke wizard dengan layanan
// `airport_transfer` + rute terpilih, jadi pengunjung tidak perlu mencari ulang.
function durationLabel(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} jam${m ? ` ${m} mnt` : ""}` : `${m} mnt`;
}

export default function AirportRouteStrip({ routes, loading, error, limit = 6 }) {
  const rows = (Array.isArray(routes) ? routes : []).slice(0, limit);

  return (
    <section className="section-tint relative overflow-hidden" data-testid="airport-route-strip">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Antar-Jemput Bandara"
          title="Tarif flat, sekali jalan"
          subtitle="Tidak dihitung per hari — satu harga untuk satu rute, sudah termasuk driver."
        />

        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="ars-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" data-testid="ars-skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[13.5px] text-muted-foreground" data-testid="ars-error">
            Gagal memuat daftar rute.
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center" data-testid="ars-empty">
            <p className="text-[14px] text-muted-foreground">Belum ada rute antar-jemput yang dipublikasikan.</p>
            <Link to="/quotation" data-testid="ars-empty-quote" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">
              Tanya rute Anda <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="ars-grid">
            {rows.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.05}>
                <Link
                  to={`/booking?service=airport_transfer&route=${encodeURIComponent(r.id)}`}
                  data-testid={`ars-item-${r.code}`}
                  className="card-premium lift group flex h-full flex-col rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
                    <PlaneTakeoff size={14} /> {r.airport_code || "Transfer"}
                  </div>
                  <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[14.5px] font-semibold text-foreground">
                    {r.from_label} <MoveRight size={15} className="text-muted-foreground" /> {r.to_label}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tarif flat</p>
                      <p className="font-mono text-[17px] font-semibold tabular-nums text-foreground" data-testid={`ars-price-${r.code}`}>
                        {r.from_price ? formatCurrency(r.from_price) : "Hubungi kami"}
                      </p>
                    </div>
                    {durationLabel(r.duration_minutes) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-medium text-secondary-foreground">
                        <Clock size={12} /> {durationLabel(r.duration_minutes)}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
                    Pesan rute ini <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
