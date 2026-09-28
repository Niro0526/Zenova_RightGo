import React, { useState } from 'react';
import { Check, ArrowLeft, Edit3, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface OrderConfirmationModalProps {
  order?: any;
  onClose: () => void;
  onViewDetails: () => void;
  onEditOrder?: (order: any) => void;
  onCancelOrder?: (orderId: string) => void;
}

export default function OrderConfirmationModal({ 
  order, 
  onClose, 
  onViewDetails,
  onEditOrder,
  onCancelOrder
}: OrderConfirmationModalProps) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Placed with incorrect quantities / Needed modification');

  if (!order) return null;

  const handleConfirmCancel = () => {
    if (onCancelOrder) {
      onCancelOrder(order.delivery_id);
    } else {
      alert(`✓ Order #${order.delivery_id} has been cancelled.`);
      onClose();
    }
  };

  return (
    <div className="figma-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Back button */}
      <div style={{ width: '100%', maxWidth: '540px', marginBottom: '16px' }}>
        <button
          onClick={onClose}
          className="back-link-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '13px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to My Orders</span>
        </button>
      </div>

      {/* Main Confirmation Card */}
      <div className="figma-card" style={{ width: '100%', maxWidth: '540px', padding: '36px 32px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)' }}>
        {/* Green Checkmark Circle */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#DCFCE7',
          color: '#22C55E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Check size={30} strokeWidth={2.5} />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B', margin: 0 }}>Order Received & Queued</h2>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
          Requisition ID: <span style={{ color: '#FF6600' }}>{order.delivery_id || 'RG-F-2752'}</span>
        </div>

        <div style={{ margin: '12px 0 20px' }}>
          <span style={{
            background: '#FFF7ED',
            color: '#C2410C',
            border: '1px solid #FFEDD5',
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            ⏳ Awaiting 16:00 Planning Cutoff
          </span>
        </div>

        {/* Order Details Summary Box */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '13px',
          textAlign: 'left',
          marginBottom: '20px',
          borderTop: '1px solid #F1F5F9',
          borderBottom: '1px solid #F1F5F9',
          padding: '16px 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Outlet</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{order.outlet_id || 'OUT001'} · Colpetty Retailer</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Brand & Segment</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{order.order_type || 'Brand Fresh'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Requested For</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{order.requested_for || 'Tomorrow, 9 Jan 2026'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748B' }}>Order Manifest</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{order.items?.length || 3} line items ({order.items?.reduce((a: number, b: any) => a + (b.qty || 1), 0)} total units)</span>
          </div>
        </div>

        {/* Notice Info Box */}
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#166534',
          textAlign: 'left',
          marginBottom: '20px',
          lineHeight: '18px'
        }}>
          ℹ️ <strong>Grace Period Active:</strong> You can modify quantities or cancel this order any time before the 16:00 daily cutoff.
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Primary View / Done */}
          <button
            type="button"
            className="btn-orange-primary"
            style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Done · Go to My Orders
          </button>

          {/* Edit / Modify & Cancel Order Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => onEditOrder && onEditOrder(order)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Edit3 size={14} color="#0284C7" />
              <span>Modify Quantities</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCancelPrompt(true)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #FECACA',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <XCircle size={14} color="#DC2626" />
              <span>Cancel Order</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onViewDetails}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            View Full Lifecycle Status →
          </button>

        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <ConfirmDialog
        open={showCancelPrompt}
        title={`Cancel Order #${order.delivery_id}?`}
        message={`This will immediately remove order #${order.delivery_id} from today's dispatch queue.`}
        confirmLabel="Confirm Cancel Order"
        cancelLabel="Keep Order"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelPrompt(false)}
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#334155]">Reason for Cancellation</label>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2.5 text-[12.5px] text-[#1E293B]"
          >
            <option value="Placed with incorrect quantities / Needed modification">Placed with incorrect quantities / Needed modification</option>
            <option value="Ordered duplicate items by mistake">Ordered duplicate items by mistake</option>
            <option value="Store storage full / Capacity constraint">Store storage full / Capacity constraint</option>
            <option value="No longer required">No longer required</option>
          </select>
        </div>
      </ConfirmDialog>
    </div>
  );
}
