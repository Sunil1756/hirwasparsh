// Client-side image compression + hashing utilities.
// - compressImage: canvas resize to max 1200px width, JPEG quality 0.75
// - sha256File: SHA-256 hash of any Blob/File, hex encoded

export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  const nameBase = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${nameBase}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function sha256File(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export interface ImageQualityMetrics {
  isValid: boolean;
  reason?: string;
  meanLuminance: number; // 0 to 255
  foliageGreenRatio: number; // 0.0 to 1.0
  skyRatio: number; // 0.0 to 1.0
  silhouetteRatio: number; // 0.0 to 1.0
}

/**
 * Rapid client-side canvas pre-flight scan to detect underexposed, silhouette,
 * night, or sky-dominated photos BEFORE calling cloud AI vision.
 */
export async function inspectImageQualityForBotanicalVerification(
  file: File | Blob
): Promise<ImageQualityMetrics> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      isValid: true,
      meanLuminance: 128,
      foliageGreenRatio: 0.5,
      skyRatio: 0.1,
      silhouetteRatio: 0.0,
    };
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    // Downscale to 160x120 for instant 10ms pixel scan
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        isValid: true,
        meanLuminance: 128,
        foliageGreenRatio: 0.5,
        skyRatio: 0.1,
        silhouetteRatio: 0.0,
      };
    }

    ctx.drawImage(img, 0, 0, 160, 120);
    const imgData = ctx.getImageData(0, 0, 160, 120).data;
    const totalPixels = 160 * 120;

    let totalLuminance = 0;
    let darkSilhouettePixels = 0;
    let brightSkyPixels = 0;
    let foliageGreenPixels = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;

      // Dark silhouette pixel: near black in high contrast
      if (lum < 32) {
        darkSilhouettePixels++;
      }

      // Bright sky / horizon pixel: high luminance with blue-neutral dominance
      if (lum > 115 && b >= r * 0.9) {
        brightSkyPixels++;
      }

      // Living foliar green: green channel distinctly dominates under daylight
      if (g > 35 && g > r * 1.12 && g > b * 1.10 && lum > 25) {
        foliageGreenPixels++;
      }
    }

    const meanLuminance = Math.round(totalLuminance / totalPixels);
    const silhouetteRatio = Math.round((darkSilhouettePixels / totalPixels) * 100) / 100;
    const skyRatio = Math.round((brightSkyPixels / totalPixels) * 100) / 100;
    const foliageGreenRatio = Math.round((foliageGreenPixels / totalPixels) * 100) / 100;

    // RULE 1: Extreme underexposure / Night
    if (meanLuminance < 30) {
      return {
        isValid: false,
        reason: "Image is too dark or underexposed (night / low light). Botanical leaf morphology and chlorophyll health cannot be verified without daylight illumination.",
        meanLuminance,
        foliageGreenRatio,
        skyRatio,
        silhouetteRatio,
      };
    }

    // RULE 2: Twilight / Sunset Silhouette (Dark foliage against bright sky)
    if (silhouetteRatio >= 0.45 && foliageGreenRatio < 0.02 && skyRatio >= 0.55) {
      return {
        isValid: false,
        reason: "Silhouette photo detected. The tree foliage appears as an underexposed dark silhouette against the sky, obscuring leaf serrations, leaf margins, and chlorophyll color. Please take a front-lit photograph under daylight.",
        meanLuminance,
        foliageGreenRatio,
        skyRatio,
        silhouetteRatio,
      };
    }

    // RULE 3: Sky / Horizon Dominated (No foreground tree specimen)
    if (skyRatio > 0.80 && foliageGreenRatio < 0.02 && silhouetteRatio < 0.15) {
      return {
        isValid: false,
        reason: "Image is dominated by sky/horizon with no clearly distinguishable tree specimen in the foreground. Please upload a clear photo of the in-ground planted sapling.",
        meanLuminance,
        foliageGreenRatio,
        skyRatio,
        silhouetteRatio,
      };
    }

    return {
      isValid: true,
      meanLuminance,
      foliageGreenRatio,
      skyRatio,
      silhouetteRatio,
    };
  } catch {
    return {
      isValid: true,
      meanLuminance: 128,
      foliageGreenRatio: 0.5,
      skyRatio: 0.1,
      silhouetteRatio: 0.0,
    };
  }
}



/**
 * Fast client-side image downscaler for cloud vision models.
 * Shrinks massive camera photos (12MP-48MP, 5MB-15MB) down to max 900px (~80-120KB) in 20ms,
 * speeding up cloud AI uploads by over 90% and reducing API processing latency.
 */
export async function optimizeBase64ForVision(
  base64OrDataUrl: string,
  maxDimension = 900,
  quality = 0.75
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof Image === "undefined") {
    return base64OrDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const cleanB64 = base64OrDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
  if (cleanB64.length < 200000) {
    return cleanB64;
  }

  return new Promise((resolve) => {
    try {
      const src = base64OrDataUrl.startsWith("data:")
        ? base64OrDataUrl
        : `data:image/jpeg;base64,${cleanB64}`;

      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          if (scale >= 1) {
            resolve(cleanB64);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(cleanB64);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl.split(",")[1] || cleanB64);
        } catch {
          resolve(cleanB64);
        }
      };
      img.onerror = () => resolve(cleanB64);
      img.src = src;
    } catch {
      resolve(cleanB64);
    }
  });
}
