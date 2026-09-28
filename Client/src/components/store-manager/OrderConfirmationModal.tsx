import React, { useState } from 'react';
import { Check, ArrowLeft, Info, Edit3, XCircle, Ban, X, CheckCircle2 } from 'lucide-react';

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
  if (!order) return null;

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Placed with incorrect quantities / Needed modification');

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
      {showCancelPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            textAlign: 'left'
          }}>
            <div style={{ background: '#FEF2F2', padding: '16px 20px', borderBottom: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '15px' }}>
                <Ban size={18} />
                <span>Cancel Order #{order.delivery_id}?</span>
              </div>
              <button onClick={() => setShowCancelPrompt(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                This will immediately remove order <strong>#{order.delivery_id}</strong> from today's dispatch queue.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', color: '#1E293B' }}
                >
                  <option value="Placed with incorrect quantities / Needed modification">Placed with incorrect quantities / Needed modification</option>
                  <option value="Ordered duplicate items by mistake">Ordered duplicate items by mistake</option>
                  <option value="Store storage full / Capacity constraint">Store storage full / Capacity constraint</option>
                  <option value="No longer required">No longer required</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowCancelPrompt(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Keep Order
                </button>
                <button
                  onClick={handleConfirmCancel}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <XCircle size={14} />
                  <span>Confirm Cancel Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
