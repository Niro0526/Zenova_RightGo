// Deterministic snapshot of the real Tech-Triathlon dataset, transcribed
// verbatim from data/task2b_peak_day_scenarios.csv, data/task2b_peak_day_fleet.csv,
// data/vehicles.csv, data/service_allowance.csv and data/district_travel.csv
// on 2026-09-28. This is NOT a procedurally-generated fixture — every row
// below matches the source CSV row-for-row. If the CSVs are updated, re-run
// the transcription and the assertions at the bottom will catch drift.
//
// No CSV-parser dependency is introduced; this file IS the parsed result,
// kept in sync by hand against the source of truth in data/.

import type {
  Brand,
  DistrictTravel,
  DockType,
  FleetStatus,
  ParkingConstraint,
  S1Order,
  ServiceAllowance,
  TempRequirement,
  Vehicle,
} from './types';

// --- S1_ORDERS: data/task2b_peak_day_scenarios.csv (85 rows) ---------------
// Tuple columns match the CSV header order exactly:
// [order_ref, outlet_id, brand, district, dock_type, parking_constraint,
//  mall_window, window_open, window_close, temp, units, weight_kg, volume_m3,
//  deferred_yesterday, days_since_last_served]
type OrderRow = [
  string, string, Brand, string, DockType, ParkingConstraint,
  string | null, string, string, TempRequirement, number, number, number,
  0 | 1, number,
];

const ORDER_ROWS: OrderRow[] = [
  ['S1-000', 'OUT001', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:00', '07:30', 'ambient', 12, 97.8, 0.5, 0, 1],
  ['S1-001', 'OUT001', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:00', '07:30', 'chilled', 80, 448.6, 2.445, 0, 2],
  ['S1-002', 'OUT002', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:30', '08:00', 'ambient', 18, 130.9, 0.666, 0, 2],
  ['S1-003', 'OUT002', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:30', '08:00', 'chilled', 38, 329.0, 1.843, 0, 1],
  ['S1-004', 'OUT003', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:00', '07:30', 'ambient', 28, 160.6, 0.87, 0, 1],
  ['S1-005', 'OUT003', 'Fresh', 'Colombo', 'street', 'van_only', null, '05:00', '07:30', 'chilled', 42, 318.1, 1.725, 0, 2],
  ['S1-006', 'OUT004', 'Fresh', 'Colombo', 'street', 'normal', null, '05:30', '08:00', 'ambient', 40, 305.6, 1.686, 0, 1],
  ['S1-007', 'OUT004', 'Fresh', 'Colombo', 'street', 'normal', null, '05:30', '08:00', 'chilled', 74, 567.7, 2.925, 0, 1],
  ['S1-008', 'OUT005', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '04:00', '07:45', 'ambient', 102, 751.8, 3.631, 0, 1],
  ['S1-009', 'OUT005', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '04:00', '07:45', 'chilled', 250, 1696.6, 10.09, 0, 2],
  ['S1-010', 'OUT006', 'Fresh', 'Colombo', 'street', 'normal', null, '03:00', '08:00', 'ambient', 105, 798.7, 4.373, 0, 2],
  ['S1-011', 'OUT007', 'Fresh', 'Colombo', 'street', 'normal', null, '05:30', '08:00', 'ambient', 169, 1045.8, 5.697, 0, 1],
  ['S1-012', 'OUT007', 'Fresh', 'Colombo', 'street', 'normal', null, '05:30', '08:00', 'chilled', 262, 1991.0, 11.722, 0, 2],
  ['S1-013', 'OUT008', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 53, 401.2, 2.18, 0, 1],
  ['S1-014', 'OUT008', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 102, 713.9, 4.003, 0, 1],
  ['S1-015', 'OUT009', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '04:00', '07:45', 'ambient', 42, 333.7, 1.995, 0, 1],
  ['S1-016', 'OUT009', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '04:00', '07:45', 'chilled', 230, 1241.3, 6.944, 0, 1],
  ['S1-017', 'OUT010', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 57, 414.6, 2.59, 0, 2],
  ['S1-018', 'OUT011', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 83, 564.5, 2.638, 0, 2],
  ['S1-019', 'OUT012', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 71, 464.1, 2.479, 0, 2],
  ['S1-020', 'OUT013', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 180, 1265.2, 6.274, 1, 2],
  ['S1-021', 'OUT013', 'Fresh', 'Colombo', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 234, 2007.0, 9.898, 0, 1],
  ['S1-022', 'OUT014', 'Fresh', 'Colombo', 'street', 'normal', null, '05:30', '08:00', 'ambient', 56, 357.2, 1.899, 0, 2],
  ['S1-023', 'OUT022', 'Tech', 'Colombo', 'mall_bay', 'mall_dock', '10:00-12:00', '10:00', '12:00', 'ambient', 8, 1695.8, 5.39, 1, 5],
  ['S1-024', 'OUT023', 'Tech', 'Colombo', 'street', 'normal', null, '09:00', '17:00', 'ambient', 4, 896.0, 2.741, 0, 1],
  ['S1-025', 'OUT024', 'Tech', 'Colombo', 'rear_dock', 'normal', null, '09:00', '17:00', 'ambient', 7, 1566.3, 4.653, 1, 5],
  ['S1-026', 'OUT025', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 49, 265.4, 1.473, 0, 2],
  ['S1-027', 'OUT026', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 52, 420.8, 2.304, 0, 1],
  ['S1-028', 'OUT026', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '03:00', '08:00', 'chilled', 170, 1190.1, 6.368, 0, 2],
  ['S1-029', 'OUT027', 'Fresh', 'Gampaha', 'street', 'normal', null, '05:00', '07:30', 'ambient', 62, 376.0, 1.994, 0, 2],
  ['S1-030', 'OUT028', 'Fresh', 'Gampaha', 'street', 'normal', null, '03:00', '08:00', 'ambient', 77, 554.1, 2.831, 0, 2],
  ['S1-031', 'OUT028', 'Fresh', 'Gampaha', 'street', 'normal', null, '03:00', '08:00', 'chilled', 182, 1209.9, 6.883, 0, 2],
  ['S1-032', 'OUT029', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 86, 588.5, 3.015, 0, 2],
  ['S1-033', 'OUT029', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:30', '08:00', 'chilled', 131, 1036.8, 6.227, 0, 1],
  ['S1-034', 'OUT030', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 73, 545.4, 2.759, 0, 1],
  ['S1-035', 'OUT030', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '03:00', '08:00', 'chilled', 230, 1202.9, 7.427, 0, 2],
  ['S1-036', 'OUT031', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 175, 1160.0, 6.652, 0, 2],
  ['S1-037', 'OUT032', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '04:00', '07:45', 'ambient', 131, 820.7, 4.652, 0, 1],
  ['S1-038', 'OUT032', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '04:00', '07:45', 'chilled', 400, 2836.8, 14.41, 1, 2],
  ['S1-039', 'OUT033', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 84, 610.7, 3.502, 0, 1],
  ['S1-040', 'OUT034', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 84, 664.3, 3.378, 0, 1],
  ['S1-041', 'OUT034', 'Fresh', 'Gampaha', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 192, 1257.9, 6.742, 1, 2],
  ['S1-042', 'OUT040', 'Fresh', 'Kalutara', 'street', 'normal', null, '03:00', '08:00', 'ambient', 90, 618.1, 3.427, 0, 1],
  ['S1-043', 'OUT041', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 61, 416.4, 2.13, 0, 1],
  ['S1-044', 'OUT042', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 127, 1020.6, 5.225, 0, 1],
  ['S1-045', 'OUT043', 'Fresh', 'Kalutara', 'street', 'normal', null, '05:00', '07:30', 'ambient', 41, 225.5, 1.332, 1, 3],
  ['S1-046', 'OUT043', 'Fresh', 'Kalutara', 'street', 'normal', null, '05:00', '07:30', 'chilled', 115, 951.0, 5.075, 0, 2],
  ['S1-047', 'OUT044', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 59, 419.5, 2.218, 0, 1],
  ['S1-048', 'OUT044', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '03:00', '08:00', 'chilled', 112, 907.2, 5.024, 0, 1],
  ['S1-049', 'OUT045', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 52, 333.1, 1.914, 0, 1],
  ['S1-050', 'OUT046', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 42, 286.6, 1.631, 1, 3],
  ['S1-051', 'OUT046', 'Fresh', 'Kalutara', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 176, 1072.0, 5.933, 0, 1],
  ['S1-052', 'OUT050', 'Fresh', 'Galle', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 54, 524.9, 2.592, 0, 2],
  ['S1-053', 'OUT051', 'Fresh', 'Galle', 'street', 'normal', null, '03:00', '08:00', 'ambient', 35, 294.5, 1.375, 0, 2],
  ['S1-054', 'OUT052', 'Fresh', 'Galle', 'street', 'normal', null, '05:00', '07:30', 'ambient', 101, 578.7, 3.791, 0, 1],
  ['S1-055', 'OUT053', 'Fresh', 'Galle', 'street', 'normal', null, '03:00', '08:00', 'ambient', 25, 186.0, 0.996, 0, 1],
  ['S1-056', 'OUT053', 'Fresh', 'Galle', 'street', 'normal', null, '03:00', '08:00', 'chilled', 80, 670.7, 3.754, 0, 2],
  ['S1-057', 'OUT054', 'Fresh', 'Galle', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 104, 747.3, 4.307, 0, 1],
  ['S1-058', 'OUT054', 'Fresh', 'Galle', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 547, 2741.8, 16.515, 0, 1],
  ['S1-059', 'OUT055', 'Fresh', 'Galle', 'street', 'normal', null, '05:00', '07:30', 'ambient', 74, 401.4, 2.236, 0, 2],
  ['S1-060', 'OUT056', 'Style', 'Galle', 'mall_bay', 'mall_dock', '10:00-12:00', '10:00', '12:00', 'ambient', 31, 516.7, 7.858, 0, 1],
  ['S1-061', 'OUT057', 'Style', 'Galle', 'street', 'normal', null, '09:00', '17:00', 'ambient', 59, 799.0, 11.822, 0, 1],
  ['S1-062', 'OUT059', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '04:00', '07:45', 'ambient', 93, 561.5, 3.388, 0, 2],
  ['S1-063', 'OUT060', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 60, 464.4, 2.3, 0, 1],
  ['S1-064', 'OUT060', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '03:00', '08:00', 'chilled', 186, 1277.8, 6.784, 0, 1],
  ['S1-065', 'OUT061', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 66, 461.0, 2.23, 0, 1],
  ['S1-066', 'OUT062', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 89, 678.1, 3.425, 0, 2],
  ['S1-067', 'OUT062', 'Fresh', 'Matara', 'rear_dock', 'normal', null, '05:30', '08:00', 'chilled', 128, 930.2, 5.194, 0, 1],
  ['S1-068', 'OUT063', 'Style', 'Matara', 'street', 'normal', null, '09:00', '17:00', 'ambient', 29, 469.2, 7.494, 1, 5],
  ['S1-069', 'OUT064', 'Tech', 'Matara', 'rear_dock', 'normal', null, '09:00', '17:00', 'ambient', 3, 477.9, 1.55, 0, 1],
  ['S1-070', 'OUT065', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 76, 505.3, 2.598, 0, 1],
  ['S1-071', 'OUT065', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '05:30', '08:00', 'chilled', 298, 2218.9, 12.035, 0, 1],
  ['S1-072', 'OUT066', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '04:00', '07:45', 'ambient', 58, 382.5, 2.095, 0, 1],
  ['S1-073', 'OUT066', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '04:00', '07:45', 'chilled', 163, 1049.3, 5.766, 0, 1],
  ['S1-074', 'OUT067', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '05:00', '07:30', 'ambient', 64, 433.8, 2.349, 0, 1],
  ['S1-075', 'OUT067', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '05:00', '07:30', 'chilled', 221, 1325.1, 7.238, 0, 2],
  ['S1-076', 'OUT068', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 53, 426.1, 2.032, 0, 2],
  ['S1-077', 'OUT069', 'Fresh', 'Kurunegala', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 67, 504.2, 2.482, 0, 1],
  ['S1-078', 'OUT070', 'Style', 'Kurunegala', 'rear_dock', 'normal', null, '09:00', '17:00', 'ambient', 42, 2561.6, 40.66, 0, 2],
  ['S1-079', 'OUT071', 'Style', 'Kurunegala', 'street', 'normal', null, '09:00', '17:00', 'ambient', 34, 531.8, 9.379, 1, 5],
  ['S1-080', 'OUT072', 'Tech', 'Kurunegala', 'rear_dock', 'normal', null, '09:00', '17:00', 'ambient', 6, 1006.3, 3.72, 0, 1],
  ['S1-081', 'OUT073', 'Fresh', 'Puttalam', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 63, 402.3, 2.38, 0, 1],
  ['S1-082', 'OUT074', 'Fresh', 'Puttalam', 'rear_dock', 'normal', null, '05:30', '08:00', 'ambient', 69, 532.1, 2.618, 0, 1],
  ['S1-083', 'OUT074', 'Fresh', 'Puttalam', 'rear_dock', 'normal', null, '05:30', '08:00', 'chilled', 205, 1588.8, 8.659, 1, 5],
  ['S1-084', 'OUT075', 'Fresh', 'Puttalam', 'rear_dock', 'normal', null, '03:00', '08:00', 'ambient', 40, 336.9, 1.859, 0, 1],
];

export const S1_ORDERS: S1Order[] = ORDER_ROWS.map(
  ([orderRef, outletId, brand, district, dockType, parkingConstraint, mallWindow, windowOpenTime, windowCloseTime, tempRequirement, orderUnits, orderWeightKg, orderVolumeM3, deferredYesterday, daysSinceLastServed]) => ({
    scenario: 'S1',
    orderRef,
    outletId,
    brand,
    district,
    depot: 'Peliyagoda',
    dockType,
    parkingConstraint,
    mallWindow,
    windowOpenTime,
    windowCloseTime,
    tempRequirement,
    orderUnits,
    orderWeightKg,
    orderVolumeM3,
    deferredYesterday: deferredYesterday === 1,
    daysSinceLastServed,
  }),
);

// --- S1_FLEET_STATUS: data/task2b_peak_day_fleet.csv (38 rows) -------------
const WORKSHOP_VEHICLE_IDS = new Set([
  'VEH001', 'VEH002', 'VEH004', 'VEH005', 'VEH012', 'VEH016', 'VEH021',
  'VEH022', 'VEH026', 'VEH035',
]);

export const S1_FLEET_STATUS: FleetStatus[] = Array.from({ length: 38 }, (_, i) => {
  const vehicleId = `VEH${String(i + 1).padStart(3, '0')}`;
  return {
    scenario: 'S1' as const,
    vehicleId,
    status: WORKSHOP_VEHICLE_IDS.has(vehicleId) ? 'in_workshop' as const : 'available' as const,
  };
});

// --- VEHICLES: data/vehicles.csv (60 rows) ----------------------------------
type VehicleRow = [string, 'truck' | 'van', 'ambient' | 'reefer', number, number, number, number, string];

const VEHICLE_ROWS: VehicleRow[] = [
  ['VEH001', 'truck', 'reefer', 5510, 26.4, 4.7, 340, 'Peliyagoda'],
  ['VEH002', 'truck', 'reefer', 3990, 21.1, 6.1, 610, 'Peliyagoda'],
  ['VEH003', 'truck', 'reefer', 5510, 26.4, 4.7, 480, 'Peliyagoda'],
  ['VEH004', 'truck', 'reefer', 6840, 33.4, 4.4, 430, 'Peliyagoda'],
  ['VEH005', 'truck', 'reefer', 6840, 33.4, 4.4, 490, 'Peliyagoda'],
  ['VEH006', 'truck', 'reefer', 6840, 33.4, 4.4, 380, 'Peliyagoda'],
  ['VEH007', 'truck', 'reefer', 3610, 19.4, 6.4, 590, 'Peliyagoda'],
  ['VEH008', 'truck', 'ambient', 3800, 22.0, 7.1, 460, 'Peliyagoda'],
  ['VEH009', 'truck', 'ambient', 5800, 30.0, 5.2, 440, 'Peliyagoda'],
  ['VEH010', 'truck', 'ambient', 6500, 34.0, 5.6, 540, 'Peliyagoda'],
  ['VEH011', 'truck', 'ambient', 7200, 38.0, 4.9, 600, 'Peliyagoda'],
  ['VEH012', 'truck', 'ambient', 4200, 24.0, 6.8, 540, 'Peliyagoda'],
  ['VEH013', 'truck', 'ambient', 5800, 30.0, 5.2, 430, 'Peliyagoda'],
  ['VEH014', 'truck', 'ambient', 7200, 38.0, 4.9, 530, 'Peliyagoda'],
  ['VEH015', 'truck', 'ambient', 3800, 22.0, 7.1, 560, 'Peliyagoda'],
  ['VEH016', 'truck', 'ambient', 3800, 22.0, 7.1, 550, 'Peliyagoda'],
  ['VEH017', 'truck', 'ambient', 3800, 22.0, 7.1, 470, 'Peliyagoda'],
  ['VEH018', 'truck', 'ambient', 3800, 22.0, 7.1, 450, 'Peliyagoda'],
  ['VEH019', 'truck', 'ambient', 7200, 38.0, 4.9, 610, 'Peliyagoda'],
  ['VEH020', 'truck', 'ambient', 6500, 34.0, 5.6, 460, 'Peliyagoda'],
  ['VEH021', 'truck', 'ambient', 4200, 24.0, 6.8, 440, 'Peliyagoda'],
  ['VEH022', 'truck', 'ambient', 4200, 24.0, 6.8, 580, 'Peliyagoda'],
  ['VEH023', 'truck', 'ambient', 7200, 38.0, 4.9, 530, 'Peliyagoda'],
  ['VEH024', 'truck', 'ambient', 6500, 34.0, 5.6, 600, 'Peliyagoda'],
  ['VEH025', 'truck', 'ambient', 3800, 22.0, 7.1, 580, 'Peliyagoda'],
  ['VEH026', 'truck', 'ambient', 7200, 38.0, 4.9, 340, 'Peliyagoda'],
  ['VEH027', 'truck', 'ambient', 3800, 22.0, 7.1, 440, 'Peliyagoda'],
  ['VEH028', 'truck', 'ambient', 4200, 24.0, 6.8, 380, 'Peliyagoda'],
  ['VEH029', 'truck', 'ambient', 5800, 30.0, 5.2, 600, 'Peliyagoda'],
  ['VEH030', 'truck', 'ambient', 6500, 34.0, 5.6, 360, 'Peliyagoda'],
  ['VEH031', 'truck', 'ambient', 7200, 38.0, 4.9, 350, 'Peliyagoda'],
  ['VEH032', 'truck', 'ambient', 4200, 24.0, 6.8, 610, 'Peliyagoda'],
  ['VEH033', 'truck', 'ambient', 7200, 38.0, 4.9, 470, 'Peliyagoda'],
  ['VEH034', 'truck', 'ambient', 3800, 22.0, 7.1, 440, 'Peliyagoda'],
  ['VEH035', 'van', 'reefer', 1040, 7.0, 10.3, 480, 'Peliyagoda'],
  ['VEH036', 'van', 'reefer', 1040, 7.0, 10.3, 480, 'Peliyagoda'],
  ['VEH037', 'van', 'ambient', 1100, 8.0, 11.5, 340, 'Peliyagoda'],
  ['VEH038', 'van', 'ambient', 1200, 9.0, 10.8, 620, 'Peliyagoda'],
  ['VEH039', 'truck', 'reefer', 6180, 29.9, 5.0, 370, 'Kandy'],
  ['VEH040', 'truck', 'reefer', 5510, 26.4, 4.7, 380, 'Kandy'],
  ['VEH041', 'truck', 'reefer', 3610, 19.4, 6.4, 600, 'Kandy'],
  ['VEH042', 'truck', 'reefer', 6180, 29.9, 5.0, 480, 'Kandy'],
  ['VEH043', 'truck', 'reefer', 5510, 26.4, 4.7, 450, 'Kandy'],
  ['VEH044', 'truck', 'ambient', 4200, 24.0, 6.8, 340, 'Kandy'],
  ['VEH045', 'truck', 'ambient', 4200, 24.0, 6.8, 530, 'Kandy'],
  ['VEH046', 'truck', 'ambient', 3800, 22.0, 7.1, 350, 'Kandy'],
  ['VEH047', 'truck', 'ambient', 5800, 30.0, 5.2, 510, 'Kandy'],
  ['VEH048', 'truck', 'ambient', 4200, 24.0, 6.8, 570, 'Kandy'],
  ['VEH049', 'truck', 'ambient', 4200, 24.0, 6.8, 390, 'Kandy'],
  ['VEH050', 'truck', 'ambient', 6500, 34.0, 5.6, 560, 'Kandy'],
  ['VEH051', 'truck', 'ambient', 7200, 38.0, 4.9, 400, 'Kandy'],
  ['VEH052', 'truck', 'ambient', 4200, 24.0, 6.8, 570, 'Kandy'],
  ['VEH053', 'truck', 'ambient', 6500, 34.0, 5.6, 370, 'Kandy'],
  ['VEH054', 'truck', 'ambient', 7200, 38.0, 4.9, 520, 'Kandy'],
  ['VEH055', 'truck', 'ambient', 4200, 24.0, 6.8, 530, 'Kandy'],
  ['VEH056', 'truck', 'ambient', 3800, 22.0, 7.1, 610, 'Kandy'],
  ['VEH057', 'van', 'reefer', 1040, 7.0, 10.3, 450, 'Kandy'],
  ['VEH058', 'van', 'reefer', 1040, 7.0, 10.3, 550, 'Kandy'],
  ['VEH059', 'van', 'ambient', 1200, 9.0, 10.8, 610, 'Kandy'],
  ['VEH060', 'van', 'ambient', 1200, 9.0, 10.8, 520, 'Kandy'],
];

export const VEHICLES: Vehicle[] = VEHICLE_ROWS.map(
  ([vehicleId, type, temp, weightCapKg, volumeCapM3, kmPerL, weeklyFuelQuotaL, depot]) => ({
    vehicleId, type, temp, weightCapKg, volumeCapM3, fuelType: 'diesel', kmPerL, weeklyFuelQuotaL, depot,
  }),
);

/** Vehicles registered on the S1 fleet roster (VEH001-038, Peliyagoda) joined with today's status. */
export const S1_VEHICLES: (Vehicle & { status: 'available' | 'in_workshop' })[] = S1_FLEET_STATUS.map(f => {
  const v = VEHICLES.find(v => v.vehicleId === f.vehicleId)!;
  return { ...v, status: f.status };
});

// --- SERVICE_ALLOWANCES: data/service_allowance.csv (9 rows) ---------------
export const SERVICE_ALLOWANCES: ServiceAllowance[] = [
  { brand: 'Fresh', dockType: 'rear_dock', serviceAllowanceMin: 15 },
  { brand: 'Fresh', dockType: 'street', serviceAllowanceMin: 16 },
  { brand: 'Fresh', dockType: 'mall_bay', serviceAllowanceMin: 18 },
  { brand: 'Style', dockType: 'rear_dock', serviceAllowanceMin: 38 },
  { brand: 'Style', dockType: 'street', serviceAllowanceMin: 46 },
  { brand: 'Style', dockType: 'mall_bay', serviceAllowanceMin: 59 },
  { brand: 'Tech', dockType: 'rear_dock', serviceAllowanceMin: 43 },
  { brand: 'Tech', dockType: 'street', serviceAllowanceMin: 55 },
  { brand: 'Tech', dockType: 'mall_bay', serviceAllowanceMin: 55 },
];

// --- DISTRICT_TRAVEL: data/district_travel.csv (12 rows) -------------------
export const DISTRICT_TRAVEL: DistrictTravel[] = [
  { district: 'Colombo', depot: 'Peliyagoda', roadClass: 'urban', freeFlowKmh: 30.0, depotToDistrictKm: 12, depotToDistrictFreeflowMin: 24, interStopKm: 4.0, interStopFreeflowMin: 8 },
  { district: 'Gampaha', depot: 'Peliyagoda', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 28, depotToDistrictFreeflowMin: 37, interStopKm: 7.0, interStopFreeflowMin: 9 },
  { district: 'Kalutara', depot: 'Peliyagoda', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 48, depotToDistrictFreeflowMin: 64, interStopKm: 9.0, interStopFreeflowMin: 12 },
  { district: 'Galle', depot: 'Peliyagoda', roadClass: 'highway', freeFlowKmh: 70.0, depotToDistrictKm: 120, depotToDistrictFreeflowMin: 103, interStopKm: 10.0, interStopFreeflowMin: 9 },
  { district: 'Matara', depot: 'Peliyagoda', roadClass: 'highway', freeFlowKmh: 70.0, depotToDistrictKm: 160, depotToDistrictFreeflowMin: 137, interStopKm: 12.0, interStopFreeflowMin: 10 },
  { district: 'Kurunegala', depot: 'Peliyagoda', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 95, depotToDistrictFreeflowMin: 127, interStopKm: 14.0, interStopFreeflowMin: 19 },
  { district: 'Puttalam', depot: 'Peliyagoda', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 130, depotToDistrictFreeflowMin: 173, interStopKm: 18.0, interStopFreeflowMin: 24 },
  { district: 'Kandy', depot: 'Kandy', roadClass: 'urban', freeFlowKmh: 30.0, depotToDistrictKm: 8, depotToDistrictFreeflowMin: 16, interStopKm: 3.0, interStopFreeflowMin: 6 },
  { district: 'Matale', depot: 'Kandy', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 26, depotToDistrictFreeflowMin: 35, interStopKm: 8.0, interStopFreeflowMin: 11 },
  { district: 'Nuwara Eliya', depot: 'Kandy', roadClass: 'hill', freeFlowKmh: 42.0, depotToDistrictKm: 78, depotToDistrictFreeflowMin: 111, interStopKm: 14.0, interStopFreeflowMin: 20 },
  { district: 'Badulla', depot: 'Kandy', roadClass: 'hill', freeFlowKmh: 42.0, depotToDistrictKm: 130, depotToDistrictFreeflowMin: 186, interStopKm: 16.0, interStopFreeflowMin: 23 },
  { district: 'Kegalle', depot: 'Kandy', roadClass: 'suburban', freeFlowKmh: 45.0, depotToDistrictKm: 40, depotToDistrictFreeflowMin: 53, interStopKm: 10.0, interStopFreeflowMin: 13 },
];

// --- Dev-time assertions: catch a bad transcription or a future data drop --
function assertDataset() {
  const count = <T,>(arr: T[], pred: (t: T) => boolean) => arr.filter(pred).length;
  const problems: string[] = [];

  if (S1_ORDERS.length !== 85) problems.push(`S1_ORDERS.length = ${S1_ORDERS.length}, expected 85`);
  const byBrand = { Fresh: count(S1_ORDERS, o => o.brand === 'Fresh'), Style: count(S1_ORDERS, o => o.brand === 'Style'), Tech: count(S1_ORDERS, o => o.brand === 'Tech') };
  if (byBrand.Fresh !== 75 || byBrand.Style !== 5 || byBrand.Tech !== 5) problems.push(`brand split = ${JSON.stringify(byBrand)}, expected {Fresh:75,Style:5,Tech:5}`);
  const chilled = count(S1_ORDERS, o => o.tempRequirement === 'chilled');
  if (chilled !== 26) problems.push(`chilled count = ${chilled}, expected 26`);
  const vanOnly = count(S1_ORDERS, o => o.parkingConstraint === 'van_only');
  if (vanOnly !== 6) problems.push(`van_only count = ${vanOnly}, expected 6`);
  const mallWindow = count(S1_ORDERS, o => o.mallWindow !== null);
  if (mallWindow !== 2) problems.push(`mall_window count = ${mallWindow}, expected 2`);

  if (S1_FLEET_STATUS.length !== 38) problems.push(`S1_FLEET_STATUS.length = ${S1_FLEET_STATUS.length}, expected 38`);
  const available = count(S1_FLEET_STATUS, f => f.status === 'available');
  const workshop = count(S1_FLEET_STATUS, f => f.status === 'in_workshop');
  if (available !== 28 || workshop !== 10) problems.push(`fleet status = {available:${available}, in_workshop:${workshop}}, expected {28,10}`);

  if (VEHICLES.length !== 60) problems.push(`VEHICLES.length = ${VEHICLES.length}, expected 60`);
  if (SERVICE_ALLOWANCES.length !== 9) problems.push(`SERVICE_ALLOWANCES.length = ${SERVICE_ALLOWANCES.length}, expected 9`);
  if (DISTRICT_TRAVEL.length !== 12) problems.push(`DISTRICT_TRAVEL.length = ${DISTRICT_TRAVEL.length}, expected 12`);

  if (problems.length > 0) {
    const message = `[dispatcher/dataset.ts] transcription mismatch:\n${problems.join('\n')}`;
    if (process.env.NODE_ENV !== 'production') throw new Error(message);
    // eslint-disable-next-line no-console
    console.error(message);
  }
}

assertDataset();
