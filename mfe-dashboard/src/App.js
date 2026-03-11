  import React, { useState, useEffect } from 'react';                                                                                                                                                                                                                          
  function App() {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [activeTenant, setActiveTenant] = useState(null);

    useEffect(() => {
      import('shell/store').then(module => {
        const useUserStore = module.default;

        const current = useUserStore.getState();
        if (current.isAuthenticated) {
          setUser(current.user);
          setRoles(current.roles);
          setActiveTenant(current.activeTenant);
        }

        const unsubscribe = useUserStore.subscribe((state) => {
          setUser(state.user);
          setRoles(state.roles);
          setActiveTenant(state.activeTenant);
        });

        return unsubscribe;
      });
    }, []);

    return (
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        {user ? (
          <div>
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 64, height: 64, borderRadius: '50%' }}
            />
            <h2>Welcome, {user.name}</h2>
            <p>Email: {user.email}</p>
            <p>Tenant: {activeTenant ?? 'Not selected yet'}</p>
            <p>Roles: {roles.length ? roles.join(', ') : 'None assigned'}</p>
          </div>
        ) : (
          <p>No user logged in. Go to /auth and sign in.</p>
        )}
      </div>
    );
  }

  export default App;