import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, PenTool } from "lucide-react";

interface DigitalSignaturePadProps {
  id: string;
  label: string;
  roleDescription?: string;
  signerName: string;
  value?: string;
  onChange: (base64Signature: string) => void;
  required?: boolean;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  id,
  label,
  signerName,
  value,
  onChange,
  required = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState("#0f172a");
  const [penWidth, setPenWidth] = useState(2.5);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas high-DPI resolution
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    }

    // If pre-existing signature image passed, draw it
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        }
      };
      img.src = value;
    }
  }, [value, penColor, penWidth]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-10), imageData]);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveState();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL("image/png");
    onChange(base64);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    onChange("");
  };

  const undoLast = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
    const base64 = canvas.toDataURL("image/png");
    onChange(base64);
  };

  return (
    <div className="surface-card rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between gap-2.5 overflow-hidden w-full" id={`signature-card-${id}`}>
      <div>
        {/* Header Title (Center-aligned) */}
        <div className="flex items-center justify-center mb-2">
          <h4 className="text-xs sm:text-sm font-bold text-main text-center flex items-center justify-center gap-1.5 leading-snug">
            <PenTool className="w-3.5 h-3.5 accent-color shrink-0" />
            <span>{label}</span>
            {required && <span className="text-rose-500 shrink-0">*</span>}
          </h4>
        </div>

        {/* Canvas container with light background, #e2e8f0 border, radius 8px */}
        <div className="relative border border-[#e2e8f0] rounded-lg overflow-hidden bg-[#ffffff] shadow-inner transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
          <canvas
            ref={canvasRef}
            id={`canvas-${id}`}
            className="w-full h-36 bg-[#ffffff] signature-canvas block cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-slate-500 tracking-wide text-center px-2 select-none">
                Tanda tangani di sini dengan jari/stylus/mouse
              </p>
              <div className="w-44 h-px border-b border-dashed border-slate-300 mt-4 select-none" />
            </div>
          )}
        </div>

        {/* Signer identification display */}
        <div className="mt-2 pt-2 text-center border-t border-subtle">
          <p className="text-xs font-bold text-main tracking-wide uppercase truncate">
            {signerName || "(Nama Belum Diisi)"}
          </p>
        </div>
      </div>

      {/* Signature Toolbar: Responsive flex layout (Left: Tools, Right: Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-2.5 border-t border-subtle w-full select-none">
        {/* Left: Pen Tools (Ink Colors & Thickness) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ink color picker */}
          <div className="flex items-center gap-1">
            {[
              { color: "#0f172a", title: "Hitam Dokumen" },
              { color: "#1e40af", title: "Biru Resmi" },
              { color: "#0284c7", title: "Cyan Digital" }
            ].map(p => (
              <button
                key={p.color}
                type="button"
                onClick={() => setPenColor(p.color)}
                className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                  penColor === p.color
                    ? "ring-2 ring-emerald-500 scale-110 border-white shadow-xs"
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: p.color }}
                title={p.title}
              />
            ))}
          </div>

          {/* Stroke thickness selector */}
          <select
            value={penWidth}
            onChange={e => setPenWidth(Number(e.target.value))}
            className="h-6 text-[10px] px-1.5 rounded-md border border-subtle surface-elevated text-main font-medium focus:outline-none cursor-pointer text-center shadow-2xs"
            title="Ketebalan goresan"
          >
            <option value={1.5} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Tipis</option>
            <option value={2.5} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Sedang</option>
            <option value={4.0} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Tebal</option>
          </select>
        </div>

        {/* Right: Actions (Undo & Clear button, never overlaps) */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={undoLast}
              className="h-6 px-1.5 text-[10px] rounded-md border border-subtle surface-elevated hover:opacity-80 text-muted font-medium flex items-center transition-all cursor-pointer"
              title="Urungkan goresan terakhir"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={clearCanvas}
            id={`btn-clear-${id}`}
            className="h-6 flex items-center justify-center gap-1 px-2.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/60 rounded-md transition-all whitespace-nowrap cursor-pointer shadow-2xs"
            title="Hapus tanda tangan"
          >
            <RotateCcw className="w-2.5 h-2.5 shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
