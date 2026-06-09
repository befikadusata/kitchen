# Coding & Design Instructions for the Oz Kitchen Applet

Welcome to the Oz Kitchen codebase! This document outlines coding protocols, UI standards, architectural guidelines, and project definitions to ensure subsequent AI sessions and engineers maintain a high-quality, elegant, and robust full-stack solution.

---

## 📅 Project Domain & Intent
Oz Kitchen is a full-stack, automated meal subscription scheduling system designed for operating kitchens with complex menu rotations, calendar exception constraints (fasting, holiday, closure, compensation schedules), and driver delivery routing.

### Core Modules:
1. **Telegram Mini-App Viewer**: Clean mobile-centered client interface simulating sub-management, calendar browsers, menu filters, and payment workflows.
2. **Kitchen & Admin Dashboard Panel**: Control system tracking inventory, exceptions, custom compensation generators, and daily schedules.
3. **Driver Dispatch Portal (OzDrive)**: Route optimization (Traveling Salesman greedy heuristic) mapping physical zones dynamically within Addis Ababa (9.01, 38.75) and managing drops.
4. **Calendar Compensation Heuristic Engine**: Pure deterministic scheduling rules handling holidays, compensatory extensions, and fasting options natively.

---

## 🎨 Design Philosophy & UX Constraints
Style and rhythm should reinforce the premium brand of the Oz Kitchen platform:
- **Tailwind-Only Rule**: Utilize modern Tailwind CSS classes directly in markup. Do not import separate `.css` modules or introduce multi-theme inputs unless requested.
- **Off-White Slate Theme**: Standard pages utilize clean off-whites (`bg-slate-50`), deep slate text headers, and minimal charcoal structural grids.
- **Dark Mobile Cosmetology**: Mobile panels (like simulated Telegram Mini-Apps or Driver Apps) utilize dark high-contrast panels (`bg-slate-900`) with vibrant primary status marks (amber `#fbbf24`, emerald green, rose/red).
- **Physical Tour Indicators**: When route planning is active, display sequence indicators inline (e.g., `📍 Stop #1`, `📍 Stop #2`).

---

## 🔧 Full-Stack Express + Vite Integration Rules
To safeguard operational integrity, respect the platform's single-port execution environment:
- **Port 3000 Constraint**: The reverse proxy routes external traffic exclusively through port `3000`. Native Express servers *must* bind to `0.0.0.0:3000`.
- **Environment Schema Documentation**: Always keep `.env.example` in sync when introducing fresh backend environment configuration vectors. NEVER commit active API keys.
- **Lazy Load Secret SDKs**: To avoid startup crash conditions when specific keys are undeclared, always verify presence and lazily initialize third-party clients (Stripe, Twilio) inside route-level wrappers.

---

## 📍 Coordinates & Routing Conventions
When rendering mapping visuals, use Addis Ababa center-point conversions:
- **Central coordinates**: `KITCHEN_COORDS = { lat: 9.01, lng: 38.75, x: 0, y: 0 }`
- **Region mappings**:
  - *Wollo Sefer*: `{ x: 1.5, y: -0.8 }`
  - *Bole*: `{ x: 3.2, y: 0.2 }`
  - *Kazanchis*: `{ x: 0.8, y: 1.2 }`
  - *Mexico*: `{ x: -1.8, y: -0.2 }`
  - *Piassa*: `{ x: -0.9, y: 2.2 }`
  - *Saris*: `{ x: -0.7, y: -3.5 }`
  - *CMC*: `{ x: 5.5, y: 1.5 }`
- Apply Traveling Salesman Nearest Neighbor sorting to tasks when optimization flags are set.
