# Green Enlightenment 🌿🛰️

> **Cryptographically Audited Afforestation MRV, Copernicus Sentinel-2 Telemetry & IPCC Tier-2 Carbon Accounting Platform**

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Copernicus](https://img.shields.io/badge/ESA-Sentinel--2%20MSI-003399)](https://dataspace.copernicus.eu/)

---

## 📌 Overview

**Green Enlightenment** is an institutional-grade agroforestry and ecological intelligence platform designed to eliminate greenwashing in carbon offset and reforestation programs. 

By unifying ground-truth botanical AI audits, cryptographic EXIF metadata validation, and European Space Agency (ESA) Copernicus Sentinel-2 satellite telemetry, Green Enlightenment provides an end-to-end Measurement, Reporting, and Verification (MRV) ecosystem for citizen adopters, grassroots NGOs, and corporate CSR sponsors.

### The Problem
Over **80,000 acres of forest are lost daily worldwide** (*Source: UN FAO Global Forest Resources Assessment*). While corporate carbon pledges and mass plantation drives have surged, up to 80% of unverified saplings perish within 12 months without detection or accountability.

### The Solution
Green Enlightenment introduces a **Continuous 36-Month Survival Verification Protocol**:
1. **Ground-Truth Botanical Auditing**: Gemini 2.5 Flash multimodal vision inspects sapling species, foliar health, and detects synthetic/replayed photos.
2. **Spaceborne Telemetry**: Copernicus Sentinel-2 10-meter Bottom-Of-Atmosphere (BOA) multi-spectral reflectance captures real NDVI & NDRE vegetative vigor curves.
3. **Institutional Carbon Accounting**: Pantropical allometric biomass modeling (*Chave et al., 2014*) compliant with **IPCC Tier-2 AFOLU** and **Verra VM0047** standards.

---

## 🏗️ Architecture

```
                                  +------------------------------------+
                                  |     Green Enlightenment Web UI     |
                                  | (React 18 + TS + Tailwind + Leaflet)|
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |     Vercel Edge Functions API      |
                                  |  (/api/gemini, /api/contact, etc.)  |
                                  +--------+------------------+--------+
                                           |                  |
                    +----------------------+                  +---------------------+
                    v                                                               v
    +------------------------------+                              +---------------------------------+
    |   Supabase PostgreSQL RLS    |                              |   ESA Copernicus Data Space     |
    | - Zero-Trust RLS Policies    |                              | - Sentinel-2 MSI Multi-Spectral |
    | - Encrypted Exif & Coordinates|                             | - 10m Ground Resolution NDVI    |
    | - Granular Role Separation   |                              | - 5-Day Overpass Telemetry      |
    +------------------------------+                              +---------------------------------+
                    ^
                    |
    +---------------+--------------+
    |   Google Gemini Vision AI    |
    | - Ground Truth Species ID    |
    | - Foliar Stress Diagnostics  |
    | - Anti-Replay & Liveness     |
    +------------------------------+
```

---

## 🚀 Key Features

- **Interactive GIS Radar**: Leaflet-powered multi-layer geospatial engine supporting cadastral parcel boundaries (KML, GeoJSON, Shapefiles via Turf.js).
- **Satellite Telemetry Engine**: Automatic ingestion of 10-meter Sentinel-2 Band 4 (Red), Band 8 (NIR), and Band 8A (Narrow NIR) to calculate NDVI and NDRE vigor indices.
- **CSR Corporate Portal**: Automated audit trails and quarterly impact certificates formatted for **SEBI BRSR Core Principle 6** and **ESG Scope-3 GHG** reporting.
- **NGO Field Scout Queue**: Offline-capable mobile PWA for field rangers with EXIF geolocation locking, tamper-evident timestamps, and QR tag synchronization.
- **Transparent Pricing**: Free individual citizen adoption plans, scalable NGO community workspaces, and enterprise CSR packages.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Lucide Icons
- **GIS & Mapping**: Leaflet, React-Leaflet, Leaflet Cluster, Turf.js
- **SEO & Social**: `react-helmet-async`, OpenGraph 1200x630 share card, Schema.org JSON-LD structured data
- **Backend & Auth**: Supabase PostgreSQL with strict Row Level Security (RLS) and column-level PII protection
- **Serverless API**: Vercel Edge Functions (secure server-side secrets isolation)
- **AI Vision**: Google Gemini 2.5 Flash via official `@google/genai` SDK
- **Testing**: Vitest, React Testing Library, jsdom

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hirwasparsh/green-enlightenment.git
   cd green-enlightenment
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Populate the required configuration keys:
   ```env
   # Public Client Variables
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"

   # Serverless Edge Secrets (Stored in Vercel / server-side only)
   GEMINI_API_KEY="your-gemini-api-key"
   COPERNICUS_CLIENT_ID="your-copernicus-client-id"
   COPERNICUS_CLIENT_SECRET="your-copernicus-client-secret"
   WHATSAPP_ACCESS_TOKEN="your-whatsapp-token"
   WHATSAPP_PHONE_NUMBER_ID="your-phone-id"
   ```

4. Launch the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🧪 Testing & Verification

Execute the automated test suite with Vitest:

```bash
# Run all unit and integration tests
npm test -- --run

# Run tests in watch mode
npm test

# Verify production build compilation
npm run build
```

---

## 🔒 Security & Anti-Fraud Architecture

- **Zero Client Secrets**: All external API keys (`GEMINI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, Copernicus credentials) are strictly quarantined in serverless `/api` routes and never bundled into client JavaScript.
- **Zero-Trust Database RLS**: Supabase tables enforce granular Row Level Security policies. Public `anon` access is revoked from writing tables, and user phone numbers are column-restricted.
- **Fail-Loud Authentication**: Phone OTP validation strictly rejects mock fallbacks, requiring positive cryptographic affirmation from carrier edge gateways.
- **Anti-Greenwashing Benchmarks**: Synthetic simulation data is explicitly demarcated with user-facing verification badges to ensure unambiguous distinction from live satellite registry data.

---

## 📜 Scientific Methodology & Standards

For detailed mathematical equations, allometric biomass formulas, and Western Ghats wood density coefficients, consult our interactive documentation:
👉 [https://green-enlightenment.com/methodology](https://green-enlightenment.com/methodology)

---

## 🤝 Pilot Partners & Institutional Research

- **ACIC Innovation Hub**: Incubation and research support.
- **Sahyadri Devrai Foundation**: Native bio-shield reforestation pilot in the Western Ghats (Pune & Mulshi watersheds).
- **ESA Copernicus Programme**: Sentinel-2 multi-spectral remote sensing data access.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
