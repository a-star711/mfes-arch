# Micro Frontend Architecture — Technical Proposal

---

## 1. Summary

This document proposes adopting a **Domain-level Micro Frontend (MFE) architecture** for INSAIO platform. This approach splits the frontend into independently owned, deployed, and developed applications aligned to business domains — mirroring the microservices pattern on the backend.

A working proof-of-concept has been built demonstrating: Shell composition, cross-domain state management, Google SSO integration, route guarding.

**Tech stack:** React, Webpack 5 with native Module Federation, Zustand or Redux Toolkit for shared state, Google/OAuth SSO.

---

## 2. What is a Micro Frontend?

Instead of one large frontend codebase owned by one team, each business domain owns its own frontend slice end-to-end. A central **Shell** application composes these domain MFEs at runtime.

--
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 Shell App                                    │
│                           (Central Orchestrator)                             │
│                                                                              │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│    │              │    │              │    │              │                 │
│    │  MFE: Auth   │    │ MFE: Claims  │    │  MFE: MVP    │                 │
│    │  (Domain 1)  │    │  (Domain 2)  │    │  (Domain 3)  │                 │
│    │              │    │              │    │              │                 │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                 │
│           │                   │                   │                          │
│           │ Module            │ Module            │ Module                   │
│           │ Federation        │ Federation        │ Federation               │
│           │                   │                   │                          │
└───────────┼───────────────────┼───────────────────┼──────────────────────────┘
            │                   │                   │
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Zustand Shared Store                                │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Auth State    │  │  Tenant Config  │  │  Feature Flags  │              │
│  │ token,user,roles│  │    tenantId     │  │                 │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  Write: Shell App (init), MFE: Auth (loginSuccess)                          │
│  Read: MFE: Claims (auth, tenantId), MFE: MVP (auth, featureFlags)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

Each MFE is a fully standalone React application that can be developed, tested, and deployed independently. The Shell loads them dynamically at runtime — no rebuild of the Shell is needed when an MFE changes.

---

## 3. Why Domain-Level Splitting

There are several ways to split a frontend. Only one is correct for enterprise:

| **Component** | Button, Header, Table are separate MFEs | Too granular — massive overhead, not a team boundary |
| **Microservice** | Each backend service has a paired MFE | Too many MFEs — a single domain may have 5-10 backend services |
| **Domain** | Auth, Claims, MVP are separate MFEs | Maps to team structure, stable boundaries, right granularity |

### Why not microservice-level?

Backend microservices are split for technical reasons (scalability, data isolation). A single business domain like "Claims" may have multiple services behind it. Pairing an MFE to each service would produce 10-50+ tiny MFEs with no meaningful ownership boundary.

### Why domain-level works

A domain is a bounded context from Domain-Driven Design (DDD) — a business capability with clear ownership:

- Maps directly to **one team**
- Has a **stable boundary** that doesn't change when backend services are refactored
- Is **large enough** to justify its own deployment pipeline
- Is **small enough** to be owned by a single team

This follows **Conway's Law**: the architecture mirrors the organization structure, reducing friction and coordination overhead.

---

## 4. Technology Decisions

| Concern | Decision | Rationale |
|---|---|---|
| **Bundler** | Webpack 5 | Native Module Federation support, battle-tested, deterministic dev/prod parity |
| **Framework** | React (standardized) | Shared via `singleton: true` — prevents duplicate loading across MFEs |
| **Shared state** | Redux Toolkit (cross-domain) | Structured, debuggable, industry standard for multi-team projects |
| **Local state** | Zustand / useState (within MFEs) | Lightweight, no boilerplate for component-level state |
| **Authentication** | Google OAuth / SSO | Standard OpenID Connect flow, enterprise-ready |
| **Future scale** | Consider Rspack | Rust-based Webpack-compatible drop-in for faster builds at 10+ MFEs |

### Webpack 5 over Vite

Vite's Module Federation is plugin-based and not native. Vite uses native ESM in development and Rollup in production — these behave differently with federation, meaning things can work locally but break in production. For enterprise deployments, deterministic behavior across environments is non-negotiable. Webpack 5 federation is native, battle-tested since 2020, and has the largest community knowledge base.

### Why Redux Toolkit for shared state (not Zustand)

For the **shared cross-domain store** (auth state, tenant context, user roles), Redux Toolkit is recommended over Zustand for multi-team projects because:

- **Enforced structure** — actions and reducers make the contract between MFEs explicit
- **DevTools** — time-travel debugging, action replay, and state diffs across all MFEs
- **Middleware** — built-in support for token refresh, logging, and error handling
- **Team familiarity** — Redux is the industry standard; less onboarding friction
- **Traceability** — every state change has a named action, making cross-domain debugging straightforward

Zustand or `useState` remains the right choice for MFE-internal state (form inputs, loading spinners, UI toggles) where the overhead of Redux is unnecessary.

---

## 5. How Module Federation Works

Webpack 5 Module Federation allows one running application to **load JavaScript modules from another running application at runtime**.

```
Build time:
  Each MFE builds → outputs remoteEntry.js (a manifest of exposed modules)
  Shell builds    → knows where each MFE's remoteEntry.js lives

Runtime (in the browser):
  Shell loads → user navigates to /claims
             → fetches remoteEntry.js from Claims MFE
             → dynamically imports ClaimsApp component
             → renders it inside the Shell
```

### Key configuration

**MFE (remote) — exposes its App:**
```js
new ModuleFederationPlugin({
  name: 'claims',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/App' },
  shared: { react: { singleton: true, eager: true } },
})
```

**Shell (host) — consumes MFEs and exposes shared state:**
```js
new ModuleFederationPlugin({
  name: 'shell',
  filename: 'remoteEntry.js',
  exposes: { './store': './src/store' },
  remotes: {
    auth: 'auth@https://auth.example.com/remoteEntry.js',
    claims: 'claims@https://claims.example.com/remoteEntry.js',
  },
  shared: { react: { singleton: true, eager: true } },
})
```

Shell is both a **host** (consumes MFEs) and a **remote** (exposes the shared store). This is a standard and correct pattern.

### Async entry point requirement

Module Federation requires an async entry point to negotiate shared modules before rendering:

```
src/index.js      →  import('./bootstrap')    (one line — makes entry async)
src/bootstrap.js  →  actual React render logic
```

---

## 6. Cross-Domain Communication

MFEs are isolated by design — they cannot import from each other. But they need to share runtime data (authenticated user, active tenant, roles).

### Architecture

The Shell owns a **shared state store** exposed as a federated module. MFEs import it and read/write through it. No MFE ever communicates with another MFE directly.

```
Shell owns:
  └── Shared Store (Redux Toolkit)
        ├── auth state (user, token, isAuthenticated)
        ├── tenant context (activeTenant, roles)
        └── any cross-domain contracts

MFE: Auth
  └── writes to shared store on login/logout

MFE: Claims
  └── reads user/tenant/roles from shared store

MFE: Dashboard
  └── reads user/tenant/roles from shared store
```

### Critical implementation detail — Window Singleton Pattern

Module Federation creates **different module instances** for local imports vs federated imports. The Shell's direct `import('./store')` and an MFE's `import('shell/store')` resolve to two separate module evaluations, creating two store instances.

**Solution:** attach the store to `window` to guarantee a true singleton:

```js
if (!window.__APP_STORE__) {
  window.__APP_STORE__ = configureStore({ ... });
}
export default window.__APP_STORE__;
```

This is a well-known production pattern for MFE shared state.

### Approaches we evaluated

| Approach | Verdict |
|---|---|
| **Hand-rolled Event Bus** | Fire-and-forget — data lost if subscriber not mounted. Rejected. |
| **Zustand** | Simple and reactive, but lacks structure for multi-team shared state. Good for MFE-internal use. |
| **Redux Toolkit** | Structured, debuggable, scalable. Recommended for shared cross-domain state. |

---

## 7. Authentication & SSO

### Architecture

The Auth MFE owns the entire authentication flow. No other MFE interacts with the SSO provider directly.

```
User opens app
        ↓
Shell loads → checks shared store → isAuthenticated?
        ↓
No  → Shell renders Auth MFE (route guard)
Yes → Shell renders requested MFE
        ↓
Auth MFE: redirects to SSO provider (Google/Okta/Azure AD)
        ↓
SSO provider verifies identity → returns token
        ↓
Auth MFE decodes token → writes user data to shared store
        ↓
Shell detects isAuthenticated = true → navigates to requested route
        ↓
All MFEs read user/tenant/roles from shared store
```

### Route guarding

Shell owns all route protection. MFEs never guard themselves — if the Shell doesn't render them, they don't exist.

```jsx
<Route path="/claims"
  element={isAuthenticated ? <ClaimsApp /> : <Navigate to="/auth" />}
/>
<Route path="*" element={<Navigate to="/auth" />} />
```

### Security best practices

| Practice | Detail |
|---|---|
| **Token storage** | Access token in memory only — never `localStorage` (vulnerable to XSS) |
| **Refresh token** | httpOnly cookie — JavaScript cannot access it |
| **MFEs don't call SSO** | Auth MFE owns the SSO flow exclusively |
| **Backend validates** | Shared store controls UI visibility only — every API call is independently authorized server-side |
| **Route guards in Shell only** | One place to enforce auth, consistent across all domains |

---

## 8. Multi-Tenancy

### Approach

One user identity, tenancy as metadata. Users who belong to multiple tenants see a tenant picker after SSO login.

```json
{
  "userId": "user-123",
  "email": "john@company.com",
  "tenants": [
    { "tenantId": "company-a", "roles": ["admin"] },
    { "tenantId": "company-b", "roles": ["viewer"] }
  ]
}
```

### Session scoping

After login, the active session token carries one tenant at a time. Switching tenant issues a new scoped token. The shared store holds `activeTenant` — all MFEs read from it to scope their data and API calls.

### Deployment model

**Recommended: Single Shell, shared MFEs, tenant context injected.**

One Shell deployment, one set of MFE deployments. The active tenant is injected into the shared store after login. MFEs render differently based on tenant context (permissions, feature flags), not separate deployments.

This is operationally simpler and sufficient when the UI is the same across tenants.

---

## 9. Benefits

- **Independent deployment** — teams ship on their own cadence, no release coordination
- **Fault isolation** — a bug in Claims doesn't require redeploying Auth or Dashboard
- **Team scalability** — teams can be hired, scaled, and organized around business domains
- **Incremental migration** — legacy code can be wrapped as an MFE and replaced piece by piece
- **Clear ownership** — no ambiguity about which team is responsible for what
- **Technology flexibility** — in theory, MFEs can use different frameworks (in practice, standardize on React)

---

## 10. Costs & Risks

| Risk | Mitigation |
|---|---|
| **Operational overhead** — N apps to build, deploy, monitor | CI/CD standardization, shared deployment templates |
| **Shared dependency conflicts** — React version mismatches | `singleton: true` + shared version policy in governance |
| **Network overhead** — multiple `remoteEntry.js` fetches at startup | CDN caching, preloading manifests |
| **Distributed debugging** — errors span MFE boundaries | Redux DevTools, structured logging, correlation IDs |
| **Governance** — teams must agree on shared contracts | Explicit contract definitions, shared store schema |
| **Initial setup cost** — more infrastructure than a standard SPA | One-time investment, amortized across project lifespan |

---

## 11. Proof of Concept — What Was Built

A working demo demonstrating all core patterns:

| Component | What it does |
|---|---|
| **Shell** (port 3000) | Host app, routing, route guards, shared store, navigation |
| **MFE: Auth** (port 3001) | Google SSO login, writes user data to shared store |
| **MFE: Dashboard** (port 3002) | Reads user data from shared store, displays profile |

### Demonstrated capabilities
- Real Google OAuth SSO authentication
- Shared Zustand store across MFEs via Module Federation (upgradeable to Redux Toolkit)
- Route guarding — unauthenticated users redirected to Auth
- Logout flow — clears shared state, redirects to login
- Shell as both host and remote (exposes store, consumes MFEs)
- Window singleton pattern for store consistency

---

## 12. Next Steps

1. **Domain identification** — finalize which business domains become MFEs (requires BA input)
2. **Upgrade shared store to Redux Toolkit** — structured contracts for multi-team development
3. **Tenant picker implementation** — post-login tenant selection for multi-tenant users
4. **CI/CD pipeline setup** — independent build and deployment per MFE
5. **Shared component library** — common UI components (buttons, tables, forms) as an npm package, not an MFE
6. **Production infrastructure** — CDN, domain routing, HTTPS, monitoring
7. **Governance document** — shared dependency versions, store contract schema, naming conventions

---

## 13. Summary

Domain-level Micro Frontends are the right approach for this project because:

- Our organization is structured around business domains
- Multiple teams will work on the frontend simultaneously
- Independent deployment cadence is a requirement
- The product will grow — MFE boundaries scale with the organization

The technology choices (Webpack 5, React, Redux Toolkit, OAuth SSO) are proven, well-documented, and aligned with enterprise standards. The proof-of-concept validates that the architecture works end-to-end.
