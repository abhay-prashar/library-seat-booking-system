import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';

const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = async (p = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (status) params.status = status;
      const res = await adminAPI.getBookings(params);
      setBookings(res.data.bookings);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch { toast.error('Failed to fetch bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(1); }, [statusFilter]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await adminAPI.cancelBooking(id, 'Cancelled by admin');
      toast.success('Booking cancelled');
      fetch(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>All Bookings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{total} total</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['', 'active', 'cancelled', 'expired', 'no_show', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '0.3rem 0.75rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s',
                borderColor: statusFilter === s ? '#6c63ff' : 'var(--border)',
                background: statusFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                color: statusFilter === s ? '#a78bfa' : 'var(--text-secondary)',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Seat</th>
              <th>Section</th>
              <th>Time Slot</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No bookings found</td></tr>
            ) : bookings.map(b => (
              <tr key={b._id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{b.user?.name}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{b.user?.studentId || b.user?.email}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{b.seat?.seatNumber}</td>
                <td>{b.section?.name}</td>
                <td>
                  <div style={{ fontSize: '0.82rem' }}>{format(new Date(b.startTime), 'dd MMM')}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                    {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}
                  </div>
                </td>
                <td><StatusBadge status={b.status} /></td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {b.checkInTime ? format(new Date(b.checkInTime), 'h:mm a') : '—'}
                </td>
                <td>
                  {b.status === 'active' && (
                    <button className="btn-danger" style={{ fontSize: '0.75rem' }} onClick={() => handleCancel(b._id)}>
                      <X size={12} /> Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetch(p)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: '0.82rem',
                borderColor: page === p ? '#6c63ff' : 'var(--border)',
                background: page === p ? 'rgba(108,99,255,0.15)' : 'transparent',
                color: page === p ? '#a78bfa' : 'var(--text-secondary)',
              }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
