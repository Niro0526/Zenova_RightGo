import { apiGet } from "@/lib/api-client";

export interface OutletContact {
  outletId: string;
  name: string;
  managerName: string;
  phone: string;
  address: string;
}

let outletCache: OutletContact[] | null = null;

async function loadOutlets(): Promise<OutletContact[]> {
  if (outletCache) return outletCache;
  try {
    const rows = await apiGet<
      Array<{
        outlet_id: string;
        name: string;
        manager_name?: string;
        phone?: string;
        address?: string;
      }>
    >("/reference/outlets");
    outletCache = rows.map((o) => ({
      outletId: o.outlet_id,
      name: o.name,
      managerName: o.manager_name || "Store Manager",
      phone: o.phone || "+94 77 0000000",
      address: o.address || "Commercial Ave",
    }));
  } catch {
    outletCache = [];
  }
  return outletCache;
}

export function getOutletContact(outletId: string): OutletContact {
  const cached = outletCache?.find((o) => o.outletId === outletId);
  if (cached) return cached;
  void loadOutlets();
  return {
    outletId,
    name: outletId,
    managerName: "Store Manager",
    phone: "+94 77 0000000",
    address: "Commercial Ave",
  };
}

export async function prefetchOutletContacts(): Promise<void> {
  await loadOutlets();
}
