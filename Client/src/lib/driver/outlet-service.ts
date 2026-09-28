import { MOCK_OUTLETS } from "@/data/mockData";

export interface OutletContact {
  outletId: string;
  name: string;
  phone?: string;
  managerName?: string;
  address?: string;
  dockType?: string;
  windowTime?: string;
}

/**
 * Retrieve verified outlet contact information from official dataset.
 * Returns null if outlet is not found.
 * Phone is ONLY present if valid non-empty contact info exists in data.
 */
export function getOutletContact(outletId: string): OutletContact | null {
  if (!outletId) return null;
  
  const match = MOCK_OUTLETS.find(
    (o) => o.outlet_id.toLowerCase() === outletId.toLowerCase() ||
           outletId.toLowerCase().includes(o.outlet_id.toLowerCase())
  );
  
  if (!match) return null;

  // Strict check: only return phone if valid string in dataset
  const rawPhone = match.phone?.trim();
  const phone = rawPhone && rawPhone.length > 5 ? rawPhone : undefined;

  return {
    outletId: match.outlet_id,
    name: match.name,
    phone,
    managerName: match.manager_name,
    address: match.address,
    dockType: match.dock_type,
    windowTime: `${match.window_open_time} - ${match.window_close_time}`,
  };
}
