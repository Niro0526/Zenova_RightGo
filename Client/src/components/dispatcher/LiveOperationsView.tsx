'use client';

import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { useDispatcherPlan } from '@/store/dispatcher/PlanningContext';
import {
  getLoadingIssues,
  resolveLoadingIssue,
  getDeliveries,
  getReceipts,
  type LoadingIssue,
  type DeliveryRecordDetail,
  type ReceiptRecord,
} from '@/lib/api/dispatcher';
import { ApiError } from '@/lib/api/client';

const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

const LOADING_STATUS_STYLE: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  loading: 'bg-amber-100 text-amber-700',
  ready: 'bg-cyan-100 text-cyan-800',
  departed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export default function LiveOperations() {
  const { draftRevision, manifests, publishPlan, isSaving, error, refresh } = useDispatcherPlan();
  const [revalidateResult, setRevalidateResult] = useState<string | null>(null);
  const [issues, setIssues] = useState<LoadingIssue[]>([]);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRecordDetail[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);

  const lastManifest = manifests[manifests.length - 1];

  const loadIssues = useCallback(async () => {
    if (!lastManifest) { setIssues([]); return; }
    try {
      setIssuesError(null);
      setIssues(await getLoadingIssues(lastManifest.revision));
    } catch (err) {
      setIssuesError(err instanceof ApiError ? err.message : 'Could not load loading issues.');
    }
  }, [lastManifest?.revision]);

  const loadOpsData = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([getDeliveries(), getReceipts()]);
      setDeliveries(d);
      setReceipts(r);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    void loadIssues();
    void loadOpsData();
    const timer = window.setInterval(() => {
      void loadIssues();
      void loadOpsData();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadIssues, loadOpsData]);

  async function handleRevalidate() {
    await Promise.all([refresh(), loadIssues(), loadOpsData()]);
    setRevalidateResult(`Revalidated against the server at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
  }

  async function handlePublish() {
    await publishPlan();
    await loadIssues();
  }

  async function handleResolve(issue: LoadingIssue, action: 'replace_from_stock' | 'send_to_dispatcher' | 'apply_policy') {
    setResolvingId(issue.id);
    try {
      await resolveLoadingIssue(issue.id, action);
      await loadIssues();
    } catch (err) {
      setIssuesError(err instanceof ApiError ? err.message : 'Could not resolve the issue.');
    } finally {
      setResolvingId(null);
    }
  }

  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'escalated');
  const resolvedIssues = issues.filter(i => i.status !== 'open' && i.status !== 'escalated');

  return (
    <div className="flex flex-col flex-1 p-6 md:p-10 gap-6 w-full max-w-[1300px] mx-auto bg-[#F9FAFB] font-sans">

      <PageHeader
        title="Live Operations"
        subtitle="Released manifest, trip loading/departure status, and loading issues - queried live from the server."
        actions={<span className="py-1 px-2 bg-[#FFF4ED] border border-[#F97316] rounded font-semibold text-[11px] text-[#F97316] uppercase">Draft revision {draftRevision}</span>}
      />
      {error && <div className="py-2.5 px-4 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">{error}</div>}
      {lastManifest ? (
        <p className="text-xs text-gray-500 -mt-3">
          Manifest currently in effect: revision {lastManifest.revision} ({lastManifest.acknowledgement === 'acknowledged' ? 'acknowledged by Loader' : 'acknowledgement pending'}).
        </p>
      ) : (
        <p className="text-xs text-gray-500 -mt-3">No plan has been released yet - release a plan from Plan Review to see trips here.</p>
      )}

      {/* Trips Table - real released-trip rows from the active manifest */}
      <div className="bg-white border border-[#CBD5E1] rounded-[10px] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead className="bg-[#F9FAFB] border-b border-[#CBD5E1]">
            <tr>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Vehicle</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Assigned Driver</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Trip · District</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Loading Status</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">Departure</th>
              <th className="py-3.5 px-5 font-bold text-[11px] text-[#485563] uppercase">OTP Unlocked</th>
            </tr>
          </thead>
          <tbody>
            {!lastManifest || lastManifest.trips.length === 0 ? (
              <tr><td colSpan={6} className="py-6 px-5 text-center text-sm text-gray-400">No trips in the active manifest.</td></tr>
            ) : lastManifest.trips.map((t, i) => (
              <tr key={i} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]">
                <td className="py-3.5 px-5 font-bold text-sm text-[#202D2D]">{t.vehicleId}</td>
                <td className="py-3.5 px-5 text-sm text-[#202D2D]">
                  <span className="font-semibold">{t.driverName || (t.driverUsername ? `@${t.driverUsername}` : 'Sunil Driver')}</span>
                </td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">Trip {t.tripNo} | {t.district ?? '-'}</td>
                <td className="py-3.5 px-5"><span className={`py-1 px-2.5 rounded font-semibold text-xs capitalize ${LOADING_STATUS_STYLE[t.loadingStatus ?? 'planned'] ?? 'bg-gray-100 text-gray-700'}`}>{t.loadingStatus ?? 'planned'}</span></td>
                <td className="py-3.5 px-5 text-sm text-[#485563]">{t.plannedDepartureTime ?? 'not set'}</td>
                <td className="py-3.5 px-5 text-sm">{t.otpUnlocked ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-gray-400">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live Deliveries & Store Receipts Section */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Live Deliveries & Store Receipts</h2>
            <p className="text-sm text-[#485563] m-0 mt-1">Real-time tracking of driver stop completions, POD evidence, and store manager receipt confirmations.</p>
          </div>
          <span className="py-1.5 px-3 rounded font-bold text-xs uppercase bg-emerald-100 text-emerald-800">
            {deliveries.length} Recorded Stop{deliveries.length === 1 ? '' : 's'}
          </span>
        </div>

        {deliveries.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No stop deliveries recorded yet. Once the driver starts the run and completes stops, outcomes and store confirmations will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                <tr>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Outlet / Stop</th>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Vehicle · Trip</th>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Driver Outcome</th>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Proof of Delivery</th>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Store Receipt Status</th>
                  <th className="py-3 px-4 font-bold text-[11px] text-[#485563] uppercase">Delivered At</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((del) => {
                  const receipt = receipts.find(r => r.outletId === del.stopId);
                  const isConfirmed = !!receipt;
                  const hasReceiptIssue = receipt?.hasIssue;

                  return (
                    <tr key={del.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-[#202D2D] block">{del.stopName || del.stopId}</span>
                        <span className="text-xs text-slate-500 font-mono">{del.stopId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-[#485563]">
                        {del.vehicleId} {del.tripId ? `(${del.tripId})` : ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`py-1 px-2.5 rounded font-semibold text-xs capitalize ${
                          del.outcome === 'full'
                            ? 'bg-green-100 text-green-800'
                            : del.outcome === 'discrepancy'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {del.outcome === 'full' ? 'Delivered Full' : del.outcome === 'discrepancy' ? 'Discrepancy' : 'Not Delivered'}
                        </span>
                        {del.discrepancyDetails && (
                          <span className="block text-[11px] text-amber-700 mt-1">
                            {del.discrepancyDetails.type} ({del.discrepancyDetails.deliveredQty} delivered)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#485563]">
                        {del.podDetails ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800">{del.podDetails.signerName || 'Store Staff'}</span>
                            <span className="text-[11px] text-emerald-600">
                              {del.podDetails.hasSignature ? '✓ Signed' : ''} {del.podDetails.photoName ? '· Photo POD' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {isConfirmed ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-bold inline-flex items-center gap-1 ${hasReceiptIssue ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {hasReceiptIssue ? '⚠ Issue Reported' : '✓ Receipt Confirmed'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {receipt.confirmedUnits} units by {receipt.confirmedBy}
                            </span>
                            {hasReceiptIssue && receipt.notes && (
                              <span className="text-[10px] text-amber-600 italic">
                                &quot;{receipt.notes}&quot;
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            Awaiting Store Confirmation
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {del.createdAt ? new Date(del.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loading issues - real LoadingIssue records reported by the Loader, resolvable here */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-[16px] text-[#202D2D] m-0">Loading Issues</h2>
            <p className="text-sm text-[#485563] m-0 mt-1">Reported by the warehouse Loader against manifest revision {lastManifest?.revision ?? '-'}.</p>
          </div>
          <span className={`py-1.5 px-3 rounded font-bold text-xs uppercase ${openIssues.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {openIssues.length > 0 ? `${openIssues.length} open` : 'No open issues'}
          </span>
        </div>

        {issuesError && <p className="text-sm text-red-600">{issuesError}</p>}

        {openIssues.length === 0 && resolvedIssues.length === 0 && (
          <p className="text-sm text-gray-400">No loading issues reported for this manifest.</p>
        )}

        {openIssues.map(issue => (
          <div key={issue.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Affected Order</span>
              <span className="font-bold text-sm text-gray-900">{issue.orderRef} · {issue.outletId} · Vehicle {issue.vehicleId} Trip {issue.tripNo}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[11px] text-gray-500 uppercase">Issue</span>
              <span className="font-bold text-sm text-gray-900">{issue.issueType} ({issue.unitsAffected} unit(s) affected){issue.notes ? ` — ${issue.notes}` : ''}</span>
              <span className="text-[11px] text-gray-500">Reported by {issue.reportedBy} at {new Date(issue.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · status: {issue.status}</span>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button disabled={resolvingId === issue.id} onClick={() => handleResolve(issue, 'replace_from_stock')} className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Replace from stock
              </button>
              <button disabled={resolvingId === issue.id} onClick={() => handleResolve(issue, 'apply_policy')} className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Apply shortfall policy (ship effective units)
              </button>
              {issue.status === 'open' && (
                <button disabled={resolvingId === issue.id} onClick={() => handleResolve(issue, 'send_to_dispatcher')} className="py-2 px-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Escalate
                </button>
              )}
            </div>
          </div>
        ))}

        {resolvedIssues.length > 0 && (
          <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
            <span className="font-semibold text-[11px] text-gray-500 uppercase">Resolved</span>
            {resolvedIssues.map(issue => (
              <span key={issue.id} className="text-xs text-gray-500">{issue.orderRef} ({issue.vehicleId} Trip {issue.tripNo}) — {issue.actionTaken ?? issue.status} by {issue.resolvedBy ?? '-'}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
          <span className="font-semibold text-[11px] text-gray-500 uppercase">Actions</span>
          <div className="flex flex-row gap-3 flex-wrap">
            <button onClick={handleRevalidate} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs text-gray-700 transition-colors">
              Revalidate against server
            </button>
            <button disabled={isSaving} onClick={handlePublish} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs text-gray-700 transition-colors disabled:opacity-50">
              {isSaving ? 'Publishing…' : 'Publish current draft'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Releasing a plan automatically notifies the Loader and Driver roles server-side - there is no separate manual "notify" step.</p>
          {revalidateResult && <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5">{revalidateResult}</p>}
        </div>
      </div>
    </div>
  );
}
