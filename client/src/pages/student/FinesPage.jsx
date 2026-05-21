import { useState, useEffect, useCallback } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { IndianRupee, AlertTriangle, CheckCircle2, Clock, CalendarDays } from 'lucide-react';

export default function FinesPage() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unpaid'); // unpaid, paid, all

  const fetchFines = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user's booking history
      const res = await bookingsAPI.getMy({ limit: 100 });
      // Filter only bookings that have a fine
      const finedBookings = res.data.bookings.filter(b => b.fineAmount > 0);
      setFines(finedBookings);
    } catch {
      toast.error('Failed to load fines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const handlePayFine = async (id) => {
    try {
      await bookingsAPI.payFine(id);
      toast.success('Fine paid successfully!');
      fetchFines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  const unpaidFines = fines.filter(f => !f.finePaid);
  const paidFines = fines.filter(f => f.finePaid);
  const totalUnpaidAmount = unpaidFines.reduce((sum, f) => sum + f.fineAmount, 0);

  const displayedFines = filter === 'unpaid' ? unpaidFines 
                        : filter === 'paid' ? paidFines 
                        : fines;

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Library Violations & Fines</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Manage penalties for late check-ins, overstays, and rules violations.
        </p>
      </div>

      {/* Summary Box */}
      <div className="glass-card fade-in" style={{ 
        padding: '1.5rem', 
        marginBottom: '1.5rem', 
        background: totalUnpaidAmount > 0 ? 'rgba(239, 68, 68, 0.02)' : 'rgba(34, 197, 94, 0.02)',
        borderColor: totalUnpaidAmount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Outstanding Balance</div>
          <div style={{ 
            fontSize: '2.2rem', 
            fontWeight: 800, 
            color: totalUnpaidAmount > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            marginTop: '0.25rem'
          }}>
            <IndianRupee size={28} />
            {totalUnpaidAmount}
          </div>
        </div>
        
        {totalUnpaidAmount > 0 ? (
          <div style={{ 
            maxWidth: '400px', 
            background: 'rgba(239, 68, 68, 0.06)', 
            border: '1px solid rgba(239, 68, 68, 0.1)', 
            borderRadius: '8px', 
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-red)', display: 'block', marginBottom: '0.2rem' }}>
              ⚠️ Account Restricted
            </span>
            You cannot reserve new library seats until your outstanding balance is ₹0. Please clear the fines below to unlock your account.
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--accent-green)', 
            fontWeight: 600, 
            fontSize: '0.9rem' 
          }}>
            <CheckCircle2 size={18} />
            Your account is in good standing!
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'unpaid', label: `Unpaid (${unpaidFines.length})` },
          { key: 'paid', label: `Paid (${paidFines.length})` },
          { key: 'all', label: `All Fines (${fines.length})` }
        ].map(tab => (
          <button 
            key={tab.key} 
            onClick={() => setFilter(tab.key)}
            style={{ 
              padding: '0.35rem 0.85rem', 
              borderRadius: 9999, 
              border: '1px solid', 
              cursor: 'pointer', 
              fontSize: '0.8rem', 
              transition: 'all 0.15s',
              borderColor: filter === tab.key ? 'var(--accent)' : 'var(--border)',
              background: filter === tab.key ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              color: filter === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fines List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading fines...</div>
      ) : displayedFines.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          {filter === 'unpaid' ? (
            <CheckCircle2 size={48} style={{ color: 'var(--accent-green)', opacity: 0.8, marginBottom: '1rem' }} />
          ) : (
            <AlertTriangle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          )}
          <p style={{ color: 'var(--text-secondary)' }}>
            {filter === 'unpaid' ? 'No unpaid fines! Excellent job following library guidelines.' 
             : filter === 'paid' ? 'No paid fines history found.' 
             : 'No violations or fines on record.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayedFines.map(f => (
            <div key={f._id} className="glass-card fade-in" style={{ 
              padding: '1.1rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              flexWrap: 'wrap',
              borderLeft: f.finePaid ? '4px solid var(--accent-green)' : '4px solid var(--accent-red)'
            }}>
              {/* Fine amount circular tag */}
              <div style={{ 
                width: 52, 
                height: 52, 
                borderRadius: '50%', 
                background: f.finePaid ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', 
                border: f.finePaid ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(239,68,68,0.15)',
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800, 
                fontSize: '0.85rem', 
                flexShrink: 0, 
                color: f.finePaid ? 'var(--accent-green)' : 'var(--accent-red)' 
              }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 500, lineHeight: 1 }}>₹</div>
                <div>{f.fineAmount}</div>
              </div>

              {/* Fine Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Seat {f.seat?.seatNumber} · {f.section?.name}
                  </span>
                  <span className="badge" style={{
                    background: f.finePaid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: f.finePaid ? '#22c55e' : '#ef4444',
                    border: f.finePaid ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                  }}>
                    {f.finePaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Reason:</strong> {f.fineReason || 'Seat booking violation'}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CalendarDays size={12} />
                  Session: {format(new Date(f.startTime), 'dd MMM yyyy, h:mm a')} → {format(new Date(f.endTime), 'h:mm a')}
                </div>
              </div>

              {/* Action Button */}
              {!f.finePaid && (
                <button 
                  className="btn-primary" 
                  style={{ 
                    fontSize: '0.78rem', 
                    padding: '0.4rem 0.85rem', 
                    background: 'var(--accent-yellow)', 
                    borderColor: 'var(--accent-yellow)', 
                    color: '#ffffff' 
                  }} 
                  onClick={() => handlePayFine(f._id)}
                >
                  <IndianRupee size={13} /> Pay Fine
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
