import React from 'react';
import { Check, ArrowLeft, Info } from 'lucide-react';

interface OrderConfirmationModalProps {
  order?: any;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function OrderConfirmationModal({ 
  order, 
  onClose, 
  onViewDetails 
}: OrderConfirmationModalProps) {
  if (!order) return null;

  return (
    <div className="figma-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Back button */}
      <div style={{ width: '100%', maxWidth: '520px', marginBottom: '16px' }}>
        <button
          onClick={onClose}
          className="back-link-btn"
        >
          <ArrowLeft size={14} />
          <span>Back to Orders</span>
        </button>
      </div>

      {/* Main Confirmation Card */}
      <div className="figma-card" style={{ width: '100%', maxWidth: '520px', padding: '36px 32px', textAlign: 'center' }}>
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

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#202D2D' }}>Order Received</h2>
        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
          Order ID: {order.delivery_id || 'RG-F-2752'}
        </div>

        <div style={{ margin: '10px 0 24px' }}>
          <span style={{
            background: '#FFF4ED',
            color: '#F59E0B',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '4px'
          }}>
            ⏳ Pending Confirmation
          </span>
        </div>

        {/* Order Details Table */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '13px',
          textAlign: 'left',
          marginBottom: '24px',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Outlet</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>Colpetty Retailer</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Brand</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>RightGo Fresh</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Order Type</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>{order.order_type || 'Chilled + Ambient'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Requested For</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>{order.requested_for || '28 Sep, 2026'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Placed At</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>{order.placed_at || '28 Sep, 15:42'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8A9BB0' }}>Items</span>
            <span style={{ fontWeight: 600, color: '#202D2D' }}>{order.items?.length || 3} line items</span>
          </div>
        </div>

        {/* Notice Info Box */}
        <div style={{
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#0369A1',
          textAlign: 'left',
          marginBottom: '24px',
          lineHeight: '18px'
        }}>
          ℹ️ You'll be notified once the dispatcher confirms and schedules this order, usually after the 16:00 daily cutoff.
        </div>

        {/* Action Buttons */}
        <button
          type="button"
          className="btn-orange-primary"
          style={{ width: '100%', marginBottom: '14px' }}
          onClick={onClose}
        >
          Back to Dashboard
        </button>

        <button
          type="button"
          onClick={onViewDetails}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif'
          }}
        >
          View Order Details →
        </button>
      </div>
    </div>
  );
}
