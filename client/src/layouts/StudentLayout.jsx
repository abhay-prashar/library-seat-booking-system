import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useEffect } from 'react';
import { BookOpen, Grid3X3, CalendarDays, LogOut, Wifi, WifiOff } from 'lucide-react';

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const { connect, disconnect, connected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) connect(token);
    return () => disconnect();
  }, []);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>LibraryDesk</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Student Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <NavLink to="/seats" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Grid3X3 size={18} />
            Seat Map
          </NavLink>
          <NavLink to="/bookings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <CalendarDays size={18} />
            My Bookings
          </NavLink>
        </nav>

        {/* User info + logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          {/* Socket status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.72rem', color: connected ? '#22c55e' : 'var(--text-secondary)' }}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Live updates on' : 'Connecting...'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.studentId || user?.email}</div>
            </div>
          </div>

          <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }} onClick={handleLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  );
}
