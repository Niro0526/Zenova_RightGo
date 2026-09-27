import React from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Info, 
  Package, 
  CheckCircle2, 
  Clock,
  Check
} from 'lucide-react';

interface OrderDetailViewProps {
  order?: any;
  selectedOutlet?: any;
  onBack: () => void;
  onConfirmReceipt: (order: any) => void;
  onInspectDegradation: (order: any) => void;
}

export default function OrderDetailView({ 
  order, 
  selectedOutlet = {}, 
  onBack, 
  onConfirmReceipt, 
  onInspectDegradation 
}: OrderDetailViewProps) {
  const activeOrder = order || {
    delivery_id: 'S1-001',
    brand: 'Fresh',
    placed_at: '7 Jan, 14:32'
  };

  return (
    <div className="figma-main">
      {/* Header Bar */}
      <div>
        <button
          onClick={onBack}
          className="back-link-btn"
        >
          <ArrowLeft size={14} />
          <span>Back to Orders</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title-text" style={{ fontSize: '24px' }}>Order {activeOrder.delivery_id}</h1>
            <span style={{
              background: '#DCFCE7',
              color: '#16A34A',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              Fresh
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Placed: <strong>7 Jan, 14:32</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Delivery Status Timeline Card */}
        <div className="figma-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D' }}>Delivery Status Timeline</h3>

          <div className="vertical-timeline">
            {/* Step 1: Received */}
            <div className="timeline-node">
              <div className="timeline-dot green"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#22C55E' }}>Received</div>
                <div className="timeline-node-desc">7 Jan, 14:32 · Order entered queue</div>
              </div>
            </div>

            {/* Step 2: Awaiting Planning */}
            <div className="timeline-node">
              <div className="timeline-dot green"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#22C55E' }}>Awaiting Planning</div>
                <div className="timeline-node-desc">7 Jan, 16:00 · Cutoff checked & locked</div>
              </div>
            </div>

            {/* Step 3: Scheduled */}
            <div className="timeline-node">
              <div className="timeline-dot green"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#22C55E' }}>Scheduled</div>
                <div className="timeline-node-desc">8 Jan, 05:15 · Arriving between 05:00-07:30</div>
              </div>
            </div>

            {/* Step 4: Out for Delivery (Current) */}
            <div className="timeline-node">
              <div className="timeline-dot pulsing"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#22C55E', fontWeight: 700 }}>Out for Delivery (Current)</div>
                <div className="timeline-node-desc">8 Jan, 06:05 · Driver departed Peliyagoda</div>
              </div>
            </div>

            {/* Step 5: Delivered */}
            <div className="timeline-node">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#8A9BB0' }}>Delivered</div>
                <div className="timeline-node-desc">upcoming target: 05:00-07:30</div>
              </div>
            </div>

            {/* Step 6: Receipt Confirmed */}
            <div className="timeline-node">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-node-title" style={{ color: '#8A9BB0' }}>Receipt Confirmed</div>
                <div className="timeline-node-desc">Pending store manager audit</div>
              </div>
            </div>
          </div>
          {/* Assigned Driver & Vehicle Card */}
          <div className="figma-card" style={{ marginTop: '16px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#202D2D' }}>
                🚚 Assigned Driver & Vehicle
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                background: '#DCFCE7',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                En Route
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              {/* Driver Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>Assigned Driver</div>
                  <div style={{ fontWeight: 700, color: '#202D2D', fontSize: '13px' }}>
                    {activeOrder.driver_name || 'Chaminda Vithanage'}
                  </div>
                </div>
                <a
                  href="tel:+94773489120"
                  style={{
                    background: '#FFF4ED',
                    color: '#F97316',
                    border: '1px solid #FED7AA',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📞 Call Driver
                </a>
              </div>

              {/* Vehicle & Depot Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Vehicle</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>{activeOrder.vehicle_id || 'VEH003 (Reefer Van 3.5T)'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Origin Depot</span>
                <span style={{ fontWeight: 600, color: '#202D2D' }}>Peliyagoda Central Depot</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Estimated Arrival</span>
                <span style={{ fontWeight: 700, color: '#0369A1' }}>{activeOrder.expected_arrival || 'Today, 05:00-07:30'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Delivery Update Banner & Manifest Items Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quantity Adjusted Banner */}
          <div style={{
            background: '#FFF4ED',
            border: '1px solid #FED7AA',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: 700, fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>Delivery Update — Quantity Adjusted</span>
            </div>
            <p style={{ fontSize: '12px', color: '#B45309', lineHeight: '18px' }}>
              8 units of chilled stock replaced due to a loading shortfall. Original 60 units confirmed - replacement stock loaded and verified by loader.
            </p>
          </div>

          {/* Manager Note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#64748B' }}>
            <Info size={14} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>
              <strong>Manager Note:</strong> Two deliveries planned today: Your ambient and chilled items are traveling under distinct segments and may arrive separately.
            </span>
          </div>

          {/* Manifest Items Card */}
          <div className="figma-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D' }}>Manifest Items</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Item 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#202D2D' }}>Organic Chicken Breast</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Segment: Chilled</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#202D2D' }}>4 cases</div>
              </div>

              {/* Item 2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#202D2D' }}>Whole Pasteurised Milk</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Segment: Chilled</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#202D2D' }}>8 cases</div>
              </div>

              {/* Item 3 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#202D2D' }}>Basmati Rice 5kg</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Segment: Ambient</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#202D2D' }}>3 cases</div>
              </div>
            </div>

            {/* Operational Change note */}
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '11px',
              color: '#92400E'
            }}>
              <strong>OPERATIONAL CHANGE:</strong> 8 of 60 chilled units on S1-001 replaced due to loading damage. No quantity reduction.
            </div>

            {/* Action button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-orange-primary"
                onClick={() => onConfirmReceipt(activeOrder)}
              >
                Proceed to Confirm Receipt →
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
