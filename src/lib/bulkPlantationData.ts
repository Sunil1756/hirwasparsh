/**
 * Bulk plantation data ingestion: strict file-type detection, tabular/geo parsing,
 * column alias mapping and row-level validation.
 *
 * IMPORTANT: never read a file as text and parse it as CSV before the file kind
 * has been confirmed by BOTH extension and content signature.
 */
import * as XLSX from "xlsx";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint, polygon as turfPolygon } from "@turf/helpers";

export type FileKind = "csv" | "xlsx" | "xls" | "geojson" | "kml";

export const SUPPORTED_MESSAGE =
  "Unsupported file type. Please upload CSV, XLSX, XLS, GeoJSON or KML.";

export const ACCEPT_ATTR =
  ".csv,.xlsx,.xls,.geojson,.json,.kml,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/geo+json,application/vnd.google-earth.kml+xml";

type Detection = { kind: FileKind } | { kind: null; reason: string };

const startsWith = (bytes: Uint8Array, sig: number[]) =>
  sig.every((b, i) => bytes[i] === b);

const BINARY_BLOCKLIST: { sig: number[]; label: string }[] = [
  { sig: [0xff, 0xd8, 0xff], label: "JPEG image" },
  { sig: [0x89, 0x50, 0x4e, 0x47], label: "PNG image" },
  { sig: [0x47, 0x49, 0x46, 0x38], label: "GIF image" },
  { sig: [0x42, 0x4d], label: "BMP image" },
  { sig: [0x25, 0x50, 0x44, 0x46], label: "PDF document" },
  { sig: [0x1f, 0x8b], label: "GZIP archive" },
  { sig: [0x52, 0x61, 0x72, 0x21], label: "RAR archive" },
];

/** Detect the true file kind from extension + content signature. */
export async function detectFileKind(file: File): Promise<Detection> {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());

  // 1. Hard-block known binary formats regardless of extension.
  for (const b of BINARY_BLOCKLIST) {
    if (startsWith(head, b.sig)) return { kind: null, reason: `${b.label} detected` };
  }
  // RIFF....WEBP
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...head.slice(8, 12)) === "WEBP") {
    return { kind: null, reason: "WEBP image detected" };
  }

  const isZip = startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06]);
  const isOle = startsWith(head, [0xd0, 0xcf, 0x11, 0xe0]);

  if (ext === "xlsx") {
    return isZip ? { kind: "xlsx" } : { kind: null, reason: "Not a valid XLSX workbook" };
  }
  if (ext === "xls") {
    if (isOle) return { kind: "xls" };
    if (isZip) return { kind: "xlsx" };
    // Some ".xls" exports are really CSV/HTML text — fall through to text checks.
  } else if (isZip || isOle) {
    return { kind: null, reason: "Binary archive detected" };
  }

  // Anything left must be readable text.
  const text = new TextDecoder("utf-8", { fatal: false }).decode(head);
  if (/[\u0000-\u0008\u000E-\u001F]/.test(text)) {
    return { kind: null, reason: "Binary content detected" };
  }
  const trimmed = text.trimStart();

  if (ext === "kml" || /^<\?xml|<kml[\s>]/i.test(trimmed)) {
    if (/<kml[\s>]|<Placemark[\s>]/i.test(text) || ext === "kml") return { kind: "kml" };
    return { kind: null, reason: "XML file is not a KML document" };
  }
  if (ext === "geojson" || ext === "json" || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { kind: "geojson" };
  }
  if (ext === "csv" || ext === "txt" || ext === "tsv" || ext === "xls") {
    return { kind: "csv" };
  }
  return { kind: null, reason: `Unrecognised ".${ext || "?"}" file` };
}

/* ------------------------------------------------------------------ */
/* Column aliases                                                      */
/* ------------------------------------------------------------------ */

export const CANONICAL_FIELDS = [
  "tree_id",
  "latitude",
  "longitude",
  "species",
  "planting_date",
  "organization",
  "site",
  "status",
  "photo_url",
  "qr_id",
] as const;
export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

const ALIASES: Record<CanonicalField, string[]> = {
  tree_id: ["tree_id", "treeid", "id", "tree", "tree_no", "tree_number", "sapling_id"],
  latitude: ["latitude", "lat", "y", "lat_dd", "gps_lat"],
  longitude: ["longitude", "lng", "lon", "long", "x", "lng_dd", "gps_lng", "gps_lon"],
  species: ["species", "tree_species", "species_name", "plant", "plant_species", "botanical_name"],
  planting_date: ["planting_date", "plantation_date", "date", "planted_on", "planted_date", "date_planted"],
  organization: ["organization", "organisation", "org", "ngo", "agency", "department"],
  site: ["site", "location", "site_name", "village", "block", "plot", "area"],
  status: ["status", "verification_status", "state", "condition", "health"],
  photo_url: ["photo_url", "photo", "image", "image_url", "picture"],
  qr_id: ["qr_id", "qr", "qr_token", "qrcode", "qr_code"],
};

const normHeader = (h: string) =>
  h.toLowerCase().trim().replace(/[\s\-.]+/g, "_").replace(/[^a-z0-9_]/g, "");

export function mapHeaders(headers: string[]): Partial<Record<CanonicalField, string>> {
  const map: Partial<Record<CanonicalField, string>> = {};
  for (const field of CANONICAL_FIELDS) {
    const hit = headers.find((h) => ALIASES[field].includes(normHeader(h)));
    if (hit) map[field] = hit;
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Parsers                                                             */
/* ------------------------------------------------------------------ */

export type RawTable = { headers: string[]; rows: Record<string, string>[] };

/** RFC4180-ish CSV splitter with quote support and delimiter sniffing. */
function splitDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === delim) { row.push(cell); cell = ""; continue; }
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (c === "\r") continue;
    cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

function tableFromMatrix(matrix: string[][]): RawTable {
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = matrix[0].map((h, i) => (h.trim() || `column_${i + 1}`));
  const rows = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = String(cells[i] ?? "").trim(); });
    return row;
  });
  return { headers, rows };
}

async function parseCsvFile(file: File): Promise<RawTable> {
  return tableFromMatrix(splitDelimited(await file.text()));
}

async function parseWorkbook(file: File): Promise<RawTable> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
  return tableFromMatrix(matrix.map((r) => (r || []).map((c) => String(c ?? ""))));
}

function flattenProps(props: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(props || {}).forEach(([k, v]) => {
    out[k] = v == null || typeof v === "object" ? "" : String(v);
  });
  return out;
}

async function parseGeoJson(file: File): Promise<RawTable> {
  const json = JSON.parse(await file.text());
  const features: any[] = Array.isArray(json)
    ? json
    : json.type === "FeatureCollection"
      ? json.features || []
      : json.type === "Feature"
        ? [json]
        : [];
  if (!features.length) throw new Error("No features found in GeoJSON");
  const rows = features.map((f) => {
    const props = flattenProps(f.properties || {});
    const g = f.geometry;
    let lat = "", lng = "";
    if (g?.type === "Point" && Array.isArray(g.coordinates)) {
      lng = String(g.coordinates[0]);
      lat = String(g.coordinates[1]);
    }
    return { ...props, latitude: props.latitude || lat, longitude: props.longitude || lng };
  });
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return { headers, rows: rows.map((r) => { const o: Record<string, string> = {}; headers.forEach((h) => (o[h] = r[h] ?? "")); return o; }) };
}

async function parseKml(file: File): Promise<RawTable> {
  const doc = new DOMParser().parseFromString(await file.text(), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("KML file could not be parsed");
  const marks = Array.from(doc.getElementsByTagName("Placemark"));
  if (!marks.length) throw new Error("No Placemark entries found in KML");
  const rows = marks.map((pm, i) => {
    const name = pm.getElementsByTagName("name")[0]?.textContent?.trim() ?? `placemark_${i + 1}`;
    const desc = pm.getElementsByTagName("description")[0]?.textContent?.trim() ?? "";
    const coords = pm.getElementsByTagName("coordinates")[0]?.textContent?.trim() ?? "";
    const [lng, lat] = coords.split(/[\s,]+/);
    const row: Record<string, string> = {
      tree_id: name,
      latitude: lat ?? "",
      longitude: lng ?? "",
      species: "",
      notes: desc,
    };
    Array.from(pm.getElementsByTagName("SimpleData")).forEach((sd) => {
      const key = sd.getAttribute("name");
      if (key) row[key] = sd.textContent?.trim() ?? "";
    });
    Array.from(pm.getElementsByTagName("Data")).forEach((d) => {
      const key = d.getAttribute("name");
      const val = d.getElementsByTagName("value")[0]?.textContent?.trim() ?? "";
      if (key) row[key] = val;
    });
    return row;
  });
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return { headers, rows: rows.map((r) => { const o: Record<string, string> = {}; headers.forEach((h) => (o[h] = r[h] ?? "")); return o; }) };
}

export async function parseBulkFile(file: File): Promise<{ kind: FileKind; table: RawTable }> {
  const det = await detectFileKind(file);
  if (!det.kind) {
    const err = new Error(SUPPORTED_MESSAGE) as Error & { reason?: string };
    err.reason = (det as { reason: string }).reason;
    throw err;
  }
  const table =
    det.kind === "csv" ? await parseCsvFile(file)
      : det.kind === "xlsx" || det.kind === "xls" ? await parseWorkbook(file)
        : det.kind === "geojson" ? await parseGeoJson(file)
          : await parseKml(file);
  if (!table.headers.length || !table.rows.length) {
    throw new Error("The file has no data rows. Expected a header row plus at least one record.");
  }
  return { kind: det.kind, table };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type PlantationRecord = {
  row_number: number;
  tree_id: string;
  latitude: number | null;
  longitude: number | null;
  species: string;
  planting_date: string;
  organization: string;
  site: string;
  status: string;
  photo_url: string;
  qr_id: string;
  issues: string[];
  duplicate: boolean;
  outside_boundary: boolean;
  valid: boolean;
};

export type ValidationSummary = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  outside: number;
};

const parseDate = (v: string): string => {
  if (!v) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v.trim());
  if (dmy) {
    const d = dmy[1].padStart(2, "0"), m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? "__invalid__" : new Date(t).toISOString().slice(0, 10);
};

export function validateRecords(
  table: RawTable,
  boundary: [number, number][] = []
): { records: PlantationRecord[]; summary: ValidationSummary; map: Partial<Record<CanonicalField, string>> } {
  const map = mapHeaders(table.headers);
  const get = (row: Record<string, string>, f: CanonicalField) =>
    (map[f] ? row[map[f]!] ?? "" : "").toString().trim();

  let poly: ReturnType<typeof turfPolygon> | null = null;
  if (boundary.length >= 3) {
    try {
      const ring = [...boundary, boundary[0]].map(([lat, lng]) => [lng, lat]);
      poly = turfPolygon([ring]);
    } catch { poly = null; }
  }

  const seenIds = new Set<string>();
  const seenCoords = new Set<string>();

  const records: PlantationRecord[] = table.rows.map((row, i) => {
    const issues: string[] = [];
    const latRaw = get(row, "latitude");
    const lngRaw = get(row, "longitude");
    const species = get(row, "species");
    const dateRaw = get(row, "planting_date");
    const treeId = get(row, "tree_id");

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (!latRaw) issues.push("Missing latitude");
    else {
      const n = Number(latRaw);
      if (!Number.isFinite(n) || n < -90 || n > 90) issues.push("Invalid latitude");
      else latitude = n;
    }
    if (!lngRaw) issues.push("Missing longitude");
    else {
      const n = Number(lngRaw);
      if (!Number.isFinite(n) || n < -180 || n > 180) issues.push("Invalid longitude");
      else longitude = n;
    }
    if (!species) issues.push("Missing species");

    let planting_date = "";
    if (dateRaw) {
      const d = parseDate(dateRaw);
      if (d === "__invalid__") issues.push("Invalid date");
      else planting_date = d;
    }

    let duplicate = false;
    if (treeId) {
      const key = treeId.toLowerCase();
      if (seenIds.has(key)) { issues.push("Duplicate Tree ID"); duplicate = true; }
      else seenIds.add(key);
    }
    if (latitude !== null && longitude !== null) {
      const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      if (seenCoords.has(key)) { issues.push("Duplicate coordinates"); duplicate = true; }
      else seenCoords.add(key);
    }

    let outside_boundary = false;
    if (poly && latitude !== null && longitude !== null) {
      outside_boundary = !booleanPointInPolygon(turfPoint([longitude, latitude]), poly);
      if (outside_boundary) issues.push("Outside plantation boundary");
    }

    return {
      row_number: i + 2, // +1 header, +1 to be 1-indexed
      tree_id: treeId,
      latitude,
      longitude,
      species,
      planting_date,
      organization: get(row, "organization"),
      site: get(row, "site"),
      status: get(row, "status"),
      photo_url: get(row, "photo_url"),
      qr_id: get(row, "qr_id"),
      issues,
      duplicate,
      outside_boundary,
      valid: issues.length === 0,
    };
  });

  const summary: ValidationSummary = {
    total: records.length,
    valid: records.filter((r) => r.valid).length,
    invalid: records.filter((r) => !r.valid).length,
    duplicates: records.filter((r) => r.duplicate).length,
    outside: records.filter((r) => r.outside_boundary).length,
  };

  return { records, summary, map };
}

const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function buildErrorReportCsv(records: PlantationRecord[]): string {
  const header = ["row_number", "tree_id", "latitude", "longitude", "species", "planting_date", "issues"];
  const lines = records
    .filter((r) => !r.valid)
    .map((r) =>
      [
        String(r.row_number),
        r.tree_id,
        r.latitude === null ? "" : String(r.latitude),
        r.longitude === null ? "" : String(r.longitude),
        r.species,
        r.planting_date,
        r.issues.join("; "),
      ].map(csvEscape).join(",")
    );
  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
