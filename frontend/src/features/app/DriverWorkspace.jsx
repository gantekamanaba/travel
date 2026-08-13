import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Activity, CheckCircle2, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/DataStates";
import { formatQty } from "@/utils/formatters";
import DriverTaskCard from "@/components/app/DriverTaskCard";
import DriverPodDialog from "@/components/app/DriverPodDialog";
import DriverNavDialog from "@/components/app/DriverNavDialog";
import OdometerDialog from "@/components/app/OdometerDialog";

function StatCard({ icon: Icon, label, value, tone = "#007AFF", testId }) {
  return (
    <div className="rounded-[14px] border border-[#EFF0F2] bg-white p-4 shadow-sm" data-testid={testId}>
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6B6B73]">
        <Icon size={14} style={{ color: tone }} /> {label}
      </div>
      <div className="mt-1 text-[24px] font-bold tabular-nums text-[#1C1C1E]" style={{ fontFamily: "Outfit, sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

export default function DriverWorkspace() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [podTask, setPodTask] = useState(null);
  const [navTask, setNavTask] = useState(null);
  const [odo, setOdo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, t] = await Promise.all([
        apiClient.get("/driver/summary"),
        apiClient.get("/driver/tasks"),
      ]);
      setSummary(s.data || null);
      setTasks(Array.isArray(t.data) ? t.data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Gagal memuat ruang kerja driver");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (task, fn, successMsg) => {
    setBusyId(task.trip_id);
    try { await fn(); toast.success(successMsg); await load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Aksi gagal"); }
    finally { setBusyId(null); }
  };

  const onAck = (t) => act(t, () => apiClient.post(`/driver/tasks/${t.trip_id}/ack`), "Tugas dikonfirmasi");
  const onStart = (t) => setOdo({ mode: "start", task: t });
  const onArrived = (t) => act(t, () => apiClient.post(`/driver/tasks/${t.trip_id}/arrived`), "Status tiba terkirim ke pelanggan");
  const onComplete = (t) => setOdo({ mode: "end", task: t });

  const confirmOdo = async (value) => {
    const cur = odo; setOdo(null);
    if (!cur) return;
    if (cur.mode === "start") {
      await act(cur.task, () => apiClient.post("/driver/checkin", { trip_id: cur.task.trip_id, odometer_start: value }), "Perjalanan dimulai");
    } else {
      await act(cur.task, () => apiClient.post("/driver/checkout", { trip_id: cur.task.trip_id, odometer_end: value }), "Trip diselesaikan");
    }
  };

  const notDriver = summary && summary.is_driver === false;

  const cards = useMemo(() => tasks.map((t) => (
    <DriverTaskCard
      key={t.trip_id} task={t} busy={busyId === t.trip_id}
      onAck={onAck} onStart={onStart} onArrived={onArrived} onComplete={onComplete}
      onPod={() => setPodTask(t)} onNav={() => setNavTask(t)}
    />
  )), [tasks, busyId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState testId="driver-workspace-loading" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4" data-testid="driver-workspace-page">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6B6B73]">
          {notDriver ? "Halaman ini untuk akun driver." : `Tugas perjalanan Anda, ${summary?.driver_name || user?.name || ""}.`}
        </p>
        <button className="icon-button !h-9 !w-9" title="Muat ulang" onClick={load} data-testid="dw-refresh"><RefreshCw size={15} /></button>
      </div>

      {summary && summary.is_driver ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="dw-summary">
          <StatCard icon={ClipboardCheck} label="Total Tugas" value={formatQty(summary.total)} testId="dw-stat-total" />
          <StatCard icon={Activity} label="Aktif" value={formatQty(summary.active)} tone="#FF9500" testId="dw-stat-active" />
          <StatCard icon={CheckCircle2} label="Selesai" value={formatQty(summary.completed)} tone="#34C759" testId="dw-stat-completed" />
          <StatCard icon={Camera} label="Perlu POD" value={formatQty(summary.need_pod)} tone="#FF3B30" testId="dw-stat-pod" />
        </div>
      ) : null}

      {notDriver ? (
        <EmptyState title="Akun Anda bukan driver" description="Masuk dengan akun driver untuk melihat dan mengelola tugas perjalanan." testId="dw-not-driver" />
      ) : tasks.length === 0 ? (
        <EmptyState title="Belum ada tugas" description="Tugas perjalanan akan muncul di sini setelah Anda di-assign oleh tim dispatch." testId="dw-empty" />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="dw-tasks">{cards}</div>
      )}

      <DriverPodDialog open={Boolean(podTask)} task={podTask} onOpenChange={(v) => !v && setPodTask(null)} onSaved={load} />
      <DriverNavDialog open={Boolean(navTask)} task={navTask} onOpenChange={(v) => !v && setNavTask(null)} />
      <OdometerDialog open={Boolean(odo)} mode={odo?.mode} task={odo?.task} onOpenChange={(v) => !v && setOdo(null)} onConfirm={confirmOdo} />
    </div>
  );
}
