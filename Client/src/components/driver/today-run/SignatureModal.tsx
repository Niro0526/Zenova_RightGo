"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SignatureIcon, XIcon, CheckIcon, RefreshCwIcon } from "@/components/driver/today-run/icons";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: { name: string; url: string; signerName: string }) => void;
  title?: string;
  outletName?: string;
  defaultSignerName?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  title = "Capture Recipient Signature",
  outletName = "OUT001 / Colpetty Retailer",
  defaultSignerName = "Store Manager",
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);

  // Setup canvas resolution and background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0F172A"; // dark slate ink

    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        initCanvas();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [isOpen, initCanvas]);

  // Coordinate helper using client bounding box
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Pointer event handlers (Universal for Mouse, Touch & Pen)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL("image/png");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    onSave({
      name: `Signature_${signerName.replace(/\s+/g, "_")}_${timestamp}.png`,
      url: dataUrl,
      signerName: signerName.trim() || "Store Manager",
    });
    onClose();
  };

  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        onSave({
          name: file.name,
          url,
          signerName: signerName.trim() || "Store Manager",
        });
        onClose();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden my-auto shrink-0">
        {/* Header (Fixed shrink-0) */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF4ED] border border-[#F97316] flex items-center justify-center text-[#F97316] shrink-0">
              <SignatureIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#202D2D] leading-tight">
                Store Manager Digital Signature
              </h3>
              <p className="text-[11px] sm:text-xs text-[#485563] truncate max-w-[240px] sm:max-w-xs">
                Proof of delivery receipt for {outletName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#485563] flex items-center justify-center border-none cursor-pointer transition-colors"
            aria-label="Close signature pad"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable flex-1) */}
        <div className="p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Signer Name Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signer-name-input"
              className="text-xs font-bold text-[#485563] uppercase tracking-wider"
            >
              Recipient / Store Manager Name
            </label>
            <input
              id="signer-name-input"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. K. Perera (Store Manager)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F9FAFB] text-sm font-semibold text-[#202D2D] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          {/* Interactive Signature Canvas Box */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#485563] uppercase tracking-wider">
                Sign directly on screen
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-semibold text-[#F97316] hover:text-[#ea6c0a] bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                <RefreshCwIcon className="w-3 h-3" />
                <span>Clear Canvas</span>
              </button>
            </div>

            <div className="relative w-full h-44 sm:h-52 bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] rounded-xl overflow-hidden select-none" style={{ touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ touchAction: "none" }}
                className="w-full h-full cursor-crosshair block touch-none"
              />

              {/* Guide Baseline */}
              <div className="absolute left-6 right-6 bottom-8 sm:bottom-10 border-b border-slate-300 pointer-events-none flex items-end justify-between pb-1">
                <span className="text-[11px] font-semibold text-slate-400">✕ Sign above this line</span>
                <span className="text-[10px] text-slate-400">Digital Touch / Mouse Signature</span>
              </div>

              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5">
                  <SignatureIcon className="w-7 h-7 sm:w-8 sm:h-8 opacity-40" />
                  <span className="text-xs font-medium">Use your finger or stylus to sign here</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Fallback */}
          <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
            <span>Need to upload a saved signature file instead?</span>
            <button
              type="button"
              onClick={() => fileFallbackRef.current?.click()}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline bg-transparent border-none cursor-pointer p-0"
            >
              Upload file
            </button>
            <input
              type="file"
              ref={fileFallbackRef}
              accept="image/*"
              onChange={handleFallbackFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer Actions (Sticky bottom / shrink-0) */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#485563] font-bold text-sm cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-signature-modal-button"
            disabled={!hasDrawn}
            onClick={handleSave}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm cursor-pointer transition-all border-none shadow-md flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-4 h-4 text-white" />
            <span>Confirm Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}

