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
}

/**
 * Baseline fallback stops matching official competition dataset (Rules/data/General Data/outlets.csv & task2b_peak_day_scenarios.csv)
 */
export const STOPS: Stop[] = [
  {
    id: 1,
    stopId: "OUT001",
    code: "OUT001",
    name: "OUT001 / Colombo Fresh Outlet",
    address: "No. 001 Commercial Ave, Colombo",
    district: "Colombo",
    depot: "Peliyagoda",
    dockType: "street",
    parkingConstraint: "van_only",
    managerName: "Manager OUT001",
    managerPhone: "+94 77 100001",
    outlets: 1,
    orders: ["S1-000", "S1-001"],
    units: 92,
    weightKg: 546.4,
    volumeM3: 2.945,
    tempRequirement: "ambient, chilled",
    status: "next",
    timeWindow: "05:00 – 07:30",
    windowOpen: "05:00",
    windowClose: "07:30",
  },
  {
    id: 2,
    stopId: "OUT002",
    code: "OUT002",
    name: "OUT002 / Colombo Fresh Outlet",
    address: "No. 002 Commercial Ave, Colombo",
    district: "Colombo",
    depot: "Peliyagoda",
    dockType: "street",
    parkingConstraint: "van_only",
    managerName: "Manager OUT002",
    managerPhone: "+94 77 100002",
    outlets: 1,
    orders: ["S1-002", "S1-003"],
    units: 56,
    weightKg: 459.9,
    volumeM3: 2.509,
    tempRequirement: "ambient, chilled",
    status: "upcoming",
    timeWindow: "05:30 – 08:00",
    windowOpen: "05:30",
    windowClose: "08:00",
  },
  {
    id: 3,
    stopId: "OUT003",
    code: "OUT003",
    name: "OUT003 / Colombo Fresh Outlet",
    address: "No. 003 Commercial Ave, Colombo",
    district: "Colombo",
    depot: "Peliyagoda",
    dockType: "street",
    parkingConstraint: "van_only",
    managerName: "Manager OUT003",
    managerPhone: "+94 77 100003",
    outlets: 1,
    orders: ["S1-004", "S1-005"],
    units: 70,
    weightKg: 478.7,
    volumeM3: 2.595,
    tempRequirement: "ambient, chilled",
    status: "upcoming",
    timeWindow: "05:00 – 07:30",
    windowOpen: "05:00",
    windowClose: "07:30",
  },
  {
    id: 4,
    stopId: "OUT004",
    code: "OUT004",
    name: "OUT004 / Colombo Fresh Outlet",
    address: "No. 004 Commercial Ave, Colombo",
    district: "Colombo",
    depot: "Peliyagoda",
    dockType: "street",
    parkingConstraint: "normal",
    managerName: "Manager OUT004",
    managerPhone: "+94 77 100004",
    outlets: 1,
    orders: ["S1-006", "S1-007"],
    units: 114,
    weightKg: 873.3,
    volumeM3: 4.611,
    tempRequirement: "ambient, chilled",
    status: "upcoming",
    timeWindow: "05:30 – 08:00",
    windowOpen: "05:30",
    windowClose: "08:00",
  },
];
