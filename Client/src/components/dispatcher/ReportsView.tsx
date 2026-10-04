'use client';
import React, { useEffect, useState } from 'react';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import { getLedger, getDeliveries, getReceipts, type LedgerEntry, type ReceiptRecord } from '@/lib/api/dispatcher';
import { ApiError } from '@/lib/api/client';

const FileTextIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
const DownloadIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const BarChartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;

function ledgerToCsv(rows: LedgerEntry[]): string {
  const header = ['Time', 'Action', 'Order Ref', 'Outlet', 'Decision Maker', 'Reason Code', 'Reason Note', 'Plan Version'];
  const lines = rows.map(r => [r.time, r.action, r.orderRef, r.outletId, r.decisionMaker, r.reasonCode ?? '', (r.reasonNote ?? '').replace(/,/g, ';'), String(r.planVersion)].join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function ReportsView() {
  const { orders, fleetVehicles, assignments, manifests, draftRevision, error: planError } = useDispatcherPlan();
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[] | null>(null);
  const [deliveryCount, setDeliveryCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLedger(), getReceipts(), getDeliveries()])
      .then(([l, r, d]) => { if (!cancelled) { setLedger(l); setReceipts(r); setDeliveryCount(d.length); } })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Could not load report data.'); });
    return () => { cancelled = true; };
  }, []);

  const lastManifest = manifests[manifests.length - 1];
  const deferredCount = orders.filter(o => assignments[o.orderRef]?.decision === 'deferred').length;
  const servedCount = orders.filter(o => assignments[o.orderRef]?.decision === 'served').length;
  const receiptIssues = receipts?.filter(r => r.hasIssue).length ?? null;

  // Real per-vehicle weight utilization for the current draft - a true snapshot,
  // not a fabricated multi-day trend (this system has no day-over-day history).
  const vehicleUtilization = fleetVehicles
    .map(v => {
      const weight = orders
        .filter(o => assignments[o.orderRef]?.decision === 'served' && assignments[o.orderRef]?.vehicleId === v.vehicleId)
        .reduce((sum, o) => sum + o.orderWeightKg, 0);
      return { vehicleId: v.vehicleId, weight, capacity: v.weightCapKg, pct: v.weightCapKg > 0 ? (weight / v.weightCapKg) * 100 : 0 };
    })
    .filter(v => v.weight > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  function handleExportLedger() {
    if (!ledger) return;
    const blob = new Blob([ledgerToCsv(ledger)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rightgo-decision-ledger-rev${draftRevision}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-10 gap-6 w-full max-w-[1160px] mx-auto bg-[#F9FAFB] h-full overflow-y-auto font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 md:gap-0">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-bold text-[24px] md:text-[28px] text-[#202D2D] m-0">Reports &amp; Analytics</h1>
          <h2 className="font-medium text-[11px] text-[#485563] uppercase tracking-wider m-0">
            Scenario S1 · Draft revision {draftRevision}{lastManifest ? ` · released as of v${lastManifest.revision}` : ' · not yet released'}
          </h2>
        </div>
      </div>

      {(planError || loadError) && (
        <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{planError ?? loadError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        {/* Export Panel */}
        <div className="col-span-1 bg-white border border-gray-200 rounded-[10px] p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
            <FileTextIcon /> Decision Ledger
          </h3>

          <div className="flex flex-col gap-3 flex-1 text-sm text-gray-600">
            <p>{ledger === null ? 'Loading…' : `${ledger.length} audit entries recorded for this scenario (append-only, every dispatcher/loader/driver/store action).`}</p>
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                Exports the real persisted decision ledger as CSV. This system has a single current scenario (S1) - there is no multi-day report history to select a date range from.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportLedger}
            disabled={!ledger || ledger.length === 0}
            className="mt-6 w-full flex justify-center items-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-bold text-sm text-white shadow-sm transition-colors"
          >
            <DownloadIcon /> Export Ledger CSV
          </button>
        </div>

        {/* KPIs + Fleet Utilization */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Served / Total</span>
              <div className="text-3xl font-black text-gray-900 mt-2">{servedCount} / {orders.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deferred Orders</span>
              <div className="text-3xl font-black text-gray-900 mt-2">{deferredCount}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Receipt Issues</span>
              <div className="text-3xl font-black text-gray-900 mt-2">{receiptIssues === null ? '—' : receiptIssues}</div>
              <div className="text-xs text-gray-400 mt-2">{receipts === null ? 'Loading…' : `of ${receipts.length} confirmed receipts`}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[10px] p-6 shadow-sm flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
              <BarChartIcon /> Fleet Weight Utilization (current draft, by vehicle)
            </h3>

            {vehicleUtilization.length === 0 ? (
              <p className="text-sm text-gray-400">No vehicles have assigned orders in the current draft yet.</p>
            ) : (
              <div className="flex-1 min-h-[200px] flex items-end justify-between gap-1 sm:gap-2 md:gap-3 mt-auto pt-8 border-b border-gray-200 pb-2 relative overflow-x-auto">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 font-semibold py-2">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>
                <div className="w-10 flex-shrink-0"></div>
                <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-2 min-w-[250px]">
                  {vehicleUtilization.map((v) => (
                    <div key={v.vehicleId} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full bg-blue-100 rounded-t-sm relative flex items-end justify-center h-[200px]">
                        <div className={`w-full rounded-t-sm transition-all duration-500 ${v.pct > 95 ? 'bg-red-500' : 'bg-blue-500 group-hover:bg-blue-600'}`} style={{ height: `${Math.min(100, v.pct)}%` }}></div>
                        <div className="absolute -top-6 text-[10px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">{v.pct.toFixed(0)}%</div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{v.vehicleId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm text-sm text-gray-600">
            {deliveryCount === null ? 'Loading delivery records…' : deliveryCount === 0
              ? 'No deliveries have been recorded yet for this scenario - driver delivery outcomes will appear here once trips are released and completed.'
              : `${deliveryCount} delivery record(s) persisted so far.`}
          </div>
        </div>
      </div>
    </div>
  );
}
