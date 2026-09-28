import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Truck,
  AlertTriangle,
  Building,
  PowerOff,
  XCircle,
  X,
  Check
} from 'lucide-react';

interface DashboardViewProps {
  selectedOutlet?: any;
  orders: any[];
  setCurrentView: (view: string) => void;
  setSelectedOrder: (order: any) => void;
  storeClosureNotice?: any;
  onSetStoreClosureNotice?: (notice: any) => void;
  onCancelStoreClosureNotice?: () => void;
}

export default function DashboardView({ 
  selectedOutlet = {}, 
  orders = [], 
  setCurrentView, 
  setSelectedOrder,
  storeClosureNotice,
  onSetStoreClosureNotice = () => {},
  onCancelStoreClosureNotice = () => {}
}: DashboardViewProps) {
  const outletName = selectedOutlet.name || 'Colpetty Retailer';
  const outletCode = selectedOutlet.outlet_id || 'OUT001';

  // Live Cutoff Countdown Timer (Ticking towards 16:00 cutoff for 8 Jan 2026 simulation)
  const [secondsRemaining, setSecondsRemaining] = useState(4 * 3600 + 22 * 60 + 45);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursLeft = Math.floor(secondsRemaining / 3600);
  const minutesLeft = Math.floor((secondsRemaining % 3600) / 60);
  const secondsLeft = secondsRemaining % 60;

  // Modal State for Store Closure
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureStartDate, setClosureStartDate] = useState('2026-01-09');
  const [closureEndDate, setClosureEndDate] = useState('2026-01-09');
  const [closureReason, setClosureReason] = useState('Store Maintenance / Renovation');
  const [closureRemarks, setClosureRemarks] = useState('Store closed for power grid maintenance. Resuming operations afterwards.');

  // Helper to format date nicely
  const formatDateLabel = (dStr: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formattedDateRange = closureStartDate === closureEndDate 
    ? formatDateLabel(closureStartDate) 
    : `${formatDateLabel(closureStartDate)} to ${formatDateLabel(closureEndDate)}`;

  // Group orders dynamically by section or status
  const activeOrders = orders.filter((o: any) => o.section === 'active' || o.status === 'Out for Delivery' || o.status === 'In Transit');
  const futureOrders = orders.filter((o: any) => o.section === 'future' || o.status === 'Awaiting Planning' || o.status === 'Queued');
  const deferredOrders = orders.filter((o: any) => o.section === 'deferred' || o.section === 'degraded' || (o.status && (o.status.toLowerCase().includes('defer') || o.status.toLowerCase().includes('escalat') || o.status.toLowerCase().includes('reschedule'))));
  const completedOrders = orders.filter((o: any) => o.section === 'completed' || o.section === 'past' || o.status === 'Delivered');

  const handleSaveClosure = (e: any) => {
    e.preventDefault();
    onSetStoreClosureNotice({
      date: formattedDateRange,
      startDate: closureStartDate,
      endDate: closureEndDate,
      reason: closureReason,
      remarks: closureRemarks,
      reportedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setShowClosureModal(false);
  };

  return (
    <div className="figma-main">
      {/* Top Header Bar */}
      <div className="figma-header-bar">
        <div>
          <h1 className="page-title-text">My Orders</h1>
          <p className="page-subtitle-text">
            Manage replenishment requests and delivery status for {outletName}
          </p>
        </div>

        {/* Right Meta Pills & Closure Action */}
        <div className="meta-badges-row">
          <div className="meta-pill-box">
            <span>{outletCode} / {outletName.replace('RightGo Fresh - ', '')}</span>
          </div>

          <div className="meta-pill-box">
            <span>RightGo {selectedOutlet.brand}</span>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Calendar size={14} color="#485563" />
            <span style={{ fontWeight: 600, color: '#202D2D' }}>Today, 8 Jan 2026</span>
          </div>

          {/* Report Store Closed Action Button */}
          {!storeClosureNotice && (
            <button
              type="button"
              onClick={() => setShowClosureModal(true)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '8px 12px',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                color: '#485563',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
              title="Notify Central Dispatcher if store or dock is unavailable tomorrow"
            >
              <AlertTriangle size={14} color="#F59E0B" />
              <span>Report Store Closed / Pause Delivery</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Store Closure Notice Banner */}
      {storeClosureNotice && (
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #FCD34D',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400E' }}>
                Delivery Pause Active for {storeClosureNotice.date}
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                Reason: <strong>{storeClosureNotice.reason}</strong> • Peliyagoda Dispatcher notified to exclude {outletCode} from tomorrow's vehicle routing.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelStoreClosureNotice}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#202D2D',
              cursor: 'pointer'
            }}
          >
            Resume Deliveries
          </button>
        </div>
      )}

      {/* Top Two Hero Cards (Next Expected Delivery + 4 PM Cutoff Timer) */}
      <div className="hero-cards-row">
        {/* Next Expected Delivery Card */}
        <div className="delivery-hero-card">
          <div>
            <div className="hero-header-row">
              <div className="hero-label-left">
                <Clock size={16} color="#485563" />
                <span>Next Expected Delivery</span>
              </div>
              <span className="badge-out-delivery">
                {activeOrders.length > 0 ? 'Out for Delivery' : 'All Runs Completed'}
              </span>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div className="delivery-timing-large">
                Today, 8 Jan - arriving between {selectedOutlet.window_open_time || '05:00'}-{selectedOutlet.window_close_time || '07:30'}
              </div>
              <div className="delivery-timing-sub" style={{ marginTop: '4px' }}>
                Operating Run Brand: {selectedOutlet.brand} · {activeOrders.length} active orders ({activeOrders.map(o => o.delivery_id).join(', ') || 'None in transit'})
              </div>
            </div>
          </div>

          <div className="delivery-card-footer">
            <span style={{ fontWeight: 500, color: '#485563' }}>Status:</span>
            <span>
              {activeOrders.length > 0 
                ? `Driver has departed ${selectedOutlet.depot} depot (Assigned: VEH014)`
                : 'All morning deliveries verified and signed off at counter.'}
            </span>
          </div>
        </div>

        {/* Order Cutoff Countdown Card */}
        <div className="cutoff-hero-card">
          <div className="cutoff-title-text">ORDER CUTOFF: 16:00 TODAY</div>
          <div className="cutoff-timer-countdown">
            {hoursLeft}h {String(minutesLeft).padStart(2, '0')}m {String(secondsLeft).padStart(2, '0')}s remaining
          </div>
          <div className="cutoff-sub-desc">For guaranteed delivery on 9 Jan</div>

          <button 
            className="btn-place-order-figma"
            onClick={() => setCurrentView('place-order')}
          >
            Place New Order
          </button>

          <p className="cutoff-disclaimer-text">
            Orders submitted after 4:00 PM will be planned for the following eligible operating run.
          </p>
        </div>
      </div>

      {/* SECTION 1: Active Operating Orders */}
      <div className="orders-section-block">
        <h2 className="section-title-heading">Active Operating Orders</h2>

        <div className="orders-cards-list">
          {activeOrders.length === 0 ? (
            <div className="figma-order-row-card" style={{ justifyContent: 'center', color: '#64748B', padding: '24px' }}>
              No active deliveries in transit. Check Completed Deliveries below.
            </div>
          ) : (
            activeOrders.map(order => (
              <div key={order.delivery_id} className="figma-order-row-card">
                <div className="order-left-group">
                  <div className={`brand-avatar-box ${order.brand === 'Style' ? 'style-brand' : ''}`}>
                    {order.brand_code || 'FR'}
                  </div>
                  <div>
                    <div className="order-id-code">{order.delivery_id}</div>
                    <div className="order-brand-desc">{order.order_type}</div>
                  </div>
                </div>

                <div className="order-middle-group">
                  <div className="meta-column-box">
                    <span className="meta-col-label">Expected Arrival</span>
                    <span className="meta-col-value">{order.expected_arrival || 'Today, 05:00-07:30'}</span>
                  </div>
                  <span className="status-pill-figma out-for-delivery">Out for Delivery</span>
                  <button 
                    className="btn-view-order-link"
                    onClick={() => {
                      setSelectedOrder(order);
                      setCurrentView('order-detail');
                    }}
                  >
                    <span>View Order</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: Orders for Future Runs */}
      <div className="orders-section-block">
        <h2 className="section-title-heading">Orders for Future Runs</h2>

        <div className="orders-cards-list">
          {futureOrders.map(order => (
            <div key={order.delivery_id} className="figma-order-row-card">
              <div className="order-left-group">
                <div className={`brand-avatar-box ${order.brand === 'Style' ? 'style-brand' : ''}`}>
                  {order.brand_code || 'FR'}
                </div>
                <div>
                  <div className="order-id-code">{order.delivery_id}</div>
                  <div className="order-brand-desc">{order.order_type}</div>
                </div>
              </div>

              <div className="order-middle-group">
                <div className="meta-column-box">
                  <span className="meta-col-label">Planned Dispatch</span>
                  <span className="meta-col-value">{order.planned_dispatch || '9 Jan'}</span>
                </div>
                <span className="status-pill-figma awaiting-planning">Awaiting Planning</span>
                <button 
                  className="btn-view-order-link"
                  onClick={() => {
                    setSelectedOrder(order);
                    setCurrentView('order-detail');
                  }}
                >
                  <span>View Order</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Deferred Orders */}
      <div className="orders-section-block">
        <h2 className="section-title-heading">Deferred Orders</h2>

        <div className="orders-cards-list">
          {deferredOrders.map(order => (
            <div key={order.delivery_id} className="figma-order-row-card">
              <div className="order-left-group">
                <div className={`brand-avatar-box ${order.brand === 'Style' ? 'style-brand' : ''}`}>
                  {order.brand_code || (order.brand === 'Style' ? 'ST' : 'FR')}
                </div>
                <div>
                  <div className="order-id-code">{order.delivery_id}</div>
                  <div className="order-brand-desc">{order.order_type || `Brand ${order.brand || 'Fresh'}`}</div>
                </div>
              </div>

              <div className="order-middle-group">
                <div className="meta-column-box" style={{ maxWidth: '320px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#F59E0B' }}>Deferred Reason</span>
                  <span style={{ fontSize: '12px', color: '#485563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px', display: 'block' }}>
                    {order.reason || order.deferral_reason || 'Fleet capacity shortage'}
                  </span>
                </div>
                <span className={`status-pill-figma ${order.status?.toLowerCase().includes('escalat') ? 'escalated' : order.status?.toLowerCase().includes('reschedule') ? 'delivered' : 'deferred'}`}>
                  {order.status || 'Deferred'}
                </span>
                <button 
                  className="btn-view-order-link"
                  onClick={() => {
                    setSelectedOrder(order);
                    setCurrentView('degradation');
                  }}
                >
                  <span>View Order</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Completed Deliveries */}
      <div className="orders-section-block">
        <h2 className="section-title-heading">Completed Deliveries</h2>

        <div className="orders-cards-list">
          {completedOrders.map(order => (
            <div key={order.delivery_id} className="figma-order-row-card">
              <div className="order-left-group">
                <div className={`brand-avatar-box ${order.brand === 'Style' ? 'style-brand' : ''}`}>
                  {order.brand_code || 'FR'}
                </div>
                <div>
                  <div className="order-id-code">{order.delivery_id}</div>
                  <div className="order-brand-desc">{order.order_type}</div>
                </div>
              </div>

              <div className="order-middle-group">
                <div className="meta-column-box">
                  <span className="meta-col-label">Delivered</span>
                  <span className="meta-col-value">{order.delivered_date || '7 Jan 2026'}</span>
                </div>
                <span className="status-pill-figma delivered">Delivered</span>
                <button 
                  className="btn-view-order-link"
                  onClick={() => {
                    setSelectedOrder(order);
                    setCurrentView('order-detail');
                  }}
                >
                  <span>View Order</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store Closure & Delivery Pause Modal */}
      {showClosureModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22, 26, 29, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#F59E0B" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#202D2D' }}>
                  Notify Store Closure / Pause Deliveries
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClosureModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px', lineHeight: '18px' }}>
              Informing the dispatcher in advance prevents wasted fleet trips and driver fuel quotas for <strong>{outletName} ({outletCode})</strong>.
            </p>

            <form onSubmit={handleSaveClosure} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Calendar Date Picker & Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
                  Delivery Blackout Date / Period
                </label>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setClosureStartDate('2026-01-09'); setClosureEndDate('2026-01-09'); }}
                    style={{
                      background: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-09') ? '#FFF4ED' : '#F8FAFC',
                      border: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-09') ? '1.5px solid #F97316' : '1px solid #CBD5E1',
                      color: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-09') ? '#F97316' : '#485563',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Tomorrow (9 Jan)
                  </button>

                  <button
                    type="button"
                    onClick={() => { setClosureStartDate('2026-01-10'); setClosureEndDate('2026-01-10'); }}
                    style={{
                      background: (closureStartDate === '2026-01-10' && closureEndDate === '2026-01-10') ? '#FFF4ED' : '#F8FAFC',
                      border: (closureStartDate === '2026-01-10' && closureEndDate === '2026-01-10') ? '1.5px solid #F97316' : '1px solid #CBD5E1',
                      color: (closureStartDate === '2026-01-10' && closureEndDate === '2026-01-10') ? '#F97316' : '#485563',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    10 Jan
                  </button>

                  <button
                    type="button"
                    onClick={() => { setClosureStartDate('2026-01-09'); setClosureEndDate('2026-01-11'); }}
                    style={{
                      background: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-11') ? '#FFF4ED' : '#F8FAFC',
                      border: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-11') ? '1.5px solid #F97316' : '1px solid #CBD5E1',
                      color: (closureStartDate === '2026-01-09' && closureEndDate === '2026-01-11') ? '#F97316' : '#485563',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    3-Day Window (9-11 Jan)
                  </button>
                </div>

                {/* Calendar Range Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>From Date</span>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        min="2026-01-09"
                        value={closureStartDate}
                        onChange={(e) => {
                          setClosureStartDate(e.target.value);
                          if (e.target.value > closureEndDate) {
                            setClosureEndDate(e.target.value);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '12px',
                          color: '#202D2D'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>To Date</span>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        min={closureStartDate}
                        value={closureEndDate}
                        onChange={(e) => setClosureEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '12px',
                          color: '#202D2D'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Date Range Badge */}
                <div style={{
                  marginTop: '8px',
                  background: '#F1F5F9',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#334155'
                }}>
                  <Calendar size={13} color="#64748B" />
                  <span>Selected Closure: <strong>{formattedDateRange}</strong></span>
                </div>
              </div>

              {/* Closure Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
                  Reason for Unavailability
                </label>
                <select
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '13px',
                    color: '#202D2D'
                  }}
                >
                  <option value="Store Maintenance / Renovation">Store Maintenance / Renovation</option>
                  <option value="Dock Inaccessible (Road Work / Mall Gate Locked)">Dock Inaccessible (Road Work / Mall Gate Locked)</option>
                  <option value="Cold Storage / Power Outage (Cannot receive chilled goods)">Cold Storage / Power Outage (Cannot receive chilled goods)</option>
                  <option value="Store Public Holiday / Poya Day">Store Public Holiday / Poya Day</option>
                  <option value="Staff Shortage (No Unloaders at Counter)">Staff Shortage (No Unloaders at Counter)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
                  Instructions for Peliyagoda Dispatch Desk
                </label>
                <textarea
                  rows={2}
                  value={closureRemarks}
                  onChange={(e) => setClosureRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '12px',
                    color: '#202D2D'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '13px',
                    color: '#485563',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    background: '#F97316',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  Notify Central Dispatcher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
