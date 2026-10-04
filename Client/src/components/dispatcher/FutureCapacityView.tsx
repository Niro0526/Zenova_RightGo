'use client';
import React, { useMemo } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';

const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

export default function FutureCapacityView() {
  const { orders, fleetVehicles, isLoading, error } = useDispatcherPlan();

  const byBrand = useMemo(() => {
    const map = new Map<string, { units: number; weight: number; volume: number; chilledVolume: number }>();
    for (const o of orders) {
      const e = map.get(o.brand) ?? { units: 0, weight: 0, volume: 0, chilledVolume: 0 };
      e.units += o.orderUnits;
      e.weight += o.orderWeightKg;
      e.volume += o.orderVolumeM3;
      if (o.tempRequirement === 'chilled') e.chilledVolume += o.orderVolumeM3;
      map.set(o.brand, e);
    }
    return Array.from(map.entries()).map(([brand, v]) => ({ brand, ...v }));
  }, [orders]);

  const totalVolume = byBrand.reduce((s, b) => s + b.volume, 0);
  const totalChilledVolume = byBrand.reduce((s, b) => s + b.chilledVolume, 0);
  const availableFleet = fleetVehicles.filter(v => v.status === 'available');
  const reeferFleet = availableFleet.filter(v => v.temp === 'reefer');
  const totalReeferCapM3 = reeferFleet.reduce((s, v) => s + v.volumeCapM3, 0);

  if (isLoading) {
    return <div className="flex flex-col flex-1 items-center justify-center p-10 text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-bold text-[24px] md:text-[28px] text-[#202D2D] m-0">Future Capacity</h1>
        <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">Current-scenario demand vs. fleet capacity</h2>
      </div>

      {error && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>}

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg">
        <AlertIcon />
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-sm text-amber-800">No demand forecast source is connected</span>
          <span className="text-xs text-amber-700">
            The competition's demand-forecasting model (Task 2A) exists only as an offline notebook under <code>ml/task2_demand_forecasting</code> -
            it is not wired to any backend endpoint, so there is no live week/depot/brand forecast to show. The figures below are the
            <strong> current S1 scenario's real confirmed-order totals and live fleet capacity</strong>, not a prediction of future weeks.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Order Volume</span>
          <div className="text-3xl font-black text-gray-900 mt-2">{totalVolume.toFixed(1)} m³</div>
          <div className="text-xs text-gray-400 mt-2">across {orders.length} confirmed S1 orders</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Chilled Volume Required</span>
          <div className="text-3xl font-black text-gray-900 mt-2">{totalChilledVolume.toFixed(1)} m³</div>
          <div className="text-xs text-gray-400 mt-2">needs a reefer-capable vehicle</div>
        </div>
        <div className={`rounded-[10px] p-5 shadow-sm border ${totalChilledVolume > totalReeferCapM3 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${totalChilledVolume > totalReeferCapM3 ? 'text-red-600' : 'text-gray-500'}`}>Available Reefer Capacity</span>
          <div className={`text-3xl font-black mt-2 ${totalChilledVolume > totalReeferCapM3 ? 'text-red-700' : 'text-gray-900'}`}>{totalReeferCapM3.toFixed(1)} m³</div>
          <div className="text-xs text-gray-400 mt-2">{reeferFleet.length} of {availableFleet.length} available vehicles are reefer-capable</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-sm text-gray-900 m-0">Demand by Brand (current scenario)</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Brand</th>
              <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Units</th>
              <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Weight (kg)</th>
              <th className="py-2.5 px-4 font-bold text-[11px] text-[#485563] uppercase">Volume (m³)</th>
            </tr>
          </thead>
          <tbody>
            {byBrand.map(b => (
              <tr key={b.brand} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 px-4 font-semibold text-sm text-gray-900">{b.brand}</td>
                <td className="py-2.5 px-4 text-sm text-gray-600">{b.units}</td>
                <td className="py-2.5 px-4 text-sm text-gray-600">{b.weight.toFixed(1)}</td>
                <td className="py-2.5 px-4 text-sm text-gray-600">{b.volume.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
