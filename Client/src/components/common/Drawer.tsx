'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared right-side slide-over. Stays mounted while closed (translate-x-full,
 * pointer-events-none) so open/close animates instead of popping instantly.
 */
export default function Drawer({ open, title, subtitle, onClose, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('button, [tabindex]')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[9000] flex justify-end transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      role="presentation"
      onClick={onClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-slate-900/50" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] p-5">
          <div>
            <h2 className="m-0 text-[16px] font-bold text-[#202D2D]">{title}</h2>
            {subtitle && <p className="m-0 mt-1 text-xs text-[#485563]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-1 rounded p-1 text-[#64748B] hover:text-[#202D2D]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">{footer}</div>}
      </div>
    </div>
  );
}
