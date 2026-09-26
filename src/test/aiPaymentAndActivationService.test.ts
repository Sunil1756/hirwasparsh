import { describe, it, expect, beforeEach } from "vitest";
import {
  aiPaymentAndActivationService,
  AiPaymentAndActivationService,
} from "../services/aiPaymentAndActivationService";

describe("PHASE 11 — Enterprise AI Payment & Activation Service Suite", () => {
  let service: AiPaymentAndActivationService;

  beforeEach(() => {
    service = new AiPaymentAndActivationService();
  });

  describe("1. Enterprise Tiers & Pricing Catalog", () => {
    it("returns active tiers including monthly, annual, and perpetual options", () => {
      const tiers = service.getEnterpriseTiers();
      expect(tiers.length).toBe(3);

      const monthly = tiers.find((t) => t.id === "enterprise_dedicated_monthly");
      expect(monthly).toBeDefined();
      expect(monthly?.priceUsd).toBe(299);
      expect(monthly?.priceInr).toBe(24999);

      const annual = tiers.find((t) => t.id === "enterprise_dedicated_annual");
      expect(annual).toBeDefined();
      expect(annual?.priceUsd).toBe(2870);
      expect(annual?.priceInr).toBe(239990);

      const perpetual = tiers.find((t) => t.id === "perpetual_model_sovereignty");
      expect(perpetual).toBeDefined();
      expect(perpetual?.priceUsd).toBe(999);
      expect(perpetual?.priceInr).toBe(79999);
    });
  });

  describe("2. Checkout Processing & Instant Activation", () => {
    it("processes Credit Card payment and returns complete enterprise activation result", async () => {
      const result = await service.processEnterpriseCheckout(
        "enterprise_dedicated_annual",
        {
          gateway: "credit_card",
          billingName: "Dr. Sameer Patil",
          billingEmail: "sameer.patil@agroforestry-mrv.org",
          organizationName: "Maharashtra Agroforestry Foundation",
          cardLast4: "4242",
          cardBrand: "Visa Enterprise",
        },
        "USD"
      );

      expect(result.orderStatus).toBe("succeeded");
      expect(result.transactionId).toContain("TXN-GE-ENT");
      expect(result.licenseKey).toContain("GE-ENT-LIC");
      expect(result.amountPaidUsd).toBe(2870);
      expect(result.allocatedMonthlyQuota).toBe(1500000);
      expect(result.dedicatedVertexEndpointUri).toContain("aiplatform.googleapis.com");
      expect(result.unlockedFeatures.length).toBeGreaterThanOrEqual(5);
      expect(result.unlockedFeatures.some((f) => f.includes("Gemini 2.5 Pro"))).toBe(true);
      expect(result.unlockedFeatures.some((f) => f.includes("TPU v5e"))).toBe(true);
      expect(result.verraComplianceCertificateNumber).toContain("VERRA-VM0047");
      expect(result.taxInvoiceSummary.totalAmount).toBeGreaterThan(2870);
    });

    it("processes Indian Razorpay UPI payment in INR and computes GST properly", async () => {
      const result = await service.processEnterpriseCheckout(
        "enterprise_dedicated_monthly",
        {
          gateway: "razorpay_upi",
          billingName: "Rajesh Shinde",
          billingEmail: "rajesh@sahayadri-trust.in",
          upiId: "rajesh@okicici",
          organizationName: "Sahyadri Bio-Shield NGO",
          gstNumber: "27AABCU9603R1ZM",
        },
        "INR"
      );

      expect(result.gatewayUsed).toBe("razorpay_upi");
      expect(result.currency).toBe("INR");
      expect(result.amountPaidInr).toBe(24999);
      expect(result.taxInvoiceSummary.baseAmount).toBe(24999);
      expect(result.taxInvoiceSummary.gstAmount).toBe(4499.82);
      expect(result.taxInvoiceSummary.totalAmount).toBe(29498.82);
      expect(result.taxInvoiceSummary.hsnSacCode).toContain("998314");
    });

    it("processes Corporate Purchase Order (PO) invoicing", async () => {
      const result = await service.processEnterpriseCheckout(
        "perpetual_model_sovereignty",
        {
          gateway: "corporate_po",
          billingName: "Amitabh Sen",
          billingEmail: "procurement@tatatrusts.org",
          organizationName: "Tata Community Afforestation Initiative",
          poNumber: "PO-TATA-2026-9901",
        },
        "USD"
      );

      expect(result.gatewayUsed).toBe("corporate_po");
      expect(result.allocatedMonthlyQuota).toBe(9999999);
      expect(result.taxInvoiceSummary.billingEntity).toBe("Tata Community Afforestation Initiative");
    });
  });

  describe("3. License Key Verification & Cryptographic Integrity", () => {
    it("verifies and looks up active enterprise license key records", async () => {
      const created = await service.processEnterpriseCheckout(
        "enterprise_dedicated_monthly",
        {
          gateway: "credit_card",
          billingName: "Ananya Sharma",
          billingEmail: "ananya@greenearth.org",
        },
        "USD"
      );

      const verified = service.verifyLicenseKey(created.licenseKey);
      expect(verified).toBeDefined();
      expect(verified?.transactionId).toBe(created.transactionId);
      expect(verified?.dedicatedVertexEndpointUri).toBe(created.dedicatedVertexEndpointUri);

      const invalid = service.verifyLicenseKey("INVALID-KEY-12345");
      expect(invalid).toBeNull();
    });
  });
});
