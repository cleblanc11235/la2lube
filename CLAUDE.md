# LA 2 Oil & Lube — Shop App

## Goal

A modern oil change shop management app for a non-technical, family-run,
2-bay shop in rural North Louisiana (LA 2 Oil & Lube, Farmerville).

**Current phase: MVP trial.** The app runs alongside the shop's existing
DataLube software, which stays the official record, to show its worth. Devices:
an old Windows PC at the counter (Chrome) and a shop iPhone (plate scanning,
bay board). Cards are run on a separate Square reader; the app only records them.

## Architecture

- Vite + React. One repo, two Netlify sites: the public website (default build)
  and the staff app (`VITE_APP_TARGET=shop`), see `src/App.tsx`.
- Data lives in Supabase (`supabase/schema.sql`), behind one shared shop login.
  Screens only talk to the `ShopStore` interface (`src/data/store/`); tests and
  local dev without env vars use the in-memory store ("practice mode").
- A **ticket** is the single record of a visit (waiting → in_progress → ready →
  paid, or void). Bay board, payment, service history and reports all read tickets.
- Setup steps: `docs/shop-setup.md`.

## Deliverable

- Works in Chrome on the counter PC and Safari on the iPhone
- Starts empty: no fake customers, transactions, or bay jobs (see "Test Data" below)
- Covers the full customer flow end to end
- Looks premium — dark theme, clean, modern, nothing dated

## The Full Demo Flow (must work end to end)

1. Owner opens app → sees the Check-In screen with today's stats in the header
2. Types a phone number or name → returning customer appears instantly with their
   vehicle and service history
3. Selects the vehicle → enters mileage → service recommendations auto-appear
   (e.g. "Transmission flush recommended — 32,000 miles since last service")
4. Taps to add services → live ticket updates with tax and total in sidebar
5. Taps "Proceed to Payment" → clean invoice screen appears
6. Selects Cash or Card → if cash, types amount, change auto-calculates
7. Taps "Charge" → Done screen appears with windshield sticker preview
   (sticker shows: shop name, date, mileage, oil type, next service mileage)
8. Taps "Next Customer" → resets cleanly to step 1
9. Revenue and car count in header have updated

## 5 Screens

### 1. Check-In

- Single large search bar, prominent
- Instant customer lookup by phone, name, or plate
- Returning customer card: name, phone, vehicle list
- Tap vehicle → show full service history timeline
- Mileage input → triggers recommendation banners (amber, dismissable)
- "New Customer" button → minimal form (name, phone, year/make/model)

### 2. Services

- Large touch-friendly button grid
- Sections: Oil Change (6 tiers), Fluid Services, Filters & Add-ons
- Selected services highlight in amber
- Sticky order sidebar: line items, subtotal, tax, total
- One-tap add/remove, no confirmation dialogs

### 3. Payment

- Left column: clean invoice (shop info, customer, vehicle, mileage, line items, total)
- Right column: Cash or Card selector
- Cash: tendered amount input + auto change calculation
- Card: "Charge $XX.XX" button (mock — no real payment needed for demo)

### 4. Done / Sticker Preview

- Big green checkmark, payment confirmed
- Windshield sticker preview (white card, courier font, shop name, date,
  mileage, oil type, NEXT SERVICE AT: XXXXX mi in bold amber)
- Reprint and Next Customer buttons

### 5. Bay Board

- One color-coded card per bay (`BAY_COUNT` in `src/config/shopSettings.ts`, 2 today)
- Waiting (orange) → Start Job → In Progress (blue, live ticking timer) → Job Done
- Finished cars move to a "Ready to Pay" list → Take Payment
- Any open ticket can be cancelled (voided)
- Each occupied bay shows vehicle, customer name, service

### 6. Daily Reports

- 4 stat cards: Revenue, Cars Served, Avg Ticket, Cash/Card Split
- Transaction table: time, customer, vehicle, services, method, total
- Updates live as tickets are completed during the demo

## Design System

- Background: #0f1117
- Surface cards: #1a1d27
- Borders: #2e3250
- Amber accent (CTAs, selected state): #f59e0b
- Blue (in progress): #3b82f6
- Green (success/complete): #22c55e
- Orange (warnings/waiting): #f97316
- Text: #f1f5f9, Muted: #64748b
- Font: Inter
- Border radius: 12px cards, 8px inputs
- Minimum touch target height: 60px
- All money values: monospace, right-aligned

## Test Data (tests only — never pre-load into the app)

The app is moving to real use in the shop, so it ships with no seed data.
The shop's real configuration lives in `src/config/` (`serviceMenu.ts`,
`shopSettings.ts` for tax rate and bay count, `shopBrand.ts`). The customers
below are fixtures in `src/test/fixtures.ts`; tests pass them in with
`<AppProvider initialCustomers={testCustomers}>`.

- Mike Johnson | (318) 555-1234 | 2021 Ford F-150 5.0L | LSU 4477
  History: Full Synthetic x3, last at 48,200 mi
- Sandra Lee | (318) 555-9876 | 2018 Chevy Silverado 5.3L | RED 1122
  History: Synthetic Blend x2, last at 72,400 mi
- Robert Williams | (318) 555-4422 | 2020 Toyota Camry 2.5L | CAM 7890
  History: Full Synthetic x2, last at 31,500 mi

- Debra Fontenot | (318) 555-7711 | 2015 Honda Civic 1.8L | HON 2233
  History: High-Mileage + Cabin Filter, last at 98,700 mi
  **_ This vehicle should trigger multiple service recommendations _**

## Service Menu (pre-loaded prices)

Oil Changes: Conventional $34.99, Synthetic Blend $54.99, Full Synthetic $74.99,
High-Mileage $64.99, Diesel $79.99, European Spec $84.99

Fluids: Transmission Flush $129.99, Coolant Flush $99.99, Power Steering $79.99,
Brake Fluid $69.99, Differential $89.99, A/C Recharge $119.99

Add-ons: Air Filter $24.99, Cabin Filter $29.99, Wiper Blades $24.99,
Tire Rotation $19.99, Interior Vac $14.99, Battery Test FREE, Fluid Top-Off FREE

## Recommendation Engine

Show amber banner if: (current mileage - mileage when *that service* was last done)
>= (interval x 0.85). If it has never been done here, measure from the vehicle's
first visit on record. No history at all → no recommendations.

- Transmission Flush: every 30,000 mi
- Coolant Flush: every 30,000 mi
- Cabin Air Filter: every 15,000 mi
- Air Filter: every 15,000 mi
  Include one-tap "Add to Ticket" button on each banner.

## Do NOT Build (yet)

- A custom backend server (Supabase is the backend)
- Real payment processing (record what was run on Square)
- Real printer integration
- Multi-location anything
- Inventory management
- Employee management
- Online booking
- Settings screen
- Per-employee logins (one shared shop login for now)

## Definition of Done

The demo is done when a non-technical person can be walked through the complete
flow — check in a returning customer, add services, pay, see the sticker —
without any explanation of how the software works. It should be that intuitive.
