import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Initialize jsPDF (A4 size, portrait)
const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const emeraldDark = [22, 101, 52];    // #166534
const emeraldPrimary = [34, 197, 94]; // #22c55e
const slateDark = [30, 41, 59];       // #1e293b
const slateMuted = [100, 116, 139];   // #64748b
const bgLight = [240, 253, 244];      // #f0fdf4

// ==========================================
// PAGE 1: COVER & EXECUTIVE SUMMARY
// ==========================================

// Header Banner
doc.setFillColor(...emeraldDark);
doc.rect(0, 0, 210, 38, "F");

doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold");
doc.setFontSize(18);
doc.text("GREEN ENLIGHTENMENT", 14, 16);

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.text("AI & Sentinel-2 Satellite Multi-Spectral Agroforestry MRV Platform", 14, 24);
doc.text("Official Grant & Seed Funding Budget Proposal (ACIC / NITI Aayog)", 14, 31);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("FUNDING ASK: INR 25,00,000", 196, 24, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text("12-Month Deployment Plan", 196, 31, { align: "right" });

// Executive Summary Card
let y = 46;
doc.setFillColor(...bgLight);
doc.roundedRect(14, y, 182, 36, 3, 3, "F");
doc.setDrawColor(...emeraldPrimary);
doc.setLineWidth(0.4);
doc.roundedRect(14, y, 182, 36, 3, 3, "S");

doc.setTextColor(...emeraldDark);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("1. EXECUTIVE SUMMARY & TARGET OBJECTIVES", 18, y + 7);

doc.setTextColor(...slateDark);
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
const summaryText = 
  "Green Enlightenment solves India's 60%+ sapling mortality crisis and corporate greenwashing by deploying " +
  "an automated AI-Vision + Sentinel-2 Satellite MRV (Measurement, Reporting, and Verification) platform. " +
  "This 12-month budget proposal represents an honest, capital-efficient, and defensible financial roadmap " +
  "tailored for the Atal Community Innovation Centre (ACIC) to scale grassroots agroforestry in rural Tier-2/3 India.";
doc.text(doc.splitTextToSize(summaryText, 174), 18, y + 14);

y += 44;

// Table 1: Macro Allocation
doc.setTextColor(...emeraldDark);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("2. 12-MONTH MACRO CAPITAL ALLOCATION SUMMARY", 14, y);

const macroRows = [
  ["1. Product Engineering, AI & Satellite Cloud", "INR 7,20,000", "28.8%", "Sentinel-2 pipeline, Gemini 2.5 compute, Supabase, offline PWA"],
  ["2. Grassroots Field Pilots & Rural Deployment", "INR 6,00,000", "24.0%", "20k physical QR tags, 5 GPS scouting kits, farmer bio-inputs"],
  ["3. Core Technical & Agroforestry Talent", "INR 7,80,000", "31.2%", "Lead AI/GIS Engineer, Agroforestry Lead, Rural Field Coordinator"],
  ["4. Carbon MRV Audits, IPCC Compliance & IP", "INR 2,20,000", "8.8%", "IPCC Tier-2 scientific validation, provisional patent filing, legal"],
  ["5. Vernacular Outreach, Workshops & Buffer", "INR 1,80,000", "7.2%", "10 Marathi/Hindi KVK workshops, printed manuals, 7% reserve"],
  ["TOTAL 12-MONTH BUDGET", "INR 25,00,000", "100.0%", "Milestone Target: 50,000 verified trees & 2 paid corporate pilots"],
];

autoTable(doc, {
  startY: y + 4,
  head: [["Budget Category", "Amount (INR)", "% Share", "Primary Deliverable / Scope"]],
  body: macroRows,
  theme: "striped",
  headStyles: { fillColor: emeraldDark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
  bodyStyles: { textColor: slateDark, fontSize: 8, cellPadding: 2.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  columnStyles: {
    0: { cellWidth: 55, fontStyle: "bold" },
    1: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: emeraldDark },
    2: { cellWidth: 18, halign: "center" },
    3: { cellWidth: 81 },
  },
  margin: { left: 14, right: 14 },
});

y = doc.lastAutoTable.finalY + 10;

// Detailed Breakdown Section 1: Tech & AI
doc.setTextColor(...emeraldDark);
doc.setFont("helvetica", "bold");
doc.setFontSize(10.5);
doc.text("3. DETAILED LINE-ITEM BREAKDOWN (PART A)", 14, y);

const techRows = [
  ["Copernicus Sentinel-2 & Planet Tile Pipeline", "Cloud storage, GeoTIFF tiling, and spectral processing for 100k+ trees", "INR 2,40,000"],
  ["Google Gemini 2.5 Vision API Inference", "Species verification, plant pathology & anti-fraud auto-rejection (~50k calls)", "INR 1,80,000"],
  ["Supabase Enterprise Vector & Cloud Database", "PostgreSQL spatial DB, encrypted image vaults, real-time edge functions", "INR 1,20,000"],
  ["Offline PWA Engine & Vector QR Tag Pipeline", "Offline IndexedDB synchronization & raster-to-SVG batch print exporter", "INR 1,00,000"],
  ["CI/CD, High-Availability Hosting & DNS", "Vercel Enterprise, edge caching, serverless workers, SSL security", "INR 80,000"],
  ["CATEGORY TOTAL: TECH & AI INFRASTRUCTURE", "28.8% of Total Capital", "INR 7,20,000"],
];

autoTable(doc, {
  startY: y + 4,
  head: [["Category 1: Technology & AI Infrastructure", "Technical Description", "Cost (INR)"]],
  body: techRows,
  theme: "grid",
  headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
  bodyStyles: { textColor: slateDark, fontSize: 7.5, cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 58, fontStyle: "bold" },
    1: { cellWidth: 96 },
    2: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: emeraldDark },
  },
  margin: { left: 14, right: 14 },
});

// Footer Page 1
doc.setFontSize(8);
doc.setTextColor(...slateMuted);
doc.text("Green Enlightenment | ACIC Funding Budget Proposal | Page 1 of 2", 105, 290, { align: "center" });

// ==========================================
// PAGE 2: FIELD OPS, TALENT, CARBON & ROI
// ==========================================
doc.addPage();

// Header Page 2
doc.setFillColor(...emeraldDark);
doc.rect(0, 0, 210, 20, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.text("GREEN ENLIGHTENMENT — ACIC BUDGET PROPOSAL (CONT.)", 14, 13);
doc.setFontSize(9);
doc.setFont("helvetica", "normal");
doc.text("Field Pilots, Talent, Carbon MRV & Commercialization", 196, 13, { align: "right" });

y = 28;

// Detailed Breakdown Section 2: Field & Talent
const fieldTalentRows = [
  ["Physical Weatherproof QR Branch Tags", "20,000 UV-resistant anodized aluminum QR tree tags @ INR 12/tag", "INR 2,40,000"],
  ["Field Scouting Kits for Rural Rangers", "5 rugged GPS/NFC field tablets + optical soil moisture probes", "INR 1,50,000"],
  ["Pilot Land Parcels & Farmer Inputs", "Subsidized bio-fertilizer kits (Trichoderma, Jeevamrit) for 500 farmers", "INR 1,50,000"],
  ["Field Logistics & Regional Travel", "Travel across Solapur, Satara, Ahmednagar & Vidarbha agroforestry clusters", "INR 60,000"],
  ["Lead AI/Geospatial Full-Stack Engineer", "12 Months lean incubation stipend @ INR 30,000 / month", "INR 3,60,000"],
  ["Agroforestry & Plant Pathology Lead", "Part-time domain specialist @ INR 15,000 / month", "INR 1,80,000"],
  ["Rural Field Coordinator & Community Lead", "12 Months on-ground liaison @ INR 20,000 / month", "INR 2,40,000"],
  ["IPCC Tier-2 Pantropical Model Audit", "Independent university forestry department validation & certification", "INR 1,00,000"],
  ["Patent / IP Filing & Legal Compliance", "Provisional patent on AI Anti-Fraud Geo-Spatial Algorithm + GST/Audit", "INR 1,20,000"],
  ["Vernacular Farmer Training & Buffer", "10 Marathi/Hindi KVK workshops, printed guides + 7% contingency reserve", "INR 1,80,000"],
  ["TOTAL BUDGET BALANCE", "Full 12-Month Operational & Technical Runway", "INR 17,80,000"],
];

autoTable(doc, {
  startY: y,
  head: [["Category 2 to 5: Field, Talent, Carbon & Outreach", "Operational Scope", "Cost (INR)"]],
  body: fieldTalentRows,
  theme: "grid",
  headStyles: { fillColor: emeraldDark, textColor: [255, 255, 255], fontSize: 8 },
  bodyStyles: { textColor: slateDark, fontSize: 7.5, cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 62, fontStyle: "bold" },
    1: { cellWidth: 92 },
    2: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: emeraldDark },
  },
  margin: { left: 14, right: 14 },
});

y = doc.lastAutoTable.finalY + 8;

// Commercialization & Self-Sustainability Box
doc.setFillColor(...bgLight);
doc.roundedRect(14, y, 182, 34, 3, 3, "F");
doc.setDrawColor(...emeraldPrimary);
doc.setLineWidth(0.4);
doc.roundedRect(14, y, 182, 34, 3, 3, "S");

doc.setTextColor(...emeraldDark);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("4. MONETIZATION & COMMERCIAL SELF-SUSTAINABILITY (NO PERPETUAL GRANTS)", 18, y + 6);

doc.setTextColor(...slateDark);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
const monetizationText = 
  "• Corporate ESG MRV Audits: INR 15 - INR 25 per tree/year for automated multi-spectral satellite verification.\n" +
  "• Bulk Weatherproof QR Tag Bundles: INR 20 per physical anodized aluminum tag bundle for mass plantation drives.\n" +
  "• Carbon Offset Issuance Brokerage: 8% - 12% brokerage fee on verified carbon credits under IPCC Tier-2 standards.\n" +
  "• Breakeven Runway: At 1,00,000 monitored trees, annual recurring revenue reaches INR 18,00,000, achieving full self-sufficiency.";
doc.text(monetizationText, 18, y + 13);

y += 40;

// Deliverables & Impact Summary
doc.setTextColor(...emeraldDark);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("5. 12-MONTH TARGET KEY PERFORMANCE INDICATORS (KPIS)", 14, y);

const kpiRows = [
  ["Trees Geotagged & Audited", "50,000+ Living Trees", "Compared to standard 40% unmonitored baseline"],
  ["24-Month Sapling Survival Rate", ">90% Verified Survival", "Powered by IoT/satellite soil moisture & AI scouting alerts"],
  ["CO2 Equivalent Sequestered", "1,00,000+ kg CO2e (1,000 MT)", "Quantified under IPCC Pantropical Tier-2 allometric models"],
  ["Corporate CSR Pilots", "2 Paid Enterprise Clients", "Direct pathway to early commercial revenue by Month 9"],
];

autoTable(doc, {
  startY: y + 4,
  head: [["Key Impact Metric", "Target by Month 12", "Strategic Value to ACIC / NITI Aayog"]],
  body: kpiRows,
  theme: "striped",
  headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 8 },
  bodyStyles: { textColor: slateDark, fontSize: 7.5, cellPadding: 2 },
  columnStyles: {
    0: { cellWidth: 55, fontStyle: "bold" },
    1: { cellWidth: 42, fontStyle: "bold", textColor: emeraldDark },
    2: { cellWidth: 85 },
  },
  margin: { left: 14, right: 14 },
});

// Footer Page 2
doc.setFontSize(8);
doc.setTextColor(...slateMuted);
doc.text("Green Enlightenment | ACIC Funding Budget Proposal | Page 2 of 2", 105, 290, { align: "center" });

// Output PDF to disk
const outputDir = path.resolve("C:/Users/DELL/.gemini/antigravity/scratch/hirwasparsh");
const artifactDir = path.resolve("C:/Users/DELL/.gemini/antigravity/brain/d8ead285-9a32-44a4-90e7-77859435c1b9");

const pdfData = doc.output("arraybuffer");
fs.writeFileSync(path.join(outputDir, "Green_Enlightenment_ACIC_Budget_Proposal.pdf"), Buffer.from(pdfData));
fs.writeFileSync(path.join(artifactDir, "Green_Enlightenment_ACIC_Budget_Proposal.pdf"), Buffer.from(pdfData));

console.log("PDF generated successfully at both scratch and artifact locations!");
