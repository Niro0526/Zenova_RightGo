/* ─── Shared types & constants ─────────────────────────────── */

export type StopStatus = "next" | "upcoming" | "completed";
export type TabId = "myRun" | "currentStop" | "history";

export interface Stop {
  id: number;
  code: string;
  name: string;
  outlets: number;
  orders: string[];
  status: StopStatus;
  timeWindow: string;
}

export const STOPS: Stop[] = [
  {
    id: 1,
    code: "OUT001",
    name: "Colpetty Retailer",
    outlets: 1,
    orders: ["S1-000", "S1-001"],
    status: "next",
    timeWindow: "05:00 – 07:30",
  },
  {
    id: 2,
    code: "OUT002",
    name: "Nugegoda Corner Store",
    outlets: 1,
    orders: ["S2-000"],
    status: "upcoming",
    timeWindow: "07:30 – 09:00",
  },
  {
    id: 3,
    code: "OUT003",
    name: "Mount Lavinia Super",
    outlets: 1,
    orders: ["S3-000"],
    status: "upcoming",
    timeWindow: "09:00 – 10:30",
  },
  {
    id: 4,
    code: "OUT004",
    name: "Dehiwala Co-op",
    outlets: 1,
    orders: ["S4-000"],
    status: "upcoming",
    timeWindow: "10:30 – 12:00",
  },
];
