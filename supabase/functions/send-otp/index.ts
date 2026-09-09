import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: Compute SHA-256 hex hash
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper: Generate a secure 6-digit numerical OTP code
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, recipient, channel, purpose, code, metadata } = body;

    if (!recipient || typeof recipient !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Recipient is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanRecipient = recipient.trim().toLowerCase();
    const targetPurpose = purpose || "login";
    const targetChannel = channel || (cleanRecipient.includes("@") ? "email" : "sms");

    // -------------------------------------------------------------
    // ACTION: SEND OTP CODE
    // -------------------------------------------------------------
    if (action === "send" || !action) {
      const generatedCode = generateSecureOtp();
      const codeHash = await sha256(generatedCode);

      // Save challenge into database
      const { error: dbError } = await supabase.rpc("create_otp_challenge", {
        p_recipient: cleanRecipient,
        p_channel: targetChannel,
        p_otp_hash: codeHash,
        p_purpose: targetPurpose,
        p_metadata: metadata || {},
        p_validity_minutes: 10,
      });

      if (dbError) {
        console.error("DB Error storing OTP challenge:", dbError);
      }

      let dispatchResult = { dispatched: true, provider: "supabase_auth" };

      // 1. Channel: EMAIL
      if (targetChannel === "email") {
        try {
          // Trigger Supabase native Email OTP
          const { error: authError } = await supabase.auth.signInWithOtp({
            email: cleanRecipient,
            options: {
              shouldCreateUser: targetPurpose === "signup",
              data: metadata || {},
            },
          });

          if (authError) {
            console.warn("Supabase Auth Email OTP warning:", authError.message);
          }
        } catch (e) {
          console.error("Email dispatch exception:", e);
        }
      }

      // 2. Channel: SMS / Phone
      if (targetChannel === "sms") {
        const FAST2SMS_API_KEY = Deno.env.get("FAST2SMS_API_KEY");
        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

        // If Twilio is configured
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
          try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
            const params = new URLSearchParams({
              To: cleanRecipient,
              From: TWILIO_FROM_NUMBER,
              Body: `Your Green Enlightenment verification code is: ${generatedCode}. Valid for 10 minutes. Do not share this code.`,
            });

            const res = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });

            const twilioData = await res.json();
            dispatchResult = { dispatched: res.ok, provider: "twilio" };
          } catch (err) {
            console.error("Twilio send error:", err);
          }
        } else if (FAST2SMS_API_KEY) {
          try {
            // Fast2SMS integration for Indian numbers
            const digits = cleanRecipient.replace(/\D/g, "").slice(-10);
            const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
              method: "POST",
              headers: {
                authorization: FAST2SMS_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                variables_values: generatedCode,
                route: "otp",
                numbers: digits,
              }),
            });
            dispatchResult = { dispatched: res.ok, provider: "fast2sms" };
          } catch (err) {
            console.error("Fast2SMS error:", err);
          }
        } else {
          // Fallback to Supabase native phone auth
          try {
            const { error: phoneError } = await supabase.auth.signInWithOtp({
              phone: cleanRecipient,
              options: { channel: "sms", data: metadata || {} },
            });
            if (phoneError) {
              console.warn("Supabase native phone OTP notice:", phoneError.message);
            }
          } catch (err) {
            console.warn("Phone dispatch exception:", err);
          }
        }
      }

      const maskedRecipient =
        targetChannel === "email"
          ? cleanRecipient.replace(/(.{2})(.*)(@.*)/, "$1***$3")
          : cleanRecipient.replace(/(\+\d{2})(\d{2})(.*)(\d{2})/, "$1 $2******$4");

      return new Response(
        JSON.stringify({
          success: true,
          message: `Verification code sent to ${maskedRecipient}.`,
          channel: targetChannel,
          recipient: maskedRecipient,
          expiresInMinutes: 10,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------
    // ACTION: VERIFY OTP CODE
    // -------------------------------------------------------------
    if (action === "verify") {
      if (!code || typeof code !== "string" || code.trim().length !== 6) {
        return new Response(
          JSON.stringify({ success: false, reason: "Please provide a valid 6-digit code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanCode = code.trim();
      const codeHash = await sha256(cleanCode);

      const { data, error } = await supabase.rpc("verify_otp_challenge", {
        p_recipient: cleanRecipient,
        p_otp_hash: codeHash,
        p_purpose: targetPurpose,
      });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, reason: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'send' or 'verify'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
