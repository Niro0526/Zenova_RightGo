'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api-client';

type Order = {
  order_ref: string;
  delivery_id?: string;
  outlet_id: string;
  brand: string;
  order_units: number;
  status: string;
};

type Vehicle = { vehicle_id: string; type: string; temp: string };
type ValidationResult = { checklist?: Array<{ label: string; kind: string; detail: string }>; checkerFeasible?: boolean; operationalFeasible?: boolean | null };

export default function Planning() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [draftRevision, setDraftRevision] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlanningData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, vehicleRows, draft] = await Promise.all([
        apiGet<Order[]>('/orders?scenario=S1'),
        apiGet<Vehicle[]>('/reference/vehicles?scenario=S1'),
        apiGet<{ draftRevision: number }>('/plan/draft?scenario=S1'),
      ]);
      setOrders(orderRows);
      setVehicles(vehicleRows);
      setDraftRevision(draft.draftRevision);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Planning data could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlanningData();
  }, []);

  const suggestPlan = async () => {
    try {
      const draft = await apiPost<{ draftRevision: number }>('/plan/suggest?scenario=S1');
      setDraftRevision(draft.draftRevision);
      setValidation(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Plan suggestion failed');
    }
  };

  const validatePlan = async () => {
    try {
      setValidation(await apiGet<ValidationResult>('/plan/validate?scenario=S1'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Plan validation failed');
    }
  };

  const publishPlan = async () => {
    try {
      await apiPost('/plan/publish?scenario=S1', {
        expected_revision: draftRevision,
        shortfall_policy: 'ship_good_tell_store',
        decision_maker: 'Dispatcher',
      });
      await loadPlanningData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Plan publish failed');
    }
  };

  return (
    <main className="flex min-h-full flex-1 flex-col gap-6 bg-[#F9FAFB] p-6 md:p-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#202D2D]">Dispatcher Planning</h1>
          <p className="text-sm text-[#485563]">Seeded Tech-Triathlon orders and fleet</p>
        </div>
        <span className="rounded border border-orange-300 bg-white px-3 py-2 text-xs font-semibold text-orange-600">Draft revision {draftRevision}</span>
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4"><strong>{orders.length}</strong><span className="ml-2 text-sm text-slate-600">orders</span></div>
        <div className="rounded-lg border bg-white p-4"><strong>{vehicles.length}</strong><span className="ml-2 text-sm text-slate-600">vehicles</span></div>
        <div className="rounded-lg border bg-white p-4"><strong>{orders.filter(order => order.status === 'awaiting_planning').length}</strong><span className="ml-2 text-sm text-slate-600">awaiting planning</span></div>
      </section>

      <section className="flex flex-wrap gap-3">
        <button className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => void suggestPlan()}>Suggest plan</button>
        <button className="rounded border bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => void validatePlan()}>Validate plan</button>
        <button className="rounded border bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => void publishPlan()}>Publish plan</button>
        <Link className="rounded border bg-white px-4 py-2 text-sm font-semibold text-slate-700" href="/dispatcher">Back to dashboard</Link>
      </section>

      {validation && <section className="rounded-lg border bg-white p-4"><h2 className="mb-3 font-semibold text-[#202D2D]">Validation</h2><p className="mb-3 text-sm text-slate-600">Checker: {validation.checkerFeasible ? 'pass' : 'fail'} · Operational: {validation.operationalFeasible == null ? 'unverified' : validation.operationalFeasible ? 'pass' : 'fail'}</p><ul className="space-y-2 text-sm">{(validation.checklist || []).map((item, index) => <li key={`${item.label}-${index}`} className={item.kind === 'checker_pass' ? 'text-green-700' : 'text-red-700'}>{item.label}: {item.detail}</li>)}</ul></section>}

      <section className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">Delivery ID</th><th className="p-3">Outlet</th><th className="p-3">Brand</th><th className="p-3">Units</th><th className="p-3">Status</th></tr></thead><tbody>{loading ? <tr><td className="p-3" colSpan={5}>Loading seeded orders...</td></tr> : orders.map(order => <tr className="border-b last:border-0" key={order.order_ref}><td className="p-3 font-medium">{order.delivery_id || order.order_ref}</td><td className="p-3">{order.outlet_id}</td><td className="p-3">{order.brand}</td><td className="p-3">{order.order_units}</td><td className="p-3">{order.status}</td></tr>)}</tbody></table>
      </section>
    </main>
  );
}
