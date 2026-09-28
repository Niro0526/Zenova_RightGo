'use client';

import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, AlertCircle, BarChart3 } from 'lucide-react';

interface IllustrativeWeek {
  week: number;
  label: string;
  totalDemandM3: number;
  chilledDemandM3: number;
  availableCapacityM3: number;
  poyaDay: boolean;
}

const ILLUSTRATIVE_FORECAST: IllustrativeWeek[] = [
  { week: 1, label: 'Week 1 (Illustrative)', totalDemandM3: 180, chilledDemandM3: 42, availableCapacityM3: 200, poyaDay: false },
  { week: 2, label: 'Week 2 (Illustrative)', totalDemandM3: 160, chilledDemandM3: 38, availableCapacityM3: 200, poyaDay: false },
  { week: 3, label: 'Week 3 (Illustrative)', totalDemandM3: 190, chilledDemandM3: 45, availableCapacityM3: 200, poyaDay: false },
  { week: 4, label: 'Week 4 (Illustrative)', totalDemandM3: 220, chilledDemandM3: 56, availableCapacityM3: 200, poyaDay: false },
  { week: 5, label: 'Week 5 (Illustrative)', totalDemandM3: 175, chilledDemandM3: 40, availableCapacityM3: 200, poyaDay: false },
  { week: 6, label: 'Week 6 (Illustrative)', totalDemandM3: 185, chilledDemandM3: 44, availableCapacityM3: 200, poyaDay: false },
  { week: 7, label: 'Week 7 (Poya Festival)', totalDemandM3: 240, chilledDemandM3: 65, availableCapacityM3: 200, poyaDay: true },
  { week: 8, label: 'Week 8 (Illustrative)', totalDemandM3: 195, chilledDemandM3: 48, availableCapacityM3: 200, poyaDay: false },
  { week: 9, label: 'Week 9 (Illustrative)', totalDemandM3: 180, chilledDemandM3: 41, availableCapacityM3: 200, poyaDay: false },
  { week: 10, label: 'Week 10 (Illustrative)', totalDemandM3: 170, chilledDemandM3: 39, availableCapacityM3: 200, poyaDay: false },
];

// Scale max chosen above maximum displayed demand (240 m³) so bars never clip or cap at capacity
const MAX_CHART_SCALE_M3 = 280;

export default function FutureCapacity() {
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Capacity boundary position inside chart
  const capacityPct = (200 / MAX_CHART_SCALE_M3) * 100; // ~71.4%

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 gap-5 w-full max-w-[1200px] mx-auto bg-[#F9FAFB]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#202D2D] m-0 tracking-tight">Capacity</h1>
            <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              Illustrative forecast
            </span>
          </div>
          <p className="text-sm text-[#64748B] m-0 mt-0.5">
            Depot fleet volume vs forecasted weekly order demand · Peliyagoda
          </p>
        </div>
      </div>

      {/* Short visible disclosure with expandable assumptions */}
      <div className="rounded-xl border border-blue-200 bg-[#EFF6FF] p-3 text-xs text-blue-900 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Info size={15} className="text-blue-600 flex-shrink-0" />
            <span>Illustrative forecast based on baseline scenario models</span>
          </div>
          <button
            onClick={() => setShowAssumptions(s => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-950 underline"
          >
            {showAssumptions ? 'Hide assumptions' : 'View assumptions'}
            {showAssumptions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
        {showAssumptions && (
          <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 text-[11px] text-blue-800 leading-relaxed flex flex-col gap-1">
            <p className="m-0">
              • Weekly demands reflect sample projected customer volumes.
            </p>
            <p className="m-0">
              • Available capacity assumes nominal 200 m³ daily depot vehicle volume without multi-trip recycling.
            </p>
            <p className="m-0">
              • Week 7 incorporates expected peak demand during Poya festive scheduling.
            </p>
          </div>
        )}
      </div>

      {/* Demand vs Capacity Horizon Chart */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 md:p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#F1F5F9]">
          <div>
            <h2 className="font-bold text-base text-[#202D2D] m-0">Weekly Demand vs Fleet Capacity (m³)</h2>
            <p className="text-xs text-[#64748B] m-0 mt-0.5">Scale calibrated to 280 m³ total horizon</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 bg-[#F97316] inline-block rounded-xs" /> Normal demand
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 bg-amber-500 inline-block rounded-xs" /> Demand exceeding capacity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500 inline-block" /> Fleet Capacity (200 m³)
            </span>
          </div>
        </div>

        {/* Chart Rows */}
        <div className="flex flex-col divide-y divide-gray-100">
          {ILLUSTRATIVE_FORECAST.map(w => {
            const barPct = (w.totalDemandM3 / MAX_CHART_SCALE_M3) * 100;
            const chilledPct = (w.chilledDemandM3 / MAX_CHART_SCALE_M3) * 100;
            const isOverCapacity = w.totalDemandM3 > w.availableCapacityM3;
            const diff = w.totalDemandM3 - w.availableCapacityM3;

            return (
              <div key={w.week} className="flex flex-col sm:flex-row sm:items-center py-3 gap-2 sm:gap-4 hover:bg-[#F8FAFC] px-2 rounded-lg transition-colors">
                {/* Week Label */}
                <div className="w-36 flex-shrink-0">
                  <span className="font-semibold text-xs text-[#202D2D]">{w.label}</span>
                  {w.poyaDay && (
                    <span className="ml-1.5 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 uppercase">
                      Festival
                    </span>
                  )}
                </div>

                {/* Progress Bar Container with Capacity Guideline Marker */}
                <div className="flex-1 relative h-4 bg-gray-100 rounded-full">
                  {/* Total Demand Bar — NOT capped at capacity! */}
                  <div
                    className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-amber-500' : 'bg-[#F97316]'}`}
                    style={{ width: `${barPct}%` }}
                    title={`Total Demand: ${w.totalDemandM3} m³`}
                  />

                  {/* Chilled Demand portion highlight */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-cyan-600/30 rounded-l-full pointer-events-none"
                    style={{ width: `${chilledPct}%` }}
                    title={`Chilled Portion: ${w.chilledDemandM3} m³`}
                  />

                  {/* Nominal Capacity Vertical Guideline (Drawn INSIDE the chart at 71.4%) */}
                  <div
                    className="absolute -top-1 -bottom-1 w-[2px] bg-red-500 z-10"
                    style={{ left: `${capacityPct}%` }}
                    title="Nominal Capacity Boundary (200 m³)"
                  />
                </div>

                {/* Value & Gap indicator */}
                <div className="w-44 flex-shrink-0 flex items-center justify-between text-xs tabular-nums">
                  <span className="font-bold text-[#202D2D]">{w.totalDemandM3} m³</span>
                  {isOverCapacity ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      +{diff} m³ deficit
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#64748B]">
                      {w.availableCapacityM3 - w.totalDemandM3} m³ buffer
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#F1F5F9]">
          <h2 className="font-bold text-base text-[#202D2D] m-0">Weekly Forecast Breakdown</h2>
          <p className="text-xs text-[#64748B] m-0 mt-0.5">Detailed demand segmentation by ambient and chilled temperature regimes</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Forecast Horizon</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Total Demand</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Chilled Demand</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Nominal Capacity</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider text-right">Utilization</th>
                <th className="py-2.5 px-4 font-bold text-[11px] text-[#64748B] uppercase tracking-wider">Load Pressure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {ILLUSTRATIVE_FORECAST.map(w => {
                const util = Math.round((w.totalDemandM3 / w.availableCapacityM3) * 100);
                const pressure = util > 100 ? (w.poyaDay ? 'Critical' : 'Elevated') : util >= 90 ? 'Tight' : 'Normal';

                return (
                  <tr key={w.week} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-xs text-[#202D2D]">{w.label}</td>
                    <td className="py-3 px-4 text-xs font-medium text-[#202D2D] text-right tabular-nums">{w.totalDemandM3} m³</td>
                    <td className="py-3 px-4 text-xs text-[#64748B] text-right tabular-nums">{w.chilledDemandM3} m³</td>
                    <td className="py-3 px-4 text-xs text-[#64748B] text-right tabular-nums">{w.availableCapacityM3} m³</td>
                    <td className="py-3 px-4 text-xs font-semibold text-right tabular-nums">
                      <span className={util > 100 ? 'text-amber-700' : 'text-[#202D2D]'}>{util}%</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        pressure === 'Critical'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : pressure === 'Elevated'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : pressure === 'Tight'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {pressure}
                      </span>
                    </td>
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
