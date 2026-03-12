import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useUserStore from './store';

const AuthApp = React.lazy(() => import('auth/App'));
const DashboardApp = React.lazy(() => import('dashboard/App'));

function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const user = useUserStore(state => state.user);
  const clearUser = useUserStore(state => state.clearUser);

  const handleLogout = () => {
    clearUser();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="slide-down nav">
      <div className="nav-brand">
        <div className="nav-brand-icon">
          <span>I</span>
        </div>
        <span className="nav-brand-text">
          INSAIO demo PoC
        </span>
      </div>

      {isAuthenticated && (
        <Link to="/dashboard" className={`nav-link${isActive('/dashboard') ? ' nav-link--active' : ''}`}>
          Dashboard
        </Link>
      )}

      {isAuthenticated && (
        <div className="nav-user">
          <div className="nav-user-info">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="nav-avatar-img" />
            ) : (
              <div className="nav-avatar-placeholder">
                <span>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="nav-user-name">{user?.name}</div>
              <div className="nav-user-email">{user?.email}</div>
            </div>
          </div>
          <div className="nav-divider" />
          <button onClick={handleLogout} className="nav-logout">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-icon" />
      <span className="loading-text">Loading...</span>
    </div>
  );
}

function AppRoutes() {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/auth" element={<AuthApp />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardApp /> : <Navigate to="/auth" />}
        />
        <Route path="*" element={<Navigate to="/auth" />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
