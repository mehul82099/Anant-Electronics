# Anant Electronics – Live Mobile Price, Offer & Customer Presentation System

A responsive, high-performance web application for **Anant Electronics** that turns the store's Google Sheet pricing and offer workbook into a fast, searchable employee interface and fullscreen customer presentation system.

> **THE GOOGLE SHEET IS THE SOURCE OF TRUTH FOR MOBILE PRODUCTS, PRICES, VARIANTS AND OFFERS.**

---

## ⚡ Live Features

1. **Google Sheets Live Synchronization**
   - Automatically synchronizes with the live Google Sheet (`1sj8ptmZ_dSUVC9IvsMdPt_wkgAnMmYXCAO0qYUmFkTs`).
   - Supports Google Sheets API v4 and direct XLSX export with redirect following.
   - Offline fallback to local workbook (`MOP LIST NEW 28.10.25.xlsx`).
   - Atomic dataset storage in `data/current.json` and audit history in `data/history.json`.

2. **100% Data Integrity & Source Traceability**
   - Every single product preserves its exact source sheet name, row number, and raw A1 cell data.
   - Dedicated "Inspect Source" modal showing exact spreadsheet cells for any model.
   - Strict price safety: never guesses missing prices or shifts offers between rows.

3. **Smart Search & Multi-Brand Filtering**
   - Instant real-time search across 580+ devices by model, brand, variant, or offer keyword.
   - Brand pills with live counters: Samsung, Xiaomi, Vivo, Oppo, Apple, Realme, Motorola, Google Pixel, OnePlus, Nothing, Infinix, Tecno, etc.
   - Filters: Active Offers, Price brackets (Under ₹15k, ₹15k-₹30k, ₹30k-₹60k, Above ₹60k), Categories (Phones, Tablets, Audio, Watch, TV).
   - View modes: Rich Grid Card view, Compact List view, and Table view.

4. **Sibling Variant Modal & Comparison Drawer**
   - Groups variants (e.g. 4/64, 6/128, 8/256) under base models.
   - Side-by-side comparison tray: compare up to 4 devices simultaneously.

5. **Customer Presentation Mode (`/presentation`)**
   - High-contrast, large typography display designed for presenting phones to walk-in customers or running on in-store TV displays.
   - Highlights net savings, special store prices, bank card swipe discounts, and estimated monthly EMI.
   - Hides internal spreadsheet identifiers unless employee diagnostics are clicked.

6. **Accessories & Authorized Service Centers**
   - Searchable accessories catalog with categories (Screen guards, Chargers, Buds, Cases).
   - Authorized Service Centers directory across Rajasthan with one-click direct phone dialers and addresses.
   - Store Operations calendar and weekly schedule.

7. **Admin Diagnostics & Sync Panel (`/admin`)**
   - Real-time "Sync Sheets Now" button with immediate feedback.
   - Worksheet structure health report tracking all 18 sheets.
   - Audit log of price changes and newly added devices.

---

## 🚀 Getting Started

### 1. Run Live Sync
To pull the latest pricing and offers directly from Google Sheets:
```bash
npm run sync
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

### 4. Run Tests & Validation
Runs Vitest data integrity tests against the workbook:
```bash
npm test
```
Typecheck the codebase:
```bash
npm run typecheck
```

---

## 📂 Project Structure

- `src/app/`: Next.js 16 App Router pages and API routes
  - `page.tsx`: Main catalog dashboard
  - `presentation/page.tsx`: Customer Presentation / TV mode
  - `accessories/page.tsx`: Accessories catalog
  - `services/page.tsx`: Authorized Service Centers
  - `calendar/page.tsx`: Store schedule
  - `admin/page.tsx`: Diagnostics & sync management
  - `api/dataset/route.ts`: Serves current published dataset
  - `api/sync/route.ts`: Sync trigger & status
  - `api/settings/route.ts`: Sync configuration settings
- `src/components/`: Reusable UI components
  - `Header.tsx`: Navigation with live sync indicator
  - `ProductCard.tsx`: Product card with MOP, offer price, savings and WhatsApp enquiry
  - `VariantModal.tsx`: Sibling memory/storage options
  - `SourceInspectModal.tsx`: Cell-by-cell spreadsheet trace
  - `CompareDrawer.tsx`: Multi-device comparison
- `src/lib/parse/`: Safe, deterministic parsers
  - `cells.ts`: Cell normalization & hashing
  - `price.ts`: Price & offer grammar
  - `variant.ts`: RAM & storage extraction
  - `offers.ts`: Bank, UPI, cashback highlight extraction
  - `grid.ts`: SheetJS grid wrapper
  - `products.ts`: Product sheets parser
  - `accessories.ts`: Accessories parser
  - `service.ts`: Service centers parser
  - `calendar.ts`: Store calendar parser
  - `workbook.ts`: Top-level workbook orchestrator
- `src/lib/sync/`: Google Sheets integration & safety
  - `fetcher.ts`: Downloads live Google Sheets workbook
  - `diff.ts`: Change detection & mass-removal protection
  - `store.ts`: Atomic persistence in `data/current.json`
  - `service.ts`: Full synchronization coordinator
