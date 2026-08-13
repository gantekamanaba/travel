import { useEffect, useRef, useState } from "react";
import { Loader2, Compass } from "lucide-react";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";

// PhotoSphereTour.jsx — tur kabin 360° multi-scene (depan/tengah/belakang).
// Lazy-loaded oleh FleetDetail (React.lazy). Reduced-motion: tanpa auto-rotate.
// scenes=[{id,label,panorama,thumbnail,links:[{nodeId,yaw,pitch}]}].
export default function PhotoSphereTour({ scenes = [], className = "" }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [currentId, setCurrentId] = useState(scenes[0]?.id);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !scenes.length) return undefined;
    let viewer;
    let cancelled = false;
    const nodes = scenes.map((s) => ({
      id: s.id,
      panorama: s.panorama,
      thumbnail: s.thumbnail || s.panorama,
      name: s.label,
      links: (s.links || []).map((l) => ({
        nodeId: l.nodeId,
        position: { yaw: `${l.yaw || 0}deg`, pitch: `${l.pitch || 0}deg` },
      })),
    }));
    // Tunda 1 tick: hindari race "destroy saat load" di React StrictMode (dev double-mount).
    const timer = setTimeout(() => {
      if (cancelled || !containerRef.current) return;
      try {
        viewer = new Viewer({
          container: containerRef.current,
          loadingTxt: "Memuat 360°…",
          navbar: ["zoom", "fullscreen"],
          plugins: [[VirtualTourPlugin, { positionMode: "manual", renderMode: "3d" }]],
        });
        viewerRef.current = viewer;
        const vt = viewer.getPlugin(VirtualTourPlugin);
        vt.addEventListener("node-changed", (e) => setCurrentId(e?.node?.id));
        viewer.addEventListener("ready", () => setLoading(false), { once: true });
        viewer.addEventListener("panorama-error", () => { setFailed(true); setLoading(false); });
        vt.setNodes(nodes, scenes[0].id);
      } catch (err) {
        setFailed(true);
        setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      try { viewer?.destroy(); } catch (e) { /* noop */ }
      viewerRef.current = null;
    };
  }, [scenes]);

  const goto = (id) => {
    try {
      viewerRef.current?.getPlugin(VirtualTourPlugin)?.setCurrentNode(id);
    } catch (e) { /* noop */ }
  };

  if (!scenes.length) return null;

  return (
    <div className={className} data-testid="photo-sphere-tour">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-primary">
        <div ref={containerRef} className="h-[360px] w-full sm:h-[480px]" />
        {loading && !failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/80 text-primary-foreground" data-testid="tour-loading">
            <Loader2 className="mr-2 animate-spin" size={18} /> Memuat 360°…
          </div>
        ) : null}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary text-primary-foreground" data-testid="tour-error">
            <Compass size={26} className="opacity-70" />
            <p className="text-[13px] opacity-80">Pratinjau 360° belum dapat dimuat.</p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" data-testid="tour-scene-tabs">
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goto(s.id)}
            data-testid={`tour-scene-${s.id}`}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12.5px] font-medium transition ${currentId === s.id ? "border-ring bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            <span className="h-8 w-12 rounded-md bg-muted bg-cover bg-center" style={s.thumbnail ? { backgroundImage: `url('${s.thumbnail}')` } : undefined} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
