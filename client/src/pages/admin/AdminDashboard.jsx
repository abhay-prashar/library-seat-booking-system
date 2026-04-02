import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Armchair, CalendarDays, Users, TrendingUp, Activity } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color = '#6c63ff' }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub}</div>}
  </div>
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics()
      .then(r => setAnalytics(r.data.analytics))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading analytics...</div>;
  if (!analytics) return null;

  const { seats, bookings, users } = analytics;
  const occupancy = seats.total ? Math.round((seats.occupied / seats.total) * 100) : 0;

  const statusColors = { active: '#6c63ff', completed: '#60a5fa', cancelled: '#ef4444', expired: '#94a3b8', no_show: '#f59e0b' };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Library seat utilization overview</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={Armchair} label="Total Seats" value={seats.total} sub={`${seats.available} available`} color="#6c63ff" />
        <StatCard icon={Activity} label="Occupied Now" value={seats.occupied} sub={`${occupancy}% occupancy`} color="#ef4444" />
        <StatCard icon={CalendarDays} label="Today's Bookings" value={bookings.today} sub={`${bookings.thisWeek} this week`} color="#22c55e" />
        <StatCard icon={Users} label="Students" value={users.total} sub={`${users.blocked} blocked`} color="#f59e0b" />
      </div>

      {/* Occupancy bar */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontWeight: 600 }}>Current Occupancy</h3>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: occupancy > 80 ? '#ef4444' : occupancy > 50 ? '#f59e0b' : '#22c55e' }}>{occupancy}%</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${occupancy}%`, background: `linear-gradient(90deg, #6c63ff, ${occupancy > 80 ? '#ef4444' : '#a78bfa'})`, borderRadius: 9999, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>{seats.occupied} occupied</span>
          <span>{seats.total} total</span>
        </div>
      </div>

      {/* Booking status breakdown */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> All-time Booking Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {Object.entries(bookings.statusBreakdown || {}).map(([status, count]) => {
            const total = Object.values(bookings.statusBreakdown).reduce((a,b) => a+b, 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                  <span style={{ textTransform: 'capitalize', color: statusColors[status] || 'var(--text-secondary)' }}>{status.replace('_', ' ')}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: statusColors[status] || '#6c63ff', borderRadius: 9999, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
