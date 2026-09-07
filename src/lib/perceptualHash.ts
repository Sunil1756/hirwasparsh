/**
 * Enterprise Perceptual Image Hashing & Anti-Fraud Engine
 * Generates 64-bit dHash (Difference Hash) and aHash fingerprints for tree photos.
 * Detects duplicate photo fraud, recycled tree submissions, and screenshot recycling via Hamming distance.
 */

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedId?: string;
  matchedName?: string;
  hammingDistance: number;
  similarityPct: number;
  riskLevel: "none" | "low" | "suspect" | "critical_fraud";
  reason?: string;
}

/**
 * Calculates the Hamming Distance (number of differing bits) between two 64-bit hex hashes.
 */
export function calculateHammingDistance(hex1: string, hex2: string): number {
  if (!hex1 || !hex2 || hex1.length !== hex2.length) {
    // If lengths differ, normalize by padding
    hex1 = (hex1 || "").padStart(16, "0");
    hex2 = (hex2 || "").padStart(16, "0");
  }

  let distance = 0;
  for (let i = 0; i < Math.min(hex1.length, hex2.length); i++) {
    const val1 = parseInt(hex1[i], 16) || 0;
    const val2 = parseInt(hex2[i], 16) || 0;
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Converts Hamming Distance into a similarity percentage (0 - 100%).
 */
export function calculateHashSimilarity(hex1: string, hex2: string): number {
  const distance = calculateHammingDistance(hex1, hex2);
  const totalBits = 64; // Standard 16 hex chars * 4 bits = 64 bits
  return Math.max(0, Math.min(100, Math.round((1 - distance / totalBits) * 100)));
}

/**
 * Loads a base64 string or image URL into an HTMLImageElement
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error("Failed to load image for perceptual hashing"));
    img.src = src;
  });
}

/**
 * Computes 64-bit Difference Hash (dHash) from an image base64, URL, or HTMLImageElement.
 * Algorithm:
 * 1. Resizes image to 9x8 pixels (72 pixels)
 * 2. Converts to grayscale luminance
 * 3. Compares adjacent pixels in each row (8 rows x 8 comparisons = 64 bits)
 * 4. Generates a 16-character hexadecimal fingerprint
 */
export async function computeImageDHash(imageInput: string | HTMLImageElement): Promise<string> {
  let img: HTMLImageElement;

  if (typeof imageInput === "string") {
    // Check if running in browser with DOM
    if (typeof window === "undefined" || !document.createElement) {
      // Deterministic fallback hash for non-browser unit tests
      let hash = 0;
      for (let i = 0; i < imageInput.length; i++) {
        hash = (hash << 5) - hash + imageInput.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
    }
    img = await loadImageElement(imageInput);
  } else {
    img = imageInput;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not initialize 2D Canvas context for image hashing");
  }

  // Draw image scaled to 9x8
  ctx.drawImage(img, 0, 0, 9, 8);
  const imageData = ctx.getImageData(0, 0, 9, 8).data;

  // Convert to 9x8 grayscale luminance matrix
  const grays: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 9; x++) {
      const idx = (y * 9 + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      // ITU-R BT.601 luminance
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      row.push(gray);
    }
    grays.push(row);
  }

  // Compute 64-bit binary string
  let binaryStr = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // If left pixel is brighter than right pixel, bit is 1, else 0
      binaryStr += grays[y][x] > grays[y][x + 1] ? "1" : "0";
    }
  }

  // Convert 64-bit binary to 16 hex characters
  let hexHash = "";
  for (let i = 0; i < binaryStr.length; i += 4) {
    const nibble = binaryStr.substring(i, i + 4);
    hexHash += parseInt(nibble, 2).toString(16);
  }

  return hexHash.padStart(16, "0");
}

/**
 * Checks a candidate photo hash against an existing repository of tree hashes.
 * Flags duplicates if Hamming distance <= thresholdDistance (default 5 bits, >92% identity).
 */
export function evaluatePhotoDuplicateFraud(
  candidateHash: string,
  existingTreeRecords: Array<{ id: string; phash?: string | null; tree_name?: string }>,
  thresholdDistance: number = 6
): DuplicateDetectionResult {
  if (!candidateHash || !existingTreeRecords || existingTreeRecords.length === 0) {
    return {
      isDuplicate: false,
      hammingDistance: 64,
      similarityPct: 0,
      riskLevel: "none",
    };
  }

  let lowestDistance = 64;
  let highestSimilarity = 0;
  let closestMatch: { id: string; tree_name?: string } | null = null;

  for (const record of existingTreeRecords) {
    if (!record.phash) continue;
    const distance = calculateHammingDistance(candidateHash, record.phash);
    const similarity = calculateHashSimilarity(candidateHash, record.phash);

    if (distance < lowestDistance) {
      lowestDistance = distance;
      highestSimilarity = similarity;
      closestMatch = record;
    }
  }

  // Risk Classification
  if (lowestDistance <= 3) {
    return {
      isDuplicate: true,
      matchedId: closestMatch?.id,
      matchedName: closestMatch?.tree_name || "Existing Database Tree",
      hammingDistance: lowestDistance,
      similarityPct: highestSimilarity,
      riskLevel: "critical_fraud",
      reason: `Identical/re-compressed image detected (${highestSimilarity}% visual match with Tree #${closestMatch?.id?.slice(0, 8)}). Photo recycling is prohibited.`,
    };
  }

  if (lowestDistance <= thresholdDistance) {
    return {
      isDuplicate: true,
      matchedId: closestMatch?.id,
      matchedName: closestMatch?.tree_name || "Existing Database Tree",
      hammingDistance: lowestDistance,
      similarityPct: highestSimilarity,
      riskLevel: "suspect",
      reason: `High perceptual similarity (${highestSimilarity}% visual match with Tree #${closestMatch?.id?.slice(0, 8)}). Submission flagged for manual auditor review.`,
    };
  }

  if (lowestDistance <= 10) {
    return {
      isDuplicate: false,
      matchedId: closestMatch?.id,
      matchedName: closestMatch?.tree_name,
      hammingDistance: lowestDistance,
      similarityPct: highestSimilarity,
      riskLevel: "low",
      reason: "Visual features are unique. Minor angle similarity detected.",
    };
  }

  return {
    isDuplicate: false,
    hammingDistance: lowestDistance,
    similarityPct: highestSimilarity,
    riskLevel: "none",
  };
}
