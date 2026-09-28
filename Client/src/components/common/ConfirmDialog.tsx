"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Ban, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Extra body content between the message and the action buttons, e.g. a reason select. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-confirmation dialog matching the app's existing cancel-order
 * pattern (red banner header, Escape/backdrop-to-cancel, focus trap on open).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Keep",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/65 p-5 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white text-left shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#FECACA] bg-[#FEF2F2] px-5 py-4">
          <div id="confirm-dialog-title" className="flex items-center gap-2 text-[15px] font-bold text-[#DC2626]">
            <Ban size={18} />
            <span>{title}</span>
          </div>
          <button type="button" onClick={onCancel} className="text-[#991B1B]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-5">
          <p id="confirm-dialog-message" className="m-0 text-[13px] text-[#475569]">{message}</p>
          {children}
          <div className="mt-1.5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-[13px] font-semibold text-[#475569]"
            >
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm} className="btn-danger">
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
