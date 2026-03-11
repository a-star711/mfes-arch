
  import { create } from 'zustand';

  if (!window.__MFE_USER_STORE__) {
    window.__MFE_USER_STORE__ = create((set) => ({
      user: null,
      activeTenant: null,
      roles: [],
      isAuthenticated: false,

      setUser: (userData) => set({
        user: userData.user,
        activeTenant: userData.activeTenant,
        roles: userData.roles,
        isAuthenticated: true,
      }),

      clearUser: () => set({
        user: null,
        activeTenant: null,
        roles: [],
        isAuthenticated: false,
      }),
    }));
  }

  export default window.__MFE_USER_STORE__;