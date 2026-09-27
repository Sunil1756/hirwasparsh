import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  realCommunicationGatewayService,
} from "../services/realCommunicationGatewayService";

describe("Real Communication Gateway Service (Fast2SMS & WhatsApp)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Sanitizes various Indian phone formats to clean 10-digit number", () => {
    expect(realCommunicationGatewayService.sanitizeIndianPhone("+91 9876543210")).toBe("9876543210");
    expect(realCommunicationGatewayService.sanitizeIndianPhone("09876543210")).toBe("9876543210");
    expect(realCommunicationGatewayService.sanitizeIndianPhone("98765-43210")).toBe("9876543210");
    expect(realCommunicationGatewayService.sanitizeIndianPhone("9876543210")).toBe("9876543210");
  });

  it("2. Validates phone number length and returns clear error for invalid numbers", async () => {
    const res = await realCommunicationGatewayService.sendSms({
      phone: "12345",
      message: "Test SMS",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Invalid Indian phone number");
  });

  it("3. Generates English and Marathi planter verification SMS copy", () => {
    const enMsg = realCommunicationGatewayService.getPlanterVerificationMessage("HS-101", "Banyan", 50, "en");
    expect(enMsg).toContain("Green Enlightenment");
    expect(enMsg).toContain("#HS-101");
    expect(enMsg).toContain("+50 Eco-Points");

    const mrMsg = realCommunicationGatewayService.getPlanterVerificationMessage("HS-101", "वड", 50, "mr");
    expect(mrMsg).toContain("हिरवास्पर्श");
    expect(mrMsg).toContain("इको-पॉइंट्स");
  });

  it("4. Dispatches live Fast2SMS when API key is provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        return: true,
        request_id: "F2S-REQ-9988",
        message: ["SMS sent successfully."],
      }),
    });
    globalThis.fetch = mockFetch;

    realCommunicationGatewayService.setFast2SmsApiKey("TEST_FAST2SMS_KEY");
    const res = await realCommunicationGatewayService.sendSms({
      phone: "9876543210",
      message: "Tree verified successfully!",
    });

    expect(res.success).toBe(true);
    expect(res.mode).toBe("live_api");
    expect(res.messageId).toBe("F2S-REQ-9988");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.fast2sms.com/dev/bulkV2",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("5. Generates 1-click WhatsApp web deep-link with pre-formatted tree certificate message", async () => {
    realCommunicationGatewayService.setWhatsAppCredentials("", "");
    const res = await realCommunicationGatewayService.sendWhatsAppNotification({
      phone: "9876543210",
      treeName: "Ancient Banyan #88",
      species: "Ficus benghalensis",
      confidence: 96.8,
      location: "Pune, Maharashtra",
      certificateUrl: "https://www.green-enlightenment.com/certificate/HS-88",
    });

    expect(res.success).toBe(true);
    expect(res.channel).toBe("whatsapp");
    expect(res.mode).toBe("direct_link");
    expect(res.whatsappDeepLink).toContain("https://wa.me/919876543210");
    expect(res.previewText).toContain("Ancient Banyan #88");
  });
});
