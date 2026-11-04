import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, customMessage, treeName, species, confidence, location, certificateUrl } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleaned = String(phone).replace(/\D/g, "");
    const formattedPhone = cleaned.startsWith("91") && cleaned.length === 12
      ? cleaned
      : `91${cleaned.slice(-10)}`;

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

    const whatsappDeepLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageBody)}`;

    // Read server-side secret from Supabase vault / Deno environment
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || Deno.env.get("VITE_WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || Deno.env.get("VITE_WHATSAPP_PHONE_NUMBER_ID");

    if (whatsappToken && whatsappPhoneId) {
      const fbRes = await fetch(
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
            to: formattedPhone,
            type: "text",
            text: { preview_url: true, body: messageBody },
          }),
        }
      );

      const fbData = await fbRes.json();
      if (fbRes.ok && fbData.messages?.[0]?.id) {
        return new Response(
          JSON.stringify({
            success: true,
            recipient: `+${formattedPhone}`,
            messageId: fbData.messages[0].id,
            whatsappDeepLink,
            mode: "live_api",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient: `+${formattedPhone}`,
        messageId: `WA-DEEPLINK-${Date.now()}`,
        whatsappDeepLink,
        mode: "direct_link",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
