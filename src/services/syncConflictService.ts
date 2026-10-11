/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 7 TASK 38
 * Synchronization Conflict Detection, Smart Merge & Resolution Engine
 *
 * Capabilities:
 * 1. Multi-entity conflict detection (Trees, Observations, Field Reports, Spot Audits)
 * 2. Deep attribute-level diff calculation between Local Offline Draft vs Cloud/Server State
 * 3. Smart Field-Level Auto-Merge (combines non-overlapping attributes without data loss)
 * 4. Pluggable Resolution Strategies:
 *    - "smart_merge": Intelligent non-conflicting field combination
 *    - "local_wins": Device offline input overrides server state
 *    - "server_wins": Cloud master state preserved, local conflict archived
 *    - "fork_new": Clones local entity with distinct unique identifier suffix (e.g. -FORK1)
 *    - "custom_merge": User-selected field-by-field choices
 * 5. Immutable MRV / Carbon Accreditation Audit Trail with author, rationale, and diff snapshots
 * 6. Reactive Subscription & Event Dispatcher for UI sync
 */

import { supabase } from "@/integrations/supabase/client";

export type ConflictEntityType = "tree" | "observation" | "field_report" | "spot_audit";

export type ConflictResolutionStrategy =
  | "smart_merge"
  | "local_wins"
  | "server_wins"
  | "fork_new"
  | "custom_merge";

export interface ConflictFieldDiff {
  field: string;
  label: string;
  localValue: any;
  serverValue: any;
  isConflicting: boolean;
  chosenValue?: any;
  chosenSource?: "local" | "server" | "custom";
}

export interface SyncConflict {
  conflictId: string;
  localId: string;
  entityType: ConflictEntityType;
  entityId?: string; // Cloud database ID or tree code (e.g. GE-2026-000102)
  title: string;
  subtitle: string;
  detectedAt: string;
  status: "pending" | "resolved" | "ignored";
  localItem: any;
  serverItem: any;
  diffs: ConflictFieldDiff[];
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedPayload?: any;
  notes?: string;
}

export interface ConflictAuditLogEntry {
  id: string;
  conflictId: string;
  entityType: ConflictEntityType;
  entityId?: string;
  resolutionStrategy: ConflictResolutionStrategy;
  resolvedBy: string;
  resolvedAt: string;
  diffSummary: Record<string, { fromLocal: any; fromServer: any; chosen: any; source: string }>;
  rationale?: string;
}

export interface ConflictResolutionPlan {
  strategy: ConflictResolutionStrategy;
  resolvedBy?: string;
  customDiffs?: ConflictFieldDiff[];
  customPayload?: any;
  rationale?: string;
}

export interface SyncResolutionResult {
  success: boolean;
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedPayload: any;
  auditEntry: ConflictAuditLogEntry;
  error?: string;
}

const CONFLICTS_STORAGE_KEY = "green_sync_conflicts_v1";
const AUDIT_TRAIL_STORAGE_KEY = "green_conflict_audit_trail_v1";

let inMemoryConflicts: SyncConflict[] = [];
let inMemoryAuditTrail: ConflictAuditLogEntry[] = [];
const listeners = new Set<() => void>();

const FIELD_LABELS: Record<string, string> = {
  tree_name: "Tree Name / Tag",
  species: "Species Name",
  health_status: "Health Condition",
  status: "Tree Status",
  height_cm: "Height (cm)",
  measured_dbh_mm: "DBH (mm)",
  foliage_density_pct: "Foliage Density (%)",
  growth_delta_cm: "Growth Delta (cm)",
  notes: "Field Notes & Observations",
  photo_url: "Evidence Photo",
  latitude: "GPS Latitude",
  longitude: "GPS Longitude",
  gps_accuracy_m: "GPS Uncertainty (±m)",
  admin_status: "Admin Approval Status",
  verification_status: "Verification Tier",
  plantation_date: "Plantation Date",
  survival_rate_pct: "Survival Rate (%)",
  threat_tags: "Threat / Stress Tags",
  inspector_name: "Inspector / Ranger",
};

export const syncConflictService = {
  /**
   * Field display label helper
   */
  getFieldLabel(field: string): string {
    return FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },

  /**
   * 1. GET ALL CONFLICTS
   */
  getConflicts(filter?: { status?: "pending" | "resolved" | "ignored"; entityType?: ConflictEntityType }): SyncConflict[] {
    let items = inMemoryConflicts;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(CONFLICTS_STORAGE_KEY);
        if (raw) {
          items = JSON.parse(raw);
          inMemoryConflicts = items;
        }
      }
    } catch (e) {
      console.error("Error reading sync conflicts:", e);
    }

    if (filter) {
      return items.filter((item) => {
        if (filter.status && item.status !== filter.status) return false;
        if (filter.entityType && item.entityType !== filter.entityType) return false;
        return true;
      });
    }

    return [...items];
  },

  /**
   * Get pending conflicts count
   */
  getPendingCount(): number {
    return this.getConflicts({ status: "pending" }).length;
  },

  /**
   * Persist conflicts to storage
   */
  persistConflicts(conflicts: SyncConflict[]): void {
    inMemoryConflicts = [...conflicts];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(CONFLICTS_STORAGE_KEY, JSON.stringify(conflicts));
      }
    } catch (e) {
      console.error("Error persisting sync conflicts:", e);
    }
    this.notifyListeners();
  },

  /**
   * 2. GET AUDIT TRAIL
   */
  getAuditTrail(): ConflictAuditLogEntry[] {
    let items = inMemoryAuditTrail;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
        if (raw) {
          items = JSON.parse(raw);
          inMemoryAuditTrail = items;
        }
      }
    } catch (e) {
      console.error("Error reading conflict audit trail:", e);
    }
    return [...items];
  },

  /**
   * Persist audit trail to storage
   */
  persistAuditTrail(trail: ConflictAuditLogEntry[]): void {
    inMemoryAuditTrail = [...trail];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(AUDIT_TRAIL_STORAGE_KEY, JSON.stringify(trail));
      }
    } catch (e) {
      console.error("Error persisting conflict audit trail:", e);
    }
  },

  /**
   * 3. DETECT CONFLICT & CALCULATE DIFFS
   */
  detectConflict(
    localItem: any,
    serverItem: any,
    entityType: ConflictEntityType
  ): { hasConflict: boolean; diffs: ConflictFieldDiff[] } {
    const diffs: ConflictFieldDiff[] = [];
    const local = localItem || {};
    const server = serverItem || {};

    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    // Ignore internal metadata fields
    const ignoredKeys = new Set([
      "localId",
      "idempotencyKey",
      "createdAt",
      "created_at",
      "updatedAt",
      "updated_at",
      "syncStatus",
      "retryCount",
      "lastAttemptAt",
      "lastError",
      "priority",
    ]);

    for (const key of allKeys) {
      if (ignoredKeys.has(key)) continue;

      const localVal = local[key];
      const serverVal = server[key];

      const localJson = JSON.stringify(localVal !== undefined ? localVal : null);
      const serverJson = JSON.stringify(serverVal !== undefined ? serverVal : null);

      if (localJson !== serverJson) {
        const isConflicting = localVal !== undefined && serverVal !== undefined && localVal !== null && serverVal !== null;
        diffs.push({
          field: key,
          label: this.getFieldLabel(key),
          localValue: localVal,
          serverValue: serverVal,
          isConflicting,
          chosenValue: localVal !== undefined ? localVal : serverVal,
          chosenSource: localVal !== undefined ? "local" : "server",
        });
      }
    }

    return {
      hasConflict: diffs.some((d) => d.isConflicting),
      diffs,
    };
  },

  /**
   * 4. REGISTER A NEW CONFLICT
   */
  registerConflict(params: {
    localId: string;
    entityType: ConflictEntityType;
    entityId?: string;
    title: string;
    subtitle: string;
    localItem: any;
    serverItem: any;
  }): SyncConflict {
    const conflicts = this.getConflicts();
    const existingIndex = conflicts.findIndex((c) => c.localId === params.localId);

    const { diffs } = this.detectConflict(params.localItem, params.serverItem, params.entityType);

    const newConflict: SyncConflict = {
      conflictId: `conf-${params.entityType}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      localId: params.localId,
      entityType: params.entityType,
      entityId: params.entityId || params.serverItem?.id || params.serverItem?.tree_id,
      title: params.title,
      subtitle: params.subtitle,
      detectedAt: new Date().toISOString(),
      status: "pending",
      localItem: params.localItem,
      serverItem: params.serverItem,
      diffs,
    };

    if (existingIndex >= 0) {
      conflicts[existingIndex] = newConflict;
    } else {
      conflicts.unshift(newConflict);
    }

    this.persistConflicts(conflicts);
    return newConflict;
  },

  /**
   * 5. SMART AUTO-MERGE ENGINE
   * Merges non-overlapping fields automatically. For overlapping conflicting fields:
   * - Prefers higher precision (e.g. updated height, fresh notes) or more specific values.
   * - Preserves server administrative approval tags while retaining field health observations.
   */
  autoResolveSmartMerge(conflict: SyncConflict): { resolvedPayload: any; mergedDiffs: ConflictFieldDiff[] } {
    const local = conflict.localItem || {};
    const server = conflict.serverItem || {};

    const resolvedPayload: any = { ...server, ...local };
    const mergedDiffs: ConflictFieldDiff[] = [];

    for (const diff of conflict.diffs) {
      const field = diff.field;
      let chosenValue = diff.localValue;
      let chosenSource: "local" | "server" | "custom" = "local";

      // Server administrative authority fields
      if (["admin_status", "verification_status", "organization_id", "project_id"].includes(field)) {
        if (server[field] !== undefined && server[field] !== null) {
          chosenValue = server[field];
          chosenSource = "server";
        }
      } else if (["health_status", "height_cm", "foliage_density_pct", "measured_dbh_mm", "notes", "photo_url"].includes(field)) {
        // Field worker fresh ground truth observations take precedence for silvicultural attributes
        if (local[field] !== undefined && local[field] !== null) {
          chosenValue = local[field];
          chosenSource = "local";
        } else {
          chosenValue = server[field];
          chosenSource = "server";
        }
      } else if (Array.isArray(local[field]) && Array.isArray(server[field])) {
        // Union of array tags (e.g. threat tags)
        chosenValue = Array.from(new Set([...server[field], ...local[field]]));
        chosenSource = "custom";
      } else {
        // Default to local if defined, else server
        chosenValue = local[field] !== undefined ? local[field] : server[field];
        chosenSource = local[field] !== undefined ? "local" : "server";
      }

      resolvedPayload[field] = chosenValue;
      mergedDiffs.push({
        ...diff,
        chosenValue,
        chosenSource,
      });
    }

    return { resolvedPayload, mergedDiffs };
  },

  /**
   * 6. FORK ENTITY ENGINE (CLONE AS NEW RECORD)
   * Solves barcode/nursery tag collision by assigning unique fork suffix
   */
  forkConflictEntity(conflict: SyncConflict): { forkedPayload: any; newEntityId: string } {
    const local = { ...conflict.localItem };
    const baseCode = local.tree_name || conflict.entityId || "GE-SAPLING";
    const timestampSuffix = Date.now().toString().slice(-4);
    const forkTag = `${baseCode}-FORK${timestampSuffix}`;

    const forkedPayload = {
      ...local,
      tree_name: forkTag,
      notes: `${local.notes || ""} [Forked duplicate from conflict resolution on ${new Date().toLocaleDateString()}]`.trim(),
    };

    return {
      forkedPayload,
      newEntityId: forkTag,
    };
  },

  /**
   * 7. RESOLVE CONFLICT
   */
  async resolveConflict(
    conflictId: string,
    plan: ConflictResolutionPlan
  ): Promise<SyncResolutionResult> {
    const conflicts = this.getConflicts();
    const conflict = conflicts.find((c) => c.conflictId === conflictId);

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found.`);
    }

    let resolvedPayload: any;
    const diffSummary: Record<string, { fromLocal: any; fromServer: any; chosen: any; source: string }> = {};

    switch (plan.strategy) {
      case "smart_merge": {
        const { resolvedPayload: smartPayload, mergedDiffs } = this.autoResolveSmartMerge(conflict);
        resolvedPayload = smartPayload;
        mergedDiffs.forEach((d) => {
          diffSummary[d.field] = {
            fromLocal: d.localValue,
            fromServer: d.serverValue,
            chosen: d.chosenValue,
            source: d.chosenSource || "smart_merge",
          };
        });
        break;
      }

      case "local_wins": {
        resolvedPayload = { ...conflict.serverItem, ...conflict.localItem };
        conflict.diffs.forEach((d) => {
          diffSummary[d.field] = {
            fromLocal: d.localValue,
            fromServer: d.serverValue,
            chosen: d.localValue,
            source: "local",
          };
        });
        break;
      }

      case "server_wins": {
        resolvedPayload = { ...conflict.serverItem };
        conflict.diffs.forEach((d) => {
          diffSummary[d.field] = {
            fromLocal: d.localValue,
            fromServer: d.serverValue,
            chosen: d.serverValue,
            source: "server",
          };
        });
        break;
      }

      case "fork_new": {
        const { forkedPayload, newEntityId } = this.forkConflictEntity(conflict);
        resolvedPayload = forkedPayload;
        diffSummary["entity_fork"] = {
          fromLocal: conflict.entityId || conflict.localItem?.tree_name,
          fromServer: conflict.serverItem?.tree_name,
          chosen: newEntityId,
          source: "fork_new",
        };
        break;
      }

      case "custom_merge": {
        resolvedPayload = plan.customPayload || { ...conflict.serverItem, ...conflict.localItem };
        if (plan.customDiffs) {
          plan.customDiffs.forEach((d) => {
            if (d.chosenValue !== undefined) {
              resolvedPayload[d.field] = d.chosenValue;
            }
            diffSummary[d.field] = {
              fromLocal: d.localValue,
              fromServer: d.serverValue,
              chosen: d.chosenValue,
              source: d.chosenSource || "custom",
            };
          });
        }
        break;
      }

      default:
        throw new Error(`Unknown resolution strategy: ${plan.strategy}`);
    }

    const resolvedBy = plan.resolvedBy || "Field Ranger / Supervisor";
    const resolvedAt = new Date().toISOString();

    // Create immutable audit log entry
    const auditEntry: ConflictAuditLogEntry = {
      id: `audit-conf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conflictId: conflict.conflictId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      resolutionStrategy: plan.strategy,
      resolvedBy,
      resolvedAt,
      diffSummary,
      rationale: plan.rationale || `Resolved via ${plan.strategy}`,
    };

    // Update conflict status
    conflict.status = "resolved";
    conflict.resolutionStrategy = plan.strategy;
    conflict.resolvedAt = resolvedAt;
    conflict.resolvedBy = resolvedBy;
    conflict.resolvedPayload = resolvedPayload;
    conflict.notes = plan.rationale;

    this.persistConflicts(conflicts);

    // Append to audit trail
    const auditTrail = this.getAuditTrail();
    auditTrail.unshift(auditEntry);
    this.persistAuditTrail(auditTrail);

    return {
      success: true,
      conflictId: conflict.conflictId,
      strategy: plan.strategy,
      resolvedPayload,
      auditEntry,
    };
  },

  /**
   * 8. BATCH RESOLVE MULTIPLE CONFLICTS
   */
  async batchResolve(
    conflictIds: string[],
    strategy: ConflictResolutionStrategy,
    resolvedBy?: string
  ): Promise<SyncResolutionResult[]> {
    const results: SyncResolutionResult[] = [];
    for (const cid of conflictIds) {
      try {
        const res = await this.resolveConflict(cid, { strategy, resolvedBy });
        results.push(res);
      } catch (err: any) {
        console.error(`Failed to resolve conflict ${cid}:`, err);
      }
    }
    return results;
  },

  /**
   * 9. REMOVE / DISMISS CONFLICT
   */
  removeConflict(conflictId: string): void {
    const conflicts = this.getConflicts().filter((c) => c.conflictId !== conflictId);
    this.persistConflicts(conflicts);
  },

  /**
   * 10. CLEAR ALL CONFLICTS
   */
  clearConflicts(): void {
    inMemoryConflicts = [];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(CONFLICTS_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Error clearing sync conflicts:", e);
    }
    this.notifyListeners();
  },

  /**
   * 11. CLEAR AUDIT TRAIL
   */
  clearAuditTrail(): void {
    inMemoryAuditTrail = [];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(AUDIT_TRAIL_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Error clearing conflict audit trail:", e);
    }
  },

  /**
   * 12. REACTIVE SUBSCRIPTIONS
   */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notifyListeners(): void {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Error notifying conflict listener:", e);
      }
    });
  },
};
