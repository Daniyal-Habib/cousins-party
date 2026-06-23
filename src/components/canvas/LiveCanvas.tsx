"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ref,
  push,
  onValue,
  off,
  remove,
} from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { NeonButton } from "@/components/theme/NeonButton";
import { cn } from "@/lib/cn";

const COLORS = ["#FF2D7B", "#FF7A3C", "#1FE0D8", "#2BB8FF", "#A855F7", "#FFFFFF", "#000000"];
const SIZES = [3, 6, 12, 22];

/**
 * Full-screen shared drawing canvas backed by Realtime DB.
 * Strokes are written to /canvas/{code}/strokes; every client renders them.
 * Supports pinch-zoom + pan via a CSS transform on the canvas layer.
 */
export function LiveCanvas({ code, enabled }: { code: string; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Map<string, Stroke>>(new Map());
  const drawingRef = useRef<Stroke | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [ready, setReady] = useState(Boolean(rtdb));

  // Zoom/pan viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number; pan: { x: number; y: number } } | null>(null);

  // ---- Subscribe to shared strokes ----
  useEffect(() => {
    if (!rtdb) return;
    const r = ref(rtdb, `canvas/${code}/strokes`);
    const unsub = onValue(r, (snap) => {
      const val = (snap.val() ?? {}) as Record<string, Stroke>;
      strokesRef.current = new Map(Object.entries(val));
      setReady(true);
      redraw();
    });
    return () => off(r, "value", unsub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ---- Resize handling ----
  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Convert a screen point to canvas-space accounting for zoom/pan. */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  const startStroke = useCallback((x: number, y: number) => {
    drawingRef.current = {
      color: eraser ? "#0B0420" : color,
      size: eraser ? size * 3 : size,
      eraser,
      points: [{ x, y }],
    };
  }, [color, size, eraser]);

  const moveStroke = useCallback((x: number, y: number) => {
    const cur = drawingRef.current;
    if (!cur) return;
    cur.points.push({ x, y });
    redrawWith(cur);
    // redrawWith reads only refs — no deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endStroke = useCallback(() => {
    const cur = drawingRef.current;
    drawingRef.current = null;
    if (!cur || cur.points.length === 0) return;
    if (rtdb) push(ref(rtdb, `canvas/${code}/strokes`), cur).catch(console.error);
    redraw();
    // redraw reads only refs — no deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ---- Pointer handlers (single-finger draw) ----
  function onPointerDown(e: React.PointerEvent) {
    // Ignore the non-primary touch (multi-touch handled by pinch logic).
    if (!enabled) return;
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = toCanvas(e.clientX, e.clientY);
    startStroke(x, y);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const { x, y } = toCanvas(e.clientX, e.clientY);
    moveStroke(x, y);
  }
  function onPointerUp() {
    if (drawingRef.current) endStroke();
  }

  // ---- Two-finger pinch-zoom + pan ----
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      drawingRef.current = null; // cancel any in-progress draw
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
        pan: { ...pan },
      };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const scale = dist / pinchRef.current.dist;
      const nextZoom = Math.min(4, Math.max(0.4, pinchRef.current.zoom * scale));
      setZoom(nextZoom);
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  // ---- Drawing ----
  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrapperRef.current!.clientWidth;
    const h = wrapperRef.current!.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokesRef.current.values()) drawStroke(ctx, s);
  }

  function redrawWith(current: Stroke) {
    redraw();
    const ctx = canvasRef.current!.getContext("2d")!;
    drawStroke(ctx, current);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    if (s.points.length === 0) return;
    ctx.globalCompositeOperation = s.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  async function clearCanvas() {
    if (!rtdb) return;
    strokesRef.current.clear();
    await remove(ref(rtdb, `canvas/${code}`));
    redraw();
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Canvas layer (zoom/pan transformed) */}
      <div
        ref={wrapperRef}
        className="relative flex-1 touch-none overflow-hidden bg-vice-midnight/40"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            {rtdb ? "Connecting canvas…" : "Canvas needs Firebase Realtime DB."}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <ZoomBtn onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>＋</ZoomBtn>
        <span className="text-center font-display text-[10px] text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <ZoomBtn onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>－</ZoomBtn>
        <ZoomBtn
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          ⤢
        </ZoomBtn>
      </div>

      {/* Toolbar */}
      {enabled && (
        <div className="space-y-2 border-t border-white/10 bg-vice-night/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setEraser(false);
                }}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition",
                  color === c && !eraser ? "border-white scale-110" : "border-white/20",
                )}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <div className="mx-1 h-6 w-px bg-white/10" />
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 transition",
                  size === s ? "border-neon-teal" : "border-white/20",
                )}
              >
                <span className="rounded-full bg-white" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <NeonButton
              variant={eraser ? "teal" : "ghost"}
              size="sm"
              onClick={() => setEraser((e) => !e)}
              className="flex-1"
            >
              Eraser
            </NeonButton>
            <NeonButton variant="danger" size="sm" onClick={clearCanvas} className="flex-1">
              Clear
            </NeonButton>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-vice-night/80 text-ink backdrop-blur-md active:scale-90"
    >
      {children}
    </button>
  );
}

interface Point { x: number; y: number }
interface Stroke {
  color: string;
  size: number;
  eraser: boolean;
  points: Point[];
}
