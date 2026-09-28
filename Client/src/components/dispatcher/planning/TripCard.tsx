'use client';

import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.round(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function TripCard({
  vehicleId, tripNo, orders, getTripStops, getTripSchedule, getTripDeparture, setTripDeparture, reorderTrip, onReassign, onDefer,
}: {
  vehicleId: string;
  tripNo: 1 | 2;
  orders: ReturnType<typeof useDispatcherPlan>['orders'];
  getTripStops: ReturnType<typeof useDispatcherPlan>['getTripStops'];
  getTripSchedule: ReturnType<typeof useDispatcherPlan>['getTripSchedule'];
  getTripDeparture: ReturnType<typeof useDispatcherPlan>['getTripDeparture'];
  setTripDeparture: ReturnType<typeof useDispatcherPlan>['setTripDeparture'];
  reorderTrip: ReturnType<typeof useDispatcherPlan>['reorderTrip'];
  onReassign: (orderRef: string) => void;
  onDefer: (orderRef: string) => void;
}) {
  const stops = getTripStops(vehicleId, tripNo);
  const schedule = getTripSchedule(vehicleId, tripNo);
  const departure = getTripDeparture(vehicleId, tripNo);
  const ordersByRef = new Map(orders.map((o) => [o.orderRef, o]));
  const allOrderRefs = stops.flatMap((s) => s.orderRefs);
  const allOrders = allOrderRefs.map((r) => ordersByRef.get(r)!);
  const brand = allOrders[0]?.brand;
  const suggestedDefault = brand === 'Fresh' && departure === null ? '03:30' : '';

  function move(index: number, dir: -1 | 1) {
    const newOrder = [...stops.map((s) => s.outletId)];
    const target = index + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderTrip(vehicleId, tripNo, newOrder);
  }

  const totalWeight = allOrders.reduce((s, o) => s + o.orderWeightKg, 0);
  const totalVolume = allOrders.reduce((s, o) => s + o.orderVolumeM3, 0);
  const loadingSequence = [...stops].reverse();

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#202D2D]">Trip {tripNo} · {allOrderRefs.length} order row(s) / {stops.length} physical stop(s)</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Planned departure</label>
          <input
            type="time"
            value={departure ?? ''}
            placeholder={suggestedDefault}
            onChange={(e) => setTripDeparture(vehicleId, tripNo, e.target.value || null)}
            className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500"
          />
          {departure === null && suggestedDefault && (
            <button onClick={() => setTripDeparture(vehicleId, tripNo, suggestedDefault)} className="text-[10px] text-orange-600 hover:underline">use suggested {suggestedDefault}</button>
          )}
          {departure === null && <span className="text-[10px] font-semibold text-amber-600">not set</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span>Weight: {totalWeight.toFixed(1)} kg</span>
        <span>Volume: {totalVolume.toFixed(3)} m³</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase text-gray-400">Delivery sequence (reorderable stops)</span>
        {stops.map((stop, i) => {
          const sch = schedule?.find((s) => s.outletId === stop.outletId);
          return (
            <div key={stop.outletId} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <span className="w-6 text-xs font-semibold text-gray-700">{i + 1}.</span>
              <span className="flex-1 text-xs text-gray-900">{stop.outletId} · {stop.orderRefs.join(', ')}</span>
              {sch && (
                <span className={`text-[10px] ${sch.late || sch.mallWindow?.violated ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                  arrive {formatMin(sch.arrival)}{sch.wait > 0 ? `, wait ${sch.wait}min` : ''}, service {formatMin(sch.serviceStart)}-{formatMin(sch.serviceEnd)}{sch.late ? ' — LATE' : ''}{sch.mallWindow?.violated ? ' — mall window violated' : ''}
                </span>
              )}
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-gray-400">Loading sequence (last delivery loaded first, first delivery loaded last — default; not a physically validated packing plan, no compartment/dimension data exists)</span>
        <span className="text-xs text-gray-600">{loadingSequence.map((s) => s.outletId).join(' → ')}</span>
      </div>

      <div className="flex flex-col gap-1">
        {allOrderRefs.map((ref) => (
          <div key={ref} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{ref} ({ordersByRef.get(ref)?.outletId})</span>
            <div className="flex gap-3">
              <button onClick={() => onReassign(ref)} className="font-semibold text-orange-600 hover:underline">Change vehicle/trip</button>
              <button onClick={() => onDefer(ref)} className="font-semibold text-gray-500 hover:underline">Defer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
