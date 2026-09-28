'use client';

import Drawer from '@/components/common/Drawer';
import OrderDetailContent from './OrderDetailContent';
import type { PassportResult, S1Order } from '@/types/dispatcher';

/** Desktop-only on-demand slide-over — never a permanently reserved column. */
export default function OrderDetailPanel({
  open, onClose, order, selectedVehicleId, selectedTripNo, passport, onAssign, onDefer,
}: {
  open: boolean;
  onClose: () => void;
  order: S1Order | null;
  selectedVehicleId: string | null;
  selectedTripNo: 1 | 2;
  passport: PassportResult | null;
  onAssign: () => void;
  onDefer: () => void;
}) {
  return (
    <div className="hidden md:block">
      <Drawer
        open={open && !!order}
        onClose={onClose}
        title={order ? `${order.orderRef} details` : 'Order details'}
        subtitle={order ? `${order.outletId} · ${order.district} District` : undefined}
      >
        {order && (
          <OrderDetailContent
            order={order}
            selectedVehicleId={selectedVehicleId}
            selectedTripNo={selectedTripNo}
            passport={passport}
            onAssign={onAssign}
            onDefer={onDefer}
          />
        )}
      </Drawer>
    </div>
  );
}
