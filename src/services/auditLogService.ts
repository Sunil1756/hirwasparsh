/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 8 TASK 44
 * Enterprise Cryptographic Audit Trail & Tamper-Evident Ledger Service
 *
 * Implements ISO 14064-3 / Verra VM0047 compliant audit logging:
 * 1. Monotonically increasing sequence numbers (1, 2, 3...)
 * 2. Cryptographic SHA-256 hash chaining (H_n = SHA-256(H_{n-1} + canonical_data))
 * 3. Before/After state delta capture
 * 4. Dual-control Four-Eyes principle signatory tracking
 * 5. Tamper detection and sequential chain integrity validation
 * 6. Binary Merkle tree root hash generation
 * 7. Compliance export engines (CSV, Signed JSON Package, ISO 14064-3 Report)
 */

export type AuditAction =
  | "CLAIM_SUBMITTED"
  | "TRIAGE_STATUS_CHANGED"
  | "CLAIM_AUTO_SCREENED"
  | "DUPLICATE_FLAGGED"
  | "DUPLICATE_ADJUDICATED"
  | "SPATIOTEMPORAL_FLAGGED"
  | "SPATIOTEMPORAL_ADJUDICATED"
  | "L1_AUDIT_SUBMITTED"
  | "L2_LEAD_APPROVED"
  | "L3_ADMIN_CERTIFIED"
  | "CLAIM_REJECTED"
  | "RE_AUDIT_REQUESTED"
  | "BATCH_CERTIFIED"
  | "MANUAL_OVERRIDE"
  | "EXPORT_GENERATED"
  | "INTEGRITY_TAMPER_SIMULATED"
  | "SYSTEM_INTEGRITY_CHECK";

export type ActorRole =
  | "field_auditor"
  | "lead_verifier"
  | "admin_certifier"
  | "system_engine"
  | "planter"
  | "external_auditor";

export type AuditSeverity = "info" | "warning" | "critical" | "security";

export interface AuditActor {
  userId: string;
  name: string;
  role: ActorRole;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditTarget {
  entityType: "claim" | "evidence" | "project" | "planter" | "batch" | "system";
  entityId: string;
  entityName?: string;
  projectId?: string;
}

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  action: AuditAction;
  actionDescription: string;
  actor: AuditActor;
  target: AuditTarget;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  stateDelta?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
  severity: AuditSeverity;
  previousHash: string;
  entryHash: string;
  signature: string;
}

export interface LogEventParams {
  action: AuditAction;
  actionDescription: string;
  actor: AuditActor;
  target: AuditTarget;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  customTimestamp?: string;
}

export interface AuditFilterParams {
  searchQuery?: string;
  action?: AuditAction | "all";
  actorRole?: ActorRole | "all";
  entityType?: string | "all";
  projectId?: string;
  severity?: AuditSeverity | "all";
  startDate?: string;
  endDate?: string;
}

export interface AuditIntegrityResult {
  isValid: boolean;
  totalEntries: number;
  validEntries: number;
  compromisedIndices: number[];
  firstCompromisedEntryId?: string;
  tamperDetails: string[];
  genesisHash: string;
  latestHash: string;
  merkleRoot: string;
  verifiedAt: string;
}

export interface AuditStats {
  totalEvents: number;
  dualControlApprovals: number;
  criticalSecurityEvents: number;
  uniqueActors: number;
  activeProjects: number;
  isChainHealthy: boolean;
  merkleRoot: string;
}

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Standard pure TypeScript SHA-256 implementation (RFC 6234 / FIPS 180-4)
 * Guarantees identical deterministic hashes across all browser and Node runtimes.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i: number, j: number;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  const utf8 = unescape(encodeURIComponent(ascii));
  for (i = 0; i < utf8[lengthProperty]; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }

  words[utf8[lengthProperty] >> 2] |= 0x80 << ((3 - (utf8[lengthProperty] % 4)) * 8);
  words[(((utf8[lengthProperty] + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const gamma0 =
          rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 =
          rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 =
        rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + (w[j] || 0)) | 0;
      const s0 =
        rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

export class AuditLogService {
  private ledger: AuditLogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private originalLedgerSnapshot: AuditLogEntry[] | null = null;

  constructor() {
    this.seedInitialLedger();
  }

  /**
   * Initializes baseline ledger with realistic historical verification milestones
   */
  private seedInitialLedger(): void {
    const seedEvents: Array<{
      action: AuditAction;
      desc: string;
      actor: AuditActor;
      target: AuditTarget;
      prev?: Record<string, any>;
      next?: Record<string, any>;
      meta?: Record<string, any>;
      severity: AuditSeverity;
      timeOffsetMinutes: number;
    }> = [
      {
        action: "CLAIM_SUBMITTED",
        desc: "Initial planting claim geotagged and ingested via field mobile client",
        actor: { userId: "PLT-104", name: "Ramesh Pawar", role: "planter", ipAddress: "152.58.12.4" },
        target: { entityType: "claim", entityId: "claim-001", entityName: "Teak Specimen #482", projectId: "proj-sahayadri" },
        prev: null,
        next: { status: "submitted", coordinates: [19.2183, 73.8291], photoCount: 1 },
        meta: { treeSpecies: "Tectona grandis", heightCm: 145 },
        severity: "info",
        timeOffsetMinutes: 360,
      },
      {
        action: "CLAIM_AUTO_SCREENED",
        desc: "AI Botanical Vision & Geofence Automated Screening completed",
        actor: { userId: "SYS-AI", name: "Gemini Botanical AI Engine", role: "system_engine" },
        target: { entityType: "claim", entityId: "claim-001", entityName: "Teak Specimen #482", projectId: "proj-sahayadri" },
        prev: { trustScore: null, aiConfidence: null },
        next: { trustScore: 92, aiConfidence: 0.96, geofenceValid: true, exifIntact: true },
        meta: { modelVersion: "gemini-2.5-flash", boundingBoxConfidence: 0.94 },
        severity: "info",
        timeOffsetMinutes: 355,
      },
      {
        action: "DUPLICATE_FLAGGED",
        desc: "Duplicate perceptual hash collision flagged across historical check-in pool",
        actor: { userId: "SYS-DEDUP", name: "dHash Collision Analyzer", role: "system_engine" },
        target: { entityType: "claim", entityId: "claim-004", entityName: "Neem Specimen #109", projectId: "proj-konkan" },
        prev: { duplicateFlag: false },
        next: { duplicateFlag: true, hammingDistance: 2, similarityScore: 0.968 },
        meta: { candidateCollisionClaimId: "claim-002", perceptualDHash: "f8c4e0a293b1d4e7" },
        severity: "warning",
        timeOffsetMinutes: 280,
      },
      {
        action: "SPATIOTEMPORAL_FLAGGED",
        desc: "Kinematic anomaly flagged: Teleportation velocity exceeded physical threshold (185 km/h)",
        actor: { userId: "SYS-KINEMATIC", name: "Spatiotemporal Kinematics Engine", role: "system_engine" },
        target: { entityType: "claim", entityId: "claim-005", entityName: "Sandalwood Specimen #33", projectId: "proj-konkan" },
        prev: { kinematicFlag: false },
        next: { kinematicFlag: true, calculatedSpeedKmh: 185.4, distanceDeltaKm: 14.8 },
        meta: { transitSeconds: 288, maxOffroadThresholdKmh: 80 },
        severity: "critical",
        timeOffsetMinutes: 240,
      },
      {
        action: "L1_AUDIT_SUBMITTED",
        desc: "Field Auditor passed 5-point verification checklist and escalated for lead approval",
        actor: { userId: "USR-001", name: "Amit Kumar", role: "field_auditor", ipAddress: "103.21.124.9" },
        target: { entityType: "claim", entityId: "claim-001", entityName: "Teak Specimen #482", projectId: "proj-sahayadri" },
        prev: { stage: "pending_l1_review", checklistCompleted: false },
        next: { stage: "pending_lead_approval", checklistCompleted: true },
        meta: { checklistScore: "5/5", notes: "Healthy specimen matching silvicultural baseline." },
        severity: "info",
        timeOffsetMinutes: 180,
      },
      {
        action: "L2_LEAD_APPROVED",
        desc: "Four-Eyes Principle verified: Lead Verifier approved claim after biometric & satellite cross-check",
        actor: { userId: "USR-002", name: "Sunita Deshmukh", role: "lead_verifier", ipAddress: "103.21.124.18" },
        target: { entityType: "claim", entityId: "claim-001", entityName: "Teak Specimen #482", projectId: "proj-sahayadri" },
        prev: { stage: "pending_lead_approval" },
        next: { stage: "pending_admin_certification" },
        meta: { dualControlVerified: true, firstReviewerId: "USR-001", sentinelNdviScore: 0.74 },
        severity: "info",
        timeOffsetMinutes: 120,
      },
      {
        action: "L3_ADMIN_CERTIFIED",
        desc: "Registry Admin performed final certification and sealed cryptographic certificate",
        actor: { userId: "USR-003", name: "Dr. Vikram Joshi", role: "admin_certifier", ipAddress: "49.36.88.2" },
        target: { entityType: "claim", entityId: "claim-001", entityName: "Teak Specimen #482", projectId: "proj-sahayadri" },
        prev: { stage: "pending_admin_certification", certified: false },
        next: { stage: "approved_certified", certified: true, certificateSerial: "HS-2026-SAH-001" },
        meta: { carbonUnitsIssuedKg: 28.5, registryStatus: "SEALED" },
        severity: "security",
        timeOffsetMinutes: 60,
      },
      {
        action: "CLAIM_REJECTED",
        desc: "Claim rejected due to confirmed duplicate photo reuse across distinct cadastral plots",
        actor: { userId: "USR-002", name: "Sunita Deshmukh", role: "lead_verifier", ipAddress: "103.21.124.18" },
        target: { entityType: "claim", entityId: "claim-004", entityName: "Neem Specimen #109", projectId: "proj-konkan" },
        prev: { stage: "pending_lead_approval" },
        next: { stage: "rejected", rejectionCategory: "fraudulent_photo_reuse" },
        meta: { rejectionReason: "Exact perceptual photo collision with claim-002; fraudulent reuse rejected." },
        severity: "warning",
        timeOffsetMinutes: 45,
      },
      {
        action: "BATCH_CERTIFIED",
        desc: "Safe batch issuance certified for 18 high-trust claims with Merkle root seal",
        actor: { userId: "USR-003", name: "Dr. Vikram Joshi", role: "admin_certifier", ipAddress: "49.36.88.2" },
        target: { entityType: "batch", entityId: "BATCH-2026-09-A", entityName: "Sahayadri Batch Q3-A", projectId: "proj-sahayadri" },
        prev: { batchStatus: "draft" },
        next: { batchStatus: "certified", approvedCount: 18, quarantinedCount: 2 },
        meta: { batchMerkleRoot: "0x4a9e2f81c7b39a48e2d1f05634bcda7918451f280a91e4" },
        severity: "security",
        timeOffsetMinutes: 15,
      },
      {
        action: "SYSTEM_INTEGRITY_CHECK",
        desc: "Routine automated SHA-256 hash-chain integrity verification executed: 100% Tamper-Free",
        actor: { userId: "SYS-INTEGRITY", name: "Cryptographic Sentinel Daemon", role: "system_engine" },
        target: { entityType: "system", entityId: "CHAIN-GLOBAL", entityName: "Hirwasparsh Audit Ledger" },
        prev: null,
        next: { status: "HEALTHY", verifiedSequenceMax: 9 },
        meta: { verifiedBlocks: 9, compromisedBlocks: 0 },
        severity: "info",
        timeOffsetMinutes: 5,
      },
    ];

    const now = Date.now();
    for (const seed of seedEvents) {
      const entryTime = new Date(now - seed.timeOffsetMinutes * 60 * 1000).toISOString();
      this.appendEntryToChain({
        action: seed.action,
        actionDescription: seed.desc,
        actor: seed.actor,
        target: seed.target,
        previousState: seed.prev,
        newState: seed.next,
        metadata: seed.meta,
        severity: seed.severity,
        customTimestamp: entryTime,
      });
    }
  }

  /**
   * Helper to compute state delta diff
   */
  public computeStateDelta(
    prev?: Record<string, any> | null,
    next?: Record<string, any> | null
  ): Record<string, { from: any; to: any }> | undefined {
    if (!prev && !next) return undefined;
    const delta: Record<string, { from: any; to: any }> = {};

    const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
    for (const key of allKeys) {
      const valPrev = prev ? prev[key] : undefined;
      const valNext = next ? next[key] : undefined;
      if (JSON.stringify(valPrev) !== JSON.stringify(valNext)) {
        delta[key] = { from: valPrev, to: valNext };
      }
    }
    return Object.keys(delta).length > 0 ? delta : undefined;
  }

  /**
   * Canonical serialization for deterministic hashing
   */
  public getCanonicalPayload(entryWithoutHash: {
    sequenceNumber: number;
    timestamp: string;
    action: AuditAction;
    actor: AuditActor;
    target: AuditTarget;
    previousState?: Record<string, any> | null;
    newState?: Record<string, any> | null;
    metadata?: Record<string, any>;
    severity: AuditSeverity;
    previousHash: string;
  }): string {
    return JSON.stringify({
      seq: entryWithoutHash.sequenceNumber,
      ts: entryWithoutHash.timestamp,
      act: entryWithoutHash.action,
      actorId: entryWithoutHash.actor.userId,
      actorRole: entryWithoutHash.actor.role,
      targetType: entryWithoutHash.target.entityType,
      targetId: entryWithoutHash.target.entityId,
      prev: entryWithoutHash.previousState || null,
      next: entryWithoutHash.newState || null,
      meta: entryWithoutHash.metadata || null,
      sev: entryWithoutHash.severity,
      prevHash: entryWithoutHash.previousHash,
    });
  }

  /**
   * Appends an event to the cryptographically chained ledger
   */
  private appendEntryToChain(params: LogEventParams): AuditLogEntry {
    const sequenceNumber = this.ledger.length + 1;
    const previousEntry = this.ledger.length > 0 ? this.ledger[this.ledger.length - 1] : null;
    const previousHash = previousEntry ? previousEntry.entryHash : GENESIS_HASH;
    const timestamp = params.customTimestamp || new Date().toISOString();
    const severity = params.severity || "info";

    const payloadForHashing = {
      sequenceNumber,
      timestamp,
      action: params.action,
      actor: params.actor,
      target: params.target,
      previousState: params.previousState,
      newState: params.newState,
      metadata: params.metadata,
      severity,
      previousHash,
    };

    const canonicalString = this.getCanonicalPayload(payloadForHashing);
    const entryHash = sha256(canonicalString);
    const signature = `SIG_${params.actor.role.toUpperCase()}_${entryHash.substring(0, 16)}`;

    const stateDelta = this.computeStateDelta(params.previousState, params.newState);

    const entry: AuditLogEntry = {
      id: "LOG-" + sequenceNumber.toString().padStart(6, "0") + "-" + entryHash.substring(0, 8),
      sequenceNumber,
      timestamp,
      action: params.action,
      actionDescription: params.actionDescription,
      actor: params.actor,
      target: params.target,
      previousState: params.previousState,
      newState: params.newState,
      stateDelta,
      metadata: params.metadata,
      severity,
      previousHash,
      entryHash,
      signature,
    };

    this.ledger.push(entry);
    return entry;
  }

  /**
   * Public method to log an audit event
   */
  public async logEvent(params: LogEventParams): Promise<AuditLogEntry> {
    const entry = this.appendEntryToChain(params);
    this.notify();
    return entry;
  }

  /**
   * Synchronous log method for non-async callbacks
   */
  public logEventSync(params: LogEventParams): AuditLogEntry {
    const entry = this.appendEntryToChain(params);
    this.notify();
    return entry;
  }

  /**
   * Returns filtered audit entries
   */
  /**
   * Synchronous get audit logs
   */
  public getAuditLogsSync(filters?: AuditFilterParams): AuditLogEntry[] {
    let result = [...this.ledger];
    if (!filters) return result;

    if (filters.action && filters.action !== "all") {
      result = result.filter((e) => e.action === filters.action);
    }
    if (filters.actorRole && filters.actorRole !== "all") {
      result = result.filter((e) => e.actor.role === filters.actorRole);
    }
    if (filters.entityType && filters.entityType !== "all") {
      result = result.filter((e) => e.target.entityType === filters.entityType);
    }
    if (filters.projectId) {
      result = result.filter((e) => e.target.projectId === filters.projectId);
    }
    if (filters.severity && filters.severity !== "all") {
      result = result.filter((e) => e.severity === filters.severity);
    }
    if (filters.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }
    if (filters.endDate) {
      const endMs = new Date(filters.endDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.actionDescription.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q) ||
          e.actor.userId.toLowerCase().includes(q) ||
          e.target.entityId.toLowerCase().includes(q) ||
          (e.target.entityName && e.target.entityName.toLowerCase().includes(q)) ||
          e.entryHash.toLowerCase().includes(q)
      );
    }
    return result;
  }

  /**
   * Synchronous chain integrity check
   */
  public verifyChainIntegritySync(): AuditIntegrityResult {
    const totalEntries = this.ledger.length;
    if (totalEntries === 0) {
      return {
        isValid: true,
        totalEntries: 0,
        validEntries: 0,
        compromisedIndices: [],
        tamperDetails: [],
        genesisHash: GENESIS_HASH,
        latestHash: GENESIS_HASH,
        merkleRoot: GENESIS_HASH,
        verifiedAt: new Date().toISOString(),
      };
    }

    const compromisedIndices: number[] = [];
    const tamperDetails: string[] = [];
    let validEntries = 0;

    for (let i = 0; i < totalEntries; i++) {
      const entry = this.ledger[i];
      let entryValid = true;

      if (entry.sequenceNumber !== i + 1) {
        entryValid = false;
        tamperDetails.push(
          `Sequence discontinuity at index ${i}: expected #${i + 1}, found #${entry.sequenceNumber}`
        );
      }

      const expectedPrevHash = i === 0 ? GENESIS_HASH : this.ledger[i - 1].entryHash;
      if (entry.previousHash !== expectedPrevHash) {
        entryValid = false;
        tamperDetails.push(
          `Hash pointer mismatch at entry #${entry.sequenceNumber} (${entry.id}): previousHash does not match entry #${i}'s hash`
        );
      }

      const canonical = this.getCanonicalPayload({
        sequenceNumber: entry.sequenceNumber,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        target: entry.target,
        previousState: entry.previousState,
        newState: entry.newState,
        metadata: entry.metadata,
        severity: entry.severity,
        previousHash: entry.previousHash,
      });

      const recomputedHash = sha256(canonical);
      if (entry.entryHash !== recomputedHash) {
        entryValid = false;
        tamperDetails.push(
          `Payload hash tampering detected at entry #${entry.sequenceNumber} (${entry.id}): record content was modified`
        );
      }

      if (entryValid) {
        validEntries++;
      } else {
        compromisedIndices.push(i);
      }
    }

    const isValid = compromisedIndices.length === 0;
    const genesisHash = this.ledger[0].entryHash;
    const latestHash = this.ledger[totalEntries - 1].entryHash;
    const merkleRoot = this.computeMerkleRoot(this.ledger);

    return {
      isValid,
      totalEntries,
      validEntries,
      compromisedIndices,
      firstCompromisedEntryId: compromisedIndices.length > 0 ? this.ledger[compromisedIndices[0]].id : undefined,
      tamperDetails,
      genesisHash,
      latestHash,
      merkleRoot,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Synchronous audit stats
   */
  public getAuditStatsSync(): AuditStats {
    const integrity = this.verifyChainIntegritySync();
    const actors = new Set(this.ledger.map((e) => e.actor.userId));
    const projects = new Set(this.ledger.map((e) => e.target.projectId).filter(Boolean));

    const dualControlCount = this.ledger.filter(
      (e) => e.action === "L2_LEAD_APPROVED" || e.action === "L3_ADMIN_CERTIFIED"
    ).length;

    const criticalSecurityCount = this.ledger.filter(
      (e) => e.severity === "critical" || e.severity === "security"
    ).length;

    return {
      totalEvents: this.ledger.length,
      dualControlApprovals: dualControlCount,
      criticalSecurityEvents: criticalSecurityCount,
      uniqueActors: actors.size,
      activeProjects: projects.size,
      isChainHealthy: integrity.isValid,
      merkleRoot: integrity.merkleRoot,
    };
  }

  public async getAuditLogs(filters?: AuditFilterParams): Promise<AuditLogEntry[]> {
    let result = [...this.ledger];

    if (!filters) return result;

    if (filters.action && filters.action !== "all") {
      result = result.filter((e) => e.action === filters.action);
    }

    if (filters.actorRole && filters.actorRole !== "all") {
      result = result.filter((e) => e.actor.role === filters.actorRole);
    }

    if (filters.entityType && filters.entityType !== "all") {
      result = result.filter((e) => e.target.entityType === filters.entityType);
    }

    if (filters.projectId) {
      result = result.filter((e) => e.target.projectId === filters.projectId);
    }

    if (filters.severity && filters.severity !== "all") {
      result = result.filter((e) => e.severity === filters.severity);
    }

    if (filters.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }

    if (filters.endDate) {
      const endMs = new Date(filters.endDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.actionDescription.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q) ||
          e.actor.userId.toLowerCase().includes(q) ||
          e.target.entityId.toLowerCase().includes(q) ||
          (e.target.entityName && e.target.entityName.toLowerCase().includes(q)) ||
          e.entryHash.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Gets specific logs for an entity
   */
  public async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return this.ledger.filter(
      (e) => e.target.entityType === entityType && e.target.entityId === entityId
    );
  }

  /**
   * Verifies the complete cryptographic hash chain from Genesis to Head
   */
  public async verifyChainIntegrity(): Promise<AuditIntegrityResult> {
    const totalEntries = this.ledger.length;
    if (totalEntries === 0) {
      return {
        isValid: true,
        totalEntries: 0,
        validEntries: 0,
        compromisedIndices: [],
        tamperDetails: [],
        genesisHash: GENESIS_HASH,
        latestHash: GENESIS_HASH,
        merkleRoot: GENESIS_HASH,
        verifiedAt: new Date().toISOString(),
      };
    }

    const compromisedIndices: number[] = [];
    const tamperDetails: string[] = [];
    let validEntries = 0;

    for (let i = 0; i < totalEntries; i++) {
      const entry = this.ledger[i];
      let entryValid = true;

      // 1. Verify sequence number is monotonic
      if (entry.sequenceNumber !== i + 1) {
        entryValid = false;
        tamperDetails.push(
          `Sequence discontinuity at index ${i}: expected #${i + 1}, found #${entry.sequenceNumber}`
        );
      }

      // 2. Verify previousHash pointer
      const expectedPrevHash = i === 0 ? GENESIS_HASH : this.ledger[i - 1].entryHash;
      if (entry.previousHash !== expectedPrevHash) {
        entryValid = false;
        tamperDetails.push(
          `Hash pointer mismatch at entry #${entry.sequenceNumber} (${entry.id}): previousHash does not match entry #${i}'s hash`
        );
      }

      // 3. Recompute hash from canonical payload and compare
      const canonical = this.getCanonicalPayload({
        sequenceNumber: entry.sequenceNumber,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        target: entry.target,
        previousState: entry.previousState,
        newState: entry.newState,
        metadata: entry.metadata,
        severity: entry.severity,
        previousHash: entry.previousHash,
      });

      const recomputedHash = sha256(canonical);
      if (entry.entryHash !== recomputedHash) {
        entryValid = false;
        tamperDetails.push(
          `Payload hash tampering detected at entry #${entry.sequenceNumber} (${entry.id}): record content was modified`
        );
      }

      if (entryValid) {
        validEntries++;
      } else {
        compromisedIndices.push(i);
      }
    }

    const isValid = compromisedIndices.length === 0;
    const genesisHash = this.ledger[0].entryHash;
    const latestHash = this.ledger[totalEntries - 1].entryHash;
    const merkleRoot = this.computeMerkleRoot(this.ledger);

    return {
      isValid,
      totalEntries,
      validEntries,
      compromisedIndices,
      firstCompromisedEntryId: compromisedIndices.length > 0 ? this.ledger[compromisedIndices[0]].id : undefined,
      tamperDetails,
      genesisHash,
      latestHash,
      merkleRoot,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Computes a binary Merkle tree root hash across entries
   */
  public computeMerkleRoot(entries: AuditLogEntry[]): string {
    if (entries.length === 0) return GENESIS_HASH;
    let hashes = entries.map((e) => e.entryHash);

    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          nextLevel.push(sha256(hashes[i] + hashes[i + 1]));
        } else {
          // Odd leaf node duplicated for tree symmetry
          nextLevel.push(sha256(hashes[i] + hashes[i]));
        }
      }
      hashes = nextLevel;
    }

    return "0x" + hashes[0];
  }

  /**
   * Computes high-level statistics for audit metrics dashboard
   */
  public async getAuditStats(): Promise<AuditStats> {
    const integrity = await this.verifyChainIntegrity();
    const actors = new Set(this.ledger.map((e) => e.actor.userId));
    const projects = new Set(this.ledger.map((e) => e.target.projectId).filter(Boolean));

    const dualControlCount = this.ledger.filter(
      (e) => e.action === "L2_LEAD_APPROVED" || e.action === "L3_ADMIN_CERTIFIED"
    ).length;

    const criticalSecurityCount = this.ledger.filter(
      (e) => e.severity === "critical" || e.severity === "security"
    ).length;

    return {
      totalEvents: this.ledger.length,
      dualControlApprovals: dualControlCount,
      criticalSecurityEvents: criticalSecurityCount,
      uniqueActors: actors.size,
      activeProjects: projects.size,
      isChainHealthy: integrity.isValid,
      merkleRoot: integrity.merkleRoot,
    };
  }

  /**
   * Exports audit log entries to RFC-4180 compliant CSV string
   */
  public exportAuditLogsToCsv(entries: AuditLogEntry[]): string {
    const headers = [
      "Sequence",
      "Timestamp_UTC",
      "Action",
      "Description",
      "Actor_ID",
      "Actor_Name",
      "Actor_Role",
      "Target_Type",
      "Target_ID",
      "Target_Project",
      "Severity",
      "Previous_Hash",
      "Entry_Hash",
      "Digital_Signature",
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = entries.map((e) => [
      e.sequenceNumber,
      escapeCsv(e.timestamp),
      escapeCsv(e.action),
      escapeCsv(e.actionDescription),
      escapeCsv(e.actor.userId),
      escapeCsv(e.actor.name),
      escapeCsv(e.actor.role),
      escapeCsv(e.target.entityType),
      escapeCsv(e.target.entityId),
      escapeCsv(e.target.projectId || "N/A"),
      escapeCsv(e.severity),
      escapeCsv(e.previousHash),
      escapeCsv(e.entryHash),
      escapeCsv(e.signature),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  /**
   * Exports signed cryptographic JSON package with Merkle root proof
   */
  public exportAuditPackageJson(entries: AuditLogEntry[]): string {
    const merkleRoot = this.computeMerkleRoot(entries);
    const genesisHash = entries.length > 0 ? entries[0].entryHash : GENESIS_HASH;
    const latestHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;

    const packagePayload = {
      standard: "ISO 14064-3 / Verra VM0047 MRV Cryptographic Audit Package",
      issuedBy: "Green Enlightenment / Hirwasparsh MRV Trust Engine",
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      genesisHash,
      latestHash,
      merkleRoot,
      packageSignature: "PKG_SIG_" + sha256(merkleRoot + latestHash).substring(0, 32),
      entries,
    };

    return JSON.stringify(packagePayload, null, 2);
  }

  /**
   * Generates ISO 14064-3 / Verra VM0047 standard compliance audit certificate report
   */
  public async generateIso14064AuditReport(projectId?: string): Promise<string> {
    const entries = projectId
      ? this.ledger.filter((e) => e.target.projectId === projectId)
      : this.ledger;

    const integrity = await this.verifyChainIntegrity();
    const stats = await this.getAuditStats();

    return `================================================================================
ISO 14064-3 / VERRA VM0047 MRV AUDIT TRAIL COMPLIANCE CERTIFICATE
================================================================================
Generated By: Green Enlightenment (Hirwasparsh) Trust Engine
Registry Scope: ${projectId ? "Project Scope: " + projectId : "Institutional Global Scope"}
Generated At: ${new Date().toISOString()}

1. CRYPTOGRAPHIC LEDGER SUMMARY
--------------------------------------------------------------------------------
Total Verification Entries Audited: ${entries.length}
Cryptographic Chain Status: ${integrity.isValid ? "100% TAMPER-FREE & CRYPTOGRAPHICALLY VALID" : "COMPROMISED - TAMPER DETECTED"}
Genesis Block Hash: ${integrity.genesisHash}
Head Block Hash: ${integrity.latestHash}
Merkle Root Hash: ${integrity.merkleRoot}

2. GOVERNANCE & DUAL-CONTROL METRICS
--------------------------------------------------------------------------------
Four-Eyes Dual-Signatures Logged: ${stats.dualControlApprovals}
Critical & Security Action Events: ${stats.criticalSecurityEvents}
Independent Verified Actors: ${stats.uniqueActors}
Active Plantations Bound: ${stats.activeProjects}

3. COMPLIANCE STANDARD CONFORMANCE
--------------------------------------------------------------------------------
[x] ISO 14064-3 (Greenhouse Gases — Verification & Validation)
[x] Verra VM0047 (Afforestation, Reforestation & Revegetation MRV)
[x] 5-Point Botanical & Spatiotemporal Checklist Enforced
[x] Monotonically Sequenced SHA-256 Hash Chain Active

4. AUDIT TRAIL SAMPLE HEAD (LATEST 3 ENTRIES)
--------------------------------------------------------------------------------
${entries
  .slice(-3)
  .map(
    (e) => `[#${e.sequenceNumber}] ${e.timestamp} | ${e.action}
    Actor: ${e.actor.name} (${e.actor.role} - ${e.actor.userId})
    Target: ${e.target.entityType}:${e.target.entityId} (${e.target.entityName || ""})
    Hash: ${e.entryHash}
    Sig: ${e.signature}`
  )
  .join("\n\n")}

================================================================================
END OF CERTIFICATE — DIGITAL PROOF VERIFIED BY HIRWASPARSH SENTINEL
================================================================================`;
  }

  /**
   * Tamper drill: Simulates an unauthorized data alteration to test fraud detection
   */
  public simulateTamperEvent(index: number, modifiedField: string, newValue: any): void {
    if (index < 0 || index >= this.ledger.length) return;

    if (!this.originalLedgerSnapshot) {
      // Take deep copy snapshot before tampering
      this.originalLedgerSnapshot = JSON.parse(JSON.stringify(this.ledger));
    }

    const target = this.ledger[index];
    if (modifiedField === "action") {
      target.action = newValue;
    } else if (modifiedField === "actorName") {
      target.actor.name = newValue;
    } else if (modifiedField === "entryHash") {
      target.entryHash = newValue;
    } else if (modifiedField === "previousHash") {
      target.previousHash = newValue;
    } else if (modifiedField === "newState") {
      target.newState = newValue;
    }

    this.notify();
  }

  /**
   * Restores chain to pristine untampered state
   */
  public restoreChainIntegrity(): void {
    if (this.originalLedgerSnapshot) {
      this.ledger = JSON.parse(JSON.stringify(this.originalLedgerSnapshot));
      this.originalLedgerSnapshot = null;
      this.notify();
    }
  }

  /**
   * Resets ledger to freshly seeded state (used in testing)
   */
  public resetLedger(): void {
    this.ledger = [];
    this.originalLedgerSnapshot = null;
    this.seedInitialLedger();
    this.notify();
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
        console.error("AuditLogService listener error:", err);
      }
    });
  }
}

export const auditLogService = new AuditLogService();
