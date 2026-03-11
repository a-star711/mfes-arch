# MFE Cross-Domain Communication & Auth State — Findings & Conclusions

---

## The Core Problem

In a Micro Frontend system, MFEs are isolated by design — they don't import from each other. But they still need to share runtime data:

- Is the user authenticated?
- Who are they, what tenant, what roles?
- How does Dashboard know what Auth just did?

---

## What We Tried — Event Bus (and why we dropped it)

The first instinct is a pub/sub event bus — Auth emits `user:login`, Dashboard listens.

**The problem:** events are fire-and-forget.

```
User navigates to /auth    → Dashboard unmounts, stops listening
User clicks Login          → event fires, nobody is subscribed
User navigates to /dashboard → Dashboard mounts, subscribes
                             → event already gone, state is lost
```

You can patch this with a state cache on the bus, but now you're building a store — so just use a proper one.

**Verdict:** valid pattern for cross-framework MFEs, but unnecessary complexity when all MFEs are React.

---

## What We Landed On — Zustand Shared Store

Shell owns a Zustand store and exposes it as a federated module. MFEs import it and read/write directly.

```
shell/src/store.js  →  exposed via Module Federation as shell/store
mfe-auth            →  imports shell/store → calls setUser() on login
mfe-dashboard       →  imports shell/store → reads user reactively
```

### Why Zustand

| Reason | Detail |
|---|---|
| **State persists** | Late subscribers get current value on mount — no timing issues |
| **Reactive** | Components re-render automatically when store changes |
| **Simple API** | No boilerplate, no reducers, no action creators |
| **Works outside React** | `getState()` lets you read/write without hooks (useful in MFE bootstrap code) |
| **Singleton safe** | Attach to `window` to guarantee one instance across all module evaluations |

### The Store Shape

```js
{
  user: { id, name, email, avatar },
  activeTenant: 'company-a',
  roles: ['admin'],
  isAuthenticated: false,
  setUser: (userData) => ...,
  clearUser: () => ...,
}
```

### CRITICAL: Window Singleton Pattern

Module Federation creates **different module instances** for local imports vs federated imports. Shell's `import('./store')` and mfe-auth's `import('shell/store')` resolve to **two separate evaluations** of the same file. Zustand's `singleton: true` in shared config is NOT enough — it only ensures one copy of the Zustand library, not one copy of your store.

**The fix:** attach the store to `window`:

```js
import { create } from 'zustand';

if (!window.__MFE_USER_STORE__) {
  window.__MFE_USER_STORE__ = create((set) => ({
    // ... store definition
  }));
}

export default window.__MFE_USER_STORE__;
```

This guarantees a true singleton regardless of how many times the module is evaluated.

### How MFEs Consume It

**Shell (static import + Zustand hooks):**
```jsx
import useUserStore from './store';

function AppRoutes() {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  // Zustand hook IS the subscription — component re-renders on change
}
```

**Writing from Auth MFE (federated dynamic import):**
```js
import('shell/store').then(module => {
  const setUser = module.default.getState().setUser;
  setUser({ user, activeTenant, roles });
});
```

**Reading from Dashboard MFE (federated dynamic import):**
```js
import('shell/store').then(module => {
  const useUserStore = module.default;
  const current = useUserStore.getState();
  const unsubscribe = useUserStore.subscribe((state) => { ... });
});
```

---

## Critical Webpack Config — Singleton Shared Modules

Both Shell and MFEs must declare shared dependencies consistently:

```js
shared: {
  react:       { singleton: true, eager: true, requiredVersion: false },
  'react-dom': { singleton: true, eager: true, requiredVersion: false },
  zustand:     { singleton: true, eager: true, requiredVersion: false },
}
```

Shell needs `filename` and `exposes` to generate its own `remoteEntry.js`:

```js
new ModuleFederationPlugin({
  name: 'shell',
  filename: 'remoteEntry.js',
  exposes: {
    './store': './src/store',
  },
  remotes: {
    auth: 'auth@http://localhost:3001/remoteEntry.js',
    dashboard: 'dashboard@http://localhost:3002/remoteEntry.js',
  },
})
```

Shell is both a **host** (consumes MFEs) and a **remote** (exposes the store). This is normal and correct.

---

## Google SSO Integration

### Setup
- Google Cloud Console → create OAuth 2.0 Client ID
- Authorized JavaScript origins: `http://localhost:3000`
- Add test users in OAuth consent screen (required for Testing mode)

### Library
Use `@react-oauth/google` with the `useGoogleLogin` hook (NOT the `GoogleLogin` component).

`GoogleLogin` renders Google's iframe-based button which uses FedCM — causes COOP/iframe issues on localhost. `useGoogleLogin` opens a standard OAuth popup, avoids all of that.

### Flow
```
User clicks "Sign in with Google"
        ↓
useGoogleLogin opens popup → accounts.google.com
        ↓
User authenticates with Google
        ↓
Popup returns access_token to onSuccess callback
        ↓
Fetch real user info from googleapis.com/oauth2/v3/userinfo
        ↓
Write to Zustand store via federated import
        ↓
Shell detects isAuthenticated = true → navigates to /dashboard
        ↓
Dashboard reads user from store → shows real name, email, avatar
```

### Webpack Dev Server — COOP Header Fix
webpack-dev-server v5 adds `Cross-Origin-Opener-Policy: same-origin` by default, which blocks OAuth popups from communicating back. Override in Shell's devServer:

```js
devServer: {
  port: 3000,
  hot: true,
  historyApiFallback: true,
  headers: {
    'Cross-Origin-Opener-Policy': 'unsafe-none',
  },
},
```

The `window.closed` COOP warnings in console are harmless noise from Google's library — the login works despite them. In production with HTTPS and a real domain, these go away.

---

## Route Guarding

Shell owns all route protection. MFEs never guard themselves.

```jsx
// Shell's App.js
function AppRoutes() {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  return (
    <Routes>
      <Route path="/auth" element={<AuthApp />} />
      <Route path="/dashboard"
        element={isAuthenticated ? <DashboardApp /> : <Navigate to="/auth" />}
      />
      <Route path="*" element={<Navigate to="/auth" />} />
    </Routes>
  );
}
```

Shell also needs `historyApiFallback: true` in devServer — without it, direct URL navigation returns a server 404 before React Router loads.

---

## Key Runtime Insight — One Runtime, Shared Memory

```
localhost:3000 (Shell)
├── loads mfe-auth/App from localhost:3001    ┐
└── loads mfe-dashboard/App from localhost:3002 ┘  same JS runtime = shared store ✅

localhost:3002 (Dashboard standalone)
└── separate JS runtime — no Shell, no store ❌ (expected)
```

**MFE dev ports are for team isolation only.** Users always access via Shell. Individual MFE URLs are internal — like microservice ports behind an API gateway.

---

## Auth Best Practices (Enterprise)

- **Shell is the gatekeeper** — checks auth state on load, redirects unauthenticated users
- **MFEs never guard themselves** — if Shell didn't render them, they don't exist
- **Token storage** — access token in memory only (never localStorage — vulnerable to XSS), refresh token in httpOnly cookie
- **MFEs never call the SSO provider** — Auth MFE owns that entirely
- **Backend always validates** — the store controls UI visibility only, every API call is independently authorized server-side
- **One user ID, tenancy as metadata** — multi-tenant users get a tenant picker after SSO login

---

## When to Use Redux Instead

Zustand is the right call for most modern React MFE setups. Consider Redux if:
- The org already has a large Redux codebase and institutional knowledge
- You need Redux DevTools for complex state debugging across many domains
- The state shape is complex enough to benefit from strict action/reducer structure

The architectural pattern is identical — Shell exposes the store, MFEs consume it.

---

## Gotchas We Hit (Enterprise Reference)

| Gotcha | Root Cause | Fix |
|---|---|---|
| Store not shared between Shell and MFEs | Local import vs federated import = different module instances | Window singleton pattern |
| Google OAuth popup blocked | webpack-dev-server v5 adds COOP headers by default | `'Cross-Origin-Opener-Policy': 'unsafe-none'` in devServer |
| Google button won't render | `GoogleLogin` component uses FedCM iframes | Use `useGoogleLogin` hook instead |
| Direct URL returns 404 | webpack-dev-server serves files, not routes | `historyApiFallback: true` |
| White screen, no errors | `HtmlWebpackPlugin` dropped from plugins array | Always verify plugins array after config edits |
| `React is not defined` | bootstrap.js uses JSX without importing React | Add `import React from 'react'` |
