import { useState, useEffect } from 'react';
import { adminAPI, seatsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Wrench, Trash2, X } from 'lucide-react';

export default function AdminSeats() {
  const [seats, setSeats] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionFilter, setSectionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ seatNumber: '', section: '', row: '', col: '' });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [secRes, seatRes] = await Promise.all([
        seatsAPI.getSections(),
        seatsAPI.getAll(sectionFilter ? { sectionId: sectionFilter } : {}),
      ]);
      setSections(secRes.data.sections);
      setSeats(seatRes.data.seats);
      if (!sectionFilter && !form.section && secRes.data.sections.length) {
        setForm(p => ({ ...p, section: secRes.data.sections[0]._id }));
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sectionFilter]);

  const toggleMaintenance = async (seat) => {
    try {
      await seatsAPI.update(seat._id, { isMaintenance: !seat.isMaintenance, maintenanceNote: seat.isMaintenance ? null : 'Under maintenance' });
      toast.success(`Seat ${seat.isMaintenance ? 'restored' : 'put in maintenance'}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteSeat = async (seat) => {
    if (!confirm(`Delete seat ${seat.seatNumber}?`)) return;
    try {
      await seatsAPI.delete(seat._id);
      toast.success('Seat deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const addSeat = async () => {
    if (!form.seatNumber || !form.section) return toast.error('Seat number and section required');
    setAdding(true);
    try {
      await seatsAPI.create({ seatNumber: form.seatNumber, section: form.section, row: Number(form.row) || undefined, col: Number(form.col) || undefined });
      toast.success('Seat added');
      setShowAddModal(false);
      setForm(p => ({ ...p, seatNumber: '', row: '', col: '' }));
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAdding(false); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Manage Seats</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{seats.length} seats</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add Seat</button>
      </div>

      {/* Section filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button onClick={() => setSectionFilter('')} style={{ padding: '0.35rem 0.85rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', borderColor: !sectionFilter ? '#6c63ff' : 'var(--border)', background: !sectionFilter ? 'rgba(108,99,255,0.15)' : 'transparent', color: !sectionFilter ? '#a78bfa' : 'var(--text-secondary)' }}>All</button>
        {sections.map(s => (
          <button key={s._id} onClick={() => setSectionFilter(s._id)} style={{ padding: '0.35rem 0.85rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', borderColor: sectionFilter === s._id ? '#6c63ff' : 'var(--border)', background: sectionFilter === s._id ? 'rgba(108,99,255,0.15)' : 'transparent', color: sectionFilter === s._id ? '#a78bfa' : 'var(--text-secondary)' }}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Seat No.</th>
              <th>Section</th>
              <th>Floor</th>
              <th>Row / Col</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : seats.map(seat => (
              <tr key={seat._id}>
                <td style={{ fontWeight: 600 }}>{seat.seatNumber}</td>
                <td>{seat.section?.name}</td>
                <td>{seat.section?.floor}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{seat.row} / {seat.col}</td>
                <td>
                  {seat.isMaintenance
                    ? <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Maintenance</span>
                    : seat.isAvailable
                      ? <span className="badge badge-active">Available</span>
                      : <span className="badge badge-cancelled">Occupied</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => toggleMaintenance(seat)}>
                      <Wrench size={12} />{seat.isMaintenance ? 'Restore' : 'Maintenance'}
                    </button>
                    <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => deleteSeat(seat)} disabled={!seat.isAvailable}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add seat modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Seat</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>Seat Number</label>
                <input className="input" placeholder="e.g. A01" value={form.seatNumber} onChange={e => setForm(p => ({ ...p, seatNumber: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>Section</label>
                <select className="input" value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} style={{ cursor: 'pointer' }}>
                  {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>Row</label>
                  <input className="input" type="number" min={1} placeholder="1" value={form.row} onChange={e => setForm(p => ({ ...p, row: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>Col</label>
                  <input className="input" type="number" min={1} placeholder="1" value={form.col} onChange={e => setForm(p => ({ ...p, col: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={addSeat} disabled={adding}>{adding ? 'Adding...' : 'Add Seat'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
