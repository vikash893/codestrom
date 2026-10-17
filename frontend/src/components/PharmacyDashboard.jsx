import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Pill, Plus, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const PharmacyDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageForm, setDosageForm] = useState('tablet');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pharmacy profile
      const meRes = await api.get('/auth/me');
      const userId = meRes.data.user.id;

      // 2. Fetch low stock alerts
      const alertsRes = await api.get('/pharmacies/inventory/alerts/low-stock');
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error('Error loading pharmacy alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await api.post('/pharmacies/inventory', {
        medicineName,
        genericName,
        brandName,
        strength,
        dosageForm,
        availableQuantity: parseInt(quantity, 10),
        unitPrice: parseFloat(price),
        batchNumber,
        expiryDate: expiryDate || undefined,
      });

      // Reset form
      setMedicineName('');
      setGenericName('');
      setBrandName('');
      setStrength('');
      setQuantity('');
      setPrice('');
      setBatchNumber('');
      setExpiryDate('');
      setShowAddForm(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to add medicine');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pharmacy Management Portal</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage live medicine inventory and stock alerts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          <span>Add Medicine to Stock</span>
        </button>
      </div>

      {/* Low Stock Alerts Banner */}
      {alerts.length > 0 && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <strong style={{ fontSize: '1rem' }}>Low Stock & Replenishment Alerts ({alerts.length})</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {alerts.map((a) => (
              <span key={a._id} className="badge badge-warning" style={{ fontSize: '0.825rem', padding: '0.35rem 0.65rem' }}>
                {a.medicineName}: {a.availableQuantity} units left ({a.stockStatus.replace(/_/g, ' ')})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddForm && (
        <div className="modal-backdrop" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Add Medicine to Inventory</h3>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dolo 650mg / Amoxicillin"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Generic Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Paracetamol"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Strength</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 650mg"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Available Quantity *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min={0}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 35.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. BATCH-99"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save to Inventory
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Overview */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Active Inventory Items</h3>
        {alerts.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Strength</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th>Last Restocked</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.medicineName}</strong></td>
                  <td>{item.strength || 'Standard'}</td>
                  <td>{item.availableQuantity} units</td>
                  <td>₹{item.unitPrice}</td>
                  <td>
                    <span className={`badge ${item.stockStatus === 'in_stock' ? 'badge-success' : item.stockStatus === 'low_stock' ? 'badge-warning' : 'badge-danger'}`}>
                      {item.stockStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{new Date(item.lastRestockedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No medicine stock items found. Click "Add Medicine to Stock" above to register your inventory.
          </div>
        )}
      </div>
    </div>
  );
};
