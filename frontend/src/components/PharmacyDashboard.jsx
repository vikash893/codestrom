import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sidebar } from './Sidebar';
import { SkeletonCard, SkeletonOrderItem } from './Skeleton';
import {
  Pill,
  Plus,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShoppingBag,
  Truck,
  PhoneCall,
  Clock,
  ArrowRight,
  PackageCheck,
  Check,
} from 'lucide-react';

export const PharmacyDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'inventory' | 'alerts'
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pharmacyProfile, setPharmacyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Medicine Form State
  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageForm, setDosageForm] = useState('tablet');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Status updating state
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pharmacy profile & inventory
      const meRes = await api.get('/pharmacies/my/inventory');
      if (meRes.data.pharmacy) {
        setPharmacyProfile(meRes.data.pharmacy);
      }
      setInventory(meRes.data.inventory || []);

      // 2. Fetch low stock alerts
      const alertsRes = await api.get('/pharmacies/inventory/alerts/low-stock');
      setAlerts(alertsRes.data.alerts || []);

      // 3. Fetch incoming delivery orders
      const ordersRes = await api.get('/orders/pharmacy-orders');
      setOrders(ordersRes.data.orders || []);
    } catch (err) {
      console.warn('Pharmacy data load warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling for incoming orders
    return () => clearInterval(interval);
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormError('');
    setAddLoading(true);

    try {
      await api.post('/pharmacies/inventory', {
        medicineName,
        genericName,
        brandName,
        strength,
        dosageForm,
        availableQuantity: parseInt(quantity, 10),
        unitPrice: parseFloat(price),
        batchNumber: batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
      });

      setMedicineName('');
      setGenericName('');
      setBrandName('');
      setStrength('');
      setQuantity('');
      setPrice('');
      setBatchNumber('');
      setShowAddForm(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to add medicine');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        role="pharmacy"
        counts={{
          pharmacyOrders: orders.filter((o) => o.status !== 'delivered').length,
          inventory: inventory.length,
          alerts: alerts.length,
        }}
      />

      {/* Main Content Workspace */}
      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {pharmacyProfile?.storeName || 'Medical Store Management'}
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              {language === 'hi'
                ? 'दवा स्टॉक इन्वेंट्री, होम डिलीवरी ऑर्डर स्वीकारना व लाइव डिस्पैच ट्रैकिंग'
                : 'Live medicine inventory, customer home delivery fulfillment, and dispatch tracking'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button className="btn btn-outline" onClick={loadData} style={{ padding: '0.4rem 0.6rem' }} title="Refresh">
              <RefreshCw size={15} />
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={16} />
              <span>{language === 'hi' ? 'दवा स्टॉक जोड़ें' : 'Add Medicine to Stock'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: HOME DELIVERY ORDERS */}
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SkeletonOrderItem />
                <SkeletonOrderItem />
              </div>
            ) : orders.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <ShoppingBag size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
                  {language === 'hi' ? 'कोई नया होम डिलीवरी ऑर्डर नहीं है' : 'No Home Delivery Orders Yet'}
                </h4>
                <p style={{ fontSize: '0.825rem' }}>
                  {language === 'hi'
                    ? 'जब मरीज पर्ची स्कैन कर या दवा सूची से ऑर्डर करेंगे, वह तुरंत यहां दिखाई देगा।'
                    : 'When patients order medicine via prescription scanner or stock discovery, orders will populate here with live dispatch controls.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((ord) => {
                  const isDelivered = ord.status === 'delivered';

                  return (
                    <div
                      key={ord._id}
                      className="card"
                      style={{
                        background: isDelivered ? '#f8fafc' : '#ffffff',
                        border: isDelivered ? '1px solid #e2e8f0' : '1.5px solid #86efac',
                        borderRadius: '10px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Order #{ord.orderId}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Patient: <strong>{ord.deliveryAddress?.patientName || 'Patient'}</strong> &bull; Phone: <strong>{ord.deliveryAddress?.contactPhone}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            background: ord.status === 'delivered' ? '#dcfce7' : ord.status === 'out_for_delivery' ? '#fef3c7' : '#e0f2fe',
                            color: ord.status === 'delivered' ? '#166534' : ord.status === 'out_for_delivery' ? '#92400e' : '#0369a1',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                          }}>
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Items & Delivery Address */}
                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.85rem', fontSize: '0.825rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <strong>{language === 'hi' ? 'दवाइयां' : 'Items Ordered'}:</strong>
                          <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                            {ord.items?.map((it, idx) => (
                              <li key={idx}>
                                {it.medicineName} x {it.quantity} &bull; ₹{it.unitPrice}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong>{language === 'hi' ? 'डिलीवरी का पता' : 'Delivery Destination'}:</strong>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                            📍 {ord.deliveryAddress?.street}, {ord.deliveryAddress?.city}
                          </p>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Collect Amount:</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                            ₹{ord.totalAmount}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Cash on Delivery</span>
                        </div>
                      </div>

                      {/* Stage Progression Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {ord.status === 'placed' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            disabled={updatingOrderId === ord._id}
                            onClick={() => handleUpdateOrderStatus(ord.orderId, 'confirmed')}
                          >
                            <Check size={14} />
                            <span>{language === 'hi' ? 'ऑर्डर स्वीकारें (Confirm)' : 'Accept & Confirm Order'}</span>
                          </button>
                        )}

                        {ord.status === 'confirmed' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#059669' }}
                            disabled={updatingOrderId === ord._id}
                            onClick={() => handleUpdateOrderStatus(ord.orderId, 'packed')}
                          >
                            <PackageCheck size={14} />
                            <span>{language === 'hi' ? 'पैक हो गया (Mark Packed)' : 'Mark Packed & Ready'}</span>
                          </button>
                        )}

                        {ord.status === 'packed' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#d97706' }}
                            disabled={updatingOrderId === ord._id}
                            onClick={() => handleUpdateOrderStatus(ord.orderId, 'out_for_delivery')}
                          >
                            <Truck size={14} />
                            <span>{language === 'hi' ? 'डिलीवरी के लिए भेजें (Dispatch)' : 'Dispatch for Delivery'}</span>
                          </button>
                        )}

                        {ord.status === 'out_for_delivery' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#16a34a' }}
                            disabled={updatingOrderId === ord._id}
                            onClick={() => handleUpdateOrderStatus(ord.orderId, 'delivered')}
                          >
                            <CheckCircle2 size={14} />
                            <span>{language === 'hi' ? 'डिलीवर हो गया (Mark Delivered)' : 'Complete & Mark Delivered'}</span>
                          </button>
                        )}

                        {ord.status === 'delivered' && (
                          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={16} />
                            <span>{language === 'hi' ? 'सफलतापूर्वक पूरा हुआ' : 'Order Successfully Delivered'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {inventory.map((item) => (
                  <div key={item._id} className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{item.medicineName}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.genericName} &bull; {item.dosageForm}</span>
                      </div>
                      <span className={`badge ${item.stockStatus === 'in_stock' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {item.stockStatus?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.825rem', color: '#334155', margin: '0.5rem 0' }}>
                      <div><strong>Available Qty: </strong> {item.availableQuantity} units</div>
                      <div><strong>Unit Price: </strong> ₹{item.unitPrice}</div>
                      {item.batchNumber && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Batch: {item.batchNumber}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LOW STOCK ALERTS */}
        {activeTab === 'alerts' && (
          <div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <SkeletonCard height="80px" />
                <SkeletonCard height="80px" />
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#166534' }}>All Stocks are Healthy</h4>
                <p style={{ fontSize: '0.825rem' }}>No medicines currently below critical threshold.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map((al) => (
                  <div key={al._id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#b45309', fontSize: '0.95rem' }}>{al.medicineName}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#78350f' }}>
                        Only {al.availableQuantity} units left in stock!
                      </div>
                    </div>
                    <span className="badge badge-warning">REPLENISHMENT REQUIRED</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD MEDICINE MODAL */}
        {showAddForm && (
          <div className="modal-backdrop" onClick={() => setShowAddForm(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
              background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Add Medicine to Inventory</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddItem}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="e.g. Dolo 650"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Generic Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="Paracetamol"
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Strength
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="650mg"
                      value={strength}
                      onChange={(e) => setStrength(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Dosage Form
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      value={dosageForm}
                      onChange={(e) => setDosageForm(e.target.value)}
                    >
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup</option>
                      <option value="cream">Cream / Ointment</option>
                      <option value="lotion">Lotion</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Available Quantity *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="35"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                  disabled={addLoading}
                >
                  {addLoading ? 'Adding...' : 'Add Medicine to Stock'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
