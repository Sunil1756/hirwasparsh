import { supabase } from "@/integrations/supabase/client";

export interface TreeBulkRow {
  id?: string;
  tree_name: string;
  species: string;
  location: string;
  latitude: number;
  longitude: number;
  height_cm?: number;
  dbh_cm?: number;
  plantation_date: string;
  planted_by?: string;
  project_name?: string;
  isValid?: boolean;
  errors?: string[];
}

export const SAMPLE_CSV_TEMPLATE = `tree_name,species,latitude,longitude,location,height_cm,dbh_cm,plantation_date,planted_by,project_name
Neem #001,Neem (Azadirachta indica),18.5204,73.8567,Pune Agro Park,45,4.2,2026-06-15,Ramesh Patil,Maharashtra Green Mission 2026
Teak #002,Teak (Tectona grandis),18.5218,73.8589,Pune Agro Park,60,5.8,2026-06-15,Sunita Deshmukh,Maharashtra Green Mission 2026
Banyan #003,Banyan (Ficus benghalensis),18.5235,73.8601,Pune Agro Park,85,8.1,2026-06-15,CSR Volunteer Team,Maharashtra Green Mission 2026
Peepal #004,Peepal (Ficus religiosa),18.5190,73.8540,Pune Agro Park,50,4.9,2026-06-15,Vikas Gaikwad,Maharashtra Green Mission 2026
Bamboo #005,Bamboo (Bambusa vulgaris),18.5250,73.8620,Pune Agro Park,120,6.0,2026-06-15,Eco Club,Maharashtra Green Mission 2026`;

/**
 * Downloads a sample CSV file formatted for instant bulk tree onboarding.
 */
export function downloadSampleCsvTemplate() {
  const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "green_enlightenment_tree_bulk_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw CSV text handling quotes and commas.
 */
function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex for CSV with quotes support
    const matches = line.match(/(?:[^\s",]+|"[^"]*")+/g) || line.split(",");
    const values = matches.map((v) => v.trim().replace(/^["']|["']$/g, ""));

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] || "";
    });
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Parses and validates an uploaded CSV file.
 */
export async function parseBulkFile(file: File): Promise<TreeBulkRow[]> {
  const text = await file.text();
  const rawRows = parseCsvText(text);

  if (rawRows.length === 0) {
    throw new Error("The uploaded CSV file is empty or could not be parsed.");
  }

  return rawRows.map((row, index) => {
    const errors: string[] = [];

    const tree_name = (row.tree_name || row["tree name"] || `Tree #${index + 1}`).trim();
    const species = (row.species || row["tree species"] || "Mixed Native Tree").trim();
    const location = (row.location || row["plot"] || row["village"] || "Maharashtra Plantation Site").trim();
    const planted_by = (row.planted_by || row["planter"] || row["beneficiary"] || "CSR Volunteer").trim();
    const project_name = (row.project_name || row["project"] || "Community Agroforestry Drive").trim();

    // Lat / Lng Parsing
    const rawLat = parseFloat(row.latitude || row["lat"]);
    const rawLng = parseFloat(row.longitude || row["lng"] || row["lon"]);

    if (isNaN(rawLat) || rawLat < -90 || rawLat > 90) {
      errors.push("Invalid Latitude (-90 to +90)");
    }
    if (isNaN(rawLng) || rawLng < -180 || rawLng > 180) {
      errors.push("Invalid Longitude (-180 to +180)");
    }

    // Height & DBH
    const height_cm = parseFloat(row.height_cm || row["height"]) || 45;
    const dbh_cm = parseFloat(row.dbh_cm || row["dbh"]) || 4.5;

    // Date
    let plantation_date = (row.plantation_date || row["date"] || "").trim();
    if (!plantation_date || isNaN(Date.parse(plantation_date))) {
      plantation_date = new Date().toISOString().split("T")[0];
    }

    const isValid = errors.length === 0;

    return {
      tree_name,
      species,
      location,
      latitude: isNaN(rawLat) ? 19.7515 : rawLat,
      longitude: isNaN(rawLng) ? 75.7139 : rawLng,
      height_cm,
      dbh_cm,
      plantation_date,
      planted_by,
      project_name,
      isValid,
      errors,
    };
  });
}

/**
 * Commits valid parsed tree rows in batches into Supabase.
 */
export async function commitBulkTreesToSupabase(
  rows: TreeBulkRow[],
  userId?: string,
  onProgress?: (progress: number, total: number) => void
): Promise<{ successCount: number; failedCount: number; insertedIds: string[] }> {
  const validRows = rows.filter((r) => r.isValid !== false);
  const insertedIds: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const chunk = validRows.slice(i, i + BATCH_SIZE);

    const payload = chunk.map((r) => ({
      user_id: userId || null,
      tree_name: r.tree_name,
      species: r.species,
      location: r.location,
      latitude: r.latitude,
      longitude: r.longitude,
      height_cm: r.height_cm || 45,
      plantation_date: r.plantation_date,
      verification_status: "verified",
      admin_status: "approved",
      ai_confidence: 95,
      notes: `Batch Imported. DBH: ${r.dbh_cm}cm. Planter: ${r.planted_by}. Project: ${r.project_name}`,
    }));

    const { data, error } = await supabase.from("trees").insert(payload).select("id");

    if (error) {
      console.error("Batch insert error:", error);
      failedCount += chunk.length;
    } else {
      successCount += chunk.length;
      if (data) {
        data.forEach((d) => insertedIds.push(d.id));
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, validRows.length), validRows.length);
    }
  }

  return { successCount, failedCount, insertedIds };
}
