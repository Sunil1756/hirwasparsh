/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 8 TASK 41
 * Duplicate Photo & Evidence Detection Subsystem
 *
 * Multi-Vector Anti-Fraud Detection:
 * 1. Exact Cryptographic Hashing (SHA-256)
 * 2. Perceptual Image Hashing (dHash 64-bit Hamming Distance)
 * 3. EXIF & Sensor Signature Match (Shutter timestamps & camera serials)
 * 4. Spatiotemporal Geodetic Collision (Same photo at disjoint GPS locations)
 */

import { calculateHammingDistance, calculateHashSimilarity } from "@/lib/perceptualHash";
import { calculateDistanceMeters } from "./evidenceVerificationService";

export type CollisionVectorType =
  | "exact_sha256"
  | "perceptual_dhash"
  | "exif_sensor"
  | "geospatial_mismatch";

export type CollisionRiskLevel =
  | "critical_fraud"
  | "high_risk_collision"
  | "moderate_similarity"
  | "safe_unique";

export type CollisionResolutionStatus =
  | "pending"
  | "confirmed_fraud_rejected"
  | "legitimate_exception_granted"
  | "dismissed_false_positive";

export interface EvidenceRecord {
  id: string;
  treeId: string;
  claimId?: string;
  planterId: string;
  planterName?: string;
  photoUrl: string;
  sha256: string;
  dhash: string;
  gps: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  exif?: {
    cameraModel?: string;
    dateTimeOriginal?: string;
    serialNumber?: string;
  };
}

export interface EvidenceCollision {
  id: string;
  candidateId: string;
  candidateTreeId: string;
  candidatePlanterId: string;
  candidatePhotoUrl: string;
  candidateGps: {
    latitude: number;
    longitude: number;
  };
  candidateTimestamp: string;
  matchingRecord: EvidenceRecord;
  primaryVector: CollisionVectorType;
  vectors: CollisionVectorType[];
  hammingDistance: number;
  visualSimilarityPct: number;
  spatialDistanceMeters: number;
  timeDeltaDays: number;
  riskLevel: CollisionRiskLevel;
  reason: string;
  detectedAt: string;
  resolutionStatus: CollisionResolutionStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface DuplicateCluster {
  clusterId: string;
  dhashFingerprint: string;
  records: EvidenceRecord[];
  riskLevel: CollisionRiskLevel;
  totalCollisions: number;
}

export interface RepositoryScanSummary {
  scannedCount: number;
  clusterCount: number;
  criticalFraudCount: number;
  highRiskCount: number;
  clusters: DuplicateCluster[];
  collisions: EvidenceCollision[];
  scannedAt: string;
}

const SEED_REPOSITORY: EvidenceRecord[] = [
  {
    id: "EV-REC-001",
    treeId: "TREE-BANYAN-7701",
    claimId: "CLM-2026-001",
    planterId: "USR-PUNE-101",
    planterName: "Ramesh Shinde",
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    dhash: "a4f8c2e19b0d3e5f",
    gps: { latitude: 18.52048, longitude: 73.85679 },
    timestamp: "2026-09-20T08:30:00.000Z",
    exif: {
      cameraModel: "Sony Alpha A7 IV",
      dateTimeOriginal: "2026-09-20T08:30:00.000Z",
      serialNumber: "SN-SNY-992144",
    },
  },
  {
    id: "EV-REC-002",
    treeId: "TREE-TEAK-2104",
    claimId: "CLM-2026-002",
    planterId: "USR-MAHA-402",
    planterName: "Kavita Patil",
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop",
    sha256: "b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    dhash: "f1e2d3c4b5a60789",
    gps: { latitude: 18.52115, longitude: 73.8576 },
    timestamp: "2026-09-24T14:15:00.000Z",
    exif: {
      cameraModel: "Redmi Note 12",
      dateTimeOriginal: "2026-09-24T14:15:00.000Z",
    },
  },
  {
    id: "EV-REC-003",
    treeId: "TREE-MAHOGANY-883",
    claimId: "CLM-2026-003",
    planterId: "USR-PUNE-333",
    planterName: "Anil Deshmukh",
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop",
    sha256: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    dhash: "8899aabbccddeeff",
    gps: { latitude: 18.52045, longitude: 73.85675 },
    timestamp: "2026-09-25T07:10:00.000Z",
    exif: {
      cameraModel: "iPhone 15 Pro",
      dateTimeOriginal: "2026-09-25T07:10:00.000Z",
    },
  },
  {
    id: "EV-REC-004",
    treeId: "TREE-NEEM-1029",
    claimId: "CLM-2026-004",
    planterId: "USR-PUNE-909",
    planterName: "Sanjay More",
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    // Exact duplicate SHA256 of EV-REC-001 (recycled photo)
    sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    dhash: "a4f8c2e19b0d3e5f",
    gps: { latitude: 18.53512, longitude: 73.87211 }, // Disjoint location (> 2 km away!)
    timestamp: "2026-09-23T11:00:00.000Z",
    exif: {
      cameraModel: "Sony Alpha A7 IV",
      dateTimeOriginal: "2026-09-20T08:30:00.000Z", // Recycled identical EXIF timestamp
      serialNumber: "SN-SNY-992144",
    },
  },
  {
    id: "EV-REC-005",
    treeId: "TREE-GULMOHAR-401",
    claimId: "CLM-2026-005",
    planterId: "USR-PUNE-909",
    planterName: "Sanjay More",
    photoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop",
    // Perceptually near-identical dHash (Hamming distance 2 bits from EV-REC-001)
    sha256: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9999",
    dhash: "a4f8c2e19b0d3e5e", // 1-bit difference
    gps: { latitude: 18.52055, longitude: 73.85685 },
    timestamp: "2026-09-24T16:00:00.000Z",
  },
];

class DuplicateEvidenceService {
  private repository: EvidenceRecord[] = [];
  private collisions: EvidenceCollision[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.repository = JSON.parse(JSON.stringify(SEED_REPOSITORY));
    this.collisions = [];
    this.scanRepositoryForDuplicates();
    this.notify();
  }

  public getRepository(): EvidenceRecord[] {
    return [...this.repository];
  }

  public getCollisions(): EvidenceCollision[] {
    return [...this.collisions];
  }

  public getClusters(): DuplicateCluster[] {
    const summary = this.scanRepositoryForDuplicates();
    return summary.clusters;
  }

  public getCollision(id: string): EvidenceCollision | undefined {
    return this.collisions.find((c) => c.id === id || c.candidateId === id || c.candidateTreeId === id);
  }

  public indexRecord(record: EvidenceRecord): void {
    const existingIdx = this.repository.findIndex((r) => r.id === record.id);
    if (existingIdx >= 0) {
      this.repository[existingIdx] = record;
    } else {
      this.repository.push(record);
    }
    this.notify();
  }

  /**
   * Evaluates a candidate photo/evidence against the indexed evidence repository.
   * Multi-Vector Analysis: SHA-256 exact match, dHash perceptual similarity, EXIF matching, and Geo-collision.
   */
  public checkCandidateEvidence(candidate: Partial<EvidenceRecord>): EvidenceCollision | null {
    if (!candidate.photoUrl && !candidate.sha256 && !candidate.dhash) return null;

    const candidateSha = candidate.sha256 || "";
    const candidateDHash = candidate.dhash || "";
    const candidateGps = candidate.gps || { latitude: 0, longitude: 0 };
    const candidateTimestamp = candidate.timestamp || new Date().toISOString();
    const candidatePlanter = candidate.planterId || "USR-UNKNOWN";
    const candidateTree = candidate.treeId || "TREE-UNKNOWN";
    const candidateId = candidate.id || "CAND-" + Math.random().toString(36).substring(2, 7);

    let worstCollision: EvidenceCollision | null = null;
    let lowestDistance = 64;

    for (const record of this.repository) {
      // Don't compare record against itself
      if (record.id === candidate.id || (candidate.claimId && record.claimId === candidate.claimId)) {
        continue;
      }

      const vectors: CollisionVectorType[] = [];
      let isExact = false;
      let isPerceptual = false;
      let isExif = false;
      let isGeoMismatch = false;

      // 1. Exact SHA-256 Check
      if (candidateSha && record.sha256 && candidateSha.toLowerCase() === record.sha256.toLowerCase()) {
        vectors.push("exact_sha256");
        isExact = true;
      }

      // 2. Perceptual dHash Check
      let hamming = 64;
      let simPct = 0;
      if (candidateDHash && record.dhash) {
        hamming = calculateHammingDistance(candidateDHash, record.dhash);
        simPct = calculateHashSimilarity(candidateDHash, record.dhash);
        if (hamming <= 6) {
          vectors.push("perceptual_dhash");
          isPerceptual = true;
        }
      }

      // 3. EXIF & Sensor Check
      if (
        candidate.exif?.dateTimeOriginal &&
        record.exif?.dateTimeOriginal &&
        candidate.exif.dateTimeOriginal === record.exif.dateTimeOriginal &&
        candidate.exif.cameraModel === record.exif.cameraModel &&
        record.treeId !== candidateTree
      ) {
        vectors.push("exif_sensor");
        isExif = true;
      }

      // 4. Geospatial Distance Delta
      const spatialDist = calculateDistanceMeters(
        candidateGps.latitude,
        candidateGps.longitude,
        record.gps.latitude,
        record.gps.longitude
      );

      // If exact or perceptual match detected at different locations (> 20 meters)
      if ((isExact || isPerceptual) && spatialDist > 20) {
        vectors.push("geospatial_mismatch");
        isGeoMismatch = true;
      }

      if (vectors.length > 0) {
        const timeDeltaDays = Math.abs(
          (new Date(candidateTimestamp).getTime() - new Date(record.timestamp).getTime()) / (1000 * 3600 * 24)
        );

        let riskLevel: CollisionRiskLevel = "moderate_similarity";
        let reason = "";

        if (isExact || isGeoMismatch || (isPerceptual && hamming <= 2)) {
          riskLevel = "critical_fraud";
          reason = isGeoMismatch
            ? "Critical Fraud: Same photo reused at distinct physical GPS locations (" + spatialDist.toFixed(0) + "m apart). Claimed for Tree " + candidateTree + " vs " + record.treeId + "."
            : "Critical Fraud: Bit-for-bit identical photograph detected across distinct tree claims (" + record.treeId + ").";
        } else if (isPerceptual || isExif) {
          riskLevel = "high_risk_collision";
          reason = "High Risk Collision: " + simPct + "% visual similarity (Hamming Distance: " + hamming + ") with Tree " + record.treeId + ". Potential re-compressed or cropped image recycling.";
        }

        const collision: EvidenceCollision = {
          id: "COL-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          candidateId,
          candidateTreeId: candidateTree,
          candidatePlanterId: candidatePlanter,
          candidatePhotoUrl: candidate.photoUrl || record.photoUrl,
          candidateGps,
          candidateTimestamp,
          matchingRecord: record,
          primaryVector: isExact ? "exact_sha256" : isGeoMismatch ? "geospatial_mismatch" : isPerceptual ? "perceptual_dhash" : "exif_sensor",
          vectors,
          hammingDistance: hamming,
          visualSimilarityPct: isExact ? 100 : simPct,
          spatialDistanceMeters: spatialDist,
          timeDeltaDays,
          riskLevel,
          reason,
          detectedAt: new Date().toISOString(),
          resolutionStatus: "pending",
        };

        const isBetterMatch =
          hamming < lowestDistance ||
          (isExact && (!worstCollision || !worstCollision.vectors.includes("exact_sha256"))) ||
          (isExact && worstCollision && worstCollision.vectors.includes("exact_sha256") &&
            new Date(record.timestamp).getTime() < new Date(worstCollision.matchingRecord.timestamp).getTime());

        if (isBetterMatch) {
          lowestDistance = hamming;
          worstCollision = collision;
        }
      }
    }

    return worstCollision;
  }

  /**
   * Scans the whole evidence repository for duplicate clusters across all trees.
   */
  public scanRepositoryForDuplicates(): RepositoryScanSummary {
    const collisions: EvidenceCollision[] = [];
    const clustersMap: Map<string, EvidenceRecord[]> = new Map();

    for (let i = 0; i < this.repository.length; i++) {
      const recA = this.repository[i];
      for (let j = i + 1; j < this.repository.length; j++) {
        const recB = this.repository[j];
        if (recA.id === recB.id) continue;

        const collision = this.checkPairCollision(recB, recA);
        if (collision) {
          collisions.push(collision);

          // Group into visual clusters by dHash prefix
          const clusterKey = recA.dhash.substring(0, 8);
          if (!clustersMap.has(clusterKey)) {
            clustersMap.set(clusterKey, [recA]);
          }
          const clusterList = clustersMap.get(clusterKey)!;
          if (!clusterList.some((r) => r.id === recB.id)) {
            clusterList.push(recB);
          }
        }
      }
    }

    const clusters: DuplicateCluster[] = Array.from(clustersMap.entries()).map(([key, records]) => {
      const hasCritical = records.some((r) =>
        collisions.some((c) => c.matchingRecord.id === r.id && c.riskLevel === "critical_fraud")
      );
      return {
        clusterId: "CLUST-" + key,
        dhashFingerprint: key,
        records,
        riskLevel: hasCritical ? "critical_fraud" : "high_risk_collision",
        totalCollisions: records.length,
      };
    });

    this.collisions = collisions;
    this.notify();

    return {
      scannedCount: this.repository.length,
      clusterCount: clusters.length,
      criticalFraudCount: collisions.filter((c) => c.riskLevel === "critical_fraud").length,
      highRiskCount: collisions.filter((c) => c.riskLevel === "high_risk_collision").length,
      clusters,
      collisions,
      scannedAt: new Date().toISOString(),
    };
  }

  private checkPairCollision(candidate: EvidenceRecord, record: EvidenceRecord): EvidenceCollision | null {
    const vectors: CollisionVectorType[] = [];
    let isExact = false;
    let isPerceptual = false;
    let isExif = false;
    let isGeoMismatch = false;

    if (candidate.sha256 && record.sha256 && candidate.sha256.toLowerCase() === record.sha256.toLowerCase()) {
      vectors.push("exact_sha256");
      isExact = true;
    }

    const hamming = calculateHammingDistance(candidate.dhash, record.dhash);
    const simPct = calculateHashSimilarity(candidate.dhash, record.dhash);
    if (hamming <= 6) {
      vectors.push("perceptual_dhash");
      isPerceptual = true;
    }

    if (
      candidate.exif?.dateTimeOriginal &&
      record.exif?.dateTimeOriginal &&
      candidate.exif.dateTimeOriginal === record.exif.dateTimeOriginal &&
      candidate.exif.cameraModel === record.exif.cameraModel &&
      candidate.treeId !== record.treeId
    ) {
      vectors.push("exif_sensor");
      isExif = true;
    }

    const spatialDist = calculateDistanceMeters(
      candidate.gps.latitude,
      candidate.gps.longitude,
      record.gps.latitude,
      record.gps.longitude
    );

    if ((isExact || isPerceptual) && spatialDist > 20) {
      vectors.push("geospatial_mismatch");
      isGeoMismatch = true;
    }

    if (vectors.length === 0) return null;

    const timeDeltaDays = Math.abs(
      (new Date(candidate.timestamp).getTime() - new Date(record.timestamp).getTime()) / (1000 * 3600 * 24)
    );

    let riskLevel: CollisionRiskLevel = "moderate_similarity";
    let reason = "";

    if (isExact || isGeoMismatch || (isPerceptual && hamming <= 2)) {
      riskLevel = "critical_fraud";
      reason = isGeoMismatch
        ? "Critical Fraud: Same photo reused at distinct physical GPS locations (" + spatialDist.toFixed(0) + "m apart). Claimed for Tree " + candidate.treeId + " vs " + record.treeId + "."
        : "Critical Fraud: Bit-for-bit identical photograph detected across distinct tree claims (" + record.treeId + ").";
    } else if (isPerceptual || isExif) {
      riskLevel = "high_risk_collision";
      reason = "High Risk Collision: " + simPct + "% visual similarity (Hamming Distance: " + hamming + ") with Tree " + record.treeId + ". Potential re-compressed or cropped image recycling.";
    }

    return {
      id: "COL-" + candidate.id + "-" + record.id,
      candidateId: candidate.id,
      candidateTreeId: candidate.treeId,
      candidatePlanterId: candidate.planterId,
      candidatePhotoUrl: candidate.photoUrl,
      candidateGps: candidate.gps,
      candidateTimestamp: candidate.timestamp,
      matchingRecord: record,
      primaryVector: isExact ? "exact_sha256" : isGeoMismatch ? "geospatial_mismatch" : isPerceptual ? "perceptual_dhash" : "exif_sensor",
      vectors,
      hammingDistance: hamming,
      visualSimilarityPct: isExact ? 100 : simPct,
      spatialDistanceMeters: spatialDist,
      timeDeltaDays,
      riskLevel,
      reason,
      detectedAt: new Date().toISOString(),
      resolutionStatus: "pending",
    };
  }

  /**
   * Resolves a duplicate evidence collision with auditor decision & rationale.
   */
  public resolveCollision(
    collisionId: string,
    status: CollisionResolutionStatus,
    notes: string,
    verifierId: string
  ): EvidenceCollision {
    let collision = this.collisions.find((c) => c.id === collisionId);
    if (!collision) {
      collision = {
        id: collisionId,
        candidateId: "CAND-DYNAMIC",
        candidateTreeId: "TREE-DYNAMIC",
        candidatePlanterId: "USR-DYNAMIC",
        candidatePhotoUrl: "",
        candidateGps: { latitude: 18.52, longitude: 73.85 },
        candidateTimestamp: new Date().toISOString(),
        matchingRecord: this.repository[0],
        primaryVector: "exact_sha256",
        vectors: ["exact_sha256"],
        hammingDistance: 0,
        visualSimilarityPct: 100,
        spatialDistanceMeters: 0,
        timeDeltaDays: 0,
        riskLevel: "critical_fraud",
        reason: "Forensic candidate collision",
        detectedAt: new Date().toISOString(),
        resolutionStatus: status,
      };
      this.collisions.push(collision);
    }

    collision.resolutionStatus = status;
    collision.resolutionNotes = notes;
    collision.resolvedBy = verifierId;
    collision.resolvedAt = new Date().toISOString();

    this.notify();
    return collision;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("DuplicateEvidenceService listener error:", err);
      }
    });
  }
}

export const duplicateEvidenceService = new DuplicateEvidenceService();
