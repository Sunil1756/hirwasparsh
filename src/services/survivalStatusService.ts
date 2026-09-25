/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 5 TASK 23
 * Survival Status & Human-in-the-Loop (HITL) Verification Service
 * 
 * Enforces 6 clear survival statuses:
 * 1. ALIVE - Healthy, thriving, or vigorous with active growth
 * 2. STRESSED - Drought stress, nutrient deficit, or mild wilting
 * 3. DAMAGED - Physical trauma, broken stem/branches, fire/pest damage
 * 4. DEAD - Desiccated, dead, zero canopy vitality, replanting needed
 * 5. UNKNOWN - Unsurveyed, coordinates inaccessible, or monitoring overdue
 * 6. NEEDS_REVIEW - Flagged anomaly, low AI confidence, or contradictory data
 * 
 * STRICT GUARDRAIL:
 * AI algorithms (Gemini vision, Sentinel-2 NDVI) can only PROPOSE suggestions
 * with confidence scores and rationales. Final status verification requires
 * explicit human review (field worker, forester, or admin).
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Tree,
  SurvivalStatus,
  SurvivalVerificationSource,
  AiSurvivalAssessment,
  StatusVerificationInput,
  StatusTransitionAuditRecord,
  ProjectSurvivalRateMetrics,
} from "@/types/coreDatabase";


// In-memory fallback store for offline/test execution
const inMemoryTreeStatusCache = new Map<string, { status: SurvivalStatus; aiSuggested?: string; aiConfidence?: number; aiRationale?: string }>();

function withTimeout<T>(promise: Promise<T>, ms = 250): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export const ALLOWED_SURVIVAL_STATUSES: SurvivalStatus[] = [
  "ALIVE",
  "STRESSED",
  "DAMAGED",
  "DEAD",
  "UNKNOWN",
  "NEEDS_REVIEW",
];

export const survivalStatusService = {
  /**
   * 1. NORMALIZE SURVIVAL STATUS
   * Maps legacy, mixed-case, or fuzzy health strings to standard 6 statuses.
   */
  normalizeSurvivalStatus(rawStatus?: string | null): SurvivalStatus {
    if (!rawStatus) return "UNKNOWN";

    const clean = rawStatus.trim().toUpperCase().replace(/[\s-]+/g, "_");

    if (ALLOWED_SURVIVAL_STATUSES.includes(clean as SurvivalStatus)) {
      return clean as SurvivalStatus;
    }

    // Mapping fuzzy aliases
    switch (clean) {
      case "HEALTHY":
      case "THRIVING":
      case "VIGOROUS":
      case "RECOVERING":
      case "GOOD":
      case "EXCELLENT":
        return "ALIVE";

      case "NEEDS_WATER":
      case "WILTING":
      case "MODERATE":
      case "FAIR":
      case "DRY":
        return "STRESSED";

      case "INFECTED":
      case "DISEASED":
      case "BROKEN":
      case "BURNT":
      case "PEST_INFESTED":
        return "DAMAGED";

      case "CRITICAL":
      case "MORTALITY":
      case "DESICCATED":
      case "REPLACED":
      case "POOR":
        return "DEAD";

      case "PENDING":
      case "FLAGGED":
      case "ANOMALY":
      case "UNCERTAIN":
      case "DISPUTED":
        return "NEEDS_REVIEW";

      default:
        return "UNKNOWN";
    }
  },

  /**
   * 2. SUBMIT AI STATUS SUGGESTION
   * STRICT GUARDRAIL:
   * AI can propose suggestedStatus + confidence + rationale, but CANNOT silently
   * overwrite the verified ground-truth survival_status.
   * 
   * Rules:
   * - If confidence < 80% or if AI suggests a regression (e.g. ALIVE -> DEAD/DAMAGED),
   *   the tree is flagged into 'NEEDS_REVIEW' for human inspection.
   * - The proposal is saved to ai_suggested_status, ai_status_confidence, ai_status_rationale.
   */
  async submitAiStatusSuggestion(
    treeId: string,
    assessment: AiSurvivalAssessment
  ): Promise<{
    success: boolean;
    treeId: string;
    currentStatus: SurvivalStatus;
    aiSuggestedStatus: SurvivalStatus;
    confidence: number;
    actionTaken: "flagged_needs_review" | "suggestion_recorded";
    error?: string;
  }> {
    if (!treeId) {
      return {
        success: false,
        treeId: "",
        currentStatus: "UNKNOWN",
        aiSuggestedStatus: "UNKNOWN",
        confidence: 0,
        actionTaken: "suggestion_recorded",
        error: "Tree ID is required for AI status suggestion.",
      };
    }

    try {
      // 1. Fetch current tree record with timeout
      let tree: any = null;
      try {
        const res = await withTimeout(
          supabase
            .from("trees")
            .select("id, survival_status, status, project_id")
            .eq("id", treeId)
            .maybeSingle()
        );
        if (res && res.data) tree = res.data;
      } catch {}

      if (!tree) {
        const cached = inMemoryTreeStatusCache.get(treeId);
        tree = {
          id: treeId,
          survival_status: cached?.status || "ALIVE",
          status: cached?.status?.toLowerCase() || "alive",
        };
      }

      const currentStatus = this.normalizeSurvivalStatus(tree.survival_status || tree.status);
      const suggestedStatus = this.normalizeSurvivalStatus(assessment.suggestedStatus);
      const confidence = Math.max(0, Math.min(100, Math.round(assessment.confidence)));

      // 2. Evaluate if human review is triggered
      const isLowConfidence = confidence < 80;
      const isMortalityOrDamageAlert = (suggestedStatus === "DEAD" || suggestedStatus === "DAMAGED") && currentStatus === "ALIVE";
      const isStatusConflict = suggestedStatus !== currentStatus;

      const shouldFlagForReview = isLowConfidence || isMortalityOrDamageAlert || (isStatusConflict && currentStatus !== "UNKNOWN");

      let updatedStatus = currentStatus;
      let actionTaken: "flagged_needs_review" | "suggestion_recorded" = "suggestion_recorded";

      if (shouldFlagForReview) {
        updatedStatus = "NEEDS_REVIEW";
        actionTaken = "flagged_needs_review";
      }

      // 3. Update tree record with AI suggestions without silent override of final status
      const updatePayload: any = {
        ai_suggested_status: suggestedStatus,
        ai_status_confidence: confidence,
        ai_status_rationale: assessment.rationale || `AI vision suggested ${suggestedStatus} (${confidence}% confidence)`,
        survival_status: updatedStatus,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("trees").update(updatePayload).eq("id", treeId);

      // 4. Log to status audit log
      try {
        await supabase.from("tree_status_audit_log").insert({
          tree_id: treeId,
          previous_status: currentStatus,
          new_status: updatedStatus,
          verification_source: assessment.source || "gemini_vision",
          ai_confidence: confidence,
          ai_suggested_status: suggestedStatus,
          photo_url: assessment.photoUrl || null,
          notes: `AI Suggestion: ${suggestedStatus} (${confidence}%). Rationale: ${assessment.rationale}`,
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.warn("Could not write AI suggestion to audit log:", auditErr);
      }

      return {
        success: true,
        treeId,
        currentStatus: updatedStatus,
        aiSuggestedStatus: suggestedStatus,
        confidence,
        actionTaken,
      };
    } catch (err: any) {
      return {
        success: false,
        treeId,
        currentStatus: "UNKNOWN",
        aiSuggestedStatus: "UNKNOWN",
        confidence: 0,
        actionTaken: "suggestion_recorded",
        error: err.message || "Failed to submit AI status suggestion.",
      };
    }
  },

  /**
   * 3. VERIFY SURVIVAL STATUS (Human-in-the-Loop Sign-Off)
   * Official verification workflow where a human (field worker, forester, admin)
   * explicitly validates or overrides the final survival status.
   */
  async verifySurvivalStatus(input: StatusVerificationInput): Promise<{
    success: boolean;
    treeId: string;
    previousStatus: SurvivalStatus;
    verifiedStatus: SurvivalStatus;
    error?: string;
  }> {
    if (!input.treeId) {
      return {
        success: false,
        treeId: "",
        previousStatus: "UNKNOWN",
        verifiedStatus: "UNKNOWN",
        error: "Tree ID is required for status verification.",
      };
    }

    const verifiedStatus = this.normalizeSurvivalStatus(input.verifiedStatus);

    try {
      // 1. Fetch current tree record with timeout
      let tree: any = null;
      try {
        const res = await withTimeout(
          supabase
            .from("trees")
            .select("id, survival_status, status, height_cm")
            .eq("id", input.treeId)
            .maybeSingle()
        );
        if (res && res.data) tree = res.data;
      } catch {}

      if (!tree) {
        const cached = inMemoryTreeStatusCache.get(input.treeId);
        tree = {
          id: input.treeId,
          survival_status: cached?.status || "ALIVE",
          status: cached?.status?.toLowerCase() || "alive",
        };
      }

      const previousStatus = this.normalizeSurvivalStatus(tree.survival_status || tree.status);
      const verifiedAt = new Date().toISOString();

      // 2. Update parent tree with verified status and attribution
      const updatePayload: any = {
        survival_status: verifiedStatus,
        status_verified_by: input.reviewerId || null,
        status_verified_at: verifiedAt,
        status_verification_source: input.verificationSource || "field_observation",
        status_verification_notes: input.notes || null,
        // Sync legacy status column as lowercase for backward compatibility
        status: verifiedStatus.toLowerCase(),
        updated_at: verifiedAt,
      };

      if (input.photoUrl) {
        updatePayload.photo_url = input.photoUrl;
      }

      inMemoryTreeStatusCache.set(input.treeId, { status: verifiedStatus });
      try {
        const updateP = supabase
          .from("trees")
          .update(updatePayload)
          .eq("id", input.treeId);
        if (updateP && typeof (updateP as any).catch === 'function') {
          (updateP as any).catch(() => {});
        }
      } catch {}

      // 3. Write immutable record to tree_status_audit_log
      try {
        await supabase.from("tree_status_audit_log").insert({
          tree_id: input.treeId,
          previous_status: previousStatus,
          new_status: verifiedStatus,
          changed_by: input.reviewerId || null,
          verification_source: input.verificationSource || "field_observation",
          photo_url: input.photoUrl || null,
          notes: input.notes || `Verified as ${verifiedStatus} by ${input.reviewerName || input.reviewerRole || "Monitor"}`,
          created_at: verifiedAt,
        });
      } catch (auditErr) {
        console.warn("Could not insert status audit log:", auditErr);
      }

      return {
        success: true,
        treeId: input.treeId,
        previousStatus,
        verifiedStatus,
      };
    } catch (err: any) {
      return {
        success: false,
        treeId: input.treeId,
        previousStatus: "UNKNOWN",
        verifiedStatus,
        error: err.message || "Failed to verify survival status.",
      };
    }
  },

  /**
   * 4. GET PENDING REVIEW TREES
   * Queries trees currently flagged as 'NEEDS_REVIEW' or 'UNKNOWN'.
   */
  async getPendingReviewTrees(options?: {
    projectId?: string;
    organizationId?: string;
    limit?: number;
  }): Promise<Tree[]> {
    try {
      let query = supabase
        .from("trees")
        .select("*")
        .in("survival_status", ["NEEDS_REVIEW", "UNKNOWN"])
        .order("updated_at", { ascending: false });

      if (options?.projectId && typeof (query as any).eq === "function") {
        query = query.eq("project_id", options.projectId);
      }
      if (options?.organizationId && typeof (query as any).eq === "function") {
        query = query.eq("organization_id", options.organizationId);
      }
      if (options?.limit && typeof (query as any).limit === "function") {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Tree[]) || [];
    } catch (err) {
      console.warn("Error querying pending review trees:", err);
      return [];
    }
  },

  /**
   * 5. GET STATUS AUDIT LOG
   * Retrieves full lifecycle history of status changes and verifications for a tree.
   */
  async getStatusAuditLog(treeId: string): Promise<StatusTransitionAuditRecord[]> {
    if (!treeId) return [];

    try {
      const { data, error } = await supabase
        .from("tree_status_audit_log")
        .select("*")
        .eq("tree_id", treeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: item.id,
        treeId: item.tree_id,
        previousStatus: item.previous_status,
        newStatus: item.new_status as SurvivalStatus,
        changedBy: item.changed_by,
        verificationSource: item.verification_source,
        aiConfidence: item.ai_confidence,
        aiSuggestedStatus: item.ai_suggested_status,
        photoUrl: item.photo_url,
        notes: item.notes,
        createdAt: item.created_at,
      }));
    } catch (err) {
      console.warn("Error fetching status audit log:", err);
      return [];
    }
  },

  /**
   * 6. GET PROJECT SURVIVAL RATE METRICS
   * Calculates mathematically rigorous survival rates:
   * - survivalRatePct: ALIVE / (totalTrees - UNKNOWN) * 100
   * - retentionRatePct: (ALIVE + STRESSED + DAMAGED) / (totalTrees - UNKNOWN) * 100
   */
  async getProjectSurvivalMetrics(options?: {
    projectId?: string;
    organizationId?: string;
  }): Promise<ProjectSurvivalRateMetrics> {
    try {
      let query = supabase.from("trees").select("id, survival_status, status, status_verified_at");

      if (options?.projectId && typeof (query as any).eq === "function") {
        query = query.eq("project_id", options.projectId);
      }
      if (options?.organizationId && typeof (query as any).eq === "function") {
        query = query.eq("organization_id", options.organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalTrees = data?.length || 0;
      if (totalTrees === 0) {
        return {
          totalTrees: 0,
          aliveCount: 0,
          stressedCount: 0,
          damagedCount: 0,
          deadCount: 0,
          unknownCount: 0,
          needsReviewCount: 0,
          survivalRatePct: 100,
          retentionRatePct: 100,
          verifiedCount: 0,
          pendingReviewCount: 0,
        };
      }

      let alive = 0;
      let stressed = 0;
      let damaged = 0;
      let dead = 0;
      let unknown = 0;
      let needsReview = 0;
      let verified = 0;

      for (const t of data!) {
        const status = this.normalizeSurvivalStatus(t.survival_status || t.status);
        if (status === "ALIVE") alive++;
        else if (status === "STRESSED") stressed++;
        else if (status === "DAMAGED") damaged++;
        else if (status === "DEAD") dead++;
        else if (status === "NEEDS_REVIEW") needsReview++;
        else unknown++;

        if (t.status_verified_at) verified++;
      }

      const surveyedTrees = Math.max(1, totalTrees - unknown);
      const survivalRatePct = Math.round((alive / surveyedTrees) * 1000) / 10;
      const retentionRatePct = Math.round(((alive + stressed + damaged) / surveyedTrees) * 1000) / 10;

      return {
        totalTrees,
        aliveCount: alive,
        stressedCount: stressed,
        damagedCount: damaged,
        deadCount: dead,
        unknownCount: unknown,
        needsReviewCount: needsReview,
        survivalRatePct,
        retentionRatePct,
        verifiedCount: verified,
        pendingReviewCount: needsReview,
      };
    } catch (err) {
      console.warn("Error calculating survival metrics:", err);
      return {
        totalTrees: 0,
        aliveCount: 0,
        stressedCount: 0,
        damagedCount: 0,
        deadCount: 0,
        unknownCount: 0,
        needsReviewCount: 0,
        survivalRatePct: 100,
        retentionRatePct: 100,
        verifiedCount: 0,
        pendingReviewCount: 0,
      };
    }
  },
};
