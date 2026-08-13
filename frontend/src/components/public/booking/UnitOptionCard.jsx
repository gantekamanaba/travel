import { Users, Check, ArrowRight, Ban, Calendar } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

// UnitOptionCard — satu unit pada hasil pencarian: foto, kapasitas, fitur, dan HARGA TOTAL
// untuk tanggal yang dipilih (bukan "mulai dari"). Angka ini identik dengan yang akan
// tersimpan di pesanan karena keduanya berasal dari mesin harga yang sama di server.
export default function UnitOptionCard({ option, onPick, picked }) {
  const v = option.vehicle || {};
  const q = option.quote || {};
  const img = (v.photos || [])[0];
  return (
    <div data-testid={`booking-unit-${v.id}`}
      className={`overflow-hidden rounded-2xl border bg-card transition ${
        picked ? "border-primary shadow-[var(--shadow-lift)]" : "border-border hover:-translate-y-0.5"}`}>
      <div className="relative h-40 overflow-hidden bg-secondary">
        {img ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${img}')` }} />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            Foto belum tersedia
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full glass-strong px-2.5 py-1 text-[11.5px] font-medium text-foreground">
          <Users size={12} /> {v.capacity} kursi
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-fraunces text-lg leading-tight text-foreground">{v.name}</h3>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{v.type_label}{v.year ? ` · ${v.year}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(v.features || []).slice(0, 4).map((f, i) => (
            <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{f}</span>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Total {q.days > 1 ? `${q.days} hari` : ""}
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums text-foreground" data-testid={`booking-unit-total-${v.id}`}>
                {formatCurrency(q.total)}
              </p>
              {q.dp_amount ? (
                <p className="text-[11.5px] text-muted-foreground tabular-nums">
                  DP {q.dp_percent}% = {formatCurrency(q.dp_amount)}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={() => onPick(option)} data-testid={`booking-pick-${v.id}`}
              className="cta-shine flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:-translate-y-0.5"
              style={{ background: "var(--gradient-cta)" }}>
              {picked ? <Check size={14} /> : null} {picked ? "Dipilih" : "Pilih unit"}
              {!picked ? <ArrowRight size={14} /> : null}
            </button>
          </div>
          {q.surcharge_percent ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
              <Calendar size={11} /> Termasuk surcharge tanggal +{q.surcharge_percent}%
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Unit yang TIDAK tersedia tetap ditampilkan beserta alasannya. Menyembunyikannya membuat
// pengunjung mengira armada kita sedikit; menyebut alasannya justru membangun kepercayaan
// dan mendorong mereka menggeser tanggal alih-alih pergi.
export function UnavailableUnitRow({ item }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-transparent px-4 py-3"
      data-testid={`booking-unit-unavailable-${item.id}`}>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-foreground">{item.name}</p>
        <p className="text-[11.5px] text-muted-foreground">{item.type_label} · {item.capacity} kursi</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11.5px] text-secondary-foreground">
        <Ban size={12} /> {item.reason}
      </span>
    </div>
  );
}
