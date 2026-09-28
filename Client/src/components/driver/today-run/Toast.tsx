"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, CheckCircleIcon, XIcon } from "@/components/driver/today-run/icons";

export interface ToastMessage {
  id?: string;
  type: "warning" | "error" | "success" | "info";
  title: string;
  message: string;
  duration?: number;
}

export type ToastState = ToastMessage;

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;

    setProgress(100);
    const duration = toast.duration || 3500;
    const startTime = Date.now();

    const intervalTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPct);
    }, 40);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isWarning = toast.type === "warning";
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-6 right-4 sm:right-6 z-[9999] flex flex-col w-[92vw] max-w-sm bg-white rounded-xl shadow-2xl border border-amber-200 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300"
      style={{
        boxShadow: "0 10px 30px -5px rgba(245, 158, 11, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Toast Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isWarning
              ? "bg-[#FFF4ED] text-[#F59E0B] border border-[#F59E0B]/30"
              : isSuccess
              ? "bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30"
              : "bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30"
          }`}
        >
          {isWarning && <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B]" />}
          {isSuccess && <CheckCircleIcon className="w-5 h-5 text-[#22C55E]" />}
          {isError && <AlertTriangleIcon className="w-5 h-5 text-[#EF4444]" />}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-w-0 pr-1">
          <span className="font-bold text-[14px] text-[#202D2D] leading-tight">
            {toast.title}
          </span>
          <p className="text-[12px] text-[#485563] mt-1 leading-snug">
            {toast.message}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#94A3B8] hover:text-[#202D2D] p-1 rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Toastify-Style Countdown Progress Bar */}
      <div className="w-full h-1 bg-[#F1F5F9] overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${
            isWarning ? "bg-[#F59E0B]" : isSuccess ? "bg-[#22C55E]" : "bg-[#EF4444]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
