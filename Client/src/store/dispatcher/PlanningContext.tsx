'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '@/lib/api/dispatcher';
import { ApiError } from '@/lib/api/client';
import {
  buildTripStops, computeStopSchedule, computeTripDistanceKm, getOrdersOnTrip,
  type FleetVehicle, type StopSchedule, type TripStop,
} from '@/lib/dispatcher/validation';
import type {
  DeferReasonCode, DistrictTravel, Manifest, OrderAssignment, S1Order, ServiceAllowance,
} from '@/types/dispatcher';
import type { DispatcherOrder, RankedCandidate, ValidationChecklistRow, CutoffStatus } from '@/lib/api/dispatcher';

function tripKey(vehicleId: string, tripNo: 1 | 2): string {
  return `${vehicleId}-${tripNo}`;
}

interface DispatcherPlanValue {
  // Server-authoritative state - fetched from the backend, never invented locally.
  orders: DispatcherOrder[];
  /** Confirmed order queue: awaiting_planning orders eligible for the current run (from DB). */
  confirmedQueue: DispatcherOrder[];
  /** 4 PM cutoff status + per-brand confirmed counts. */
  cutoffStatus: CutoffStatus | null;
  fleetVehicles: FleetVehicle[];
  assignments: Record<string, OrderAssignment>;
  draftRevision: number;
  manifests: (Manifest & { version: number })[];
  counts: { total: number; served: number; deferred: number; unresolved: number };
  ordersClosed: boolean;
  ordersClosedAt: string | null;
  planChecklist: ValidationChecklistRow[];
  checkerFeasible: boolean;
  operationalFeasible: boolean | null;

  // Loading / request lifecycle - UI must gate on these rather than assume success.
  isLoading: boolean; // initial load
  isSaving: boolean; // a mutation is in flight - callers should disable the triggering control
  error: string | null;
  refresh: () => Promise<void>;
  /** Lightweight refresh of only the confirmed queue + cutoff status (safe to poll every 30s). */
  refreshQueue: () => Promise<void>;

  // Presentational helpers (pure, computed client-side from the fetched state - these
  // never gate a decision, only render a preview of it).
  ordersOnTrip: (vehicleId: string, tripNo: 1 | 2) => S1Order[];
  getTripDeparture: (vehicleId: string, tripNo: 1 | 2) => string | null;
  getTripDriver: (vehicleId: string, tripNo: 1 | 2) => { username?: string | null; name?: string | null };
  getVehicleFuelInput: (vehicleId: string) => number | null;
  getTripStops: (vehicleId: string, tripNo: 1 | 2) => TripStop[];
  getTripSchedule: (vehicleId: string, tripNo: 1 | 2) => StopSchedule[] | null;
  getVehicleDistanceKm: (vehicleId: string) => number;

  // Server-backed mutations - every one awaits the backend's confirmation
  // before the UI reflects a change, and surfaces a rejection as `error`
  // rather than silently applying an optimistic local update.
  assignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2) => Promise<boolean>;
  reassignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) => Promise<boolean>;
  deferOrder: (orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) => Promise<boolean>;
  reorderTrip: (vehicleId: string, tripNo: 1 | 2, newOutletOrder: string[]) => Promise<boolean>;
  setTripDeparture: (vehicleId: string, tripNo: 1 | 2, departureTime: string | null) => Promise<boolean>;
  setTripDriver: (vehicleId: string, tripNo: 1 | 2, driverUsername: string, driverName?: string) => Promise<boolean>;
  setVehicleFuelInput: (vehicleId: string, priorWeeklyFuelUsageL: number | null) => Promise<boolean>;
  suggestPlan: () => Promise<boolean>;
  closeOrders: () => Promise<boolean>;
  publishPlan: () => Promise<boolean>;
  acknowledgeManifest: (version: number) => Promise<boolean>;
  compatibleCandidates: (orderRef: string) => Promise<RankedCandidate[]>;
}

const DispatcherPlanContext = createContext<DispatcherPlanValue | null>(null);

const emptyCounts = { total: 0, served: 0, deferred: 0, unresolved: 0 };

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<DispatcherOrder[]>([]);
  const [confirmedQueue, setConfirmedQueue] = useState<DispatcherOrder[]>([]);
  const [cutoffStatus, setCutoffStatus] = useState<CutoffStatus | null>(null);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [allowances, setAllowances] = useState<ServiceAllowance[]>([]);
  const [districtTravel, setDistrictTravel] = useState<DistrictTravel[]>([]);
  const [draft, setDraft] = useState<api.DraftPlanResponse | null>(null);
  const [manifests, setManifests] = useState<(Manifest & { version: number })[]>([]);
  const [planChecklist, setPlanChecklist] = useState<ValidationChecklistRow[]>([]);
  const [checkerFeasible, setCheckerFeasible] = useState(false);
  const [operationalFeasible, setOperationalFeasible] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow earlier refresh() overwriting state from a later
  // one that already landed ("Prevent older responses from overwriting
  // newer draft state").
  const requestSeq = useRef(0);

  const refreshChecklist = useCallback(async () => {
    try {
      const res = await api.validatePlan();
      setPlanChecklist(res.checklist);
      setCheckerFeasible(res.checkerFeasible);
      setOperationalFeasible(res.operationalFeasible);
    } catch {
      // Checklist is advisory display state - a failure here must not block the rest of the UI.
    }
  }, []);

  /** Lightweight poll: fetch only confirmed queue + cutoff status (no draft re-fetch). */
  const refreshQueue = useCallback(async () => {
    try {
      const [queueRes, cutoffRes] = await Promise.all([
        api.getConfirmedQueue(),
        api.getCutoffStatus(),
      ]);
      setConfirmedQueue(queueRes);
      setCutoffStatus(cutoffRes);
    } catch {
      // Non-fatal: queue display degrades gracefully; the full refresh path will surface hard errors.
    }
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    setError(null);
    try {
      const [ordersRes, fleetRes, allowRes, travelRes, draftRes, manifestsRes, queueRes, cutoffRes] = await Promise.all([
        api.getOrders(), api.getFleetVehicles(), api.getServiceAllowances(), api.getDistrictTravel(),
        api.getDraft(), api.listManifests(),
        api.getConfirmedQueue(), api.getCutoffStatus(),
      ]);
      if (seq !== requestSeq.current) return; // a newer refresh already landed
      setOrders(ordersRes);
      setFleetVehicles(fleetRes);
      setAllowances(allowRes);
      setDistrictTravel(travelRes);
      setDraft(draftRes);
      setManifests(manifestsRes);
      setConfirmedQueue(queueRes);
      setCutoffStatus(cutoffRes);
      await refreshChecklist();
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof ApiError ? err.message : 'Could not load dispatcher data. Is the backend running?');
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, [refreshChecklist]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Poll the confirmed-queue every 30 s so newly placed store orders appear
  // in the Dispatcher's planning screen without a full page refresh.
  useEffect(() => {
    const id = setInterval(() => { void refreshQueue(); }, 30_000);
    return () => clearInterval(id);
  }, [refreshQueue]);

  const ordersByRef = useMemo(() => new Map(orders.map((o) => [o.orderRef, o])), [orders]);
  const assignments = draft?.assignments ?? {};
  const stopSequences = draft?.stopSequences ?? {};
  const tripMeta = draft?.tripMeta ?? {};
  const vehicleFuelInputs = draft?.vehicleFuelInputs ?? {};
  const draftRevision = draft?.draftRevision ?? 0;
  const counts = draft?.counts ?? emptyCounts;

  const assignmentsMap = useMemo(() => new Map(Object.entries(assignments)), [assignments]);

  const ordersOnTrip = useCallback((vehicleId: string, tripNo: 1 | 2): S1Order[] => {
    return getOrdersOnTrip(orders, assignmentsMap, vehicleId, tripNo);
  }, [orders, assignmentsMap]);

  const getTripDeparture = useCallback((vehicleId: string, tripNo: 1 | 2) => tripMeta[tripKey(vehicleId, tripNo)]?.plannedDepartureTime ?? null, [tripMeta]);
  const getTripDriver = useCallback((vehicleId: string, tripNo: 1 | 2) => {
    const meta = tripMeta[tripKey(vehicleId, tripNo)];
    return {
      username: meta?.driverUsername ?? null,
      name: meta?.driverName ?? null,
    };
  }, [tripMeta]);
  const getVehicleFuelInput = useCallback((vehicleId: string) => vehicleFuelInputs[vehicleId] ?? null, [vehicleFuelInputs]);

  const getTripStops = useCallback((vehicleId: string, tripNo: 1 | 2): TripStop[] => {
    const key = tripKey(vehicleId, tripNo);
    const tripOrders = ordersOnTrip(vehicleId, tripNo);
    const seq = stopSequences[key] ?? Array.from(new Set(tripOrders.map((o) => o.outletId)));
    return buildTripStops(seq, tripOrders.map((o) => o.orderRef), ordersByRef);
  }, [ordersOnTrip, stopSequences, ordersByRef]);

  const getTripSchedule = useCallback((vehicleId: string, tripNo: 1 | 2): StopSchedule[] | null => {
    const departureTime = getTripDeparture(vehicleId, tripNo);
    if (departureTime === null) return null;
    const stops = getTripStops(vehicleId, tripNo);
    if (stops.length === 0) return [];
    return computeStopSchedule(stops, departureTime, ordersByRef, allowances, districtTravel);
  }, [getTripDeparture, getTripStops, ordersByRef, allowances, districtTravel]);

  const getVehicleDistanceKm = useCallback((vehicleId: string): number => {
    let total = 0;
    for (const tripNo of [1, 2] as const) {
      const stops = getTripStops(vehicleId, tripNo);
      if (stops.length === 0) continue;
      const tripOrders = ordersOnTrip(vehicleId, tripNo);
      total += computeTripDistanceKm(stops, tripOrders[0].district, tripOrders[0].depot, districtTravel);
    }
    return total;
  }, [getTripStops, ordersOnTrip, districtTravel]);

  /** Wraps a mutation: blocks concurrent submissions, applies the server's
   * returned draft state only on success, surfaces a rejection as `error`
   * without touching existing state (so an in-progress edit the user was
   * about to retry isn't wiped out from under them). */
  const runMutation = useCallback(async (fn: () => Promise<api.DraftPlanResponse>): Promise<boolean> => {
    if (isSaving) return false; // a request is already in flight
    setIsSaving(true);
    setError(null);
    try {
      const next = await fn();
      setDraft(next);
      await refreshChecklist();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed - check your connection and try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, refreshChecklist]);

  const assignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2) =>
    runMutation(() => api.assignOrder(orderRef, vehicleId, tripNo)), [runMutation]);
  const reassignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) =>
    runMutation(() => api.reassignOrder(orderRef, vehicleId, tripNo, reasonNote)), [runMutation]);
  const deferOrder = useCallback((orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) =>
    runMutation(() => api.deferOrder(orderRef, reasonCode, reasonNote)), [runMutation]);
  const reorderTrip = useCallback((vehicleId: string, tripNo: 1 | 2, newOutletOrder: string[]) =>
    runMutation(() => api.reorderTrip(vehicleId, tripNo, newOutletOrder)), [runMutation]);
  const setTripDeparture = useCallback((vehicleId: string, tripNo: 1 | 2, departureTime: string | null) =>
    runMutation(() => api.setTripDeparture(vehicleId, tripNo, departureTime)), [runMutation]);
  const setTripDriver = useCallback((vehicleId: string, tripNo: 1 | 2, driverUsername: string, driverName?: string) =>
    runMutation(() => api.setTripDriver(vehicleId, tripNo, driverUsername, driverName)), [runMutation]);
  const setVehicleFuelInput = useCallback((vehicleId: string, priorWeeklyFuelUsageL: number | null) =>
    runMutation(() => api.setVehicleFuelInput(vehicleId, priorWeeklyFuelUsageL)), [runMutation]);
  const suggestPlan = useCallback(() => runMutation(() => api.suggestPlan()), [runMutation]);
  const closeOrders = useCallback(() => runMutation(() => api.closeOrders()), [runMutation]);

  const publishPlan = useCallback(async (): Promise<boolean> => {
    if (isSaving || !draft) return false;
    setIsSaving(true);
    setError(null);
    try {
      await api.publishPlan(draft.draftRevision);
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not release the plan - check your connection and try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, draft, refresh]);

  const acknowledgeManifest = useCallback(async (version: number): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    setError(null);
    try {
      await api.acknowledgeManifest(version);
      const next = await api.listManifests();
      setManifests(next);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not acknowledge the manifest.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  const compatibleCandidates = useCallback((orderRef: string) => api.getCandidates(orderRef), []);

  const value: DispatcherPlanValue = {
    orders, confirmedQueue, cutoffStatus, fleetVehicles, assignments, draftRevision, manifests, counts,
    ordersClosed: Boolean(draft?.ordersClosed),
    ordersClosedAt: draft?.ordersClosedAt ?? null,
    planChecklist, checkerFeasible, operationalFeasible,
    isLoading, isSaving, error, refresh, refreshQueue,
    ordersOnTrip, getTripDeparture, getTripDriver, getVehicleFuelInput, getTripStops, getTripSchedule, getVehicleDistanceKm,
    assignOrder, reassignOrder, deferOrder, reorderTrip, setTripDeparture, setTripDriver, setVehicleFuelInput,
    suggestPlan, closeOrders, publishPlan, acknowledgeManifest, compatibleCandidates,
  };

  return <DispatcherPlanContext.Provider value={value}>{children}</DispatcherPlanContext.Provider>;
}

export function useDispatcherPlan(): DispatcherPlanValue {
  const ctx = useContext(DispatcherPlanContext);
  if (!ctx) throw new Error('useDispatcherPlan must be used within PlanningProvider');
  return ctx;
}
