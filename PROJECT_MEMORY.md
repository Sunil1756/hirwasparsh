# Green Enlightenment (Hirwasparsh) — Master Project Memory & Architecture

> **Mission**: Enterprise B2B MRV (Measurement, Reporting & Verification) Platform for NGOs, CSR Foundations, and Large-Scale Afforestation Projects.
> **Incubation**: Operating under **ACIC (Atal Community Innovation Centre)** to build an institutional-grade startup and carbon organization targeting `.org` domain deployment.

---

## 1. Core Principles & Non-Negotiable Rules

1. **Large-Scale Institutional Afforestation Focus**:
   - The platform is designed for **NGOs, Corporate CSR Initiatives, Forest Departments, and Commercial Restoration Drives (planting 1,000 to 500,000+ trees across multi-hectare plots)**.
   - It is **NOT** for individual retail backyard planters.
   - Never mix individual retail registrations into project/NGO dashboard metrics.
   - Individual retail features (e.g., individual "My Trees & Growth" tracking) are set aside from primary navigation and menus to maintain strict institutional NGO/CSR focus.

2. **Zero Greenwashing Policy**:
   - No fake or hardcoded 100% survival rates, mock verified trees, or artificial drone scores.
   - If a new project has 0 field check-ins, it must honestly display `0 verified trees` and `0.00 MT verified CO2`, while displaying its projected mature sequestration potential.
   - Multi-Source Fusion gated verification: Carbon certificates cannot be issued without verified ground truth and satellite overpass data.

3. **No Mandatory Drone Requirement**:
   - Drones are cost-prohibitive for everyday NGOs in India.
   - Drone surveys are optional auxiliary boosters, not an enforced requirement in the confidence score.

4. **Dynamic Database Binding**:
   - All components, GIS consoles, carbon calculators, and ESG certificate generators must dynamically read from Supabase database records (`plantation_projects`, `plots`, `trees`, `check_ins`).
   - Never hardcode project IDs, names (e.g. `saga`), or static organization names.

---

## 2. 2-Pillar Grounded MRV Architecture

```
Total Confidence Score (0–100 pts) =
  🛰️ Pillar 1: Space-Borne Satellite Remote Sensing (40 pts max)
+ 📷 Pillar 2: Ground Truth Stratified Sample Audits (60 pts max)
- ⏳ Inactivity & Time Decay Penalty (Up to -25 pts after 30-day grace period)
```

### Pillar 1: Space-Borne Remote Sensing (40 Pts Max)
- **Constellation**: Copernicus Sentinel-2 L2A Multi-Spectral Earth Observation (10m/pixel).
- **Spectral Indices**:
  - **NDVI** (Normalized Difference Vegetation Index): Chlorophyll & photosynthetic vigor.
  - **NDRE** (Red-Edge): Leaf nitrogen health & early stress detection.
  - **NDWI** (Normalized Difference Water Index): Foliar cellular moisture & drought tracking.
  - **EVI** (Enhanced Vegetation Index): High-biomass canopy density.
  - **Thermal LST**: Surface cooling / canopy microclimate.
- **Scoring**:
  - $\ge 3$ cloud-free overpasses with stable/improving NDVI trend = **40 pts**.
  - 1–2 overpasses = **28 pts**.
  - 0 overpasses = **0 pts**.

### Pillar 2: Ground Truth Stratified Sample Audits (60 Pts Max)
- **Sampling Protocol**: **Cochran's Stratified Random Sampling (Verra VM0047 / IPCC Tier-2)**.
  - For large plantations ($N = 1,000$ to $500,000+$ trees), auditing **30 to 50 representative sample quadrat trees (Permanent Sample Plots - PSPs)** provides $95\%$ statistical confidence ($e = 5\%$).
- **Verification**:
  - NGO rangers / supervisors capture geotagged proof-of-life photos.
  - **Gemini 2.5 Botanical AI** verifies species taxonomy, health status, and detects fraud via perceptual dHash.
- **Scoring**:
  - Full sample target reached with high AI confidence = **60 pts**.
  - Partial sampling = Proportional score based on quota completion.

### Pillar 3: Inactivity Time Decay Penalty (Up to -25 Pts)
- **Grace Period**: 30 days.
- **Decay Rate**: $-0.15\text{ pts/day}$ beyond 30 days of inactivity.
- **Max Penalty**: $-25.0\text{ pts}$.
- Prevents abandoned plots from retaining active carbon certification.

---

## 3. Verification Tiers
1. **Gold Tier Verified ✓** ($\ge 80\text{ pts}$): Audited and fully certified for Institutional ESG & Carbon credit issuance.
2. **Field-Verified Active** ($50–79\text{ pts}$): Solid ground truth evidence; active monitoring ongoing.
3. **Satellite Only (Awaiting Field Audits)** ($>0\text{ pts}$ satellite): Space-borne macro trend active, awaiting ground team sample plots.
4. **Unverified / Demo** ($<50\text{ pts}$ / unverified): Requires field inputs to unlock tradeable carbon metrics.

---

## 4. Key Application Routes & Portals

| Route | Purpose | Target Audience |
|---|---|---|
| `/tree-map` | Interactive Space-Borne GIS & 8 Analysis Consoles | General / Public / Operations |
| `/csr-portal` | B2B Corporate ESG & BRSR Reporting Console | CSR Donors, Corporate Sponsors |
| `/ngo-workspace` | Plantation Management, Batch Manifests & Field Task Dispatch | NGO Field Operators, Forest Officers |
| `/pricing` | Institutional MRV & Satellite Monitoring Tiers | B2B Clients, Enterprise |
| `/plant/organization` | Geodetic Cadastral Boundary Onboarding & Ingestion | Project Registrars |
| `/bulk-onboard` | CSV / GeoJSON Batch Manifest Ingestion | Technical Operators |
| `/verify/cert/:serial` | Public Cryptographic Carbon Certificate QR Verification | Auditors, Public Registries |

---

## 5. Technical Stack & Repository Structure
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Framer Motion.
- **Geospatial & Mapping**: Leaflet, React-Leaflet, Turf.js (geodetic area, perimeter, centroid calculation), ESRI World Imagery & Sentinel-2 STAC tiles.
- **Backend & Database**: Supabase (PostgreSQL with Row-Level Security, Storage Buckets).
- **AI & Computer Vision**: Google Gemini 2.5 Botanical Vision API, dHash Perceptual Hashing.
- **Carbon Accounting**: Chave Pantropical Forestry Allometry & IPCC 2006/2019 Tier-2 Guidelines.
- **Testing**: Vitest, Testing Library (100% pass rate requirement across all 40+ tests).
