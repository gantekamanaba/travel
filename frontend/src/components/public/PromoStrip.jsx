import { Link } from "react-router-dom";
import { Ticket, CalendarClock, ArrowRight, ShieldCheck } from "lucide-react";
import { useResource } from "@/hooks/useResource";
import { formatCurrency, formatDate } from "@/utils/formatters";
import SectionHeading from "@/components/public/SectionHeading";
import Reveal from "@/components/public/Reveal";

// PromoStrip.jsx — promo AKTIF dari `GET /api/public/promos`.
//
// Catatan penting soal kejujuran angka: kartu di sini hanya MENAMPILKAN syarat promo.
// Kelayakan & potongan finalnya tetap dihitung server saat memesan (lihat
// `POST /api/public/booking/promos` + guardrail INV-PRICE-01), jadi tidak ada janji
// diskon yang tidak bisa ditepati sistem.
function discountLabel(p) {
  if (p.discount_type === "percent") return `${p.discount_value}%`;
  return formatCurrency(p.discount_value);
}

export default function PromoStrip({ dpPercent, eyebrow = "Promo", title = "Promo yang sedang berjalan", subtitle = "Kode di bawah bisa dipakai saat memesan online — potongannya dihitung ulang oleh sistem." }) {
  const { data, loading, error } = useResource("/public/promos");
  const rows = (Array.isArray(data) ? data : []).slice(0, 4);

  return (
    <section className="relative overflow-hidden" data-testid="promo-strip">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="promo-loading">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" data-testid="promo-skeleton" />
            ))}
          </div>
        ) : error || rows.length === 0 ? (
          /* EMPTY STATE yang tetap menjual: bila tidak ada promo, yang ditonjolkan adalah
             kebijakan NYATA (DP kecil + harga transparan), bukan diskon yang tidak ada. */
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-8 sm:flex-row sm:items-center sm:justify-between" data-testid="promo-empty">
            <div className="flex items-start gap-3">
              <span className="icon-chip h-11 w-11 shrink-0"><ShieldCheck size={18} /></span>
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">Tidak ada promo aktif saat ini</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Harga tetap transparan: cukup DP {dpPercent || 30}% untuk mengamankan jadwal, tanpa biaya tersembunyi.
                </p>
              </div>
            </div>
            <Link to="/booking" data-testid="promo-empty-cta" className="cta-shine inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-primary-foreground" style={{ background: "var(--gradient-cta)" }}>
              Pesan Online <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="promo-grid">
            {rows.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <div className="card-premium lift flex h-full flex-col rounded-2xl p-6" data-testid={`promo-item-${p.code}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="icon-chip h-11 w-11 shrink-0"><Ticket size={18} strokeWidth={1.8} /></span>
                    <span className="rounded-lg border border-dashed border-primary/40 bg-secondary px-3 py-1.5 font-mono text-[13px] font-bold tabular-nums text-foreground" data-testid={`promo-code-${p.code}`}>
                      {p.code}
                    </span>
                  </div>
                  <h3 className="mt-4 font-fraunces text-xl text-foreground">{p.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-medium">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-mono tabular-nums text-secondary-foreground">Potongan {discountLabel(p)}</span>
                    {p.min_days > 1 ? <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">Min. {p.min_days} hari</span> : null}
                    {p.weekend_only ? <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">Akhir pekan</span> : null}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <CalendarClock size={13} /> Sampai {formatDate(p.valid_until)}
                    </span>
                    <Link to="/booking" data-testid={`promo-use-${p.code}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                      Pakai kode ini <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
