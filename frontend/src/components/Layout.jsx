import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">NW</span>
          <div>
            <strong>Next Waves</strong>
            <p>For beauty businesses</p>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            <span className="nav-label">Overview</span>
            <span className="nav-hint">Your numbers</span>
          </NavLink>
          <NavLink to="/leads">
            <span className="nav-label">Leads</span>
            <span className="nav-hint">Customer messages</span>
          </NavLink>
          <NavLink to="/business">
            <span className="nav-label">Business</span>
            <span className="nav-hint">Profile and contact link</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p className="user-name">{user?.name}</p>
          <p className="user-email">{user?.email}</p>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
