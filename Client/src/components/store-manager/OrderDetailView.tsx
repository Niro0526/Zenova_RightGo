import React, { useState } from 'react';
import { ArrowLeft, Check, Edit3, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface OrderDetailViewProps {
  order?: any;
  selectedOutlet?: any;
  onBack: () => void;
  onConfirmReceipt: (order: any) => void;
  onInspectDegradation: (order: any) => void;
  onEditOrder?: (order: any) => void;
  onCancelOrder?: (orderId: string) => void;
}

export default function OrderDetailView({ 
  order, 
  selectedOutlet = {}, 
  onBack, 
  onConfirmReceipt, 
  onInspectDegradation,
  onEditOrder,
  onCancelOrder
}: OrderDetailViewProps) {
  const activeOrder = order || {
    delivery_id: 'S1-001',
    brand: 'Fresh',
    placed_at: '7 Jan, 14:32',
    status: 'Out for Delivery'
  };

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Placed with incorrect quantities / Needed modification');

  const isAwaitingPlanning = activeOrder.status === 'Awaiting Planning' || activeOrder.status === 'Queued';
  const isDeferred = activeOrder.status?.toLowerCase().includes('defer') || activeOrder.status?.toLowerCase().includes('escalat');
  const isDelivered = activeOrder.status === 'Delivered';
  const isCancelled = activeOrder.status === 'Cancelled';
  const isOutForDelivery = activeOrder.status === 'Out for Delivery' || activeOrder.status === 'In Transit';

  const orderItems = activeOrder.items || [
    { name: 'Organic Chicken Breast (Fresh Cut)', qty: 4, unit: 'cases (5kg)', temp: 'Chilled' },
    { name: 'Whole Pasteurised Milk (1L)', qty: 8, unit: 'crates (12 btls)', temp: 'Chilled' },
    { name: 'Basmati Rice 5kg', qty: 3, unit: 'bags (5kg)', temp: 'Ambient' }
  ];

  const handleConfirmCancel = () => {
    if (onCancelOrder) {
      onCancelOrder(activeOrder.delivery_id);
    } else {
      alert(`✓ Order #${activeOrder.delivery_id} cancelled.`);
      onBack();
    }
  };

  return (
    <div className="figma-main">
      {/* Header Bar */}
      <div>
        <button
          onClick={onBack}
          className="back-link-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none', background: 'none', color: '#64748B', fontWeight: 600, fontSize: '13px', padding: '0', marginBottom: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to My Orders</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title-text" style={{ fontSize: '24px', margin: 0, fontWeight: 700, color: '#1E293B' }}>
              Order {activeOrder.delivery_id}
            </h1>
            <span style={{
              background: isDelivered ? '#DCFCE7' : isCancelled ? '#FEF2F2' : isDeferred ? '#FFF1F2' : isAwaitingPlanning ? '#FFF7ED' : '#E0F2FE',
              color: isDelivered ? '#16A34A' : isCancelled ? '#DC2626' : isDeferred ? '#E11D48' : isAwaitingPlanning ? '#C2410C' : '#0284C7',
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px'
            }}>
              {activeOrder.status || 'Active'}
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Placed: <strong>{activeOrder.placed_at || activeOrder.order_date || '7 Jan, 14:32'}</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'flex-start', marginTop: '20px' }}>
        
        {/* LEFT COLUMN: Delivery Status Timeline Card */}
        <div className="figma-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Delivery Status Timeline</h3>

          <div className="vertical-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Step 1: Received */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', marginTop: '4px' }}></div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E' }}>1. Received & Queued</div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>{activeOrder.placed_at || '7 Jan, 14:32'} · Order entered queue</div>
              </div>
            </div>

            {/* Step 2: Awaiting Planning */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isAwaitingPlanning ? '#F59E0B' : '#22C55E', marginTop: '4px' }}></div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isAwaitingPlanning ? '#D97706' : '#22C55E' }}>2. Planning Cutoff</div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>16:00 Daily Cutoff · Route batching</div>
              </div>
            </div>

            {/* Step 3: Scheduled / Dispatched */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isOutForDelivery || isDelivered ? '#22C55E' : isDeferred ? '#EF4444' : '#CBD5E1', marginTop: '4px' }}></div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isOutForDelivery || isDelivered ? '#22C55E' : isDeferred ? '#EF4444' : '#94A3B8' }}>
                  {isDeferred ? '3. Deferred (Capacity)' : '3. Scheduled & Dispatched'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {activeOrder.vehicle_id ? `Assigned: ${activeOrder.vehicle_id}` : isDeferred ? 'Rolled over to next wave' : 'Pending fleet allocation'}
                </div>
              </div>
            </div>

            {/* Step 4: Delivered */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isDelivered ? '#22C55E' : isCancelled ? '#DC2626' : '#CBD5E1', marginTop: '4px' }}></div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isDelivered ? '#22C55E' : isCancelled ? '#DC2626' : '#94A3B8' }}>
                  {isCancelled ? '4. Cancelled by Store' : '4. Delivered & Confirmed'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  {isDelivered ? (activeOrder.delivery_time || 'Delivered') : isCancelled ? 'Requisition voided' : 'Pending store intake sign-off'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Manifest Items & Lifecycle Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Manifest Items Card */}
          <div className="figma-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: 0 }}>Manifest Items ({orderItems.length})</h3>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>{activeOrder.order_type || 'Brand Fresh'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orderItems.map((itm: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1E293B' }}>{itm.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>{itm.temp || (itm.isChilled ? 'Chilled (+4°C)' : 'Ambient')}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1E293B' }}>
                    {itm.qty} {itm.unit || 'units'}
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Action Buttons based on lifecycle status */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {isAwaitingPlanning && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <XCircle size={14} />
                    <span>Cancel Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditOrder && onEditOrder(activeOrder)}
                    style={{
                      background: '#FF6600',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Modify Quantities</span>
                  </button>
                </>
              )}

              {isOutForDelivery && (
                <button
                  type="button"
                  className="btn-orange-primary"
                  onClick={() => onConfirmReceipt(activeOrder)}
                >
                  Proceed to Confirm Receipt →
                </button>
              )}

              {isDeferred && (
                <button
                  type="button"
                  className="btn-orange-primary"
                  onClick={() => onInspectDegradation(activeOrder)}
                >
                  Inspect Deferral Mitigation →
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <ConfirmDialog
        open={showCancelPrompt}
        title={`Cancel Order #${activeOrder.delivery_id}?`}
        message={`This will cancel order #${activeOrder.delivery_id} and remove it from today's planning batch.`}
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
