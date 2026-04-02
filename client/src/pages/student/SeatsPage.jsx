import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { seatsAPI, bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, addHours } from 'date-fns';
import { MapPin, Clock, Zap, X, CheckCircle, Armchair, Wifi } from 'lucide-react';

const roundUpToNext30 = () => {
  const now = new Date();
  const m = now.getMinutes();
  const rounded = m < 30 ? 30 : 60;
  now.setMinutes(rounded, 0, 0);
  if (rounded === 60) now.setHours(now.getHours() + 1, 0, 0, 0);
  return now;
};

const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SeatsPage() {
  const { user, refreshUser } = useAuth();
  const { on } = useSocket();
  const [sections, setSections] = useState([]);
  const [seats, setSeats] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState(null);

  // Booking modal state
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [booking, setBooking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [secRes, seatRes, activeRes] = await Promise.all([
        seatsAPI.getSections(),
        seatsAPI.getAll(activeSection ? { sectionId: activeSection } : {}),
        bookingsAPI.getActive(),
      ]);
      setSections(secRes.data.sections);
      setSeats(seatRes.data.seats);
      setActiveBooking(activeRes.data.booking);
      if (!activeSection && secRes.data.sections.length) {
        setActiveSection(secRes.data.sections[0]._id);
      }
    } catch {
      toast.error('Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!activeSection) return;
    setLoading(true);
    seatsAPI.getAll({ sectionId: activeSection })
      .then(r => setSeats(r.data.seats))
      .finally(() => setLoading(false));
  }, [activeSection]);

  // Real-time socket updates
  useEffect(() => {
    const unsub = on('seat_update', (data) => {
      setSeats(prev => prev.map(s => {
        if (s._id !== data.seatId) return s;
        if (data.type === 'BOOKED') return { ...s, isAvailable: false };
        if (data.type === 'AVAILABLE') return { ...s, isAvailable: true, currentBooking: null };
        if (data.type === 'UPDATED') return { ...s, ...data.seat };
        return s;
      }));
    });
    return () => unsub && unsub();
  }, [on]);

  const openModal = (seat) => {
    if (!seat.isAvailable || seat.isMaintenance) return;
    if (activeBooking) return toast.error('You already have an active booking. Cancel it first.');
    setSelected(seat);
    const s = roundUpToNext30();
    setStartTime(toLocalInput(s));
    setEndTime(toLocalInput(addHours(s, 1)));
    setModal(true);
  };

  const handleBook = async () => {
    setBooking(true);
    try {
      await bookingsAPI.create({ seatId: selected._id, startTime, endTime });
      toast.success(`Seat ${selected.seatNumber} booked!`);
      setModal(false);
      await fetchData();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async () => {
    if (!activeBooking) return;
    try {
      await bookingsAPI.cancel(activeBooking._id, 'User cancelled');
      toast.success('Booking cancelled');
      setActiveBooking(null);
      await fetchData();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  };

  const handleCheckIn = async () => {
    try {
      await bookingsAPI.checkIn(activeBooking._id);
      toast.success('Checked in!');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const filtered = seats.filter(s => !activeSection || s.section?._id === activeSection);
  const rows = [...new Set(filtered.map(s => s.row))].sort((a,b) => a-b);

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Seat Map</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          <Wifi size={13} style={{ display: 'inline', marginRight: 4 }} />
          Real-time availability — click a green seat to book
        </p>
      </div>

      {/* Active booking banner */}
      {activeBooking && (
        <div className="glass-card fade-in" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderColor: 'rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <CheckCircle size={20} color="#6c63ff" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Active Booking — Seat {activeBooking.seat?.seatNumber} · {activeBooking.section?.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {format(new Date(activeBooking.startTime), 'dd MMM, h:mm a')} → {format(new Date(activeBooking.endTime), 'h:mm a')}
              {activeBooking.checkInTime ? <span style={{ marginLeft: 8, color: '#22c55e' }}>✓ Checked in</span> : null}
            </div>
          </div>
          {!activeBooking.checkInTime && (
            <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={handleCheckIn}>
              <Zap size={14} /> Check In
            </button>
          )}
          <button className="btn-danger" style={{ fontSize: '0.8rem' }} onClick={handleCancel}>
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {sections.map(sec => (
          <button key={sec._id} onClick={() => setActiveSection(sec._id)}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.18s',
              borderColor: activeSection === sec._id ? '#6c63ff' : 'var(--border)',
              background: activeSection === sec._id ? 'rgba(108,99,255,0.15)' : 'transparent',
              color: activeSection === sec._id ? '#a78bfa' : 'var(--text-secondary)',
            }}>
            {sec.name}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[['seat-available', 'Available'], ['seat-booked', 'Occupied'], ['seat-maintenance', 'Maintenance']].map(([cls, label]) => (
          <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div className={`seat-cell ${cls}`} style={{ width: 14, height: 14, borderRadius: 4, cursor: 'default' }} />
            {label}
          </div>
        ))}
      </div>

      {/* Seat Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading seats...</div>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <Armchair size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No seats in this section</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              {/* Entrance indicator */}
              <div style={{ width: '80%', height: 6, background: 'linear-gradient(135deg, rgba(108,99,255,0.3), transparent)', borderRadius: 9999, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>ENTRANCE</div>

              {rows.map(row => {
                const rowSeats = filtered.filter(s => s.row === row).sort((a,b) => a.col - b.col);
                return (
                  <div key={row} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ width: 20, fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right' }}>R{row}</span>
                    {rowSeats.map(seat => {
                      const cls = seat.isMaintenance ? 'seat-maintenance' : seat.isAvailable ? 'seat-available' : 'seat-booked';
                      return (
                        <div key={seat._id} className={`seat-cell ${cls}`} title={`Seat ${seat.seatNumber} — ${seat.isAvailable && !seat.isMaintenance ? 'Available' : seat.isMaintenance ? 'Maintenance' : 'Occupied'}`}
                          onClick={() => openModal(seat)}>
                          {seat.seatNumber}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section info */}
      {sections.find(s => s._id === activeSection) && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sections.find(s => s._id === activeSection)?.amenities?.map(a => (
            <span key={a} style={{ padding: '0.2rem 0.7rem', borderRadius: 9999, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', fontSize: '0.75rem', color: '#a78bfa' }}>
              {a.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {modal && selected && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Book Seat {selected.seatNumber}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
                  <MapPin size={12} style={{ display: 'inline' }} /> {selected.section?.name}
                </p>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />Start Time
                </label>
                <input className="input" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} min={toLocalInput(new Date())} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />End Time
                </label>
                <input className="input" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} min={startTime} />
              </div>

              <div style={{ background: 'rgba(108,99,255,0.08)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid rgba(108,99,255,0.15)' }}>
                ⚡ Max 4 hours · Min 30 min · Auto-cancelled if no check-in within 15 min
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleBook} disabled={booking}>
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
