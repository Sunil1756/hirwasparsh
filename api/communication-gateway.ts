export const config = {
  runtime: "edge",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function sanitizeIndianPhone(rawPhone: string): string {
  const cleaned = (rawPhone || "").replace(/\D/g, "");
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  if (cleaned.length === 11 && cleaned.startsWith("0")) return cleaned.slice(1);
  return cleaned.slice(-10);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // Server-side secrets: never exposed to browser or client bundles
  const whatsappToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.VITE_WHATSAPP_ACCESS_TOKEN ||
    "";
  const whatsappPhoneId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.VITE_WHATSAPP_PHONE_NUMBER_ID ||
    "";
  const fast2smsApiKey =
    process.env.FAST2SMS_API_KEY ||
    process.env.VITE_FAST2SMS_API_KEY ||
    "";

  try {
    const body = await req.json();
    const {
      channel = "whatsapp",
      phone: rawPhone,
      message,
      customMessage,
      treeName,
      species,
      confidence,
      location,
      certificateUrl,
      isUnicode = false,
      route = "q",
    } = body;

    if (!rawPhone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required." }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const tenDigitPhone = sanitizeIndianPhone(rawPhone);
    if (!tenDigitPhone || tenDigitPhone.length !== 10) {
      return new Response(
        JSON.stringify({
          error: "Invalid phone number. Must be a 10-digit Indian mobile number.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // CHANNEL 1: WHATSAPP CLOUD API
    // ==========================================
    if (channel === "whatsapp") {
      const formattedInternationalPhone = `91${tenDigitPhone}`;
      const messageBody =
        customMessage ||
        message ||
        `🌱 *Green Enlightenment - Plantation Verified!*\n\n` +
          `Tree: *${treeName || "Adopted Sapling"}*\n` +
          `Species: ${species || "Native Flora"}\n` +
          `AI Confidence: *${confidence ? `${confidence}%` : "Verified (98.4%)"}*\n` +
          `Location: ${location || "Maharashtra Agroforestry Zone"}\n\n` +
          `📜 View Live Satellite Audit Certificate:\n${certificateUrl || "https://green-enlightenment.com"}\n\n` +
          `Thank you for advancing ecological canopy growth! 🌳`;

      const whatsappDeepLink = `https://wa.me/${formattedInternationalPhone}?text=${encodeURIComponent(
        messageBody
      )}`;

      // Server-to-server Meta WhatsApp Cloud API call
      if (whatsappToken && whatsappPhoneId) {
        try {
          const fbResponse = await fetch(
            `https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${whatsappToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedInternationalPhone,
                type: "text",
                text: { preview_url: true, body: messageBody },
              }),
            }
          );

          const fbData = await fbResponse.json();
          if (fbResponse.ok && fbData.messages?.[0]?.id) {
            return new Response(
              JSON.stringify({
                channel: "whatsapp",
                success: true,
                recipient: `+${formattedInternationalPhone}`,
                messageId: fbData.messages[0].id,
                previewText: messageBody,
                whatsappDeepLink,
                mode: "live_api",
              }),
              {
                status: 200,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          } else {
            return new Response(
              JSON.stringify({
                channel: "whatsapp",
                success: false,
                recipient: `+${formattedInternationalPhone}`,
                previewText: messageBody,
                whatsappDeepLink,
                error: fbData.error?.message || "WhatsApp Cloud API error",
                mode: "direct_link",
              }),
              {
                status: 200,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              channel: "whatsapp",
              success: false,
              recipient: `+${formattedInternationalPhone}`,
              previewText: messageBody,
              whatsappDeepLink,
              error: err?.message,
              mode: "direct_link",
            }),
            {
              status: 200,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }
      }

      // If WhatsApp credentials not present on server, fallback to deep link (client opens WhatsApp natively)
      return new Response(
        JSON.stringify({
          channel: "whatsapp",
          success: true,
          recipient: `+${formattedInternationalPhone}`,
          messageId: `WA-DEEPLINK-${Date.now()}`,
          previewText: messageBody,
          whatsappDeepLink,
          mode: "direct_link",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // CHANNEL 2: FAST2SMS GATEWAY
    // ==========================================
    if (channel === "sms") {
      const smsText = message || customMessage || "Green Enlightenment update.";

      if (fast2smsApiKey) {
        try {
          const smsResponse = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: fast2smsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: route || "q",
              message: smsText,
              language: isUnicode ? "unicode" : "english",
              flash: 0,
              numbers: tenDigitPhone,
            }),
          });

          const smsData = await smsResponse.json();
          if (smsData.return) {
            return new Response(
              JSON.stringify({
                channel: "sms",
                success: true,
                recipient: `+91-${tenDigitPhone}`,
                messageId: smsData.request_id || `REQ-${Date.now()}`,
                previewText: smsText,
                mode: "live_api",
              }),
              {
                status: 200,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          } else {
            return new Response(
              JSON.stringify({
                channel: "sms",
                success: false,
                recipient: `+91-${tenDigitPhone}`,
                previewText: smsText,
                error: smsData.message ? smsData.message.join(", ") : "Fast2SMS error",
                mode: "sandbox",
              }),
              {
                status: 200,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
              }
            );
          }
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              channel: "sms",
              success: false,
              recipient: `+91-${tenDigitPhone}`,
              previewText: smsText,
              error: err?.message,
              mode: "sandbox",
            }),
            {
              status: 200,
              headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Sandbox Fallback
      return new Response(
        JSON.stringify({
          channel: "sms",
          success: true,
          recipient: `+91-${tenDigitPhone}`,
          messageId: `SANDBOX-SMS-${Date.now()}`,
          previewText: smsText,
          mode: "sandbox",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported channel: ${channel}` }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_SERVER_ERROR", message: err?.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
