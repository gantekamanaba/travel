import { MapPin, Navigation2, Play, Flag, CheckCircle2, Camera, Phone, CalendarClock } from "lucide-react";
import { formatDateTime } from "@/utils/formatters";

const STATUS = {
  standby: { label: "Siap", tone: "neutral" },
  assigned: { label: "Ditugaskan", tone: "info" },
  to_pickup: { label: "Menuju Jemput", tone: "warning" },
  on_trip: { label: "Dalam Perjalanan", tone: "info" },
  arrived: { label: "Tiba", tone: "success" },
  completed: { label: "Selesai", tone: "success" },
};

export default function DriverTaskCard({ task, busy, onAck, onStart, onArrived, onComplete, onPod, onNav }) {
  const st = STATUS[task.trip_status] || { label: task.trip_status || "-", tone: "neutral" };
  const tid = task.trip_id;
  const started = ["to_pickup", "on_trip", "arrived"].includes(task.trip_status);
  const canStart = ["standby", "assigned"].includes(task.trip_status);
  const done = task.trip_status === "completed";
  const hasCoords = task.dest_lat != null && task.dest_lng != null;

  return (
    <div className="rounded-[16px] border border-[#EFF0F2] bg-white p-4 shadow-sm" data-testid={`dw-task-${tid}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#1C1C1E]" style={{ fontFamily: "Outfit, sans-serif" }}>{task.code || "Trip"}</span>
            <span className={`status-pill tone-${st.tone}`} data-testid={`dw-status-${tid}`}>{st.label}</span>
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-[#1C1C1E]">{task.customer_name || "-"}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {task.acknowledged ? <span className="status-pill tone-success" data-testid={`dw-badge-ack-${tid}`}>Dikonfirmasi</span> : null}
          {task.arrived ? <span className="status-pill tone-info">Tiba</span> : null}
          {task.has_pod ? <span className="status-pill tone-success" data-testid={`dw-badge-pod-${tid}`}>POD ✓</span> : null}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[12.5px] text-[#3A3A3C]">
        <div className="flex items-center gap-2"><MapPin size={14} className="text-[#007AFF]" /><span>{task.origin || "-"} → <b>{task.destination || "-"}</b></span></div>
        <div className="flex items-center gap-2"><CalendarClock size={14} className="text-[#8E8E93]" /><span className="tabular-nums">{formatDateTime(task.start_datetime)}</span></div>
        {task.customer_phone ? <div className="flex items-center gap-2"><Phone size={14} className="text-[#8E8E93]" /><span className="tabular-nums">{task.customer_phone}</span></div> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!task.acknowledged && !done ? (
          <button className="secondary-button !h-9" disabled={busy} onClick={() => onAck(task)} data-testid={`dw-ack-${tid}`}>
            <CheckCircle2 size={14} /> Konfirmasi Tugas
          </button>
        ) : null}
        <button className="secondary-button !h-9" disabled={!hasCoords} onClick={() => onNav(task)} data-testid={`dw-nav-${tid}`}>
          <Navigation2 size={14} /> Navigasi
        </button>
        {canStart ? (
          <button className="primary-button !h-9" disabled={busy} onClick={() => onStart(task)} data-testid={`dw-start-${tid}`}>
            <Play size={14} /> Mulai
          </button>
        ) : null}
        {started ? (
          <>
            {!task.arrived ? (
              <button className="secondary-button !h-9" disabled={busy} onClick={() => onArrived(task)} data-testid={`dw-arrived-${tid}`}>
                <Flag size={14} /> Tiba di Tujuan
              </button>
            ) : null}
            <button className="secondary-button !h-9" disabled={busy} onClick={() => onPod(task)} data-testid={`dw-pod-${tid}`}>
              <Camera size={14} /> {task.has_pod ? "Lihat / Ubah POD" : "Unggah POD"}
            </button>
            <button className="primary-button !h-9" disabled={busy} onClick={() => onComplete(task)} data-testid={`dw-complete-${tid}`}>
              <CheckCircle2 size={14} /> Selesai
            </button>
          </>
        ) : null}
        {done ? (
          <button className="secondary-button !h-9" disabled={busy} onClick={() => onPod(task)} data-testid={`dw-pod-${tid}`}>
            <Camera size={14} /> {task.has_pod ? "Lihat POD" : "Unggah POD"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
