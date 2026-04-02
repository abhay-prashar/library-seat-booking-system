import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CalendarDays, Zap, X, Clock } from 'lucide-react';

const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async (p = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10 };
      if (status) params.status = status;
      const res = await bookingsAPI.getMy(params);
      setBookings(res.data.bookings);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(1); }, [statusFilter]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id, 'User cancelled');
      toast.success('Booking cancelled');
      fetchBookings(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await bookingsAPI.checkIn(id);
      toast.success('Checked in!');
      fetchBookings(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>My Bookings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {total} booking{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {['', 'active', 'completed', 'cancelled', 'expired', 'no_show'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '0.35rem 0.85rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.15s',
              borderColor: statusFilter === s ? '#6c63ff' : 'var(--border)',
              background: statusFilter === s ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: statusFilter === s ? '#a78bfa' : 'var(--text-secondary)',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CalendarDays size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No bookings found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bookings.map(b => (
            <div key={b._id} className="glass-card fade-in" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Seat info */}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: b.status === 'active' ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, color: b.status === 'active' ? '#a78bfa' : 'var(--text-secondary)' }}>
                {b.seat?.seatNumber}
              </div>

              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.section?.name}</span>
                  <StatusBadge status={b.status} />
                  {b.checkInTime && <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✓ Checked in</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} />
                  {format(new Date(b.startTime), 'dd MMM, h:mm a')} → {format(new Date(b.endTime), 'h:mm a')}
                  <span style={{ marginLeft: 4 }}>({b.durationMinutes} min)</span>
                </div>
              </div>

              {b.status === 'active' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!b.checkInTime && (
                    <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }} onClick={() => handleCheckIn(b._id)}>
                      <Zap size={13} /> Check In
                    </button>
                  )}
                  <button className="btn-danger" style={{ fontSize: '0.78rem' }} onClick={() => handleCancel(b._id)}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchBookings(p)}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem',
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
