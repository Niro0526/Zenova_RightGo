'use client';

import PassportChecklist from './PassportChecklist';
import type { PassportResult, S1Order } from '@/types/dispatcher';

/** Order summary + constraint checklist + Assign/Defer actions. Used both inside the desktop Drawer and inline on the mobile Adjust stage. */
export default function OrderDetailContent({
  order, selectedVehicleId, selectedTripNo, passport, onAssign, onDefer,
}: {
  order: S1Order;
  selectedVehicleId: string | null;
  selectedTripNo: 1 | 2;
  passport: PassportResult | null;
  onAssign: () => void;
  onDefer: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-[11px] font-semibold uppercase text-[#F97316]">{order.brand}</span>
        <p className="m-0 mt-1 text-sm font-medium text-[#485563]">{order.dockType.replace('_', ' ')} · {order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient'}</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
          <span className="mb-0.5 text-[10px] font-bold uppercase text-[#64748B]">Weight</span>
          <span className="text-xs font-bold text-[#202D2D] tabular-nums">{order.orderWeightKg} kg</span>
        </div>
        <div className="flex flex-col rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
          <span className="mb-0.5 text-[10px] font-bold uppercase text-[#64748B]">Volume</span>
          <span className="text-xs font-bold text-[#202D2D] tabular-nums">{order.orderVolumeM3} m³</span>
        </div>
        <div className="flex flex-col rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
          <span className="mb-0.5 text-[10px] font-bold uppercase text-[#64748B]">Window</span>
          <span className="text-xs font-bold text-[#202D2D] tabular-nums">{order.windowOpenTime}–{order.windowCloseTime}</span>
        </div>
      </div>

      {passport && selectedVehicleId ? (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Constraint Validation vs {selectedVehicleId} · Trip {selectedTripNo}
          </h3>
          <PassportChecklist rows={passport.results} />
        </div>
      ) : (
        <p className="text-xs text-[#94A3B8] p-3 rounded-lg border border-gray-100 bg-[#FAFAFA]">
          Select a vehicle from the workspace to run checker feasibility rules.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-[#E2E8F0] pt-4">
        <button
          disabled={!passport?.checkerFeasible}
          onClick={onAssign}
          className="h-10 rounded-lg bg-[#F97316] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-[#CBD5E1] shadow-xs"
        >
          {selectedVehicleId
            ? passport?.checkerFeasible
              ? `Confirm Assignment to ${selectedVehicleId} · Trip ${selectedTripNo}`
              : `Incompatible with ${selectedVehicleId}`
            : 'Select a vehicle to assign'}
        </button>
        <button
          onClick={onDefer}
          className="h-10 rounded-lg border border-[#CBD5E1] bg-white px-4 text-xs font-semibold text-[#485563] transition-colors hover:bg-[#F8FAFC]"
        >
          Defer Order with Reason
        </button>
      </div>
    </div>
  );
}
