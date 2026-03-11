# MFE Project Memory

## Project Location
`C:\Users\User\Desktop\MFs`

## What We Built
A Micro Frontend learning project with:
- `shell/` — Host app, port 3000, React + Webpack 5 + Module Federation
- `mfe-auth/` — Auth domain, port 3001
- `mfe-dashboard/` — Dashboard domain, port 3002

## Current State
- All 3 apps have working Webpack 5 + Module Federation setup
- Abandoned hand-rolled event bus approach (too error-prone for learning)
- Next step: restart with Zustand shared store, then Redux after

## User Context
- Enterprise project at work involving MFEs, multi-tenancy, SSO
- Two tenants (Company A / Company B), some users belong to both
- Familiar with React and Vite, learning Webpack 5 and Module Federation
- Prefers to write code himself step by step, not have edits made silently
- BA call happened regarding domain splitting

## Key Architectural Decisions Discussed
- Webpack 5 over Vite for enterprise (dev/prod parity, native Module Federation)
- Domain-level splitting (not microservice-level, not page-level)
- Shell owns shared contracts (store, event bus, etc.)
- Multi-tenancy: one userId, tenantId as metadata field, scoped tokens per session
- Shell is both host AND remote (exposes shared modules to MFEs)

## Webpack 5 Module Federation — Key Config Notes
- MFEs need `filename: 'remoteEntry.js'` to generate the manifest
- Shell needs both `exposes` AND `filename` if MFEs import from it
- Both MFEs need `remotes: { shell: 'shell@http://localhost:3000/remoteEntry.js' }`
- `shared: { react: { singleton: true, eager: true } }` prevents duplicate React
- Entry point must be async: `src/index.js` just does `import('./bootstrap')`

## Cross-Domain Communication — Final Approach
- Zustand store owned by Shell, exposed as federated module (`shell/store`)
- MFEs import store via `import('shell/store')` — federated dynamic import
- Auth MFE writes to store via `getState().setUser()` (outside React, no hook needed)
- Dashboard MFE subscribes via `useUserStore.subscribe()` + reads current state on mount with `getState()`
- Shell uses static import + Zustand hooks (`useUserStore(state => state.isAuthenticated)`)

## CRITICAL: Window Singleton Pattern for Store
- Module Federation creates DIFFERENT module instances for local vs federated imports
- Shell's `import('./store')` and mfe-auth's `import('shell/store')` are TWO instances
- Fix: attach store to `window.__MFE_USER_STORE__` so all imports get the same instance
- This is a well-known production pattern for MFE shared state

## Why Zustand over hand-rolled Event Bus
- Event bus is fire-and-forget — if Dashboard unmounts when event fires, data is lost
- Zustand holds state — late subscribers always get current value on mount
- Cleaner API, no manual subscribe/unsubscribe ceremony
- Enterprise standard for modern React MFE setups
- Redux is alternative for orgs with existing Redux investment (more boilerplate, more structured)

## Google OAuth (SSO) Setup
- Uses `@react-oauth/google` with `useGoogleLogin` hook (NOT `GoogleLogin` component)
- `useGoogleLogin` opens standard OAuth popup — avoids FedCM/iframe complications
- Returns access_token → fetch real user info from googleapis.com/oauth2/v3/userinfo
- Google Cloud Console needs: Authorized JS origins `http://localhost:3000`, test users added
- Shell devServer needs: `headers: { 'Cross-Origin-Opener-Policy': 'unsafe-none' }`
- COOP `window.closed` warnings are harmless noise from Google's client library

## Key MFE Runtime Insight
- MFE localhost ports (3001, 3002) are DEV ONLY — for team isolation and standalone testing
- Users always access via Shell (3000) — the composed application
- All MFEs share ONE JS runtime inside the Shell — that's why the shared store works
- Direct MFE URLs are separate runtimes — store is not shared there (expected, not a bug)
- Analogy: MFE ports = internal microservice ports, Shell = API gateway

## Lessons Learned
- Module Federation dual instance bug: local import vs federated import = different instances. Use window singleton.
- Shell must use static import for store + Zustand hooks. MFEs use federated dynamic import.
- Verify all webpack configs before running — easy to miss remotes/exposes/filename
- HtmlWebpackPlugin must be in plugins array — easy to drop when editing config
- bootstrap.js needs React import if it uses JSX
- Shell needs both filename + exposes to generate remoteEntry.js for MFEs to consume
- webpack-dev-server v5 adds COOP headers by default — override with `unsafe-none` for OAuth
- `historyApiFallback: true` needed in Shell for client-side routing
- Google OAuth: use `useGoogleLogin` hook, not `GoogleLogin` component (avoids FedCM issues)
- Always add `.catch()` to federated imports for debugging
