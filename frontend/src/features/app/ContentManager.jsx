import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MapPin, Package, Newspaper, Quote, Tag, Plus, Pencil, Trash2, ShieldAlert, Palette,
  Copy, Eye, Search, ArrowUpDown, CheckCircle2, XCircle, ChevronDown,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/DataStates";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentFormDialog from "@/components/app/ContentFormDialog";
import ThemeManagerPanel from "@/components/cms/ThemeManagerPanel";
import { formatCurrency } from "@/utils/formatters";

// SEO field group (G6 + CMS-02) — dipakai destinations/packages/articles/promos.
const SEO_FIELDS = [
  { k: "meta_title", label: "SEO — Meta Title", type: "text", section: "seo", hint: "Judul di hasil pencarian (≤60 karakter)" },
  { k: "meta_description", label: "SEO — Meta Description", type: "textarea", section: "seo", hint: "Ringkasan (≤160 karakter)" },
  { k: "og_image", label: "SEO — OG Image (share sosmed)", type: "image", section: "seo" },
  { k: "canonical", label: "SEO — URL Kanonik (opsional)", type: "text", section: "seo", hint: "Kosongkan bila memakai URL default" },
];

// Konfigurasi field per resource (SSOT form CMS).
export const SCHEMAS = {
  destinations: {
    label: "Destinasi", title: (d) => d.name, sub: (d) => String(d.region || "-").replace(/_/g, " "),
    publicPath: "/destinasi/", publicSlugField: "slug",
    fields: [
      { k: "name", label: "Nama", type: "text", req: true },
      { k: "slug", label: "Slug (URL)", type: "text", req: true },
      { k: "region", label: "Region", type: "select", options: [["bali", "Bali"], ["jawa_timur", "Jawa Timur"], ["jawa_tengah", "Jawa Tengah"], ["jawa_barat", "Jawa Barat"], ["yogyakarta", "Yogyakarta"]] },
      { k: "hero_image", label: "Gambar Hero", type: "image" },
      { k: "intro", label: "Intro (kalimat pembuka)", type: "textarea" },
      { k: "description", label: "Deskripsi", type: "textarea" },
      { k: "highlights", label: "Highlight (JSON: title + desc)", type: "json", hint: '[{"title":"Pura & Budaya","desc":"Tanah Lot, Uluwatu..."}]' },
      { k: "best_time", label: "Waktu Terbaik Berkunjung", type: "text" },
      { k: "gallery", label: "Galeri Foto", type: "gallery", galleryMode: "urls" },
      { k: "tour_scenes", label: "Tur 360°", type: "tour" },
      { k: "hotel_recommendations", label: "Rekomendasi Hotel (JSON array)", type: "json", hint: '[{"name":"Hotel","rating":4.5,"price_range":"Rp 1jt"}]' },
      // G4: expose field backend yang belum ada di FE sebelumnya
      { k: "route_points", label: "Rute Perjalanan (JSON array titik)", type: "json", hint: '[{"name":"Bandung","lat":-6.9,"lng":107.6}]' },
      { k: "faqs", label: "FAQ (JSON array q&a)", type: "json", hint: '[{"q":"Apakah aman?","a":"Ya, ..."}]' },
      { k: "position", label: "Urutan tampil (kecil dulu)", type: "number" },
      { k: "popular", label: "Populer", type: "bool" },
      ...SEO_FIELDS,
    ],
  },
  packages: {
    label: "Paket", title: (d) => d.name, sub: (d) => d.destination || "-",
    publicPath: "/paket/", publicSlugField: "slug",
    fields: [
      { k: "name", label: "Nama Paket", type: "text", req: true },
      { k: "slug", label: "Slug (URL)", type: "text", req: true },
      { k: "destination", label: "Destinasi", type: "text" },
      { k: "description", label: "Deskripsi", type: "textarea" },
      { k: "days", label: "Durasi (hari)", type: "number" },
      { k: "price_from", label: "Harga Mulai (Rp)", type: "number" },
      { k: "includes", label: "Termasuk (1 item per baris)", type: "list" },
      { k: "image_url", label: "Gambar (URL)", type: "text" },
      { k: "position", label: "Urutan tampil", type: "number" },
      { k: "active", label: "Aktif (tampil di web)", type: "bool" },
      ...SEO_FIELDS,
    ],
  },
  articles: {
    label: "Artikel", title: (d) => d.title, sub: (d) => `${d.category || "Tips"} · ${d.author || "-"}`,
    publicPath: "/blog/", publicSlugField: "slug",
    fields: [
      { k: "title", label: "Judul", type: "text", req: true },
      { k: "slug", label: "Slug (URL)", type: "text", req: true },
      { k: "category", label: "Kategori", type: "select", options: [["Tips", "Tips"], ["Itinerary", "Itinerary"], ["Korporat", "Korporat"], ["Destinasi", "Destinasi"]] },
      { k: "excerpt", label: "Ringkasan", type: "textarea" },
      { k: "cover_image", label: "Gambar Sampul", type: "image" },
      { k: "body", label: "Isi Artikel (pisah paragraf dgn baris kosong)", type: "textarea" },
      { k: "author", label: "Penulis", type: "text" },
      { k: "read_minutes", label: "Waktu Baca (menit)", type: "number" },
      { k: "tags", label: "Tag (pisah koma)", type: "tags" },
      { k: "position", label: "Urutan tampil", type: "number" },
      { k: "featured", label: "Sorotan (tampil besar di Blog)", type: "bool" },
      { k: "published", label: "Terbit", type: "bool" },
      ...SEO_FIELDS,
    ],
  },
  testimonials: {
    label: "Testimoni", title: (d) => d.name, sub: (d) => d.role || "-",
    fields: [
      { k: "name", label: "Nama", type: "text", req: true },
      { k: "role", label: "Peran / Jabatan", type: "text" },
      { k: "quote", label: "Kutipan", type: "textarea", req: true },
      { k: "rating", label: "Rating (1-5)", type: "number" },
      { k: "avatar", label: "Avatar (URL/upload)", type: "image" },
      { k: "position", label: "Urutan tampil", type: "number" },
      { k: "approved", label: "Disetujui (tampil di publik)", type: "bool" },
    ],
  },
  promos: {
    label: "Promo", title: (d) => d.title || d.code, sub: (d) => d.code,
    fields: [
      { k: "code", label: "Kode Promo", type: "text", req: true },
      { k: "title", label: "Judul", type: "text" },
      { k: "description", label: "Deskripsi", type: "textarea" },
      { k: "discount_type", label: "Tipe Diskon", type: "select", options: [["percent", "Persen (%)"], ["amount", "Nominal (Rp)"]] },
      { k: "discount_value", label: "Nilai Diskon", type: "number" },
      { k: "valid_until", label: "Berlaku Sampai", type: "date" },
      { k: "position", label: "Urutan tampil", type: "number" },
      { k: "active", label: "Aktif", type: "bool" },
      ...SEO_FIELDS,
    ],
  },
};

const TABS = [
  ["destinations", "Destinasi", MapPin],
  ["packages", "Paket", Package],
  ["articles", "Artikel", Newspaper],
  ["testimonials", "Testimoni", Quote],
  ["promos", "Promo", Tag],
  ["theme", "Tema Situs", Palette],
];

// Halaman Light CMS (B3 + G1-G10) — kelola seluruh konten website dari satu tempat.
export default function ContentManager() {
  const [tab, setTab] = useState("destinations");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [denied, setDenied] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");  // G5: search bar
  // CMS-D3: paginasi (limit + offset + total via X-Total-Count header).
  const PAGE_SIZE = 50;
  const [total, setTotal] = useState(0);

  const isTheme = tab === "theme";
  const schema = SCHEMAS[tab];

  // CMS-D3: reset ke halaman pertama; utk "Muat Lebih Banyak" gunakan loadMore().
  const load = useCallback(() => {
    if (tab === "theme") { setLoading(false); return; }
    setLoading(true);
    const qs = new URLSearchParams();
    if (query.trim()) qs.set("q", query.trim());
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", "0");
    apiClient.get(`/content/${tab}?${qs.toString()}`)
      .then((r) => {
        setRows(Array.isArray(r.data) ? r.data : []);
        const t = Number(r.headers?.["x-total-count"] ?? r.headers?.["X-Total-Count"] ?? 0);
        setTotal(Number.isFinite(t) ? t : 0);
        setError(null);
        setDenied(false);
      })
      .catch((e) => { if (e?.response?.status === 403) setDenied(true); else setError("Gagal memuat konten"); })
      .finally(() => setLoading(false));
  }, [tab, query]);

  const loadMore = useCallback(() => {
    if (loadingMore || rows.length >= total) return;
    setLoadingMore(true);
    const qs = new URLSearchParams();
    if (query.trim()) qs.set("q", query.trim());
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(rows.length));
    apiClient.get(`/content/${tab}?${qs.toString()}`)
      .then((r) => {
        const more = Array.isArray(r.data) ? r.data : [];
        setRows((prev) => [...prev, ...more]);
        const t = Number(r.headers?.["x-total-count"] ?? r.headers?.["X-Total-Count"] ?? 0);
        if (Number.isFinite(t)) setTotal(t);
      })
      .catch(() => toast.error("Gagal memuat halaman berikutnya"))
      .finally(() => setLoadingMore(false));
  }, [tab, query, rows.length, total, loadingMore]);

  // Debounce search: reload 350ms setelah user berhenti mengetik.
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  const onAdd = () => { setEditItem(null); setFormOpen(true); };
  const onEdit = (item) => { setEditItem(item); setFormOpen(true); };
  const confirmDelete = async () => {
    if (!delItem) return;
    setBusy(true);
    try { await apiClient.delete(`/content/${tab}/${delItem.id}`); toast.success("Konten dihapus"); setDelItem(null); load(); }
    catch { toast.error("Gagal menghapus"); }
    finally { setBusy(false); }
  };

  // G8: duplicate konten
  const onDuplicate = async (item) => {
    try {
      const { data } = await apiClient.post(`/content/${tab}/${item.id}/duplicate`);
      toast.success(`Duplikat dibuat: ${schema.title(data) || data.id}`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menduplikasi"); }
  };

  // G7: preview publik — buka di tab baru
  const onPreview = (item) => {
    if (!schema.publicPath) return;
    const slug = item[schema.publicSlugField];
    if (!slug) { toast.message("Item belum punya slug — simpan dulu"); return; }
    window.open(`${schema.publicPath}${slug}`, "_blank", "noopener");
  };

  // Reorder via manual position input di list (inline update `position` field)
  const [editPosId, setEditPosId] = useState(null);
  const [editPosVal, setEditPosVal] = useState("");
  const savePosition = async (item) => {
    const p = Number(editPosVal);
    if (Number.isNaN(p)) { setEditPosId(null); return; }
    try {
      await apiClient.put(`/content/${tab}/${item.id}`, { position: p });
      toast.success("Urutan diperbarui"); setEditPosId(null); load();
    } catch { toast.error("Gagal menyimpan urutan"); }
  };

  const addBtn = (
    <button className="primary-button" onClick={onAdd} data-testid="content-add"><Plus size={14} /> Tambah {schema?.label}</button>
  );

  const statusPill = (it) => {
    // testimonials pakai `approved`; promos/packages pakai `active`; articles pakai `published`
    if ("approved" in it) return { label: it.approved ? "Disetujui" : "Menunggu", tone: it.approved ? "tone-success" : "tone-warning" };
    if ("active" in it) return { label: it.active ? "Aktif" : "Nonaktif", tone: it.active ? "tone-success" : "tone-neutral" };
    if ("published" in it) return { label: it.published ? "Terbit" : "Draft", tone: it.published ? "tone-success" : "tone-neutral" };
    return null;
  };

  if (denied) {
    return (
      <div className="flex flex-col items-center rounded-[14px] border border-[#FFE0DC] bg-[#FFF5F4] px-6 py-16 text-center" data-testid="content-denied">
        <ShieldAlert size={28} className="mb-3 text-[#FF3B30]" />
        <h3 className="text-base font-bold text-[#1C1C1E]">Akses terbatas</h3>
        <p className="mt-1 max-w-sm text-sm text-[#6B6B73]">Konten Web hanya dapat dikelola oleh Pemilik & Admin Operasional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="content-page">
      <div className="tab-bar">
        {TABS.map(([k, l, Icon]) => (
          <button key={k} className={`tab-button ${tab === k ? "active" : ""}`} onClick={() => { setTab(k); setQuery(""); }} data-testid={`content-tab-${k}`}>
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>

      {isTheme ? <ThemeManagerPanel /> : (<>
      {/* G5: search bar + Tambah + info total (CMS-D3) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8A8F]" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${schema.label.toLowerCase()}…`} className="pl-8" data-testid="content-search" />
          </div>
          {!loading && total > 0 ? (
            <span className="text-[12px] text-[#6B6B73] tabular-nums" data-testid="content-count">
              Menampilkan <span className="font-semibold text-[#1C1C1E]">{rows.length}</span> dari <span className="font-semibold text-[#1C1C1E]">{total}</span>
            </span>
          ) : null}
        </div>
        {addBtn}
      </div>

      {loading ? <LoadingState testId="content-loading" />
        : error ? <ErrorState message={error} onRetry={load} />
        : rows.length === 0 ? <EmptyState title={query ? `Tidak ada hasil untuk "${query}"` : `Belum ada ${schema.label.toLowerCase()}`} description={query ? "Ubah kata kunci atau tekan Tambah." : "Tambahkan konten untuk ditampilkan di website."} testId="content-empty" action={addBtn} />
        : (
          <section className="section-card">
            <div className="divide-y divide-[#F2F2F5]" data-testid="content-list">
              {rows.map((it) => {
                const pill = statusPill(it);
                return (
                <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid={`content-item-${it.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13px] font-bold text-[#1C1C1E]">
                      {schema.title(it) || "(tanpa judul)"}
                      {pill ? <span className={`status-pill ${pill.tone}`}>{pill.tone === "tone-success" ? <CheckCircle2 size={10} /> : pill.tone === "tone-warning" ? <ArrowUpDown size={10} /> : <XCircle size={10} />} {pill.label}</span> : null}
                      {typeof it.position === "number" && it.position !== 0 ? <span className="rounded bg-[#F2F2F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B6B73]">#{it.position}</span> : null}
                    </p>
                    <p className="truncate text-[11.5px] tabular-nums text-[#6B6B73]">
                      {schema.sub(it)}{typeof it.price_from === "number" ? ` · mulai ${formatCurrency(it.price_from)}` : ""}{typeof it.discount_value === "number" ? ` · ${it.discount_type === "percent" ? `${it.discount_value}%` : formatCurrency(it.discount_value)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {/* Inline edit position (G10) */}
                    {editPosId === it.id ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={editPosVal} onChange={(e) => setEditPosVal(e.target.value)} className="h-8 w-16" data-testid={`content-pos-input-${it.id}`} />
                        <button className="icon-button !h-8 !w-8 !text-[#34C759]" onClick={() => savePosition(it)} title="Simpan urutan" data-testid={`content-pos-save-${it.id}`}><CheckCircle2 size={14} /></button>
                        <button className="icon-button !h-8 !w-8" onClick={() => setEditPosId(null)} title="Batal"><XCircle size={14} /></button>
                      </div>
                    ) : (
                      <button className="icon-button !h-8 !w-8" title="Urutan tampil" onClick={() => { setEditPosId(it.id); setEditPosVal(String(it.position ?? "")); }} data-testid={`content-pos-${it.id}`}><ArrowUpDown size={13} /></button>
                    )}
                    {schema.publicPath ? (
                      <button className="icon-button !h-8 !w-8" title="Pratinjau di web" onClick={() => onPreview(it)} data-testid={`content-preview-${it.id}`}><Eye size={13} /></button>
                    ) : null}
                    <button className="icon-button !h-8 !w-8" title="Duplikat" onClick={() => onDuplicate(it)} data-testid={`content-duplicate-${it.id}`}><Copy size={13} /></button>
                    <button className="icon-button !h-8 !w-8" title="Edit" onClick={() => onEdit(it)} data-testid={`content-edit-${it.id}`}><Pencil size={13} /></button>
                    <button className="icon-button !h-8 !w-8 !text-[#A8221A]" title="Hapus" onClick={() => setDelItem(it)} data-testid={`content-delete-${it.id}`}><Trash2 size={13} /></button>
                  </div>
                </div>
              );})}
            </div>
            {/* CMS-D3: tombol Muat Lebih Banyak — muncul bila masih ada data */}
            {rows.length < total ? (
              <div className="flex items-center justify-center border-t border-[#F2F2F5] py-3">
                <button
                  className="secondary-button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-testid="content-load-more"
                >
                  {loadingMore ? "Memuat…" : (<><ChevronDown size={14} /> Muat lebih banyak ({total - rows.length} tersisa)</>)}
                </button>
              </div>
            ) : null}
          </section>
        )}

      <ContentFormDialog resource={tab} schema={schema} item={editItem} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <ConfirmDialog open={Boolean(delItem)} onOpenChange={(v) => !v && setDelItem(null)} busy={busy}
        title={`Hapus ${schema?.label?.toLowerCase()}?`} description="Tindakan ini tidak dapat dibatalkan."
        onConfirm={confirmDelete} testId="content-confirm-delete" />
      </>)}
    </div>
  );
}
