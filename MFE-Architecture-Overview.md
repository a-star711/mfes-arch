# Micro Frontend Architecture — Overview & Standards

---

## What is Micro Frontend Architecture?

A pattern where a frontend application is split into **independently owned, deployed, and developed pieces** aligned to business domains — mirroring what microservices did for the backend.

Instead of one large frontend codebase owned by one team, each business domain (e.g Claims/MVP/) owns its own frontend slice end-to-end.

---

## Why Domain-Level — Not Microservice-Level or Others

This is one of the most important architectural decisions in MFE design. There are several ways you could slice a frontend:

### The splitting options

| Split by | Example | Problem |
|---|---|---|
| **Page** | `/login`, `/dashboard`, `/profile` are separate MFEs | Pages don't map to teams — one team may own 10 pages |
| **Component** | Button, Header, Table are separate MFEs | Too granular — massive coordination overhead, not a team boundary |
| **Microservice** | Every backend microservice has a paired MFE | Microservices are technical boundaries, not business ones — leads to too many MFEs |
| **Domain** | Auth, Claim, MVP & etc. are separate MFEs | Maps to team structure, stable boundaries |

### Why microservice-level is wrong

Backend microservices are often split for **technical reasons** — scalability, independent data stores, language choice. A single business domain like "Orders" may have 5-10 microservices behind it (order-service, pricing-service, inventory-check-service, etc.).

If you paired an MFE to each microservice you would end up with:
- 10-50+ MFEs for a mid-size product
- Enormous Shell routing complexity
- Tiny MFEs with no real ownership boundary
- Teams owning fragments of UI that don't map to anything meaningful

The MFE would become a thin HTTP wrapper around one endpoint — that is not a domain, it is a component.

### Why domain-level is right

A **domain** in this context means a bounded context from Domain-Driven Design (DDD) — a business capability with clear ownership:

```
Auth domain      → who the user is, login, sessions, permissions
Orders domain    → placing, tracking, cancelling orders
Inventory domain → stock levels, product catalogue
Billing domain   → payments, invoices, subscriptions
```

Each domain:
- Maps directly to **one team**
- Has a **stable boundary** that doesn't change when backend services are refactored
- Is **large enough** to justify its own deployment pipeline
- Is **small enough** to be owned by a single team without coordination

### Conway's Law — the real reason

> "Any organization that designs a system will produce a design whose structure is a copy of the organization's communication structure." — Melvin Conway

If your company has a Billing team, an Auth team, and an Orders team — your frontend should reflect that. Domain-level MFEs let your **architecture mirror your org chart**, which reduces friction and communication overhead. Teams ship independently because they own everything in their domain.

---

## Architecture Components

```
┌─────────────────────────────────────────────┐
│                  SHELL                      │
│  - Owns routing                             │
│  - Owns shared contracts (event bus, etc.)  │
│  - Composes MFEs at runtime                 │
│                                             │
│  ┌─────────────┐   ┌─────────────────────┐  │
│  │  MFE: Auth  │   │  MFE: Dashboard     │  │
│  │  port 3001  │   │  port 3002          │  │
│  │  own repo   │   │  own repo           │  │
│  └─────────────┘   └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Shell** — the host application. Loads and composes MFEs, owns routing, owns shared utilities.

**MFEs (Remotes)** — independently runnable apps that expose themselves to the Shell at runtime.

---

## How MFEs Connect — Module Federation

The technology enabling this is **Webpack 5 Module Federation**. It allows one running application to load JavaScript modules from another running application **at runtime**, not at build time.

- Each MFE builds a `remoteEntry.js` — a manifest of what it exposes
- The Shell fetches these manifests at runtime and dynamically imports components from them
- Neither the Shell nor MFEs need to be rebuilt when another changes

```
Build time:
  mfe-auth builds  →  outputs remoteEntry.js at localhost:3001
  shell builds     →  knows "auth" lives at localhost:3001/remoteEntry.js

Runtime (in the browser):
  Shell loads  →  user navigates to /auth
             →  fetches remoteEntry.js from mfe-auth
             →  dynamically imports AuthApp component
             →  renders it inside the Shell
```

---

## Cross-Domain Communication

MFEs cannot import from each other — that creates coupling and defeats the purpose. Communication is handled via a **Shell-owned Event Bus** — a shared pub/sub contract:

- `mfe-auth` emits `user:login` with user data
- `mfe-dashboard` subscribes to `user:login` and reacts
- Neither MFE knows about the other — they only know about the contract



---

## Technology Recommendation

| Concern | Decision | Reason |
|---|---|---|
| **Bundler** | Webpack 5 | Native Module Federation, battle-tested, predictable dev/prod parity |
| **Framework** | React (standardized) | Shared React via `singleton: true` prevents duplicate loading |
| **Communication** | Shell Event Bus | Decoupled, framework-agnostic, Shell owns the contract |
| **Future scale** | Consider Rspack | Rust-based Webpack-compatible drop-in, much faster builds at large scale |

### Why not Vite?

Vite's Module Federation support is plugin-based and not natively built in. More critically, Vite uses native ESM in dev and Rollup in prod — these can behave differently with federation, meaning things work locally but break in production. For enterprise deployments, that is an unacceptable risk. Webpack's federation is deterministic across both environments.

---

## Key Benefits for the Business

- Teams deploy independently — no release train coordination
- A bug in one domain does not require redeploying the whole frontend
- Teams can be scaled, hired, and organized around business domains
- Incremental migration is possible — legacy code can be wrapped as an MFE
- Clear ownership — no ambiguity about which team fixes what

---

## Key Costs & Risks to be Aware Of

- **Operational overhead** — N apps to build, deploy, and monitor instead of 1
- **Shared dependency conflicts** — React version mismatches between MFEs can cause runtime errors
- **Network overhead** — more round trips to load remote manifests at startup
- **Distributed debugging** — errors can span multiple MFE boundaries
- **Governance needed** — teams must agree on Shell contracts (event names, payloads, shared deps versions)
- **Initial setup cost** — significantly more infrastructure than a standard SPA

---

## When It Makes Sense

- Multiple teams working on the same frontend simultaneously
- Different domains needing different release cadences
- Large enough codebase where a monolithic frontend becomes a bottleneck
- Organization already structured around domain teams (Conway's Law applies)

**It is overkill for small teams or early-stage products.** The pattern pays off at scale when team coordination becomes the bottleneck, not the technology.

---

## Summary

Domain-level Micro Frontends are the right granularity because domains map to teams, teams map to business capabilities, and business capabilities are stable over time. Splitting by microservice goes too fine, splitting by page goes too shallow. The domain boundary — borrowed from DDD — gives you the right unit of independent ownership, deployment, and accountability in a large engineering organization.
