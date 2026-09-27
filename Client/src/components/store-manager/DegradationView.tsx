import React from 'react';
import { ArrowLeft, AlertTriangle, Info, Clock } from 'lucide-react';

interface DegradationViewProps {
  order?: any;
  selectedOutlet?: any;
  onBack: () => void;
  onAcknowledge?: (deliveryId: string) => void;
}

export default function DegradationView({ 
  order, 
  selectedOutlet = {}, 
  onBack, 
  onAcknowledge 
}: DegradationViewProps) {
  const activeOrder = order || {
    delivery_id: 'RG-F-2748',
    placed_at: '25 Sep, 14:20'
  };

  const handleAcknowledge = () => {
    if (onAcknowledge) {
      onAcknowledge(activeOrder.delivery_id);
    } else {
      alert('Deferral notice acknowledged. Order rolled over to next planning cycle.');
      onBack();
    }
  };

  return (
    <div className="figma-main">
      {/* Top Header Bar */}
      <div>
        <button
          onClick={onBack}
          className="back-link-btn"
        >
          <ArrowLeft size={14} />
          <span>Back to Orders</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div>
            <h1 className="page-title-text" style={{ fontSize: '24px' }}>Order {activeOrder.delivery_id}</h1>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Placed: <strong>25 Sep, 14:20</strong></div>
          </div>

          <span className="status-badge-figma deferred">
            Deferred
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Delivery Status Timeline & Manifest Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Delivery Status Timeline Card */}
          <div className="figma-card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D' }}>Delivery Status Timeline</h3>

            <div className="vertical-timeline">
              {/* Step 1: Received */}
              <div className="timeline-node">
                <div className="timeline-dot green"></div>
                <div>
                  <div className="timeline-node-title" style={{ color: '#22C55E' }}>Received</div>
                  <div className="timeline-node-desc">25 Sep, 14:20 · Order entered queue</div>
                </div>
              </div>

              {/* Step 2: Awaiting Planning */}
              <div className="timeline-node">
                <div className="timeline-dot green"></div>
                <div>
                  <div className="timeline-node-title" style={{ color: '#22C55E' }}>Awaiting Planning</div>
                  <div className="timeline-node-desc">25 Sep, 16:00 · Cutoff checked & locked</div>
                </div>
              </div>

              {/* Step 3: Deferred */}
              <div className="timeline-node">
                <div className="timeline-dot red"></div>
                <div>
                  <div className="timeline-node-title" style={{ color: '#EF4444', fontWeight: 700 }}>Deferred</div>
                  <div className="timeline-node-desc">26 Sep, 05:10 · Could not be allocated to fleet</div>
                </div>
              </div>

              {/* Step 4: Scheduled */}
              <div className="timeline-node">
                <div className="timeline-dot"></div>
                <div>
                  <div className="timeline-node-title" style={{ color: '#8A9BB0' }}>Scheduled</div>
                  <div className="timeline-node-desc">Pending</div>
                </div>
              </div>

              {/* Step 5: Delivered */}
              <div className="timeline-node">
                <div className="timeline-dot"></div>
                <div>
                  <div className="timeline-node-title" style={{ color: '#8A9BB0' }}>Delivered</div>
                  <div className="timeline-node-desc">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Manifest Items (Waiting — Unchanged) Card */}
          <div className="figma-card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#202D2D', marginBottom: '14px' }}>
              Manifest Items (Waiting — Unchanged)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#202D2D' }}>Grade A Chicken Breast</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Segment: Chilled</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>4 cases</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#202D2D' }}>Whole Milk 1L</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Segment: Chilled</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>8 cases</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#202D2D' }}>Basmati Rice 5kg</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Segment: Ambient</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>3 cases</div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Deferral Alert, Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Order Deferred Alert Banner */}
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>Order Deferred</span>
            </div>
            <p style={{ fontSize: '12px', color: '#991B1B', lineHeight: '18px' }}>
              Your order could not be scheduled for today's run. Fleet capacity was fully allocated to higher-priority Fresh deliveries. This order will be rescheduled once the next operating plan is confirmed.
            </p>
          </div>

          {/* Deferral Details Card */}
          <div className="figma-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#202D2D' }}>Deferral Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Reason</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>Fleet capacity exceeded</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Decided By</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>Dispatcher - Peliyagoda</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Original Date</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>27 Sep, 2026</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>New Expected Date</span>
                <span style={{ fontWeight: 600, color: '#F59E0B' }}>Pending — Awaiting next planning cycle</span>
              </div>
            </div>
          </div>

          {/* Consecutive Deferral Sub-Warning Banner */}
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={14} color="#D97706" />
            <span>This order was deferred yesterday. Last served: <strong>3 days ago</strong>.</span>
          </div>

          {/* Actions Row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn-orange-primary"
              style={{ flex: 1 }}
              onClick={handleAcknowledge}
            >
              Acknowledge
            </button>

            <button
              type="button"
              className="btn-secondary-white"
              style={{ flex: 1 }}
              onClick={() => alert('Contacting Peliyagoda Planning Desk (+94 11 291 0000)...')}
            >
              Contact Dispatcher
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
