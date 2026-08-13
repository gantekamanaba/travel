import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, ImagePlus, Images } from "lucide-react";
import apiClient from "@/services/apiClient";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GalleryManager from "@/components/cms/GalleryManager";
import TourSceneBuilder from "@/components/cms/TourSceneBuilder";
import LivePreviewPanel from "@/components/cms/LivePreviewPanel";

const ARRAY_TYPES = new Set(["gallery", "tour"]);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Konversi dokumen API -> nilai form (array/json/bool/date dirapikan agar editable).
function toForm(fields, item) {
  const f = {};
  for (const fl of fields) {
    const v = item ? item[fl.k] : undefined;
    if (fl.type === "list") f[fl.k] = Array.isArray(v) ? v.join("\n") : (v || "");
    else if (fl.type === "tags") f[fl.k] = Array.isArray(v) ? v.join(", ") : (v || "");
    else if (fl.type === "json") f[fl.k] = v ? JSON.stringify(v, null, 2) : "";
    else if (fl.type === "bool") f[fl.k] = Boolean(v);
    else if (fl.type === "date") f[fl.k] = v ? String(v).slice(0, 10) : "";
    else if (ARRAY_TYPES.has(fl.type)) f[fl.k] = Array.isArray(v) ? v : [];
    else f[fl.k] = v ?? "";
  }
  return f;
}

// Field image: pilih dari Media Library (unified) ATAU unggah berkas baru.
// Sebelumnya field ini HANYA punya tombol unggah ke `/api/uploads/cms` — artinya gambar yang sudah
// ada di sistem tidak bisa dipakai ulang, dan setiap pemakaian membuat berkas duplikat baru di disk.
// Sekarang tombol "Library" membuka pemilih yang sama dengan editor halaman iklan (folder, pencarian,
// potong gambar, ganti berkas), sementara tombol "Unggah" tetap ada untuk jalur tercepat.
function ImageField({ fieldKey, label, value, onChange, testId }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const openPicker = () => inputRef.current?.click();
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";  // reset agar file yg sama bisa dipilih ulang
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await apiClient.post("/uploads/cms", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url);
      toast.success(`Terunggah (${Math.round(data.size_bytes / 1024)}KB) — tersimpan di Media Library`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengunggah gambar");
    } finally { setBusy(false); }
  };
  // Preview URL: kalau relatif (/api/public/media/… atau /api/uploads/…) prefix dgn backend url.
  const previewSrc = value ? (String(value).startsWith("http") ? value : `${BACKEND_URL}${value}`) : "";
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="URL gambar, pilih dari Library, atau unggah" data-testid={testId} />
        <button type="button" onClick={() => setPickerOpen(true)} className="secondary-button !px-3 shrink-0" data-testid={`${testId}-library`}>
          <Images size={14} />
          <span className="hidden sm:inline">Library</span>
        </button>
        <button type="button" onClick={openPicker} disabled={busy} className="secondary-button !px-3 shrink-0" data-testid={`${testId}-upload`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          <span className="hidden sm:inline">Unggah</span>
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPick} data-testid={`${testId}-file`} />
      </div>
      {previewSrc ? (
        <img src={previewSrc} alt="" className="h-24 w-full rounded-lg border border-border object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-[#E5E5EA] bg-[#F7F8FA] text-[11px] text-[#8A8A8F]">
          <ImagePlus size={16} className="mr-1.5" /> Belum ada gambar
        </div>
      )}
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} pickKind="image"
        title={`Pilih gambar — ${label || fieldKey}`}
        onPick={(asset) => onChange(asset?.url || "")} />
    </div>
  );
}

// Dialog form generik CMS (B3 + P10/FASE 5 + G3/G4/G6 enhancement).
export default function ContentFormDialog({ resource, schema, item, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  useEffect(() => { if (open) setForm(toForm(schema.fields, item)); }, [open, item, schema]);

  const hasPreview = resource === "destinations" || resource === "articles";
  const seoFields = schema.fields.filter((f) => f.section === "seo");
  const mainFields = schema.fields.filter((f) => f.section !== "seo");

  const submit = async () => {
    const payload = {};
    for (const fl of schema.fields) {
      const v = form[fl.k];
      if (fl.req && (v === "" || v === undefined || v === null)) { toast.message(`${fl.label} wajib diisi`); return; }
      if (fl.type === "list") payload[fl.k] = String(v || "").split("\n").map((s) => s.trim()).filter(Boolean);
      else if (fl.type === "tags") payload[fl.k] = String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
      else if (fl.type === "json") {
        try { payload[fl.k] = v ? JSON.parse(v) : []; }
        catch { toast.error(`${fl.label}: format JSON tidak valid`); return; }
      } else if (fl.type === "number") payload[fl.k] = Number(v) || 0;
      else if (fl.type === "bool") payload[fl.k] = Boolean(v);
      else if (ARRAY_TYPES.has(fl.type)) payload[fl.k] = Array.isArray(v) ? v : [];
      else payload[fl.k] = v ?? "";
    }
    setSaving(true);
    try {
      if (item?.id) await apiClient.put(`/content/${resource}/${item.id}`, payload);
      else await apiClient.post(`/content/${resource}`, payload);
      toast.success(item?.id ? "Konten diperbarui" : "Konten ditambahkan");
      onOpenChange(false); onSaved && onSaved();
    } catch (e) {
      const detail = e?.response?.data?.detail || "Gagal menyimpan";
      if (e?.response?.status === 409) toast.error(`Duplikat: ${detail}`);
      else toast.error(detail);
    }
    finally { setSaving(false); }
  };

  const renderField = (fl) => (
    <div key={fl.k} className="space-y-1">
      <Label className="text-[12px]">{fl.label}{fl.req ? " *" : ""}</Label>
      {fl.type === "textarea" || fl.type === "list" || fl.type === "json" ? (
        <Textarea rows={fl.type === "json" ? 4 : 3} value={form[fl.k] || ""} onChange={(e) => set(fl.k, e.target.value)} placeholder={fl.hint || ""} data-testid={`cf-${fl.k}`} />
      ) : fl.type === "bool" ? (
        <div className="pt-1"><Switch checked={Boolean(form[fl.k])} onCheckedChange={(v) => set(fl.k, v)} data-testid={`cf-${fl.k}`} /></div>
      ) : fl.type === "select" ? (
        <Select value={form[fl.k] || ""} onValueChange={(v) => set(fl.k, v)}>
          <SelectTrigger data-testid={`cf-${fl.k}`}><SelectValue placeholder="Pilih…" /></SelectTrigger>
          <SelectContent>{(fl.options || []).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      ) : fl.type === "image" ? (
        <ImageField fieldKey={fl.k} label={fl.label} value={form[fl.k]} onChange={(v) => set(fl.k, v)} testId={`cf-${fl.k}`} />
      ) : fl.type === "gallery" ? (
        <GalleryManager value={form[fl.k] || []} onChange={(arr) => set(fl.k, arr)} mode={fl.galleryMode || "captioned"} />
      ) : fl.type === "tour" ? (
        <TourSceneBuilder value={form[fl.k] || []} onChange={(arr) => set(fl.k, arr)} />
      ) : (
        <Input type={fl.type === "number" ? "number" : fl.type === "date" ? "date" : "text"} value={form[fl.k] ?? ""} onChange={(e) => set(fl.k, e.target.value)} placeholder={fl.hint || ""} data-testid={`cf-${fl.k}`} />
      )}
      {fl.hint && (fl.type === "text" || fl.type === "textarea") ? <p className="text-[10.5px] text-[#8A8A8F]">{fl.hint}</p> : null}
    </div>
  );

  const fieldsBlock = (
    <div className="space-y-3">
      {mainFields.map(renderField)}
      {seoFields.length > 0 ? (
        <details className="rounded-lg border border-[#E5E5EA] bg-[#F7F8FA] px-3 py-2" open={Boolean(form.meta_title || form.meta_description || form.og_image)} data-testid="cf-seo-group">
          <summary className="cursor-pointer text-[12px] font-semibold text-[#1C1C1E]">SEO &amp; Sosial Media (opsional)</summary>
          <div className="mt-2 space-y-3">
            {seoFields.map(renderField)}
          </div>
        </details>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`flex max-h-[92vh] flex-col overflow-hidden ${hasPreview ? "max-w-5xl" : "max-w-2xl"}`} data-testid="content-form-dialog">
        <DialogHeader><DialogTitle>{item?.id ? "Edit" : "Tambah"} {schema.label}</DialogTitle></DialogHeader>
        {hasPreview ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[1.45fr_1fr] lg:overflow-hidden">
            <div className="min-h-0 lg:overflow-y-auto lg:pr-2">{fieldsBlock}</div>
            <div className="min-h-0 lg:overflow-y-auto lg:border-l lg:border-border lg:pl-3">
              <LivePreviewPanel resource={resource} form={form} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">{fieldsBlock}</div>
        )}
        <DialogFooter className="mt-2">
          <button className="secondary-button" onClick={() => onOpenChange(false)} data-testid="cf-cancel">Batal</button>
          <button className="primary-button" onClick={submit} disabled={saving} data-testid="cf-submit">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
