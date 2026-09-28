'use client';

import React from 'react';

const InfoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

const PRESSURE_STYLE: Record<string, string> = {
  Normal: 'text-green-600',
  Elevated: 'text-amber-600',
  'High Pressure': 'text-red-600 font-bold',
};

// No Task2A forecasting model exists in this project (data/submission_task2a.csv
// is a blank prediction template, not a completed model output). The numbers
// below are illustrative placeholders only, clearly labeled as such in the UI -
// they are NOT derived from a real forecast and must not be presented as one.
interface IllustrativeWeek {
  week: number;
  label: string;
  totalDemandM3: number;
  chilledDemandM3: number;
  availableCapacityM3: number;
  limitExceeded: boolean;
  poyaDay: boolean;
}

const ILLUSTRATIVE_FORECAST: IllustrativeWeek[] = [
  { week: 1, label: 'Week 1', totalDemandM3: 180, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 2, label: 'Week 2', totalDemandM3: 160, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 3, label: 'Week 3', totalDemandM3: 190, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 4, label: 'Week 4', totalDemandM3: 220, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: true, poyaDay: false },
  { week: 5, label: 'Week 5', totalDemandM3: 175, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 6, label: 'Week 6', totalDemandM3: 185, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 7, label: 'Week 7 (Poya Festival)', totalDemandM3: 240, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: true, poyaDay: true },
  { week: 8, label: 'Week 8', totalDemandM3: 195, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 9, label: 'Week 9', totalDemandM3: 180, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
  { week: 10, label: 'Week 10', totalDemandM3: 170, chilledDemandM3: 0, availableCapacityM3: 200, limitExceeded: false, poyaDay: false },
];

function capacityPressure(w: IllustrativeWeek): 'Normal' | 'Elevated' | 'High Pressure' {
  const ratio = w.totalDemandM3 / w.availableCapacityM3;
  if (ratio > 1) return w.poyaDay ? 'High Pressure' : 'Elevated';
  if (ratio >= 0.9) return 'Elevated';
  return 'Normal';
}

export default function FutureCapacity() {
  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-bold text-[28px] text-[#202D2D] leading-[36px] m-0">Future Capacity</h1>
          <span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#F97316] uppercase">Task 2A</span>
        </div>
        <p className="text-sm text-[#485563] m-0">Task 2A · Peliyagoda Depot only — S1 fleet and orders are Peliyagoda-depot exclusively; there is no other depot/brand selection to make for this scenario.</p>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 p-4 bg-[#EFF6FF] border border-blue-300 rounded-lg">
        <span className="text-blue-500 flex-shrink-0"><InfoIcon /></span>
        <span className="text-sm text-blue-800">No Task2A forecasting model exists in this project (`data/submission_task2a.csv` is a blank template, not a completed prediction). Every number below is an illustrative placeholder, not a real forecast.</span>
      </div>

      {/* Demand vs Capacity Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Demand vs Available Capacity (m³) — illustrative</h2>
          <div className="flex items-center gap-4 text-xs text-[#485563]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 inline-block rounded-sm"></span> Total Demand</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-red-400 inline-block"></span> Available Capacity</span>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-gray-100">
          <div className="flex items-center py-3 gap-4 text-[11px] font-bold text-[#485563] uppercase">
            <span className="w-16 flex-shrink-0">ISO Week</span>
            <span className="flex-1">Demand Horizon</span>
            <span className="w-24 flex-shrink-0 text-right">Total Demand</span>
            <span className="w-40 flex-shrink-0">Alerts</span>
          </div>
          {ILLUSTRATIVE_FORECAST.map(w => {
            const pct = Math.min(100, (w.totalDemandM3 / w.availableCapacityM3) * 100);
            const overCap = w.totalDemandM3 > w.availableCapacityM3;
            return (
              <div key={w.week} className="flex items-center py-4 gap-4">
                <span className="w-16 flex-shrink-0 font-semibold text-sm text-[#202D2D]">Week {w.week}</span>
                <div className="flex-1 relative h-3 bg-gray-100 rounded-full overflow-visible">
                  <div className={`h-full rounded-full ${overCap ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }}></div>
                  <div className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-red-400" style={{ left: '100%' }}></div>
                </div>
                <span className="w-24 flex-shrink-0 text-right font-semibold text-sm text-[#202D2D]">{w.totalDemandM3} m³</span>
                <div className="w-40 flex-shrink-0 flex gap-1.5 flex-wrap">
                  {w.limitExceeded && <span className="py-0.5 px-2 bg-amber-100 text-amber-700 rounded font-bold text-[10px] uppercase">Limit Exceeded</span>}
                  {w.poyaDay && <span className="py-0.5 px-2 bg-blue-100 text-blue-700 rounded font-bold text-[10px] uppercase">Poya Day</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forward Forecast Indicators */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-4 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Forward Forecast Indicators</h2>
            <p className="text-xs text-[#485563] m-0 mt-1">Task 2A forecast period - ISO weeks as specified.</p>
          </div>
          <span className="py-1 px-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded font-semibold text-[11px]">Illustrative forecast - model output pending</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="border-b border-[#CBD5E1]">
              <tr>
                <th className="py-2.5 px-3 font-bold text-[11px] text-[#485563] uppercase">ISO Week</th>
                <th className="py-2.5 px-3 font-bold text-[11px] text-[#485563] uppercase">Total Demand (m³)</th>
                <th className="py-2.5 px-3 font-bold text-[11px] text-[#485563] uppercase">Chilled Demand (m³)</th>
                <th className="py-2.5 px-3 font-bold text-[11px] text-[#485563] uppercase">Available Capacity (m³)</th>
                <th className="py-2.5 px-3 font-bold text-[11px] text-[#485563] uppercase">Capacity Pressure</th>
              </tr>
            </thead>
            <tbody>
              {ILLUSTRATIVE_FORECAST.map(w => {
                const pressure = capacityPressure(w);
                return (
                  <tr key={w.week} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-3 font-semibold text-sm text-[#202D2D]">{w.label}</td>
                    <td className="py-3 px-3 text-sm text-[#485563]">{w.totalDemandM3} m³</td>
                    <td className="py-3 px-3 text-sm text-[#485563]">{w.chilledDemandM3} m³</td>
                    <td className="py-3 px-3 text-sm text-[#485563]">{w.availableCapacityM3} m³</td>
                    <td className={`py-3 px-3 text-sm font-semibold ${PRESSURE_STYLE[pressure]}`}>{pressure}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
