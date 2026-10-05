/* ─── Shared types & constants for Driver Portal ─────────────────────────── */

export type StopStatus = "next" | "upcoming" | "completed";
export type TabId = "myRun" | "currentStop" | "history";

export interface Stop {
  id: number;
  stopId?: string;
  code: string;
  name: string;
  address?: string;
  district?: string;
  depot?: string;
  dockType?: string;
  parkingConstraint?: string;
  managerName?: string;
  managerPhone?: string;
  outlets: number;
  orders: string[];
  units?: number;
  weightKg?: number;
  volumeM3?: number;
  tempRequirement?: string;
  status: StopStatus;
  timeWindow: string;
  windowOpen?: string;
  windowClose?: string;
  orderDetails?: StopOrderDetail[];
  loadingNotes?: StopLoadingNote[];
}

/** Per-order quantities for a stop, straight from the server (effective = after any loading shortfall). */
export interface StopOrderDetail {
  orderRef: string;
  units: number;
  plannedUnits: number;
  weightKg?: number;
  volumeM3?: number;
  tempRequirement?: string;
}

/** A real loader issue recorded against an order carried to this stop. */
export interface StopLoadingNote {
  orderRef: string;
  issueType: string;
  unitsAffected: number;
  status: string;
  actionTaken?: string | null;
  plannedUnits?: number | null;
  effectiveUnits?: number | null;
}

export function describeLoadingNote(n: StopLoadingNote): string {
  const outcome =
    n.status === "resolved"
      ? n.actionTaken === "replace_from_stock"
        ? "replaced from stock before departure"
        : "shipped short per shortfall policy"
      : n.status === "escalated"
      ? "escalated to the dispatcher"
      : "still open";
  return `Loading issue on order ${n.orderRef}: ${n.issueType} (${n.unitsAffected} units) - ${outcome}.`;
}

export function describePlanChange(n: StopLoadingNote): string | null {
  if (n.plannedUnits != null && n.effectiveUnits != null && n.effectiveUnits < n.plannedUnits) {
    return `Order ${n.orderRef}: ${n.plannedUnits} units planned, ${n.effectiveUnits} loaded - the reduced quantity is what you deliver.`;
  }
  return null;
}
