'use client';

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { demoAdapter } from '@/lib/dispatcher/adapter';
import { buildPassport, validatePlan, type FleetVehicle, type PlanCheckRow } from '@/lib/dispatcher/validation';
import type {
  DecisionLedgerAction,
  DecisionLedgerEntry,
  DeferReasonCode,
  OrderAssignment,
  PassportResult,
  S1Order,
} from '@/types/dispatcher';

const DECISION_MAKER = 'Sarah Jenkins'; // matches the fixed demo persona shown in the sidebar

interface PlanningState {
  assignments: Record<string, OrderAssignment>;
  ledger: DecisionLedgerEntry[];
  planVersion: number;
  published: boolean;
}

type Action =
  | { type: 'ASSIGN'; orderRef: string; vehicleId: string; tripNo: 1 | 2 }
  | { type: 'DEFER'; orderRef: string; reasonCode: DeferReasonCode; reasonNote: string }
  | { type: 'REASSIGN'; orderRef: string; vehicleId: string; tripNo: 1 | 2; reasonNote: string }
  | { type: 'PUBLISH' };

function nowLocal(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function assignmentLabel(a: OrderAssignment | undefined): string {
  if (!a || a.decision !== 'served' || !a.vehicleId || !a.tripNo) return '-';
  return `${a.vehicleId} · Trip ${a.tripNo}`;
}

function makeInitialState(): PlanningState {
  const orders = demoAdapter.listOrders();
  const assignments: Record<string, OrderAssignment> = {};
  for (const o of orders) {
    // Real task2b_peak_day_scenarios.csv carries no decision/vehicle/trip columns -
    // the only honest initial state is every order unresolved until the dispatcher acts.
    assignments[o.orderRef] = { decision: 'unresolved', vehicleId: null, tripNo: null, reasonCode: null, reasonNote: null };
  }
  return { assignments, ledger: [], planVersion: 1, published: false };
}

function reducer(state: PlanningState, action: Action): PlanningState {
  switch (action.type) {
    case 'ASSIGN': {
      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'served', vehicleId: action.vehicleId, tripNo: action.tripNo, reasonCode: null, reasonNote: null };
      const order = demoAdapter.listOrders().find(o => o.orderRef === action.orderRef)!;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`,
        orderRef: action.orderRef,
        outletId: order.outletId,
        action: prev.decision === 'served' ? 'reassigned' : 'assigned',
        reasonCode: null,
        reasonNote: null,
        decisionMaker: DECISION_MAKER,
        time: nowLocal(),
        previousAssignment: assignmentLabel(prev),
        updatedAssignment: assignmentLabel(next),
        planVersion: state.planVersion,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
      };
    }
    case 'REASSIGN': {
      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'served', vehicleId: action.vehicleId, tripNo: action.tripNo, reasonCode: null, reasonNote: null };
      const order = demoAdapter.listOrders().find(o => o.orderRef === action.orderRef)!;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`,
        orderRef: action.orderRef,
        outletId: order.outletId,
        action: 'reassigned',
        reasonCode: null,
        reasonNote: action.reasonNote,
        decisionMaker: DECISION_MAKER,
        time: nowLocal(),
        previousAssignment: assignmentLabel(prev),
        updatedAssignment: assignmentLabel(next),
        planVersion: state.planVersion,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
      };
    }
    case 'DEFER': {
      const prev = state.assignments[action.orderRef];
      const next: OrderAssignment = { decision: 'deferred', vehicleId: null, tripNo: null, reasonCode: action.reasonCode, reasonNote: action.reasonNote || null };
      const order = demoAdapter.listOrders().find(o => o.orderRef === action.orderRef)!;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-${action.orderRef}`,
        orderRef: action.orderRef,
        outletId: order.outletId,
        action: 'deferred',
        reasonCode: action.reasonCode,
        reasonNote: action.reasonNote || null,
        decisionMaker: DECISION_MAKER,
        time: nowLocal(),
        previousAssignment: assignmentLabel(prev),
        updatedAssignment: '-',
        planVersion: state.planVersion,
      };
      return {
        ...state,
        assignments: { ...state.assignments, [action.orderRef]: next },
        ledger: [entry, ...state.ledger],
      };
    }
    case 'PUBLISH': {
      const nextVersion = state.planVersion + 1;
      const entry: DecisionLedgerEntry = {
        id: `${Date.now()}-publish`,
        orderRef: '(plan)',
        outletId: '-',
        action: 'published',
        reasonCode: null,
        reasonNote: `Local/demo publish - Plan v${nextVersion}. No server-side release exists; this only updates session-local state.`,
        decisionMaker: DECISION_MAKER,
        time: nowLocal(),
        previousAssignment: `Plan v${state.planVersion}`,
        updatedAssignment: `Plan v${nextVersion}`,
        planVersion: nextVersion,
      };
      return { ...state, planVersion: nextVersion, published: true, ledger: [entry, ...state.ledger] };
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
  planVersion: number;
  published: boolean;
  counts: { total: number; served: number; deferred: number; unresolved: number };
  /** Orders currently sitting on a given vehicle/trip slot. */
  ordersOnTrip: (vehicleId: string, tripNo: 1 | 2) => S1Order[];
  /** Every candidate (vehicle, tripNo) that passes ALL checker rules for this order. */
  compatibleCandidates: (orderRef: string) => { vehicle: FleetVehicle; tripNo: 1 | 2; passport: PassportResult }[];
  getPassport: (orderRef: string, vehicleId: string, tripNo: 1 | 2) => PassportResult;
  assignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2) => void;
  reassignOrder: (orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) => void;
  deferOrder: (orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) => void;
  publishPlan: () => void;
  planChecklist: PlanCheckRow[];
}

const DispatcherPlanContext = createContext<DispatcherPlanValue | null>(null);

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  const orders = useMemo(() => demoAdapter.listOrders(), []);
  const fleetVehicles = useMemo(() => demoAdapter.listFleetVehicles(), []);
  const allowances = useMemo(() => demoAdapter.listServiceAllowances(), []);
  const districtTravel = useMemo(() => demoAdapter.listDistrictTravel(), []);
  const ordersByRef = useMemo(() => new Map(orders.map(o => [o.orderRef, o])), [orders]);
  const vehiclesById = useMemo(() => new Map(fleetVehicles.map(v => [v.vehicleId, v])), [fleetVehicles]);

  const ordersOnTrip = useCallback((vehicleId: string, tripNo: 1 | 2): S1Order[] => {
    const refs: string[] = [];
    for (const [orderRef, a] of Object.entries(state.assignments)) {
      if (a.decision === 'served' && a.vehicleId === vehicleId && a.tripNo === tripNo) refs.push(orderRef);
    }
    return refs.map(r => ordersByRef.get(r)!);
  }, [state.assignments, ordersByRef]);

  const getPassport = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2): PassportResult => {
    const order = ordersByRef.get(orderRef)!;
    const vehicle = vehiclesById.get(vehicleId)!;
    const existingOrdersInCandidateTrip = ordersOnTrip(vehicleId, tripNo).filter(o => o.orderRef !== orderRef);
    const otherTripNo = tripNo === 1 ? 2 : 1;
    const otherTripOrders = ordersOnTrip(vehicleId, otherTripNo);
    return buildPassport({
      order, vehicle, candidateTripNo: tripNo, existingOrdersInCandidateTrip, otherTripOrders,
      ordersByRef, allowances, districtTravel,
    });
  }, [ordersByRef, vehiclesById, ordersOnTrip, allowances, districtTravel]);

  const compatibleCandidates = useCallback((orderRef: string) => {
    const out: { vehicle: FleetVehicle; tripNo: 1 | 2; passport: PassportResult }[] = [];
    for (const vehicle of fleetVehicles) {
      if (vehicle.status !== 'available') continue;
      for (const tripNo of [1, 2] as const) {
        const passport = getPassport(orderRef, vehicle.vehicleId, tripNo);
        if (passport.checkerFeasible) out.push({ vehicle, tripNo, passport });
      }
    }
    return out;
  }, [fleetVehicles, getPassport]);

  const counts = useMemo(() => {
    let served = 0, deferred = 0, unresolved = 0;
    for (const a of Object.values(state.assignments)) {
      if (a.decision === 'served') served++;
      else if (a.decision === 'deferred') deferred++;
      else unresolved++;
    }
    return { total: orders.length, served, deferred, unresolved };
  }, [state.assignments, orders.length]);

  const planChecklist = useMemo(() => validatePlan({
    orders,
    decisions: new Map(Object.entries(state.assignments).map(([ref, a]) => [ref, { decision: a.decision, vehicleId: a.vehicleId, tripNo: a.tripNo, reasonCode: a.reasonCode }])),
    vehiclesById,
    allowances,
    districtTravel,
  }), [orders, state.assignments, vehiclesById, allowances, districtTravel]);

  const assignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2) => {
    dispatch({ type: 'ASSIGN', orderRef, vehicleId, tripNo });
  }, []);
  const reassignOrder = useCallback((orderRef: string, vehicleId: string, tripNo: 1 | 2, reasonNote: string) => {
    dispatch({ type: 'REASSIGN', orderRef, vehicleId, tripNo, reasonNote });
  }, []);
  const deferOrder = useCallback((orderRef: string, reasonCode: DeferReasonCode, reasonNote: string) => {
    dispatch({ type: 'DEFER', orderRef, reasonCode, reasonNote });
  }, []);
  const publishPlan = useCallback(() => dispatch({ type: 'PUBLISH' }), []);

  const value: DispatcherPlanValue = {
    orders, fleetVehicles, assignments: state.assignments, ledger: state.ledger,
    planVersion: state.planVersion, published: state.published, counts,
    ordersOnTrip, compatibleCandidates, getPassport,
    assignOrder, reassignOrder, deferOrder, publishPlan, planChecklist,
  };

  return <DispatcherPlanContext.Provider value={value}>{children}</DispatcherPlanContext.Provider>;
}

export function useDispatcherPlan(): DispatcherPlanValue {
  const ctx = useContext(DispatcherPlanContext);
  if (!ctx) throw new Error('useDispatcherPlan must be used within PlanningProvider');
  return ctx;
}
