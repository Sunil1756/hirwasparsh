// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { realRazorpayPaymentService, INSTITUTIONAL_PLANS } from "../services/realRazorpayPaymentService";
import { aiModelTrainingAndSubscriptionService } from "../services/aiModelTrainingAndSubscriptionService";

describe("Real Razorpay Payment & Subscription Gateway Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("1. Pricing Plans & GST Calculation Integrity", () => {
    expect(INSTITUTIONAL_PLANS.ngo_pro.priceAnnualInr).toBe(4999);
    expect(INSTITUTIONAL_PLANS.csr_enterprise.priceAnnualInr).toBe(24999);

    // Calculate annual NGO Pro plan breakdown
    const breakdown = realRazorpayPaymentService.calculateBreakdown("ngo_pro", "annual", "INR");
    const expectedBase = 4999 * 12; // 59,988
    const expectedGst = Math.round(expectedBase * 0.18 * 100) / 100; // 10,797.84
    const expectedTotal = expectedBase + expectedGst; // 70,785.84

    expect(breakdown.baseAmount).toBe(expectedBase);
    expect(breakdown.gstAmount).toBe(expectedGst);
    expect(breakdown.totalAmount).toBe(expectedTotal);
    expect(breakdown.amountPaise).toBe(Math.round(expectedTotal * 100));
  });

  it("2. Merchant Key Management & Storage Override", () => {
    // Default fallback
    const defaultKey = realRazorpayPaymentService.getRazorpayKeyId();
    expect(defaultKey).toBeDefined();

    // Set custom live key
    realRazorpayPaymentService.setMerchantKeyId("rzp_live_test_merchant_key_999");
    expect(realRazorpayPaymentService.getRazorpayKeyId()).toBe("rzp_live_test_merchant_key_999");
    expect(realRazorpayPaymentService.isCustomKeyConfigured()).toBe(true);

    // Clear key
    realRazorpayPaymentService.setMerchantKeyId("");
    expect(realRazorpayPaymentService.getRazorpayKeyId()).toContain("rzp_test_");
  });

  it("3. Order Creation with Customer & Tax Metadata", async () => {
    const customer = {
      name: "Ramesh Sharma",
      email: "ramesh@kisan-trust.org",
      phone: "+91 9822198765",
      organizationName: "Kisan Agro Trust",
      gstin: "27AAECK1234F1Z5",
    };

    const order = await realRazorpayPaymentService.createOrder(
      "ngo_pro",
      "annual",
      "INR",
      customer,
      "razorpay"
    );

    expect(order.orderId).toContain("order_ngo_");
    expect(order.planId).toBe("ngo_pro");
    expect(order.customerDetails.gstin).toBe("27AAECK1234F1Z5");
    expect(order.baseAmount).toBeGreaterThan(0);
    expect(order.totalAmount).toBeGreaterThan(order.baseAmount);
  });

  it("4. Payment Recording, GST Tax Invoice, and License Key Provisioning", async () => {
    const customer = {
      name: "Sunita Deshmukh",
      email: "sunita@csr-corp.com",
      phone: "+91 9811122233",
      organizationName: "Deshmukh CSR Foundation",
      gstin: "27AACCD9999P1ZV",
    };

    const order = await realRazorpayPaymentService.createOrder(
      "csr_enterprise",
      "annual",
      "INR",
      customer,
      "razorpay"
    );

    const result = await realRazorpayPaymentService.recordPaymentAndActivate({
      paymentId: "pay_test_88776655",
      orderId: order.orderId,
      signature: "sig_valid_sha256_mock",
      method: "upi",
      order,
    });

    expect(result.success).toBe(true);
    expect(result.paymentId).toBe("pay_test_88776655");
    expect(result.invoiceNumber).toContain("INV-2026-GST-");
    expect(result.licenseKey).toContain("LIC-GE-MRV-CSR_ENTERPRISE-");
    expect(result.subscriptionEnd).toBeDefined();

    // Verify global active plan upgraded
    const activeSub = aiModelTrainingAndSubscriptionService.getCurrentSubscriptionState();
    expect(activeSub.activePlanId).toBe("enterprise_dedicated");
  });

  it("5. Corporate Purchase Order Workflow Execution", async () => {
    const customer = {
      name: "State Forest Officer",
      email: "procurement@forest.gov.in",
      organizationName: "Maharashtra State Forest Department",
    };

    const order = await realRazorpayPaymentService.createOrder(
      "csr_enterprise",
      "annual",
      "INR",
      customer,
      "corporate_po"
    );

    const result = await realRazorpayPaymentService.processCorporatePoOrder(
      order,
      "PO-2026-MAHA-0091"
    );

    expect(result.success).toBe(true);
    expect(result.paymentId).toContain("PO-PO-2026-MAHA-0091");
    expect(result.signature).toContain("po_verified_PO-2026-MAHA-0091");
  });
});
