import { useState } from 'react';
import { MOCK_OUTLETS } from '@/data/mockData';
import { formatColomboDate, formatShortDate, formatTimeColombo } from '@/lib/dateUtils';

/**
 * Generates initial interactive seed data with dynamic dates relative to Asia/Colombo today.
 */
export function getInitialStoreOrders(): any[] {
  const todayLabel = formatColomboDate(0, true);
  const todayShort = formatShortDate(0);
  const tomorrowShort = formatShortDate(1);
  const yesterdayLabel = formatColomboDate(-1, false);
  const yesterdayShort = formatShortDate(-1);
  const twoDaysAgoLabel = formatColomboDate(-2, false);
  const threeDaysAgoLabel = formatColomboDate(-3, false);

  return [
    {
      delivery_id: 'S1-000',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Ambient',
      order_date: todayLabel,
      status: 'Out for Delivery',
      expected_arrival: `Today, 05:00-07:30`,
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
      order_date: todayLabel,
      status: 'Out for Delivery',
      expected_arrival: `Today, 05:00-07:30`,
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
      order_date: todayShort,
      status: 'Awaiting Planning',
      planned_dispatch: tomorrowShort,
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
      order_date: yesterdayLabel,
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
      delivery_id: 'RG-F-2741',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Ambient',
      order_date: twoDaysAgoLabel,
      status: 'Delivered',
      delivered_date: yesterdayLabel,
      delivery_time: `${yesterdayShort}, 08:45`,
      section: 'completed',
      receipt_ref: 'REC-S1-0988-001',
      items: [
        { name: 'Keeri Samba Rice (10kg Bags)', qty: 20, unit: 'bags' },
        { name: 'Pure Coconut Oil (1L Bottles)', qty: 25, unit: 'bottles' },
        { name: 'Refined White Sugar (1kg)', qty: 30, unit: 'packs' }
      ]
    },
    {
      delivery_id: 'RG-F-2891',
      brand: 'Fresh',
      brand_code: 'FR',
      order_type: 'Brand Fresh · Chilled',
      order_date: threeDaysAgoLabel,
      status: 'Delivered',
      delivered_date: twoDaysAgoLabel,
      delivery_time: `${formatShortDate(-2)}, 07:15`,
      section: 'completed',
      receipt_ref: 'REC-S1-0975-002',
      items: [
        { name: 'Farm Fresh Milk (1L Bottles)', qty: 40, unit: 'bottles' },
        { name: 'Highland Set Yoghurt (Cup pk)', qty: 48, unit: 'cups' },
        { name: 'Fresh Farm Eggs (Crate of 30)', qty: 10, unit: 'crates' }
      ]
    }
  ];
}

/** Store Manager's order/outlet domain state */
export function useStoreManagerOrders() {
  const [selectedOutlet, setSelectedOutlet] = useState(MOCK_OUTLETS[0]);
  const [orders, setOrders] = useState<any[]>(getInitialStoreOrders());
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
