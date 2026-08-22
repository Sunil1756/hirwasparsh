import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";

async function generateSlide() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 13.33 x 7.5 inches

  const slide = pptx.addSlide();

  // Background - Deep Forest Slate / Dark Executive
  slide.background = { color: "0B1E16" };

  // Top Header Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 1.1,
    fill: { color: "06150F" },
    line: { color: "1B4332", width: 1 },
  });

  // Small Top Eyebrow Tag
  slide.addText("ACIC BOARD MEETING · GREEN ENLIGHTENMENT INNOVATION PITCH", {
    x: 0.8,
    y: 0.15,
    w: 8.5,
    h: 0.25,
    fontSize: 10,
    fontFace: "Arial",
    color: "52B788",
    bold: true,
  });

  // 1. One-Line Slide Title: Problem Statement
  slide.addText("Problem Statement: Unverified Rural Plantations Suffer 70%+ Mortality & Zero Carbon Accountability", {
    x: 0.8,
    y: 0.42,
    w: 11.7,
    h: 0.55,
    fontSize: 18,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
  });

  // Top Right Logo / Team Badge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.2,
    y: 0.22,
    w: 2.3,
    h: 0.65,
    fill: { color: "143628" },
    line: { color: "2D6A4F", width: 1.5 },
    rectRadius: 0.1,
  });
  slide.addText("🌳 Green Enlightenment\nNITI Aayog / ACIC Seed", {
    x: 10.2,
    y: 0.25,
    w: 2.3,
    h: 0.58,
    fontSize: 9.5,
    fontFace: "Arial",
    color: "D8F3DC",
    align: "center",
    bold: true,
  });

  // 4 Primary Content Cards Layout (2x2 Grid)
  const cardW = 5.65;
  const cardH = 2.45;
  const col1X = 0.8;
  const col2X = 6.85;
  const row1Y = 1.35;
  const row2Y = 4.05;

  // -------------------------------------------------------------
  // CARD 1: THE CORE PROBLEM (Top-Left)
  // -------------------------------------------------------------
  slide.addShape(pptx.ShapeType.roundRect, {
    x: col1X,
    y: row1Y,
    w: cardW,
    h: cardH,
    fill: { color: "122A1E" },
    line: { color: "E76F51", width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: col1X + 0.2,
    y: row1Y + 0.18,
    w: 2.2,
    h: 0.32,
    fill: { color: "E76F51" },
    rectRadius: 0.08,
  });
  slide.addText("1. WHAT IS THE PROBLEM?", {
    x: col1X + 0.2,
    y: row1Y + 0.2,
    w: 2.2,
    h: 0.28,
    fontSize: 9.5,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
  });

  slide.addText(
    [
      { text: "• 70%+ Sapling Mortality: ", options: { bold: true, color: "FFAAA6" } },
      { text: "Over 90% of rural plantation drives lack post-planting tracking; saplings die unnoticed within 12 months.\n", options: { color: "D8E2DC" } },
      { text: "• Fake Uploads & Greenwashing: ", options: { bold: true, color: "FFAAA6" } },
      { text: "CSR & Govt drives suffer from duplicate stock images and unverified paper claims with zero ground truth.\n", options: { color: "D8E2DC" } },
      { text: "• Lack of Satellite MRV: ", options: { bold: true, color: "FFAAA6" } },
      { text: "No multi-spectral telemetry exists to audit canopy vigor and tree growth at rural scale.", options: { color: "D8E2DC" } },
    ],
    {
      x: col1X + 0.2,
      y: row1Y + 0.62,
      w: cardW - 0.4,
      h: 1.7,
      fontSize: 10.5,
      fontFace: "Arial",
      lineSpacing: 16,
    }
  );

  // -------------------------------------------------------------
  // CARD 2: COMMUNITY IMPACT (Top-Right)
  // -------------------------------------------------------------
  slide.addShape(pptx.ShapeType.roundRect, {
    x: col2X,
    y: row1Y,
    w: cardW,
    h: cardH,
    fill: { color: "122A1E" },
    line: { color: "F4A261", width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: col2X + 0.2,
    y: row1Y + 0.18,
    w: 2.4,
    h: 0.32,
    fill: { color: "F4A261" },
    rectRadius: 0.08,
  });
  slide.addText("2. WHO IS AFFECTED & HOW?", {
    x: col2X + 0.2,
    y: row1Y + 0.2,
    w: 2.4,
    h: 0.28,
    fontSize: 9.5,
    fontFace: "Arial",
    color: "0B1E16",
    bold: true,
    align: "center",
  });

  slide.addText(
    [
      { text: "• Smallholder & Tribal Farmers: ", options: { bold: true, color: "FFE3A8" } },
      { text: "Deprived of agroforestry yields and excluded from lucrative global voluntary carbon credit markets.\n", options: { color: "D8E2DC" } },
      { text: "• Funding Agencies (ACIC / CSR / Govt): ", options: { bold: true, color: "FFE3A8" } },
      { text: "₹100s of crores invested annually with zero proof of tree survival or measurable return on ecology.\n", options: { color: "D8E2DC" } },
      { text: "• Semi-Arid Ecosystems: ", options: { bold: true, color: "FFE3A8" } },
      { text: "Worsening groundwater depletion, recurring drought cycles, and topsoil loss in Maharashtra belts.", options: { color: "D8E2DC" } },
    ],
    {
      x: col2X + 0.2,
      y: row1Y + 0.62,
      w: cardW - 0.4,
      h: 1.7,
      fontSize: 10.5,
      fontFace: "Arial",
      lineSpacing: 16,
    }
  );

  // -------------------------------------------------------------
  // CARD 3: POTENTIAL SOLUTION (Bottom-Left)
  // -------------------------------------------------------------
  slide.addShape(pptx.ShapeType.roundRect, {
    x: col1X,
    y: row2Y,
    w: cardW,
    h: cardH,
    fill: { color: "122A1E" },
    line: { color: "52B788", width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: col1X + 0.2,
    y: row2Y + 0.18,
    w: 2.8,
    h: 0.32,
    fill: { color: "52B788" },
    rectRadius: 0.08,
  });
  slide.addText("3. OUR PROPOSED SOLUTION (GREEN ENLIGHTENMENT)", {
    x: col1X + 0.2,
    y: row2Y + 0.2,
    w: 2.8,
    h: 0.28,
    fontSize: 8.5,
    fontFace: "Arial",
    color: "0B1E16",
    bold: true,
    align: "center",
  });

  slide.addText(
    [
      { text: "• Sentinel-2 Satellite Multi-Spectral Telemetry: ", options: { bold: true, color: "74C69D" } },
      { text: "Automated 36-month NDVI & NDRE canopy vigor curves tracking real biomass growth.\n", options: { color: "D8E2DC" } },
      { text: "• Gemini Edge AI Anti-Fraud Screening: ", options: { bold: true, color: "74C69D" } },
      { text: "Instant non-tree auto-rejection + autonomous 70% threshold verification and instant eco-points.\n", options: { color: "D8E2DC" } },
      { text: "• Digital Tree Passports & Vernacular Voice: ", options: { bold: true, color: "74C69D" } },
      { text: "Geo-tagged batch vector QR sheets + Marathi/Hindi audio agro-advisories for rural farmers.", options: { color: "D8E2DC" } },
    ],
    {
      x: col1X + 0.2,
      y: row2Y + 0.62,
      w: cardW - 0.4,
      h: 1.7,
      fontSize: 10.5,
      fontFace: "Arial",
      lineSpacing: 16,
    }
  );

  // -------------------------------------------------------------
  // CARD 4: BENEFITS & VALUE CREATED (Bottom-Right)
  // -------------------------------------------------------------
  slide.addShape(pptx.ShapeType.roundRect, {
    x: col2X,
    y: row2Y,
    w: cardW,
    h: cardH,
    fill: { color: "122A1E" },
    line: { color: "40916C", width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: col2X + 0.2,
    y: row2Y + 0.18,
    w: 2.4,
    h: 0.32,
    fill: { color: "40916C" },
    rectRadius: 0.08,
  });
  slide.addText("4. POSITIVE CHANGE & BENEFITS", {
    x: col2X + 0.2,
    y: row2Y + 0.2,
    w: 2.4,
    h: 0.28,
    fontSize: 9.5,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
  });

  slide.addText(
    [
      { text: "• >90% 3-Year Tree Survival: ", options: { bold: true, color: "95D5B2" } },
      { text: "AI-driven disease alerts and bio-remedies (NSKE 5%, Trichoderma) prevent sapling die-off.\n", options: { color: "D8E2DC" } },
      { text: "• Direct Carbon & Livelihood Income: ", options: { bold: true, color: "95D5B2" } },
      { text: "Enables certified IPCC-compliant carbon credit payouts directly to rural planters.\n", options: { color: "D8E2DC" } },
      { text: "• 100% Audit-Grade Transparency: ", options: { bold: true, color: "95D5B2" } },
      { text: "Provides ACIC, NITI Aayog, and CSR sponsors tamper-proof GIS dashboards with cryptographic proof.", options: { color: "D8E2DC" } },
    ],
    {
      x: col2X + 0.2,
      y: row2Y + 0.62,
      w: cardW - 0.4,
      h: 1.7,
      fontSize: 10.5,
      fontFace: "Arial",
      lineSpacing: 16,
    }
  );

  // -------------------------------------------------------------
  // BOTTOM KPI / EXECUTIVE SUMMARY STRIP
  // -------------------------------------------------------------
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 6.65,
    w: 13.33,
    h: 0.85,
    fill: { color: "06150F" },
    line: { color: "1B4332", width: 1 },
  });

  const kpiData = [
    { label: "12-Month Pilot Target", val: "50,000 Verified Trees" },
    { label: "Projected Survival Rate", val: ">90% (vs 30% Avg)" },
    { label: "CO₂ Sequestration", val: "1,000 MT CO₂e / yr" },
    { label: "Commercial Breakeven", val: "₹18L+ ARR at 100k Trees" },
  ];

  kpiData.forEach((kpi, idx) => {
    const kpiX = 0.8 + idx * 2.95;
    slide.addText(kpi.val, {
      x: kpiX,
      y: 6.72,
      w: 2.8,
      h: 0.35,
      fontSize: 13,
      fontFace: "Arial",
      color: "52B788",
      bold: true,
      align: "center",
    });
    slide.addText(kpi.label, {
      x: kpiX,
      y: 7.05,
      w: 2.8,
      h: 0.28,
      fontSize: 9,
      fontFace: "Arial",
      color: "A7C957",
      align: "center",
    });
  });

  // Write file
  const outPath = path.resolve("Green_Enlightenment_ACIC_Board_Slide.pptx");
  await pptx.writeFile({ fileName: outPath });
  console.log("PPTX successfully generated at:", outPath);
}

generateSlide().catch(err => {
  console.error("Error generating PPTX:", err);
  process.exit(1);
});
