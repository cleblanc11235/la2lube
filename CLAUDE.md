# QuickLube Pro — Demo Prototype

## Goal

Build a single, self-contained, demoable prototype of a modern oil change shop
management app. This is for a non-technical shop owner in rural North Louisiana.
It needs to look incredible and be immediately usable with zero setup.

## Deliverable

A single Vite + React app (or single HTML file if simpler) that:

- Runs in any browser with no backend, no API keys, no setup
- Has realistic mock data pre-loaded and ready to go on first open
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

- 4 bays displayed as color-coded cards
- Bay 1: In Progress (blue, live ticking timer)
- Bay 2: Complete (green)
- Bay 3: Empty (gray)
- Bay 4: Waiting (orange)
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

## Mock Data (pre-load this)

4 customers, Louisiana names, realistic vehicles:

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

Show amber banner if: (current mileage - last service mileage) >= (interval x 0.85)

- Transmission Flush: every 30,000 mi
- Coolant Flush: every 30,000 mi
- Cabin Air Filter: every 15,000 mi
- Air Filter: every 15,000 mi
  Include one-tap "Add to Ticket" button on each banner.

## Do NOT Build

- Any backend or database
- Real payment processing
- Real printer integration
- Multi-location anything
- Inventory management
- Employee management
- Online booking
- Settings screen
- Authentication/login

## Definition of Done

The demo is done when a non-technical person can be walked through the complete
flow — check in a returning customer, add services, pay, see the sticker —
without any explanation of how the software works. It should be that intuitive.
