'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import Drawer from '@/components/common/Drawer';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import type { S1Order } from '@/types/dispatcher';

export default function OrderDetailsDrawer({ order, open, onClose }: { order: S1Order | null; open: boolean; onClose: () => void }) {
  const { assignments, ledger } = useDispatcherPlan();
  const allocation = order ? assignments[order.orderRef] : undefined;
  const history = order ? ledger.filter((e) => e.orderRef === order.orderRef) : [];

  return (
    <Drawer
      open={open && !!order}
      onClose={onClose}
      title={order ? order.orderRef : 'Order details'}
      subtitle={order ? `${order.outletId} · ${order.district} District` : undefined}
      footer={order && (
        <Link
          href={`/dispatcher/planning?order=${order.orderRef}`}
          className="block w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-white no-underline transition-colors hover:bg-orange-600"
        >
          View in planning
        </Link>
      )}
    >
      {order && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand" value={order.brand} />
            <Field label="Depot" value={order.depot} />
            <Field label="Destination" value={`${order.outletId} · ${order.dockType.replace('_', ' ')}`} />
            <Field label="Temperature" value={order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'} />
            <Field label="Delivery window" value={`${order.windowOpenTime}-${order.windowCloseTime}`} />
            <Field label="Load" value={`${order.orderWeightKg} kg / ${order.orderVolumeM3} m³`} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Constraints</span>
            <div className="flex flex-wrap gap-1.5">
              {order.parkingConstraint === 'van_only' && <Badge tone="orange">Van only</Badge>}
              {order.parkingConstraint === 'mall_dock' && <Badge tone="indigo">{order.mallWindow ?? 'Mall dock'}</Badge>}
              {order.deferredYesterday && <Badge tone="gray">Deferred yesterday</Badge>}
              {order.parkingConstraint === 'normal' && !order.deferredYesterday && <span className="text-xs italic text-gray-400">None</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-gray-400">Current allocation</span>
            {allocation?.decision === 'served' && <span className="text-sm font-semibold text-[#F97316]">Assigned — {allocation.vehicleId} · Trip {allocation.tripNo}</span>}
            {allocation?.decision === 'deferred' && <span className="text-sm font-semibold text-gray-600">Deferred — {allocation.reasonCode}{allocation.reasonNote ? ` (${allocation.reasonNote})` : ''}</span>}
            {(!allocation || allocation.decision === 'unresolved') && <span className="text-sm text-gray-400">Unallocated</span>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">History (this session)</span>
            {history.length === 0 ? (
              <span className="text-xs text-gray-400">No decisions recorded yet.</span>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#202D2D]">
                      <span className="capitalize">{entry.action}</span>
                      <span className="text-gray-400">{entry.time}</span>
                    </div>
                    {entry.reasonNote && <div className="mt-0.5 text-[11px] text-gray-500">{entry.reasonNote}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-100 bg-gray-50 p-2.5">
      <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'orange' | 'indigo' | 'gray'; children: ReactNode }) {
  const cls = tone === 'orange' ? 'bg-[#FFF4ED] text-[#F97316] border-[#F97316]' : tone === 'indigo' ? 'bg-[#EEF2FF] text-[#6366F1] border-[#6366F1]' : 'bg-gray-100 text-gray-500 border-gray-300';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${cls}`}>{children}</span>;
}
