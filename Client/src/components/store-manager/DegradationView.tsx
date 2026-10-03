import React, { useState } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Clock, 
  PhoneCall, 
  Truck, 
  Calendar, 
  CheckCircle2, 
  Package, 
  X, 
  Send, 
  ChevronRight, 
  Zap, 
  Info,
  XCircle,
  Ban
} from 'lucide-react';
import { formatShortDate } from '@/lib/dateUtils';

interface DegradationViewProps {
  order?: any;
  selectedOutlet?: any;
  onBack: () => void;
  onAcknowledge?: (deliveryId: string, slot?: string) => void;
  onEscalate?: (deliveryId: string, escalationData: any) => void;
  onCancel?: (deliveryId: string, cancelData: any) => void;
}

export default function DegradationView({ 
  order, 
  selectedOutlet = { outlet_id: 'S1', name: 'RightGo Super - Colombo 03 (Kollupitiya)' }, 
  onBack, 
  onAcknowledge, 
  onEscalate, 
  onCancel 
}: DegradationViewProps) {
  const activeOrder = order || {
    delivery_id: 'RG-F-3180',
    placed_at: `${formatShortDate(-1)}, 14:20`,
    brand: 'Fresh',
    order_type: 'Brand Fresh · Ambient & Chilled',
    reason: 'Fleet capacity shortage: 2x 10T primary vehicles undergoing emergency dry-dock maintenance at Peliyagoda Central Depot. Rolled over to next planning cycle.',
    items: [
      { name: 'Keeri Samba Rice (10kg Bags)', qty: 10, unit: 'bags', segment: 'Ambient Staples' },
      { name: 'Pure Ceylon Tea Pack (500g)', qty: 25, unit: 'boxes', segment: 'Beverages' },
      { name: 'Full Cream Milk Powder (400g)', qty: 20, unit: 'pouches', segment: 'Dairy' }
    ]
  };

  const orderItems = activeOrder.items || [
    { name: 'Keeri Samba Rice (10kg Bags)', qty: 10, unit: 'bags', segment: 'Ambient Staples' },
    { name: 'Pure Ceylon Tea Pack (500g)', qty: 25, unit: 'boxes', segment: 'Beverages' },
    { name: 'Full Cream Milk Powder (400g)', qty: 20, unit: 'pouches', segment: 'Dairy' }
  ];

  // State
  const [currentStatus, setCurrentStatus] = useState<string>(activeOrder.status || 'Deferred');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Escalation State
  const [escalationReason, setEscalationReason] = useState('High customer demand / Pending pre-orders');
  const [requestedMitigation, setRequestedMitigation] = useState('priority-fleet');
  const [escalationNotes, setEscalationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [escalationDetails, setEscalationDetails] = useState<any>(null);

  // Reschedule Slot State
  const [selectedSlot, setSelectedSlot] = useState('Tomorrow, 06:00 AM - 08:30 AM (Wave 1)');

  // Cancellation State
  const [cancelReason, setCancelReason] = useState('Procured urgent stock through alternative local channel');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationDetails, setCancellationDetails] = useState<any>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmReschedule = () => {
    setCurrentStatus('Rescheduled');
    setShowRescheduleModal(false);
    triggerToast(`✓ Slot confirmed: ${selectedSlot}. Rolled over to next dispatch run.`);
    if (onAcknowledge) {
      onAcknowledge(activeOrder.delivery_id, selectedSlot);
    }
  };

  const handleSubmitEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const ticket = {
        ticketId: 'ESC-' + Math.floor(10000 + Math.random() * 90000),
        reason: escalationReason,
        mitigation: requestedMitigation === 'priority-fleet' ? 'Priority Allocation in Next Fleet Wave' :
                    requestedMitigation === 'express-shuttle' ? 'Request Dedicated Express Van' : 'Split Partial Dispatch',
        notes: escalationNotes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setEscalationDetails(ticket);
      setCurrentStatus('Escalated');
      setShowEscalateModal(false);
      triggerToast(`⚡ Priority escalation #${ticket.ticketId} logged with Peliyagoda Planning Desk!`);
      if (onEscalate) {
        onEscalate(activeOrder.delivery_id, ticket);
      }
    }, 500);
  };

  const handleSubmitCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);
    setTimeout(() => {
      setIsCancelling(false);
      const cancelData = {
        reason: cancelReason,
        notes: cancelNotes,
        cancelledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cancelledBy: selectedOutlet.manager || 'Store Manager'
      };
      setCancellationDetails(cancelData);
      setCurrentStatus('Cancelled');
      setShowCancelModal(false);
      triggerToast(`🚫 Order #${activeOrder.delivery_id} cancelled. Peliyagoda depot staging released.`);
      if (onCancel) {
        onCancel(activeOrder.delivery_id, cancelData);
      }
    }, 500);
  };

  return (
    <div className="figma-main" style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: currentStatus === 'Cancelled' ? '#DC2626' : '#10B981',
          color: '#FFFFFF',
          padding: '14px 22px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '13px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {currentStatus === 'Cancelled' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="page-title-text" style={{ fontSize: '24px', margin: 0, fontWeight: 700, color: '#1E293B' }}>
                Order {activeOrder.delivery_id}
              </h1>
              <span style={{
                background: currentStatus === 'Cancelled' ? '#FEF2F2' : currentStatus === 'Escalated' ? '#FEF2F2' : currentStatus === 'Rescheduled' ? '#ECFDF5' : '#FFF1F2',
                color: currentStatus === 'Cancelled' ? '#DC2626' : currentStatus === 'Escalated' ? '#DC2626' : currentStatus === 'Rescheduled' ? '#059669' : '#E11D48',
                border: `1px solid ${currentStatus === 'Cancelled' ? '#FECACA' : currentStatus === 'Escalated' ? '#FECACA' : currentStatus === 'Rescheduled' ? '#A7F3D0' : '#FDA4AF'}`,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {currentStatus === 'Cancelled' ? (
                  <><Ban size={13} /> CANCELLED BY STORE</>
                ) : currentStatus === 'Escalated' ? (
                  <><Zap size={13} /> ESCALATED TO HUB</>
                ) : currentStatus === 'Rescheduled' ? (
                  <><Calendar size={13} /> RESCHEDULED</>
                ) : (
                  <><AlertTriangle size={13} /> DEFERRED</>
                )}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Store: <strong>{selectedOutlet.name || selectedOutlet.outlet_id}</strong> · Placed: <strong>{activeOrder.placed_at || '7 Jan, 14:20'}</strong> · Depot: <strong>Peliyagoda Central Hub</strong>
            </div>
          </div>

          {/* Quick Hub Call Button */}
          <button
            onClick={() => setShowContactModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <PhoneCall size={14} color="#0284C7" />
            <span>Contact Dispatch Desk</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px', alignItems: 'flex-start', marginTop: '20px' }}>
        
        {/* LEFT COLUMN: Deferral Notice & Order Manifest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Deferral / Cancellation Notice Card */}
          <div style={{
            background: currentStatus === 'Cancelled' ? '#FEF2F2' : currentStatus === 'Escalated' ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${currentStatus === 'Cancelled' ? '#FECACA' : currentStatus === 'Escalated' ? '#FDE68A' : '#FECACA'}`,
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: currentStatus === 'Cancelled' ? '#DC2626' : currentStatus === 'Escalated' ? '#D97706' : '#DC2626', fontWeight: 700, fontSize: '14px' }}>
                {currentStatus === 'Cancelled' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                <span>
                  {currentStatus === 'Cancelled'
                    ? 'Order Requisition Cancelled by Store Manager'
                    : currentStatus === 'Escalated' 
                    ? 'Store Priority Escalation Active' 
                    : currentStatus === 'Rescheduled'
                    ? 'Reschedule Confirmed by Store Manager'
                    : 'Deferral Notice from Central Dispatch'
                  }
                </span>
              </div>
              <span style={{ fontSize: '11px', background: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                {currentStatus === 'Cancelled' ? 'Voided' : 'Planning Rollover'}
              </span>
            </div>

            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '20px', margin: 0 }}>
              {currentStatus === 'Cancelled'
                ? `This order was cancelled by the store manager. Reason: ${cancellationDetails?.reason || cancelReason}. Depot stock staging has been released.`
                : activeOrder.reason || 'Fleet capacity shortage: 2x 10T primary vehicles undergoing emergency dry-dock maintenance at Peliyagoda Central Depot. Rolled over to next planning cycle.'
              }
            </p>

            {escalationDetails && currentStatus === 'Escalated' && (
              <div style={{ background: '#FFFFFF', border: '1px dashed #F59E0B', borderRadius: '8px', padding: '12px', marginTop: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#B45309', marginBottom: '4px' }}>
                  <span>⚡ Priority Escalation #{escalationDetails.ticketId}</span>
                  <span>{escalationDetails.timestamp}</span>
                </div>
                <div style={{ color: '#475569' }}><strong>Requested Resolution:</strong> {escalationDetails.mitigation}</div>
                <div style={{ color: '#475569', marginTop: '2px' }}><strong>Reason:</strong> {escalationDetails.reason}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '11.5px' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>Decided By</span>
                <strong style={{ color: '#1E293B' }}>{currentStatus === 'Cancelled' ? 'Store Manager' : 'Peliyagoda Central Dispatch'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>Original Target</span>
                <strong style={{ color: '#1E293B' }}>Today's Primary Run</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>Current Status</span>
                <strong style={{ color: currentStatus === 'Cancelled' ? '#DC2626' : '#FF6600' }}>
                  {currentStatus === 'Cancelled' ? 'Cancelled / Released' : 'Tomorrow, Wave 1 (06:00 AM)'}
                </strong>
              </div>
            </div>
          </div>

          {/* Manifest Items Waiting for Dispatch Card */}
          <div className="figma-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Manifest Items {currentStatus === 'Cancelled' ? '(Cancelled)' : '(Awaiting Dispatch)'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                  {currentStatus === 'Cancelled' ? 'Items released back to central warehouse allocation' : 'Items held at Peliyagoda depot waiting for next available transport allocation'}
                </p>
              </div>
              <span style={{ fontSize: '11.5px', background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {orderItems.length} SKUs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orderItems.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color="#475569" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.segment || 'General Manifest'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>{item.qty} {item.unit || 'units'}</div>
                    <span style={{ fontSize: '10.5px', color: currentStatus === 'Cancelled' ? '#94A3B8' : '#F59E0B', fontWeight: 600 }}>
                      {currentStatus === 'Cancelled' ? 'Released' : 'Pending Dispatch'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: currentStatus === 'Cancelled' ? '#F1F5F9' : '#FFFBEB', padding: '10px 14px', borderRadius: '8px', marginTop: '14px', fontSize: '12px', color: currentStatus === 'Cancelled' ? '#64748B' : '#92400E' }}>
              <Info size={16} color={currentStatus === 'Cancelled' ? '#64748B' : '#D97706'} />
              <span>
                {currentStatus === 'Cancelled'
                  ? 'Requisition cancelled. To re-order these items, please create a new order from Place Order.'
                  : 'Manifest is staged and pre-picked at Peliyagoda depot. It will be loaded immediately when vehicle space is assigned.'
                }
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Store Manager Actions & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Store Manager Action Hub */}
          <div className="figma-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
              Store Manager Order Actions
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Choose an operational action to manage this deferred delivery
            </p>

            {currentStatus === 'Cancelled' ? (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <XCircle size={28} color="#DC2626" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#991B1B' }}>Order Requisition Cancelled</div>
                <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '4px 0 12px' }}>
                  This order has been cancelled and removed from central dispatch queues.
                </p>
                <button
                  onClick={onBack}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                >
                  Return to Orders Dashboard
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Action 1: Raise Urgent Priority Escalation */}
                <div 
                  onClick={() => setShowEscalateModal(true)}
                  style={{
                    border: '1px solid #FCA5A5',
                    background: '#FFF5F5',
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={20} color="#DC2626" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B' }}>
                        1. Raise Urgent Priority Escalation
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#7F1D1D' }}>
                        Flag order for immediate priority in next vehicle allocation
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#991B1B" />
                </div>

                {/* Action 2: Confirm Rescheduled Slot */}
                <div 
                  onClick={() => setShowRescheduleModal(true)}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={20} color="#334155" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                        2. Accept Rescheduled Delivery Slot
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Confirm acceptance for tomorrow's scheduled intake wave
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#64748B" />
                </div>

                {/* Action 3: Cancel Deferred Order */}
                <div 
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XCircle size={20} color="#DC2626" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#DC2626' }}>
                        3. Cancel Deferred Order
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Release staged items at depot and cancel requisition
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>

              </div>
            )}
          </div>

          {/* Delivery Status Timeline */}
          <div className="figma-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '14px' }}>
              Delivery Status Timeline
            </h3>

            <div className="vertical-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Received */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', marginTop: '4px' }}></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E' }}>1. Order Received & Queued</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{formatShortDate(-1)}, 14:20 · Store requisition confirmed</div>
                </div>
              </div>

              {/* Step 2: Cutoff */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', marginTop: '4px' }}></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E' }}>2. Planning Cutoff Reached</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{formatShortDate(-1)}, 16:00 · Orders locked for route optimization</div>
                </div>
              </div>

              {/* Step 3: Deferred */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', marginTop: '4px' }}></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>3. Order Deferred (Fleet Capacity)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{formatShortDate(0)}, 05:10 · Vehicle constraint at Peliyagoda Hub</div>
                </div>
              </div>

              {/* Step 4: Manager Action State */}
              {currentStatus === 'Cancelled' ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#DC2626', marginTop: '4px' }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>4. Order Cancelled by Store Manager</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>Depot allocation released and voided</div>
                  </div>
                </div>
              ) : currentStatus === 'Escalated' ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', marginTop: '4px' }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>4. Priority Escalation Logged</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>Under review by Peliyagoda Lead Dispatcher</div>
                  </div>
                </div>
              ) : currentStatus === 'Rescheduled' ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', marginTop: '4px' }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>4. Reschedule Confirmed</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>Tomorrow Wave 1 confirmed for dispatch</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#CBD5E1', marginTop: '4px' }}></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>4. Pending Store Confirmation</div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>Awaiting manager action or auto-rollover</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hub Dispatch Contact Desk Box */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>Peliyagoda Dispatch Desk</div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>Hotline: +94 11 291 0000 · Ext 204</div>
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              style={{
                background: '#FF6600',
                color: '#FFFFFF',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Call Desk
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Priority Escalation Modal */}
      {/* ========================================================================= */}
      {showEscalateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            maxWidth: '540px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#FEF2F2', padding: '16px 20px', borderBottom: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '15px' }}>
                <Zap size={18} />
                <span>Escalate Deferral to Central Dispatch</span>
              </div>
              <button onClick={() => setShowEscalateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEscalation} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Escalation Reason
                </label>
                <select
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#1E293B' }}
                >
                  <option value="High customer demand / Pending pre-orders">High customer demand / Pending customer orders</option>
                  <option value="Weekend promotional campaign active">Store promotion campaign active (High footfall)</option>
                  <option value="Consecutive deferral violation (over 48 hours)">Consecutive deferral notice (over 48 hours delay)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Requested Resolution Strategy
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: requestedMitigation === 'priority-fleet' ? '1.5px solid #FF6600' : '1px solid #E2E8F0', background: requestedMitigation === 'priority-fleet' ? '#FFF7ED' : '#FFFFFF', cursor: 'pointer', fontSize: '12.5px' }}>
                    <input 
                      type="radio" 
                      name="mitigation" 
                      checked={requestedMitigation === 'priority-fleet'} 
                      onChange={() => setRequestedMitigation('priority-fleet')} 
                    />
                    <div>
                      <strong>Guaranteed Priority in Next Wave:</strong> Reserve first loading priority on tomorrow's 06:00 AM wave.
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: requestedMitigation === 'express-shuttle' ? '1.5px solid #FF6600' : '1px solid #E2E8F0', background: requestedMitigation === 'express-shuttle' ? '#FFF7ED' : '#FFFFFF', cursor: 'pointer', fontSize: '12.5px' }}>
                    <input 
                      type="radio" 
                      name="mitigation" 
                      checked={requestedMitigation === 'express-shuttle'} 
                      onChange={() => setRequestedMitigation('express-shuttle')} 
                    />
                    <div>
                      <strong>Emergency Express Shuttle:</strong> Dispatch small 1T van directly from Peliyagoda.
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: requestedMitigation === 'split' ? '1.5px solid #FF6600' : '1px solid #E2E8F0', background: requestedMitigation === 'split' ? '#FFF7ED' : '#FFFFFF', cursor: 'pointer', fontSize: '12.5px' }}>
                    <input 
                      type="radio" 
                      name="mitigation" 
                      checked={requestedMitigation === 'split'} 
                      onChange={() => setRequestedMitigation('split')} 
                    />
                    <div>
                      <strong>Split Partial Delivery:</strong> Dispatch priority items first, roll remaining items to regular schedule.
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Store Manager Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={escalationNotes}
                  onChange={(e) => setEscalationNotes(e.target.value)}
                  placeholder="e.g. Urgent demand for Keeri Samba rice and tea. Please allocate space on the first morning truck."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Priority Escalation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Reschedule Morning Slot Modal */}
      {/* ========================================================================= */}
      {showRescheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            maxWidth: '500px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#F8FAFC', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 700, fontSize: '15px' }}>
                <Calendar size={18} color="#FF6600" />
                <span>Confirm Rescheduled Delivery Slot</span>
              </div>
              <button onClick={() => setShowRescheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                Peliyagoda logistics has reserved capacity on tomorrow's primary fleet run. Select your preferred intake wave:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { slot: 'Tomorrow, 06:00 AM - 08:30 AM (Wave 1)', desc: 'Pre-opening intake · Early morning wave', tag: 'Recommended' },
                  { slot: 'Tomorrow, 10:00 AM - 12:30 PM (Wave 2)', desc: 'Mid-morning delivery wave', tag: 'Standard' },
                  { slot: 'Tomorrow, 02:00 PM - 04:30 PM (Wave 3)', desc: 'Afternoon delivery wave', tag: 'Standard' }
                ].map((s, idx) => (
                  <label key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: selectedSlot === s.slot ? '1.5px solid #FF6600' : '1px solid #E2E8F0',
                    background: selectedSlot === s.slot ? '#FFF7ED' : '#FFFFFF',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="radio" 
                        name="slot" 
                        checked={selectedSlot === s.slot} 
                        onChange={() => setSelectedSlot(s.slot)} 
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B' }}>{s.slot}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>{s.desc}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10.5px', background: selectedSlot === s.slot ? '#FF6600' : '#F1F5F9', color: selectedSlot === s.slot ? '#FFFFFF' : '#64748B', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {s.tag}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#FF6600', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={15} />
                  <span>Accept Slot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Cancel Deferred Order Confirmation Modal */}
      {/* ========================================================================= */}
      {showCancelModal && (
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
            maxWidth: '520px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#FEF2F2', padding: '16px 20px', borderBottom: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '15px' }}>
                <XCircle size={18} />
                <span>Cancel Order Requisition #{activeOrder.delivery_id}</span>
              </div>
              <button onClick={() => setShowCancelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCancellation} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '18px' }}>
                Are you sure you want to cancel this deferred order? This will release reserved stock staging at Peliyagoda Central Depot and remove this order from tomorrow's dispatch allocation.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Cancellation Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#1E293B' }}
                >
                  <option value="Procured urgent stock through alternative local channel">Procured urgent stock through alternative local channel</option>
                  <option value="Customer cancelled advance order">Customer cancelled advance reservation / demand dropped</option>
                  <option value="Delivery delay exceeds operational window">Delivery delay exceeds store operational window</option>
                  <option value="Requisition placed in error / Duplicate">Requisition placed in error / Duplicate entry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Manager Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="e.g. Bought 5 bags locally to manage immediate customer demand."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Ban size={14} />
                  <span>{isCancelling ? 'Cancelling...' : 'Confirm Order Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Hub Dispatch Contact & Hotline Modal */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            maxWidth: '460px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#F0F9FF', padding: '16px 20px', borderBottom: '1px solid #E0F2FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369A1', fontWeight: 700, fontSize: '15px' }}>
                <PhoneCall size={18} />
                <span>Peliyagoda Logistics Control</span>
              </div>
              <button onClick={() => setShowContactModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369A1' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '12px' }}>Central Route Dispatcher Lead</span>
                <strong style={{ fontSize: '14px', color: '#1E293B' }}>Kamal Jayasinghe (Peliyagoda Central)</strong>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Direct Extension:</span>
                  <strong style={{ color: '#FF6600' }}>Ext. 204</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Direct Hotline:</span>
                  <strong style={{ color: '#1E293B' }}>+94 11 291 0000</strong>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Order #{activeOrder.delivery_id} has been flagged for reference when you contact the dispatcher.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowContactModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    triggerToast('📞 Call placed to Peliyagoda Dispatch Desk (Ext. 204)...');
                  }}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0284C7', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PhoneCall size={14} />
                  <span>Dial Dispatch Desk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
