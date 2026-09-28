'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

/** Small click-to-toggle popover for secondary/demo detail that would otherwise sit as an always-visible paragraph. */
export default function InfoPopover({ label = 'Details', children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#202D2D]"
      >
        <Info size={12} /> {label}
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs leading-5 text-[#485563] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
          {children}
        </div>
      )}
    </div>
  );
}
