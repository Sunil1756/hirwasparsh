import { describe, it, expect, beforeEach } from "vitest";
import { getGeminiApiKey, setGeminiApiKey } from "../lib/gemini";
import { realCommunicationGatewayService } from "../services/realCommunicationGatewayService";
import fs from "fs";
import path from "path";

describe("Security Audit: Secrets Moved to Server-Side Endpoints", () => {
  beforeEach(() => {
    // Clean mock environment
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it("does not leak secrets into client localStorage", () => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("green_gemini_api_key", "AIzaSyLeakedSecretKey123");
      window.localStorage.setItem("gemini_api_key", "AIzaSyAnotherLeakedSecret");

      // Invoking setGeminiApiKey purges legacy keys
      setGeminiApiKey();

      expect(window.localStorage.getItem("green_gemini_api_key")).toBeNull();
      expect(window.localStorage.getItem("gemini_api_key")).toBeNull();
    }
  });

  it("returns server-managed status rather than exposing raw API keys to client", () => {
    const key = getGeminiApiKey();
    expect(key).toBe("server-managed");
    expect(key).not.toContain("AIzaSy");
  });

  it("provides whatsapp and sms dispatch without client-side secrets", async () => {
    const res = await realCommunicationGatewayService.sendWhatsAppNotification({
      phone: "9876543210",
      treeName: "Neem Sapling #402",
      species: "Azadirachta indica",
      confidence: 99,
    });

    expect(res.channel).toBe("whatsapp");
    expect(res.success).toBe(true);
    expect(res.whatsappDeepLink).toBeDefined();
    expect(res.whatsappDeepLink).toContain("wa.me/919876543210");
    // Ensure no secret tokens leaked into the returned result
    expect(JSON.stringify(res)).not.toContain("EAAB");
    expect(JSON.stringify(res)).not.toContain("Bearer");
  });

  it("confirms serverless edge API endpoints exist in api/ directory", () => {
    const geminiApiPath = path.resolve(__dirname, "../../api/gemini.ts");
    const commApiPath = path.resolve(__dirname, "../../api/communication-gateway.ts");

    expect(fs.existsSync(geminiApiPath)).toBe(true);
    expect(fs.existsSync(commApiPath)).toBe(true);

    const geminiContent = fs.readFileSync(geminiApiPath, "utf8");
    const commContent = fs.readFileSync(commApiPath, "utf8");

    // Must use Edge Runtime
    expect(geminiContent).toContain('runtime: "edge"');
    expect(commContent).toContain('runtime: "edge"');

    // Must access server-side environment variables
    expect(geminiContent).toContain("process.env.GEMINI_API_KEY");
    expect(commContent).toContain("process.env.WHATSAPP_ACCESS_TOKEN");
  });

  it("verifies supabase edge function send-whatsapp exists for dual serverless architecture", () => {
    const supabaseFnPath = path.resolve(__dirname, "../../supabase/functions/send-whatsapp/index.ts");
    expect(fs.existsSync(supabaseFnPath)).toBe(true);

    const content = fs.readFileSync(supabaseFnPath, "utf8");
    expect(content).toContain("Deno.env.get");
    expect(content).toContain("WHATSAPP_ACCESS_TOKEN");
  });
});
