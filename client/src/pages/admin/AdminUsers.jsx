import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ShieldOff, ShieldCheck, Search } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  const load = async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15, role: 'student' };
      if (f === 'blocked') params.isBlocked = true;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [filter]);

  const toggleBlock = async (user) => {
    const isBlocking = !user.isBlocked;
    const reason = isBlocking ? prompt('Reason for blocking:') : null;
    if (isBlocking && !reason) return;
    try {
      await adminAPI.blockUser(user._id, isBlocking, reason);
      toast.success(`User ${isBlocking ? 'blocked' : 'unblocked'}`);
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Users</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{total} students</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'blocked'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.35rem 0.85rem', borderRadius: 9999, border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', borderColor: filter === f ? '#6c63ff' : 'var(--border)', background: filter === f ? 'rgba(108,99,255,0.15)' : 'transparent', color: filter === f ? '#a78bfa' : 'var(--text-secondary)' }}>
              {f || 'All'}{f === 'blocked' ? ' (blocked)' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: u.isBlocked ? '#ef4444' : '#a78bfa', flexShrink: 0 }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.studentId || '—'}</td>
                <td>
                  {u.isBlocked
                    ? <span className="badge badge-cancelled" title={u.blockedReason}>Blocked</span>
                    : <span className="badge badge-active">Active</span>}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.lastLogin ? format(new Date(u.lastLogin), 'dd MMM, h:mm a') : '—'}</td>
                <td>
                  <button
                    className={u.isBlocked ? 'btn-primary' : 'btn-danger'}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => toggleBlock(u)}>
                    {u.isBlocked ? <><ShieldCheck size={12} /> Unblock</> : <><ShieldOff size={12} /> Block</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: '0.82rem', borderColor: page === p ? '#6c63ff' : 'var(--border)', background: page === p ? 'rgba(108,99,255,0.15)' : 'transparent', color: page === p ? '#a78bfa' : 'var(--text-secondary)' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
