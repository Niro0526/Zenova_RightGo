import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Info, 
  UploadCloud, 
  Camera, 
  CheckCircle2,
  PenTool,
  Clock,
  User,
  Package,
  FileCheck,
  RefreshCw,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';

interface ConfirmReceiptViewProps {
  order?: any;
  selectedOutlet?: any;
  onReceiptConfirmed: (deliveryId: string, payload: any) => void;
  onBack: () => void;
}

export default function ConfirmReceiptView({ 
  order, 
  selectedOutlet = {}, 
  onReceiptConfirmed, 
  onBack 
}: ConfirmReceiptViewProps) {
  const currentOrder = order || {
    delivery_id: 'S1-001',
    driver_name: 'Chaminda Vithanage',
    vehicle_id: 'VEH003 (Reefer Van)',
    brand: 'Fresh'
  };

  // Delivery Status: 'complete' | 'partial' | 'damaged' | 'temp'
  const [deliveryStatus, setDeliveryStatus] = useState('complete');

  // Form Fields
  const [receiverName, setReceiverName] = useState('K. Perera (Store Manager)');
  const [deliveredTime, setDeliveredTime] = useState('07:30 AM');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [affectedProduct, setAffectedProduct] = useState('Organic Chicken Breast');
  const [reportedShortQty, setReportedShortQty] = useState('2 cases');

  // Interactive Checklist of Delivered Items
  const [itemsChecklist, setItemsChecklist] = useState([
    { id: 'item-1', name: 'Organic Chicken Breast', requested: '4 cases', expected: '4 cases', received: 4, isTicked: true, temp: 'Chilled (+4°C)' },
    { id: 'item-2', name: 'Whole Pasteurised Milk', requested: '8 cases', expected: '8 cases', received: 8, isTicked: true, temp: 'Chilled (+4°C)' },
    { id: 'item-3', name: 'Basmati Rice 5kg', requested: '3 cases', expected: '3 cases', received: 3, isTicked: true, temp: 'Ambient' }
  ]);

  // Digital Signature Canvas Ref & State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1E293B';
      }
    }
  }, []);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignature(false);
    }
  };

  const applyDefaultSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '22px "Brush Script MT", cursive, sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText('K. Perera (Signed)', 40, 45);
      }
      setHasSignature(true);
    }
  };

  // Toggle item verification
  const handleToggleItem = (id: string) => {
    setItemsChecklist((prev: any[]) => prev.map((item: any) => {
      if (item.id === id) {
        return { ...item, isTicked: !item.isTicked };
      }
      return item;
    }));
  };

  // Update received quantity
  const handleItemCountChange = (id: string, count: number) => {
    setItemsChecklist((prev: any[]) => prev.map((item: any) => {
      if (item.id === id) {
        return { ...item, received: count };
      }
      return item;
    }));
  };

  // Handle Photo Upload Simulation
  const handlePhotoUploadSim = (e: any) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent: any) => {
        setUploadedPhotos((prev: any[]) => [...prev, {
          id: Date.now(),
          name: file.name,
          url: uploadEvent.target.result,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      };
      reader.readAsDataURL(file);
    } else {
      // Sample simulated photo
      setUploadedPhotos(prev => [...prev, {
        id: Date.now(),
        name: `dock_proof_${Date.now().toString().slice(-4)}.jpg`,
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=60',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const removePhoto = (id: any) => {
    setUploadedPhotos((prev: any[]) => prev.filter((p: any) => p.id !== id));
  };

  // Handle Delivery Status switch
  const handleStatusSelect = (status: string) => {
    setDeliveryStatus(status);
    if (status === 'complete') {
      // Auto-tick all checklist items
      setItemsChecklist((prev: any[]) => prev.map((i: any) => ({ ...i, isTicked: true })));
    }
  };

  // Handle Form Submission
  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!hasSignature) {
      alert('Please provide Receiver Signature before confirming delivery.');
      return;
    }

    if (deliveryStatus !== 'complete' && uploadedPhotos.length === 0 && !discrepancyNote.trim()) {
      alert('Please add a short discrepancy note or attach a photo proof for reported issues.');
      return;
    }

    const isFullMatch = deliveryStatus === 'complete';
    const totalReceivedUnits = itemsChecklist.reduce((acc, item) => acc + (item.received || 0), 0);
    const disputesList = isFullMatch ? [] : [{
      product: affectedProduct,
      type: deliveryStatus,
      shortage: reportedShortQty,
      note: discrepancyNote,
      photosCount: uploadedPhotos.length
    }];

    onReceiptConfirmed(currentOrder.delivery_id, {
      confirmedAt: deliveredTime,
      receiverName,
      status: deliveryStatus,
      disputes: disputesList,
      isFullMatch,
      confirmedUnits: totalReceivedUnits > 0 ? totalReceivedUnits : 12
    });
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
          <span>Back to order details</span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div>
            <h1 className="page-title-text" style={{ fontSize: '24px' }}>
              Proof of Delivery & Goods Receipt
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              Order Ref: <strong>{currentOrder.delivery_id}</strong> • Driver: <strong>{currentOrder.driver_name || 'Chaminda Vithanage'}</strong> ({currentOrder.vehicle_id || 'VEH003 Reefer'})
            </p>
          </div>

          <span style={{
            background: '#FFF4ED',
            color: '#F59E0B',
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #FED7AA'
          }}>
            ⏳ Awaiting Store Sign-Off
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px', alignItems: 'flex-start', marginTop: '12px' }}>
        
        {/* LEFT COLUMN: Physical Goods Audit Checklist & Status Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. Delivery Status Selection (Complete / Partial / Damaged / Temp) */}
          <div className="figma-card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#202D2D', marginBottom: '6px' }}>
              📦 Step 1: Overall Delivery Status
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
              Select how the physical delivery arrived at {selectedOutlet.name || 'Store Dock'}:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {/* Complete Delivery */}
              <div
                onClick={() => handleStatusSelect('complete')}
                style={{
                  border: deliveryStatus === 'complete' ? '2px solid #22C55E' : '1px solid #CBD5E1',
                  background: deliveryStatus === 'complete' ? '#F0FDF4' : '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#22C55E" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>Complete Delivery</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  All items received intact in full quantity. No issues.
                </div>
              </div>

              {/* Partial / Short Delivery */}
              <div
                onClick={() => handleStatusSelect('partial')}
                style={{
                  border: deliveryStatus === 'partial' ? '2px solid #F97316' : '1px solid #CBD5E1',
                  background: deliveryStatus === 'partial' ? '#FFF4ED' : '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color="#F97316" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#C2410C' }}>Partial / Shortage</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Missing cases or fewer units than manifest.
                </div>
              </div>

              {/* Damaged Goods */}
              <div
                onClick={() => handleStatusSelect('damaged')}
                style={{
                  border: deliveryStatus === 'damaged' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                  background: deliveryStatus === 'damaged' ? '#FEF2F2' : '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={16} color="#EF4444" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B' }}>Damaged in Transit</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Crushed boxes, leaks, or broken packaging.
                </div>
              </div>

              {/* Temperature Issue */}
              <div
                onClick={() => handleStatusSelect('temp')}
                style={{
                  border: deliveryStatus === 'temp' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                  background: deliveryStatus === 'temp' ? '#FEF2F2' : '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B' }}>Cold-Chain Breach</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Chilled goods arrived warm or thawed.
                </div>
              </div>
            </div>
          </div>

          {/* 2. Unloading Checklist Table */}
          <div className="figma-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#202D2D' }}>
                  📋 Step 2: Unload Audit Checklist
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Tick items as physically counted off the vehicle:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setItemsChecklist(prev => prev.map(i => ({ ...i, isTicked: true })))}
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#16A34A',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✓ Tick All
              </button>
            </div>

            <table className="figma-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Tick</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Manifest Qty</th>
                  <th>Actual Received</th>
                </tr>
              </thead>
              <tbody>
                {itemsChecklist.map(item => (
                  <tr key={item.id} style={{ background: item.isTicked ? '#F0FDF4' : 'inherit' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isTicked}
                        onChange={() => handleToggleItem(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22C55E' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: item.temp.includes('Chilled') ? '#E0F2FE' : '#F1F5F9',
                        color: item.temp.includes('Chilled') ? '#0369A1' : '#475569'
                      }}>
                        {item.temp}
                      </span>
                    </td>
                    <td>{item.expected}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          value={item.received}
                          onChange={(e) => handleItemCountChange(item.id, parseInt(e.target.value) || 0)}
                          style={{
                            width: '55px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748B' }}>cases</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conditional Discrepancy Details Box (Only shows if Partial/Damaged/Temp) */}
          {deliveryStatus !== 'complete' && (
            <div className="figma-card" style={{ border: '1.5px solid #FCD34D', background: '#FFFBEB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={18} color="#D97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#92400E' }}>
                  Discrepancy Details for Central Dispatcher
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                    Affected Product
                  </label>
                  <select
                    value={affectedProduct}
                    onChange={(e) => setAffectedProduct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '12px'
                    }}
                  >
                    {itemsChecklist.map(i => (
                      <option key={i.id} value={i.name}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                    Discrepancy Qty / Amount
                  </label>
                  <input
                    type="text"
                    value={reportedShortQty}
                    onChange={(e) => setReportedShortQty(e.target.value)}
                    placeholder="e.g. 2 cases missing / 1 damaged"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                  Discrepancy Explanation Note
                </label>
                <textarea
                  rows={2}
                  value={discrepancyNote}
                  onChange={(e) => setDiscrepancyNote(e.target.value)}
                  placeholder="Explain why goods were short or damaged so dispatcher can issue credit note..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Proof of Delivery Form (Signature, Photo, Receiver Info) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="figma-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#202D2D' }}>
              ✍️ Proof of Delivery (POD)
            </h3>

            {/* 1. Received By Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
                <User size={14} color="#485563" />
                <span>👤 Received By – Store Manager Name</span>
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '13px',
                  color: '#202D2D',
                  fontWeight: 600
                }}
              />
            </div>

            {/* 2. Delivered Time */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '6px' }}>
                <Clock size={14} color="#485563" />
                <span>🕐 Delivered Time at Dock</span>
              </label>
              <input
                type="text"
                value={deliveredTime}
                onChange={(e) => setDeliveredTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '13px',
                  color: '#202D2D'
                }}
              />
            </div>

            {/* 3. 📸 Add Delivery / Proof Photo */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#202D2D' }}>
                  <Camera size={14} color="#485563" />
                  <span>📸 Add Delivery Photo {deliveryStatus !== 'complete' ? '(Required for Issue)' : '(Optional)'}</span>
                </label>
              </div>

              {/* Upload Drop Zone / Button */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{
                  flex: 1,
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  background: '#F9FAFB',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <UploadCloud size={20} color="#8A9BB0" />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                    Click to browse photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUploadSim}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handlePhotoUploadSim}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Camera size={18} color="#F97316" />
                  <span>Snap Photo</span>
                </button>
              </div>

              {/* Photo Previews */}
              {uploadedPhotos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {uploadedPhotos.map(photo => (
                    <div key={photo.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ImageIcon size={14} color="#16A34A" />
                        <span style={{ fontWeight: 600, color: '#166534' }}>{photo.name}</span>
                        <span style={{ color: '#64748B' }}>({photo.time})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. ✍️ Receiver Signature Pad */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#202D2D' }}>
                  <PenTool size={14} color="#485563" />
                  <span>✍️ Receiver Signature</span>
                </label>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={applyDefaultSignature}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F97316',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Quick Sign
                  </button>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{
                border: hasSignature ? '1.5px solid #22C55E' : '1.5px dashed #CBD5E1',
                borderRadius: '8px',
                background: '#FFFFFF',
                overflow: 'hidden'
              }}>
                <canvas
                  ref={canvasRef}
                  width={370}
                  height={80}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '80px', display: 'block', cursor: 'crosshair', background: '#FAFAFA' }}
                />
              </div>
              <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px', display: 'block' }}>
                {hasSignature ? '✓ Signature captured' : 'Draw with cursor/finger or click Quick Sign'}
              </span>
            </div>

            {/* 5. General Notes / Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#202D2D', marginBottom: '4px' }}>
                📝 Store Manager Counter Note
              </label>
              <textarea
                rows={2}
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                placeholder="Unloaded at dock 2, verified with driver Chaminda..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Confirm Delivery Button */}
            <button
              type="submit"
              className="btn-orange-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={18} />
              <span>Confirm Delivery & Sign Off</span>
            </button>

            <div style={{
              background: '#F0FDF4',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#166534'
            }}>
              <FileCheck size={14} color="#22C55E" />
              <span>Receipt Ref: <strong>REC-{currentOrder.delivery_id}-001</strong></span>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}

