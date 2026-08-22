import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

async function generateSlidePDF() {
  // 16:9 widescreen landscape (297 x 167 mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [297, 167],
  });

  // Background
  doc.setFillColor(11, 30, 22);
  doc.rect(0, 0, 297, 167, "F");

  // Top Header Banner
  doc.setFillColor(6, 21, 15);
  doc.rect(0, 0, 297, 26, "F");
  doc.setDrawColor(27, 67, 50);
  doc.setLineWidth(0.5);
  doc.line(0, 26, 297, 26);

  // Top Eyebrow Tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(82, 183, 136);
  doc.text("ACIC BOARD MEETING · GREEN ENLIGHTENMENT INNOVATION PITCH", 14, 8);

  // 1. One-Line Slide Title: Problem Statement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Problem Statement: Unverified Rural Plantations Suffer 70%+ Mortality & Zero Carbon Accountability",
    14,
    18
  );

  // Top Right Logo / Team Badge
  doc.setFillColor(20, 54, 40);
  doc.setDrawColor(45, 106, 79);
  doc.roundedRect(235, 4, 48, 16, 2, 2, "FD");
  doc.setFontSize(8.5);
  doc.setTextColor(216, 243, 220);
  doc.text("Tree Tag: Green Enlightenment", 238, 11);
  doc.setFontSize(7.5);
  doc.setTextColor(167, 201, 87);
  doc.text("NITI Aayog / ACIC Seed Round", 238, 16);

  // 4 Cards Layout (2x2 Grid)
  const cardW = 130;
  const cardH = 58;
  const col1X = 14;
  const col2X = 153;
  const row1Y = 32;
  const row2Y = 94;

  // Helper function to draw cards
  function drawCard(x, y, badgeBg, badgeText, items, borderColor) {
    doc.setFillColor(18, 42, 30);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "FD");

    // Header badge
    doc.setFillColor(...badgeBg);
    doc.roundedRect(x + 4, y + 4, 60, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, x + 7, y + 8.2);

    // Bullet items
    let curY = y + 15;
    items.forEach((item) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...item.hlColor);
      doc.text("• " + item.title + ":", x + 5, curY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(216, 226, 220);
      const splitText = doc.splitTextToSize(item.desc, cardW - 12);
      doc.text(splitText, x + 5, curY + 3.8);
      curY += 13.5;
    });
  }

  // Card 1
  drawCard(
    col1X,
    row1Y,
    [231, 111, 81],
    "1. WHAT IS THE PROBLEM?",
    [
      {
        title: "70%+ Sapling Mortality",
        desc: "Over 90% of rural plantation drives lack post-planting tracking; saplings die unnoticed within 12 months.",
        hlColor: [255, 170, 166],
      },
      {
        title: "Fake Uploads & Greenwashing",
        desc: "CSR & Govt drives suffer from duplicate stock images and unverified paper claims with zero ground truth.",
        hlColor: [255, 170, 166],
      },
      {
        title: "Lack of Satellite MRV",
        desc: "No multi-spectral telemetry exists to audit canopy vigor and tree growth at rural scale.",
        hlColor: [255, 170, 166],
      },
    ],
    [231, 111, 81]
  );

  // Card 2
  drawCard(
    col2X,
    row1Y,
    [244, 162, 97],
    "2. WHO IS AFFECTED & HOW?",
    [
      {
        title: "Smallholder & Tribal Farmers",
        desc: "Deprived of agroforestry yields and excluded from lucrative global voluntary carbon credit markets.",
        hlColor: [255, 227, 168],
      },
      {
        title: "Funding Agencies (ACIC/CSR/Govt)",
        desc: "100s of crores invested annually with zero proof of tree survival or measurable return on ecology.",
        hlColor: [255, 227, 168],
      },
      {
        title: "Semi-Arid Ecosystems",
        desc: "Worsening groundwater depletion, recurring drought cycles, and topsoil loss in Maharashtra belts.",
        hlColor: [255, 227, 168],
      },
    ],
    [244, 162, 97]
  );

  // Card 3
  drawCard(
    col1X,
    row2Y,
    [82, 183, 136],
    "3. OUR PROPOSED SOLUTION",
    [
      {
        title: "Sentinel-2 Multi-Spectral Telemetry",
        desc: "Automated 36-month NDVI & NDRE canopy vigor curves tracking real biomass growth.",
        hlColor: [116, 198, 157],
      },
      {
        title: "Gemini Edge AI Anti-Fraud Vision",
        desc: "Instant non-tree auto-rejection + autonomous 70% threshold verification and instant eco-points.",
        hlColor: [116, 198, 157],
      },
      {
        title: "Digital Passports & Vernacular Voice",
        desc: "Geo-tagged batch vector QR sheets + Marathi/Hindi audio agro-advisories for rural farmers.",
        hlColor: [116, 198, 157],
      },
    ],
    [82, 183, 136]
  );

  // Card 4
  drawCard(
    col2X,
    row2Y,
    [64, 145, 108],
    "4. POSITIVE CHANGE & BENEFITS",
    [
      {
        title: ">90% 3-Year Tree Survival",
        desc: "AI-driven disease alerts and bio-remedies (NSKE 5%, Trichoderma) prevent sapling die-off.",
        hlColor: [149, 213, 178],
      },
      {
        title: "Direct Carbon & Livelihood Income",
        desc: "Enables certified IPCC-compliant carbon credit payouts directly to rural planters.",
        hlColor: [149, 213, 178],
      },
      {
        title: "100% Audit-Grade Transparency",
        desc: "Provides ACIC, NITI Aayog, and CSR sponsors tamper-proof GIS dashboards with cryptographic proof.",
        hlColor: [149, 213, 178],
      },
    ],
    [64, 145, 108]
  );

  // Bottom KPI Strip
  doc.setFillColor(6, 21, 15);
  doc.rect(0, 154, 297, 13, "F");
  doc.setDrawColor(27, 67, 50);
  doc.setLineWidth(0.5);
  doc.line(0, 154, 297, 154);

  const kpis = [
    { val: "50,000 Verified Trees", lbl: "12-Month Target" },
    { val: ">90% Survival Rate", lbl: "vs 30% Unmonitored Avg" },
    { val: "1,000 MT CO2e / yr", lbl: "Certified Sequestration" },
    { val: "₹18L+ ARR Breakeven", lbl: "Commercial Sustainability" },
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = 20 + idx * 68;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(82, 183, 136);
    doc.text(kpi.val, xPos, 159);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(167, 201, 87);
    doc.text(kpi.lbl, xPos, 163.5);
  });

  const outPdf = path.resolve("Green_Enlightenment_ACIC_Board_Slide.pdf");
  doc.save(outPdf);
  console.log("PDF slide successfully generated at:", outPdf);
}

generateSlidePDF().catch((err) => {
  console.error("Error generating PDF slide:", err);
  process.exit(1);
});
