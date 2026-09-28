'use client';

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { demoAdapter } from '@/lib/dispatcher/adapter';
import {
  buildPassportForCandidate, buildTripStops, computeStopSchedule, computeTripDistanceKm, getOrdersOnTrip, rankCandidates, validatePlan,
  type FleetVehicle, type PlanCheckRow, type RankedCandidate, type StopSchedule, type TripStop,
} from '@/lib/dispatcher/validation';
export type { FleetVehicle };
import { generateSuggestedDraftPlan, type GeneratedDraftResult } from '@/lib/dispatcher/draftGenerator';
import type {
  DecisionLedgerEntry,
  DeferReasonCode,
  Manifest,
  OrderAssignment,
  PassportResult,
  S1Order,
  ShortfallEvent,
  TripMeta,
} from '@/types/dispatcher';

const DECISION_MAKER = 'Dispatcher (you)'; // this session's demo user — no real authenticated identity exists

function tripKey(vehicleId: string, tripNo: 1 | 2): string {
  return `${vehicleId}-${tripNo}`;
}

export interface PlanningState {
  assignments: Record<string, OrderAssignment>;
  ledger: DecisionLedgerEntry[];
  draftRevision: number;
  stopSequences: Record<string, string[]>; // key: tripKey -> outletId order
  tripMeta: Record<string, TripMeta>; // key: tripKey -> { plannedDepartureTime }
  vehicleFuelInputs: Record<string, number | null>; // vehicleId -> confirmed prior weekly usage (null = unconfirmed)
  releasedManifests: Manifest[];
  shortfallEvents: ShortfallEvent[];
}

export type Action =
  | { type: 'ASSIGN'; orderRef: string; vehicleId: string; tripNo: 1 | 2 }
  | { type: 'DEFER'; orderRef: string; reasonCode: DeferReasonCode; reasonNote: string }
  | { type: 'REASSIGN'; orderRef: string; vehicleId: string; tripNo: 1 | 2; reasonNote: string }
  | { type: 'REORDER'; vehicleId: string; tripNo: 1 | 2; newOutletOrder: string[] }
  | { type: 'SET_TRIP_DEPARTURE'; vehicleId: string; tripNo: 1 | 2; departureTime: string | null }
  | { type: 'SET_VEHICLE_FUEL_INPUT'; vehicleId: string; priorWeeklyFuelUsageL: number | null }
  | { type: 'PUBLISH'; expectedRevision: number }
  | { type: 'ACKNOWLEDGE_MANIFEST'; revision: number }
  | { type: 'REPORT_SHORTFALL'; orderRef: string }
  | { type: 'SET_SHORTFALL_RESOLUTION'; id: string; resolution: 'replace' | 'defer'; note: string }
  | { type: 'APPLY_DRAFT_PLAN'; newAssignments: Record<string, OrderAssignment>; newStopSequences: Record<string, string[]>; newTripMeta: Record<string, TripMeta>; message?: string }
  | { type: 'CHANGE_TRIP_VEHICLE'; fromVehicleId: string; toVehicleId: string; tripNo: 1 | 2 }
  | { type: 'RESET_PLAN' };

function nowLocal(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function assignmentLabel(a: OrderAssignment | undefined): string {
  if (!a || a.decision !== 'served' || !a.vehicleId || !a.tripNo) return '-';
  return `${a.vehicleId} · Trip ${a.tripNo}`;
}

export function makeInitialState(): PlanningState {
  const orders = demoAdapter.listOrders();
  const assignments: Record<string, OrderAssignment> = {};
  for (const o of orders) {
    // Real task2b_peak_day_scenarios.csv carries no decision/vehicle/trip columns -
    // the only honest initial state is every order unresolved until the dispatcher acts.
    assignments[o.orderRef] = { decision: 'unresolved', vehicleId: null, tripNo: null, reasonCode: null, reasonNote: null };
  }
  return {
    assignments, ledger: [], draftRevision: 0,
    stopSequences: {}, tripMeta: {}, vehicleFuelInputs: {},
    releasedManifests: [], shortfallEvents: [],
  };
}

/** Whether `outletId` is still occupied by some OTHER order on `key`, given the pre-mutation assignments. */
function outletStillOnTrip(orders: S1Order[], assignments: Record<string, OrderAssignment>, key: string, outletId: string, excludingOrderRef: string): boolean {
  return orders.some(o => {
    if (o.orderRef === excludingOrderRef || o.outletId !== outletId) return false;
    const a = assignments[o.orderRef];
    return a?.decision === 'served' && a.vehicleId && a.tripNo && tripKey(a.vehicleId, a.tripNo) === key;
  });
}

function updateStopSequences(
  stopSequences: Record<string, string[]>,
  orders: S1Order[],
  assignments: Record<string, OrderAssignment>,
  oldKey: string | null,
  newKey: string | null,
  outletId: string,
  orderRef: string,
): Record<string, string[]> {
  const next = { ...stopSequences };
  if (oldKey && oldKey !== newKey && !outletStillOnTrip(orders, assignments, oldKey, outletId, orderRef)) {
    next[oldKey] = (next[oldKey] ?? []).filter(o => o !== outletId);
  }
  if (newKey) {
    const seq = next[newKey] ?? [];
    if (!seq.includes(outletId)) next[newKey] = [...seq, outletId];
  }
  return next;
}

/** Recomputes the live plan checklist from current state + reference data — the single function both the UI selector and the reducer's authoritative transitions call. */
function computeChecklist(state: PlanningState, orders: S1Order[], vehiclesById: Map<string, FleetVehicle>): PlanCheckRow[] {
  return validatePlan({
    orders,
    decisions: new Map(Object.entries(state.assignments).map(([ref, a]) => [ref, { decision: a.decision, vehicleId: a.vehicleId, tripNo: a.tripNo, reasonCode: a.reasonCode }])),
    vehiclesById,
    allowances: demoAdapter.listServiceAllowances(),
    districtTravel: demoAdapter.listDistrictTravel(),
    stopSequences: new Map(Object.entries(state.stopSequences)),
    tripMeta: new Map(Object.entries(state.tripMeta)),
    vehicleFuelInputs: new Map(Object.entries(state.vehicleFuelInputs)),
  });
}

export function reducer(state: PlanningState, action: Action): PlanningState {
  // All plan-committing transitions reach into demoAdapter directly (the
  // existing pattern in this file, predating this change) rather than
  // trusting anything the action payload claims about feasibility/version -
  // see docs/SOURCE_REQUIREMENTS.md for why this is required here.
  const orders = demoAdapter.listOrders();
  const vehiclesById = new Map(demoAdapter.listFleetVehicles().map(v => [v.vehicleId, v]));
  const allowances = demoAdapter.listServiceAllowances();
  const districtTravel = demoAdapter.listDistrictTravel();
  const ordersByRef = new Map(orders.map(o => [o.orderRef, o]));

  switch (action.type) {
    case 'ASSIGN': {
      const order = ordersByRef.get(action.orderRef)!;
      const assignmentsMap = new Map(Object.entries(state.assignments).map(([ref, a]) => [ref, a]));
      const passport = buildPassportForCandidate(
        action.orderRef, action.vehicleId, action.tripNo, orders, vehiclesById, allowances, districtTravel,
        assignmentsMap, new Map(Object.entries(state.stopSequences)), new Map(Object.entries(state.tripMeta)), new Map(Object.entries(state.vehicleFuelInputs)),
      );
      if (!passport.checkerFeasible) return state; // reducer refuses an infeasible assignment regardless of any UI pre-check

      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'served', vehicleId: action.vehicleId, tripNo: action.tripNo, reasonCode: null, reasonNote: null };
      const newKey = tripKey(action.vehicleId, action.tripNo);
      const oldKey = prev.vehicleId && prev.tripNo ? tripKey(prev.vehicleId, prev.tripNo) : null;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`, orderRef: action.orderRef, outletId: order.outletId,
        action: prev.decision === 'served' ? 'reassigned' : 'assigned', reasonCode: null, reasonNote: null,
        decisionMaker: DECISION_MAKER, time: nowLocal(), previousAssignment: assignmentLabel(prev), updatedAssignment: assignmentLabel(next), planVersion: state.draftRevision,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
        stopSequences: updateStopSequences(state.stopSequences, orders, state.assignments, oldKey, newKey, order.outletId, action.orderRef),
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'REASSIGN': {
      const order = ordersByRef.get(action.orderRef)!;
      const assignmentsMap = new Map(Object.entries(state.assignments).map(([ref, a]) => [ref, a]));
      const passport = buildPassportForCandidate(
        action.orderRef, action.vehicleId, action.tripNo, orders, vehiclesById, allowances, districtTravel,
        assignmentsMap, new Map(Object.entries(state.stopSequences)), new Map(Object.entries(state.tripMeta)), new Map(Object.entries(state.vehicleFuelInputs)),
      );
      if (!passport.checkerFeasible) return state; // same authoritative recompute as ASSIGN, not trusted from the caller

      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'served', vehicleId: action.vehicleId, tripNo: action.tripNo, reasonCode: null, reasonNote: null };
      const newKey = tripKey(action.vehicleId, action.tripNo);
      const oldKey = prev.vehicleId && prev.tripNo ? tripKey(prev.vehicleId, prev.tripNo) : null;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`, orderRef: action.orderRef, outletId: order.outletId,
        action: 'reassigned', reasonCode: null, reasonNote: action.reasonNote,
        decisionMaker: DECISION_MAKER, time: nowLocal(), previousAssignment: assignmentLabel(prev), updatedAssignment: assignmentLabel(next), planVersion: state.draftRevision,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
        stopSequences: updateStopSequences(state.stopSequences, orders, state.assignments, oldKey, newKey, order.outletId, action.orderRef),
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'DEFER': {
      const order = ordersByRef.get(action.orderRef)!;
      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'deferred', vehicleId: null, tripNo: null, reasonCode: action.reasonCode, reasonNote: action.reasonNote || null };
      const oldKey = prev.vehicleId && prev.tripNo ? tripKey(prev.vehicleId, prev.tripNo) : null;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`, orderRef: action.orderRef, outletId: order.outletId,
        action: 'deferred', reasonCode: action.reasonCode, reasonNote: action.reasonNote || null,
        decisionMaker: DECISION_MAKER, time: nowLocal(), previousAssignment: assignmentLabel(prev), updatedAssignment: '-', planVersion: state.draftRevision,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
        stopSequences: oldKey ? updateStopSequences(state.stopSequences, orders, state.assignments, oldKey, null, order.outletId, action.orderRef) : state.stopSequences,
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'REORDER': {
      const key = tripKey(action.vehicleId, action.tripNo);
      const oldOrder = state.stopSequences[key] ?? [];
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-resequence-${key}`, orderRef: '(trip)', outletId: `${action.vehicleId} Trip ${action.tripNo}`,
        action: 'resequenced', reasonCode: null, reasonNote: `Stop order changed: ${oldOrder.join(' -> ')} became ${action.newOutletOrder.join(' -> ')}`,
        decisionMaker: DECISION_MAKER, time: nowLocal(), previousAssignment: oldOrder.join(', '), updatedAssignment: action.newOutletOrder.join(', '), planVersion: state.draftRevision,
      };
      return {
        ...state,
        stopSequences: { ...state.stopSequences, [key]: action.newOutletOrder },
        ledger: [entry, ...state.ledger],
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'SET_TRIP_DEPARTURE': {
      const key = tripKey(action.vehicleId, action.tripNo);
      return {
        ...state,
        tripMeta: { ...state.tripMeta, [key]: { ...state.tripMeta[key], plannedDepartureTime: action.departureTime } },
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'SET_VEHICLE_FUEL_INPUT': {
      return {
        ...state,
        vehicleFuelInputs: { ...state.vehicleFuelInputs, [action.vehicleId]: action.priorWeeklyFuelUsageL },
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'PUBLISH': {
      if (action.expectedRevision !== state.draftRevision) return state; // stale or duplicate dispatch - no-op
      const last = state.releasedManifests[state.releasedManifests.length - 1];
      if (last && last.revision === state.draftRevision) return state; // nothing changed since last release - no-op

      // Authoritative recompute, from current state - never trusts a caller-supplied flag.
      const checklist = computeChecklist(state, orders, vehiclesById);
      const blocked = checklist.some(r => r.kind === 'checker_fail' || r.kind === 'unverified');
      if (blocked) return state;

      const tripGroups = new Map<string, string[]>();
      for (const [ref, a] of Object.entries(state.assignments)) {
        if (a.decision === 'served' && a.vehicleId && a.tripNo) {
          const key = tripKey(a.vehicleId, a.tripNo);
          tripGroups.set(key, [...(tripGroups.get(key) ?? []), ref]);
        }
      }
      const manifest: Manifest = {
        revision: state.draftRevision,
        publishedAt: nowLocal(),
        acknowledgement: 'pending',
        trips: Array.from(tripGroups.entries()).map(([key, orderRefs]) => {
          const [vehicleId, tripNoStr] = key.split('-');
          return { vehicleId, tripNo: Number(tripNoStr) as 1 | 2, stopOutletIds: state.stopSequences[key] ?? [], orderRefs };
        }),
      };
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-publish`, orderRef: '(plan)', outletId: '-', action: 'published', reasonCode: null,
        reasonNote: `Local/demo publish - Manifest revision ${state.draftRevision}. No server-side release exists; this only updates session-local state.`,
        decisionMaker: DECISION_MAKER, time: nowLocal(), previousAssignment: last ? `v${last.revision}` : '(none)', updatedAssignment: `v${state.draftRevision}`, planVersion: state.draftRevision,
      };
      return { ...state, releasedManifests: [...state.releasedManifests, manifest], ledger: [entry, ...state.ledger] };
    }
    case 'ACKNOWLEDGE_MANIFEST': {
      return {
        ...state,
        releasedManifests: state.releasedManifests.map(m => m.revision === action.revision ? { ...m, acknowledgement: 'acknowledged-simulated' } : m),
      };
    }
    case 'REPORT_SHORTFALL': {
      const order = ordersByRef.get(action.orderRef);
      if (!order) return state;
      const last = state.releasedManifests[state.releasedManifests.length - 1];
      const event: ShortfallEvent = {
        id: `${Date.now()}-shortfall-${action.orderRef}`,
        orderRef: action.orderRef,
        outletId: order.outletId,
        reportedAt: nowLocal(),
        manifestVersionAtReport: last ? last.revision : null, // stamped once, here, at creation - never recomputed on render
        resolution: null,
        resolvedNote: null,
      };
      return { ...state, shortfallEvents: [...state.shortfallEvents, event] };
    }
    case 'SET_SHORTFALL_RESOLUTION': {
      return {
        ...state,
        shortfallEvents: state.shortfallEvents.map(e => e.id === action.id ? { ...e, resolution: action.resolution, resolvedNote: action.note } : e),
      };
    }
    case 'APPLY_DRAFT_PLAN': {
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-generate-plan`,
        orderRef: '(bulk)',
        outletId: 'Peliyagoda Depot',
        action: 'assigned',
        reasonCode: null,
        reasonNote: action.message || 'Suggested draft plan generated',
        decisionMaker: 'Planning Engine (Suggested Draft)',
        time: nowLocal(),
        previousAssignment: '-',
        updatedAssignment: 'Draft Generated',
        planVersion: state.draftRevision,
      };
      return {
        ...state,
        assignments: action.newAssignments,
        stopSequences: action.newStopSequences,
        tripMeta: { ...state.tripMeta, ...action.newTripMeta },
        ledger: [entry, ...state.ledger],
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'CHANGE_TRIP_VEHICLE': {
      const fromKey = tripKey(action.fromVehicleId, action.tripNo);
      const toKey = tripKey(action.toVehicleId, action.tripNo);

      const newAssignments: Record<string, OrderAssignment> = { ...state.assignments };
      let movedCount = 0;
      for (const [ref, a] of Object.entries(state.assignments)) {
        if (a.decision === 'served' && a.vehicleId === action.fromVehicleId && a.tripNo === action.tripNo) {
          newAssignments[ref] = { ...a, vehicleId: action.toVehicleId };
          movedCount++;
        }
      }
      if (movedCount === 0) return state;

      const newStopSequences = { ...state.stopSequences };
      if (newStopSequences[fromKey]) {
        newStopSequences[toKey] = newStopSequences[fromKey];
        delete newStopSequences[fromKey];
      }

      const newTripMeta = { ...state.tripMeta };
      if (newTripMeta[fromKey]) {
        newTripMeta[toKey] = newTripMeta[fromKey];
        delete newTripMeta[fromKey];
      }

      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-change-vehicle-${toKey}`,
        orderRef: `(${movedCount} orders)`,
        outletId: `${action.fromVehicleId} → ${action.toVehicleId} (Trip ${action.tripNo})`,
        action: 'reassigned',
        reasonCode: null,
        reasonNote: `Changed trip vehicle from ${action.fromVehicleId} to ${action.toVehicleId}`,
        decisionMaker: DECISION_MAKER,
        time: nowLocal(),
        previousAssignment: `${action.fromVehicleId} · Trip ${action.tripNo}`,
        updatedAssignment: `${action.toVehicleId} · Trip ${action.tripNo}`,
        planVersion: state.draftRevision,
      };

      return {
        ...state,
        assignments: newAssignments,
        stopSequences: newStopSequences,
        tripMeta: newTripMeta,
        ledger: [entry, ...state.ledger],
        draftRevision: state.draftRevision + 1,
      };
    }
    case 'RESET_PLAN': {
      return makeInitialState();
    }
    default:
      return state;
  }
}

interface DispatcherPlanValue {
  orders: S1Order[];
  fleetVehicles: FleetVehicle[];
  assignments: Record<string, OrderAssignment>;
  ledger: DecisionLedgerEntry[];
  draftRevision: number;
  releasedManifests: Manifest[];
  shortfallEvents: ShortfallEvent[];
  counts: { total: number; served: number; deferred: number; unresolved: number };
  ordersOnTrip: (vehicleId: string, tripNo: 1 | 2) => S1Order[];
  compatibleCandidates: (orderRef: string) => RankedCandidate[];
  getPassport: (orderRef: string, vehicleId: string, tripNo: 1 | 2) => PassportResult;
  getTripDeparture: (vehicleId: string, tripNo: 1 | 2) => string | null;
  getVehicleFuelInput: (vehicleId: string) => number | null;
  getTripStops: (vehicleId: string, tripNo: 1 | 2) => TripStop[];
  getTripSchedule: (vehicleId: string, tripNo: 1 | 2) => StopSchedule[] | null;
  getVehicleDistanceKm: (vehicleId: string) => number;
  assignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2) => void;
  reassignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) => void;
  deferOrder: (orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) => void;
  reorderTrip: (vehicleId: string, tripNo: 1 | 2, newOutletOrder: string[]) => void;
  setTripDeparture: (vehicleId: string, tripNo: 1 | 2, departureTime: string | null) => void;
  setVehicleFuelInput: (vehicleId: string, priorWeeklyFuelUsageL: number | null) => void;
  publishPlan: () => void;
  acknowledgeManifest: (revision: number) => void;
  reportShortfall: (orderRef: string) => void;
  setShortfallResolution: (id: string, resolution: 'replace' | 'defer', note: string) => void;
  applyDraftPlan: (newAssignments: Record<string, OrderAssignment>, newStopSequences: Record<string, string[]>, newTripMeta: Record<string, TripMeta>, message?: string) => void;
  resetPlan: () => void;
  generateSuggestedDraft: (preserveExisting?: boolean) => GeneratedDraftResult;
  isDraftGenerated: boolean;
  lastGeneratedResult: GeneratedDraftResult | null;
  changeTripVehicle: (fromVehicleId: string, toVehicleId: string, tripNo: 1 | 2) => void;
  canChangeTripVehicle: (fromVehicleId: string, toVehicleId: string, tripNo: 1 | 2) => { allowed: boolean; reason?: string };
  planChecklist: PlanCheckRow[];
}

const DispatcherPlanContext = createContext<DispatcherPlanValue | null>(null);

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [lastGeneratedResult, setLastGeneratedResult] = React.useState<GeneratedDraftResult | null>(null);

  const orders = useMemo(() => demoAdapter.listOrders(), []);
  const fleetVehicles = useMemo(() => demoAdapter.listFleetVehicles(), []);
  const allowances = useMemo(() => demoAdapter.listServiceAllowances(), []);
  const districtTravel = useMemo(() => demoAdapter.listDistrictTravel(), []);
  const ordersByRef = useMemo(() => new Map(orders.map(o => [o.orderRef, o])), [orders]);
  const vehiclesById = useMemo(() => new Map(fleetVehicles.map(v => [v.vehicleId, v])), [fleetVehicles]);
  const assignmentsMap = useMemo(() => new Map(Object.entries(state.assignments).map(([ref, a]) => [ref, a])), [state.assignments]);
  const stopSequencesMap = useMemo(() => new Map(Object.entries(state.stopSequences)), [state.stopSequences]);
  const tripMetaMap = useMemo(() => new Map(Object.entries(state.tripMeta)), [state.tripMeta]);
  const vehicleFuelInputsMap = useMemo(() => new Map(Object.entries(state.vehicleFuelInputs)), [state.vehicleFuelInputs]);

  const ordersOnTrip = useCallback((vehicleId: string, tripNo: 1 | 2): S1Order[] => {
    return getOrdersOnTrip(orders, assignmentsMap, vehicleId, tripNo);
  }, [orders, assignmentsMap]);

  const getPassport = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2): PassportResult => {
    return buildPassportForCandidate(orderRef, vehicleId, tripNo, orders, vehiclesById, allowances, districtTravel, assignmentsMap, stopSequencesMap, tripMetaMap, vehicleFuelInputsMap);
  }, [orders, vehiclesById, allowances, districtTravel, assignmentsMap, stopSequencesMap, tripMetaMap, vehicleFuelInputsMap]);

  const compatibleCandidates = useCallback((orderRef: string): RankedCandidate[] => {
    const order = ordersByRef.get(orderRef);
    if (!order) return [];
    const raw: { vehicle: FleetVehicle; tripNo: 1 | 2; passport: PassportResult; order: S1Order; existingOrdersInCandidateTrip: S1Order[] }[] = [];
    for (const vehicle of fleetVehicles) {
      if (vehicle.status !== 'available') continue;
      for (const tripNo of [1, 2] as const) {
        const passport = getPassport(orderRef, vehicle.vehicleId, tripNo);
        if (passport.checkerFeasible) {
          raw.push({ vehicle, tripNo, passport, order, existingOrdersInCandidateTrip: ordersOnTrip(vehicle.vehicleId, tripNo) });
        }
      }
    }
    return rankCandidates(raw);
  }, [fleetVehicles, getPassport, ordersByRef, ordersOnTrip]);

  const counts = useMemo(() => {
    let served = 0, deferred = 0, unresolved = 0;
    for (const a of Object.values(state.assignments)) {
      if (a.decision === 'served') served++;
      else if (a.decision === 'deferred') deferred++;
      else unresolved++;
    }
    return { total: orders.length, served, deferred, unresolved };
  }, [state.assignments, orders.length]);

  const planChecklist = useMemo(() => computeChecklist(state, orders, vehiclesById), [state, orders, vehiclesById]);

  const assignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2) => {
    dispatch({ type: 'ASSIGN', orderRef, vehicleId, tripNo });
  }, []);
  const reassignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) => {
    dispatch({ type: 'REASSIGN', orderRef, vehicleId, tripNo, reasonNote });
  }, []);
  const deferOrder = useCallback((orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) => {
    dispatch({ type: 'DEFER', orderRef, reasonCode, reasonNote });
  }, []);
  const reorderTrip = useCallback((vehicleId: string, tripNo: 1 | 2, newOutletOrder: string[]) => {
    dispatch({ type: 'REORDER', vehicleId, tripNo, newOutletOrder });
  }, []);
  const setTripDeparture = useCallback((vehicleId: string, tripNo: 1 | 2, departureTime: string | null) => {
    dispatch({ type: 'SET_TRIP_DEPARTURE', vehicleId, tripNo, departureTime });
  }, []);
  const setVehicleFuelInput = useCallback((vehicleId: string, priorWeeklyFuelUsageL: number | null) => {
    dispatch({ type: 'SET_VEHICLE_FUEL_INPUT', vehicleId, priorWeeklyFuelUsageL });
  }, []);
  const publishPlan = useCallback(() => dispatch({ type: 'PUBLISH', expectedRevision: state.draftRevision }), [state.draftRevision]);
  const acknowledgeManifest = useCallback((revision: number) => dispatch({ type: 'ACKNOWLEDGE_MANIFEST', revision }), []);
  const reportShortfall = useCallback((orderRef: string) => dispatch({ type: 'REPORT_SHORTFALL', orderRef }), []);
  const setShortfallResolution = useCallback((id: string, resolution: 'replace' | 'defer', note: string) => dispatch({ type: 'SET_SHORTFALL_RESOLUTION', id, resolution, note }), []);

  const applyDraftPlan = useCallback((newAssignments: Record<string, OrderAssignment>, newStopSequences: Record<string, string[]>, newTripMeta: Record<string, TripMeta>, message?: string) => {
    dispatch({ type: 'APPLY_DRAFT_PLAN', newAssignments, newStopSequences, newTripMeta, message });
  }, []);

  const resetPlan = useCallback(() => {
    setLastGeneratedResult(null);
    dispatch({ type: 'RESET_PLAN' });
  }, []);

  const generateSuggestedDraft = useCallback((preserveExisting = false): GeneratedDraftResult => {
    const result = generateSuggestedDraftPlan({
      orders,
      fleetVehicles,
      allowances,
      districtTravel,
      preserveExistingAssignments: preserveExisting,
      existingAssignments: state.assignments,
    });
    setLastGeneratedResult(result);
    dispatch({
      type: 'APPLY_DRAFT_PLAN',
      newAssignments: result.assignments,
      newStopSequences: result.stopSequences,
      newTripMeta: result.tripMeta,
      message: `Suggested draft plan generated: ${result.summary.allocatedCount} allocated across ${result.summary.tripsCreated} trips. ${result.summary.unplacedCount} orders need decisions.`,
    });
    return result;
  }, [orders, fleetVehicles, allowances, districtTravel, state.assignments]);

  const isDraftGenerated = useMemo(() => {
    return counts.served > 0 || lastGeneratedResult !== null;
  }, [counts.served, lastGeneratedResult]);

  const getTripDeparture = useCallback((vehicleId: string, tripNo: 1 | 2) => state.tripMeta[tripKey(vehicleId, tripNo)]?.plannedDepartureTime ?? null, [state.tripMeta]);
  const getVehicleFuelInput = useCallback((vehicleId: string) => state.vehicleFuelInputs[vehicleId] ?? null, [state.vehicleFuelInputs]);

  const getTripStops = useCallback((vehicleId: string, tripNo: 1 | 2): TripStop[] => {
    const key = tripKey(vehicleId, tripNo);
    const tripOrders = ordersOnTrip(vehicleId, tripNo);
    const seq = stopSequencesMap.get(key) ?? Array.from(new Set(tripOrders.map(o => o.outletId)));
    return buildTripStops(seq, tripOrders.map(o => o.orderRef), ordersByRef);
  }, [ordersOnTrip, stopSequencesMap, ordersByRef]);

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

  const canChangeTripVehicle = useCallback((fromVehicleId: string, toVehicleId: string, tripNo: 1 | 2): { allowed: boolean; reason?: string } => {
    if (fromVehicleId === toVehicleId) return { allowed: false, reason: 'Source and target vehicle are identical.' };
    const targetVeh = vehiclesById.get(toVehicleId);
    if (!targetVeh) return { allowed: false, reason: 'Vehicle does not exist.' };
    if (targetVeh.status !== 'available') return { allowed: false, reason: `Vehicle is ${targetVeh.status}.` };

    const tripOrders = ordersOnTrip(fromVehicleId, tripNo);
    if (tripOrders.length === 0) return { allowed: false, reason: 'No orders on source trip.' };

    const existingTargetOrders = ordersOnTrip(toVehicleId, tripNo);
    if (existingTargetOrders.length > 0) return { allowed: false, reason: `Vehicle ${toVehicleId} already has Trip ${tripNo} assigned.` };

    const totalWeight = tripOrders.reduce((sum, o) => sum + o.orderWeightKg, 0);
    const totalVolume = tripOrders.reduce((sum, o) => sum + o.orderVolumeM3, 0);

    if (totalWeight > targetVeh.weightCapKg) {
      return { allowed: false, reason: `Total weight (${totalWeight.toFixed(1)} kg) exceeds capacity (${targetVeh.weightCapKg} kg).` };
    }
    if (totalVolume > targetVeh.volumeCapM3) {
      return { allowed: false, reason: `Total volume (${totalVolume.toFixed(2)} m³) exceeds capacity (${targetVeh.volumeCapM3} m³).` };
    }

    const hasChilled = tripOrders.some(o => o.tempRequirement === 'chilled');
    if (hasChilled && targetVeh.temp !== 'reefer') {
      return { allowed: false, reason: 'Requires reefer vehicle for chilled goods.' };
    }

    const requiresVan = tripOrders.some(o => o.parkingConstraint === 'van_only');
    const isVan = targetVeh.type === 'van';
    if (requiresVan && !isVan) {
      return { allowed: false, reason: 'Outlet access constraint requires a van (cannot use truck).' };
    }

    return { allowed: true };
  }, [vehiclesById, ordersOnTrip]);

  const changeTripVehicle = useCallback((fromVehicleId: string, toVehicleId: string, tripNo: 1 | 2) => {
    dispatch({ type: 'CHANGE_TRIP_VEHICLE', fromVehicleId, toVehicleId, tripNo });
  }, []);

  const value: DispatcherPlanValue = {
    orders, fleetVehicles, assignments: state.assignments, ledger: state.ledger,
    draftRevision: state.draftRevision, releasedManifests: state.releasedManifests, shortfallEvents: state.shortfallEvents,
    counts, ordersOnTrip, compatibleCandidates, getPassport, getTripDeparture, getVehicleFuelInput,
    getTripStops, getTripSchedule, getVehicleDistanceKm,
    assignOrder, reassignOrder, deferOrder, reorderTrip, setTripDeparture, setVehicleFuelInput,
    publishPlan, acknowledgeManifest, reportShortfall, setShortfallResolution, planChecklist,
    applyDraftPlan, resetPlan, generateSuggestedDraft, isDraftGenerated, lastGeneratedResult,
    changeTripVehicle, canChangeTripVehicle,
  };

  return <DispatcherPlanContext.Provider value={value}>{children}</DispatcherPlanContext.Provider>;
}

export function useDispatcherPlan(): DispatcherPlanValue {
  const ctx = useContext(DispatcherPlanContext);
  if (!ctx) throw new Error('useDispatcherPlan must be used within PlanningProvider');
  return ctx;
}
