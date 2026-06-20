# Oz Kitchen

> A full-stack subscription scheduling, routing, and operations system for commercial kitchens, featuring automated calendar compensations and route optimization for Addis Ababa.

[![Stack: React + Express](https://img.shields.io/badge/Stack-React%20%2B%20Express-blue)](https://react.dev)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)](https://www.postgresql.org)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Why This Exists

Commercial meal subscription services face complex logistical hurdles:
1. **Dynamic Scheduling**: Handling religious fasting periods (e.g., Orthodox fasting) and menu preferences (hybrid/fasting/non-fasting) dynamically.
2. **Calendar Exceptions**: Processing holidays and kitchen closures while automatically generating compensatory delivery extensions on subsequent working days.
3. **Dispatch Logistics**: Coordinating drivers and optimizing delivery routes across a sprawling city.

**Oz Kitchen** solves this with a deterministic scheduling engine and dynamic route optimization, integrated into a unified portal simulating the customer, administrative, and driver workflows.

---

## 🚀 Key Modules

The project is structured into three specialized portals, backed by a unified heuristic engine:

1. **Telegram Mini-App Client**: Emulates the mobile customer interface, allowing users to subscribe, choose dietary preferences (Fasting, Non-Fasting, Hybrid), customize menus, track orders, and upload Telebirr payment screenshots.
2. **Kitchen & Admin Dashboard**: A control panel for kitchen managers to track daily prep metrics, log operational holidays/closures, manage menus, track the active driver fleet, and review customer subscriptions.
3. **OzDrive Driver Dispatch Portal**: A delivery worker companion that tracks driver location, maps drops in real-time, and optimizes delivery sequences.
4. **Calendar Compensation & Scheduling Heuristics**: The core engine that calculates delivery schedules and inserts offsets/extensions based on kitchen availability rules.

---

## 🛠️ Architecture & Tech Stack

This project is a TypeScript monorepo combining a modern React frontend and a robust Express backend.

```
┌──────────────────────────────────────────────────────────────┐
│                      Vite Dev Server (Frontend)               │
│     ┌───────────────────┬─────────────────┬────────────┐     │
│     │ Telegram Mini-App │ Admin Dashboard │  OzDrive   │     │
│     └───────────────────┴─────────────────┴────────────┘     │
└──────────────────────────────┬───────────────────────────────┘
                               │ JSON API / Port 3000
┌──────────────────────────────▼───────────────────────────────┐
│                      Express Backend Server                  │
│       ┌───────────────────────────────────────────────┐      │
│       │        Calendar Compensation Engine           │      │
│       ├───────────────────────────────────────────────┤      │
│       │        Route Sequence Optimization (TSP)      │      │
│       └───────────────────────┬───────────────────────┘      │
└───────────────────────────────┼──────────────────────────────┘
                                │ pg pool connection
┌───────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL Database                       │
└──────────────────────────────────────────────────────────────┘
```

### Stack Breakdown
- **Frontend**: [React 19](https://react.dev), [Vite 6](https://vite.dev), [Tailwind CSS 4](https://tailwindcss.com), [Lucide React](https://lucide.dev) (icons), [Motion](https://motion.dev) (micro-animations).
- **Backend**: [Express 4](https://expressjs.com), [Node.js](https://nodejs.org), [TSX](https://github.com/privatenumber/tsx) (TypeScript execution).
- **Database**: [PostgreSQL 16](https://www.postgresql.org) with the `pg` client pool.

---

## ⚙️ Algorithms Showcase (For Recruiters)

This repository features two notable computer science implementations addressing real-world domain logic:

### 1. Calendar Compensation Heuristic Engine
Located in [src/utils/calendar.ts](file:///home/befikadusata/Devs/2026/kitchen/src/utils/calendar.ts), this module implements:
- **`generateDeliveryTasks`**: A pure function that calculates active delivery tasks by scanning subscription ranges, skipping kitchen holidays/closures, and calculating the exact offsets to prepend "compensatory deliveries" on subsequent open weekdays.
- **`isFastingDay`**: Processes hybrid subscription logic, resolving Wednesday/Friday fasting days alongside floating kitchen fasting period exceptions.

### 2. Greedy Nearest Neighbor TSP Route Optimization
Located in [src/components/DriverApp.tsx](file:///home/befikadusata/Devs/2026/kitchen/src/components/DriverApp.tsx), the driver dispatch portal implements route sequencing:
- Translates Addis Ababa districts (Bole, Wollo Sefer, Kazanchis, Piassa, Mexico, Saris, CMC) to coordinate mappings.
- Computes distances using Havesine-like approximations.
- Runs a Greedy Nearest Neighbor Traveling Salesman heuristic to sort deliveries, presenting drivers with optimized `📍 Stop #1`, `📍 Stop #2` sequences and displaying total mileage savings.

---

## 📋 Directory Structure

- [server.ts](file:///home/befikadusata/Devs/2026/kitchen/server.ts) — Main Express backend server defining APIs.
- [db.ts](file:///home/befikadusata/Devs/2026/kitchen/db.ts) — PostgreSQL wrapper and helper functions.
- [schema.sql](file:///home/befikadusata/Devs/2026/kitchen/schema.sql) — PostgreSQL database schemas.
- [seed.ts](file:///home/befikadusata/Devs/2026/kitchen/seed.ts) — Seeding file initializing dummy database content.
- [src/](file:///home/befikadusata/Devs/2026/kitchen/src) — Single-page React application containing layouts, components, context, and calendar utils.

---

## 🔧 Installation & Local Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** database service (running locally or remotely)

### 2. Configure Environment Variables
Copy [.env.example](file:///home/befikadusata/Devs/2026/kitchen/.env.example) to `.env` and fill out your variables:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local server port for Express (reverse-proxied traffic) | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://oz_admin:oz_password_2026@localhost:5432/oz_kitchen` |
| `JWT_SECRET` | Token secret for security | `oz-kitchen-secret-2026` |
| `GEMINI_API_KEY` | Optional API key for generative features | `your_gemini_api_key_here` |

### 3. Initialize & Seed Database
Build schemas and seed initial data using the CLI tool:

```bash
npx tsx seed.ts
```

### 4. Run Development Server
Start the development build. This launches the Express server and Vite frontend concurrently:

```bash
npm run dev
```

Visit the app in your browser at `http://localhost:3000`.

---

## 🎨 UI & Design Principles
- **Administrative Slate**: Sleek, clean off-white canvas (`bg-slate-50`) using high-contrast slate headers and charcoal borders to represent a modern back-office feel.
- **Mobile Cosmetology**: Both the Telegram Mini-App and the Driver dispatch portal use high-contrast dark panels (`bg-slate-900`) tailored to simulate mobile device viewport frames and minimize distraction during active operations.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE details for info.
MIT © 2026 Oz Kitchen.
