  import React, { Suspense, useEffect } from 'react';
  import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
  import useUserStore from './store';

  const AuthApp = React.lazy(() => import('auth/App'));
  const DashboardApp = React.lazy(() => import('dashboard/App'));

  function Nav() {
    const navigate = useNavigate();
    const clearUser = useUserStore(state => state.clearUser);

    const handleLogout = () => {
      clearUser();
      navigate('/auth');
    };

    return (
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/auth">Auth</Link>
        <Link to="/dashboard">Dashboard</Link>
        <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</button>
      </nav>
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
      <Suspense fallback={<div>Loading...</div>}>
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