import { useState } from 'react';
import { MOCK_OUTLETS } from '@/data/mockData';

// Master interactive seed data for all Store Manager orders — session-local
// demo state, resets on refresh. No backend is connected.
const SEED_ORDERS: any[] = [
  {
    delivery_id: 'S1-000',
    brand: 'Fresh',
    brand_code: 'FR',
    order_type: 'Brand Fresh · Ambient',
    order_date: 'Today, 8 Jan 2026',
    status: 'Out for Delivery',
    expected_arrival: 'Today, 05:00-07:30',
    section: 'active',
    vehicle_id: 'VEH014 (Dry-Box 6T)',
    driver_name: 'Sunil Jayawardena',
    items: [
      { name: 'Keeri Samba Rice (10kg Bags)', qty: 20, unit: 'bags', expected: 20, loaded: 20 },
      { name: 'Pure Ceylon Tea Pack (500g)', qty: 50, unit: 'boxes', expected: 50, loaded: 50 },
      { name: 'Refined White Sugar (1kg)', qty: 40, unit: 'packs', expected: 40, loaded: 40 }
    ]
  },
  {
    delivery_id: 'S1-001',
    brand: 'Fresh',
    brand_code: 'FR',
    order_type: 'Brand Fresh · Chilled',
    order_date: 'Today, 8 Jan 2026',
    status: 'Out for Delivery',
    expected_arrival: 'Today, 05:00-07:30',
    section: 'active',
    vehicle_id: 'VEH003 (Reefer Van)',
    driver_name: 'Chaminda Vithanage',
    items: [
      { id: 'item-1', name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', expected: 4, loaded: 4, temp: 'Chilled (+4°C)' },
      { id: 'item-2', name: 'Farm Fresh Milk (1L Bottles)', qty: 8, unit: 'crates (12 btls)', expected: 8, loaded: 8, temp: 'Chilled (+4°C)' },
      { id: 'item-3', name: 'Keeri Samba Rice (10kg Bags)', qty: 3, unit: 'bags (10kg)', expected: 3, loaded: 3, temp: 'Ambient' }
    ]
  },
  {
    delivery_id: 'RG-F-3201',
    brand: 'Fresh',
    brand_code: 'FR',
    order_type: 'Brand Fresh',
    order_date: '8 Jan 2026',
    status: 'Awaiting Planning',
    planned_dispatch: '9 Jan',
    section: 'future',
    items: [
      { name: 'Keeri Samba Rice (10kg Bags)', qty: 15, unit: 'bags' },
      { name: 'Coconut Milk Powder (1kg)', qty: 30, unit: 'packs' }
    ]
  },
  {
    delivery_id: 'RG-F-3180',
    brand: 'Fresh',
    brand_code: 'FR',
    order_type: 'Brand Fresh',
    order_date: '7 Jan 2026',
    status: 'Deferred',
    degradation_level: 'Critical (Tier 3)',
    reason: 'Fleet dry-dock emergency: 2x 10T trucks grounded at Peliyagoda. Prioritised perishables.',
    section: 'deferred',
    items: [
      { name: 'Keeri Samba Rice (10kg Bags)', qty: 10, unit: 'bags' },
      { name: 'Pure Ceylon Tea Pack (500g)', qty: 25, unit: 'boxes' },
      { name: 'Full Cream Milk Powder (400g)', qty: 20, unit: 'pouches' }
    ]
  },
  {
    delivery_id: 'RG-S-8821',
    brand: 'Style',
    brand_code: 'ST',
    order_type: 'Brand Style',
    order_date: '6 Jan 2026',
    status: 'Delivered',
    delivery_time: '7 Jan, 08:45',
    section: 'completed',
    items: [
      { name: 'Linen Shirts (Box of 20)', qty: 5, unit: 'boxes' },
      { name: 'Cotton Trousers (Box of 15)', qty: 4, unit: 'boxes' }
    ]
  },
  {
    delivery_id: 'RG-L-1104',
    brand: 'Living',
    brand_code: 'LV',
    order_type: 'Brand Living',
    order_date: '5 Jan 2026',
    status: 'Delivered',
    delivery_time: '6 Jan, 14:20',
    section: 'completed',
    items: [
      { name: 'Ceramic Dinner Plates (Set of 6)', qty: 10, unit: 'sets' },
      { name: 'Glass Tumbler Sets (6pk)', qty: 15, unit: 'sets' }
    ]
  }
];

/** Store Manager's order/outlet domain state — orders, selected outlet, and the in-flight edit/confirmation/closure-notice state that surrounds them. */
export function useStoreManagerOrders() {
  const [selectedOutlet, setSelectedOutlet] = useState(MOCK_OUTLETS[0]);
  const [orders, setOrders] = useState<any[]>(SEED_ORDERS);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [justConfirmedOrder, setJustConfirmedOrder] = useState<any>(null);
  const [storeClosureNotice, setStoreClosureNotice] = useState<any>(null);

  return {
    selectedOutlet, setSelectedOutlet,
    orders, setOrders,
    editingOrder, setEditingOrder,
    justConfirmedOrder, setJustConfirmedOrder,
    storeClosureNotice, setStoreClosureNotice,
  };
}
