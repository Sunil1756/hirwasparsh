import { describe, it, expect, beforeEach } from "vitest";
import {
  aiModelTrainingAndSubscriptionService,
  AiModelTrainingAndSubscriptionService,
} from "../services/aiModelTrainingAndSubscriptionService";

describe("PHASE 11 — AI Model Training, Subscription & Marketplace Procurement Service Suite", () => {
  let service: AiModelTrainingAndSubscriptionService;

  beforeEach(() => {
    service = new AiModelTrainingAndSubscriptionService();
  });

  describe("1. AI Subscription Plans & Quotas", () => {
    it("returns structured subscription tiers ranging from Developer Free to Enterprise Dedicated", () => {
      const plans = service.getSubscriptionPlans();
      expect(plans.length).toBe(3);

      const free = plans.find((p) => p.id === "developer_free");
      expect(free).toBeDefined();
      expect(free?.monthlyPriceUsd).toBe(0);
      expect(free?.monthlyQuotaScans).toBe(500);

      const pro = plans.find((p) => p.id === "agroforestry_pro");
      expect(pro).toBeDefined();
      expect(pro?.monthlyPriceUsd).toBe(49);
      expect(pro?.monthlyQuotaScans).toBe(15000);
      expect(pro?.verraMrvExport).toBe(true);

      const enterprise = plans.find((p) => p.id === "enterprise_dedicated");
      expect(enterprise).toBeDefined();
      expect(enterprise?.monthlyPriceUsd).toBe(299);
      expect(enterprise?.dedicatedEndpointIncluded).toBe(true);
      expect(enterprise?.customFineTuningAllowed).toBe(true);
    });

    it("retrieves current user subscription state and active API quota", () => {
      const state = service.getCurrentSubscriptionState();
      expect(state.userId).toBeDefined();
      expect(state.apiKey).toContain("ge_live_ak");
      expect(state.monthlyQuotaLimit).toBeGreaterThan(0);
      expect(state.tokenCreditBalanceUsd).toBeGreaterThanOrEqual(0);
    });

    it("updates subscription plan tier and resets quota limits accurately", () => {
      const updated = service.updateSubscriptionPlan("enterprise_dedicated", "annual");
      expect(updated.activePlanId).toBe("enterprise_dedicated");
      expect(updated.billingCycle).toBe("annual");
      expect(updated.monthlyQuotaLimit).toBe(100000);
    });
  });

  describe("2. Pre-Trained Forestry AI Model Marketplace", () => {
    it("lists specialized agroforestry, canopy biometrics, pathology, and temporal ReID models", () => {
      const models = service.getMarketplaceModels();
      expect(models.length).toBeGreaterThanOrEqual(4);

      const bioVision = models.find((m) => m.id === "ge_biovision_ultra");
      expect(bioVision).toBeDefined();
      expect(bioVision?.accuracyBenchmarkPct).toBeGreaterThan(98);
      expect(bioVision?.supportedSpeciesCount).toBeGreaterThan(150);
      expect(bioVision?.edgeCompatibleFormats).toContain("onnx");
      expect(bioVision?.edgeCompatibleFormats).toContain("tflite");

      const canopyNet = models.find((m) => m.id === "sentinel_canopy_deepnet");
      expect(canopyNet).toBeDefined();
      expect(canopyNet?.category).toBe("canopy_biometrics");

      const pathoScan = models.find((m) => m.id === "pathoscan_agroforestry");
      expect(pathoScan).toBeDefined();
      expect(pathoScan?.category).toBe("pathology_pest");

      const temporalReId = models.find((m) => m.id === "treeid_temporal_reid");
      expect(temporalReId).toBeDefined();
      expect(temporalReId?.category).toBe("temporal_reid");
    });

    it("handles purchasing a perpetual model license and generates an audit receipt", () => {
      const purchaseRes = service.purchaseMarketplaceModel("pathoscan_agroforestry", "perpetual_license");
      expect(purchaseRes.success).toBe(true);
      expect(purchaseRes.receiptId).toContain("RCPT-GE-AI");
      expect(purchaseRes.message).toContain("Perpetual License");

      const models = service.getMarketplaceModels();
      const purchased = models.find((m) => m.id === "pathoscan_agroforestry");
      expect(purchased?.isPurchased).toBe(true);
    });

    it("provisions a dedicated monthly cloud endpoint subscription and registers endpoint URI", () => {
      const endpointRes = service.purchaseMarketplaceModel("sentinel_canopy_deepnet", "dedicated_monthly_endpoint");
      expect(endpointRes.success).toBe(true);
      expect(endpointRes.message).toContain("Dedicated Vertex Endpoint");

      const state = service.getCurrentSubscriptionState();
      expect(state.activeDedicatedEndpoints.some((ep) => ep.includes("sentinel-canopy-dn"))).toBe(true);
    });
  });

  describe("3. Google Cloud Vertex AI Custom Fine-Tuning Pipeline", () => {
    it("launches a Supervised Fine-Tuning (SFT) training job with custom hyperparameters", () => {
      const job = service.launchVertexAiTrainingJob("WesternGhats-SFT-TestRun", {
        baseModel: "gemini-2.5-pro",
        epochs: 4,
        loraRank: 64,
        batchSize: 32,
        datasetSampleCount: 30000,
      });

      expect(job.jobId).toContain("JOB-VERTEX-SFT");
      expect(job.jobName).toBe("WesternGhats-SFT-TestRun");
      expect(job.status).toBe("training");
      expect(job.totalEpochs).toBe(4);
      expect(job.hyperparameters.loraRank).toBe(64);
      expect(job.hyperparameters.datasetSampleCount).toBe(30000);
      expect(job.checkpointUri).toContain("gs://hirwasparsh-model-vault/checkpoints");
      expect(job.verraComplianceCertified).toBe(true);
      expect(job.trainingLogs.length).toBeGreaterThanOrEqual(3);
    });

    it("exports trained model weights to edge formats (ONNX / TFLite)", () => {
      const jobs = service.getTrainingJobs();
      const completedJob = jobs.find((j) => j.status === "completed") || jobs[0];

      const onnxExport = service.exportModelWeights(completedJob.jobId, "onnx");
      expect(onnxExport.exportUri).toContain(".onnx");
      expect(onnxExport.bundleSizeBytes).toBeGreaterThan(50000000);
      expect(onnxExport.verificationChecksumSha256).toContain("SHA256");

      const tfliteExport = service.exportModelWeights(completedJob.jobId, "tflite");
      expect(tfliteExport.exportUri).toContain(".tflite");
      expect(tfliteExport.bundleSizeBytes).toBeLessThan(onnxExport.bundleSizeBytes);
    });
  });
});
