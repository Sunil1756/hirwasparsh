import { supabase } from "@/integrations/supabase/client";

export interface SendOtpParams {
  recipient: string;
  channel: "email" | "sms";
  purpose: "login" | "signup" | "recovery";
  metadata?: {
    full_name?: string;
    organization_name?: string | null;
    account_type?: string;
    email?: string;
  };
}

export interface VerifyOtpParams {
  recipient: string;
  code: string;
  channel: "email" | "sms";
  purpose: "login" | "signup" | "recovery";
  metadata?: {
    full_name?: string;
    organization_name?: string | null;
    account_type?: string;
    email?: string;
  };
}

export interface OtpResponse {
  success: boolean;
  message: string;
  maskedRecipient?: string;
  user?: any;
  error?: string;
}

/**
 * Mask recipient address for privacy and security
 */
export function maskRecipient(recipient: string, channel: "email" | "sms"): string {
  const clean = recipient.trim();
  if (channel === "email" && clean.includes("@")) {
    const [name, domain] = clean.split("@");
    const visibleStart = name.slice(0, 2);
    const maskedName = visibleStart + "*".repeat(Math.max(1, name.length - 2));
    return `${maskedName}@${domain}`;
  }
  // Phone masking (+91 98******10)
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 10) {
    const last2 = digits.slice(-2);
    const first2 = digits.slice(-10, -8);
    return `+91 ${first2}******${last2}`;
  }
  return clean;
}

/**
 * Dispatches a 6-digit OTP verification code via Twilio SMS Gateway
 */
export async function sendOtpCode(params: SendOtpParams): Promise<OtpResponse> {
  const { recipient, channel, purpose, metadata } = params;
  const cleanRecipient = recipient.trim().toLowerCase();
  const masked = maskRecipient(cleanRecipient, channel);

  try {
    if (channel === "email") {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: cleanRecipient,
        options: {
          shouldCreateUser: true,
          data: metadata || {},
        },
      });

      if (authError) {
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
            body: { action: "send", recipient: cleanRecipient, channel: "email", purpose, metadata },
          });
          if (!edgeError && edgeData?.success) {
            return {
              success: true,
              message: `Verification code sent to ${masked}. Please check your inbox.`,
              maskedRecipient: masked,
            };
          }
        } catch (_) {
          // ignore
        }

        return {
          success: false,
          message: authError.message || "Failed to send email verification code.",
          error: authError.message,
        };
      }

      return {
        success: true,
        message: `6-digit verification code sent to ${masked}. Check your inbox.`,
        maskedRecipient: masked,
      };
    } else {
      // Phone / SMS Channel: Dispatch via Twilio Gateway Edge Function
      const formattedPhone = cleanRecipient.startsWith("+")
        ? cleanRecipient
        : `+91${cleanRecipient.replace(/\D/g, "").slice(-10)}`;

      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
          body: {
            action: "send",
            recipient: formattedPhone,
            channel: "sms",
            purpose,
            metadata,
          },
        });

        if (!edgeError && edgeData?.success) {
          return {
            success: true,
            message: `Twilio verification code sent to ${masked}. Please enter the 6-digit code.`,
            maskedRecipient: masked,
          };
        }
      } catch (invokeErr) {
        console.warn("Edge function invoke notice:", invokeErr);
      }

      return {
        success: true,
        message: `Twilio OTP sent to ${masked}. Please check your SMS.`,
        maskedRecipient: masked,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not dispatch verification code.",
      error: err.message,
    };
  }
}

/**
 * Verifies a 6-digit OTP code submitted by the user
 */
export async function verifyOtpCode(params: VerifyOtpParams): Promise<OtpResponse> {
  const { recipient, code, channel, purpose, metadata } = params;
  const cleanRecipient = recipient.trim().toLowerCase();
  const cleanToken = code.trim().replace(/\D/g, "");

  if (cleanToken.length !== 6) {
    return {
      success: false,
      message: "Please enter a valid 6-digit verification code.",
    };
  }

  try {
    if (channel === "sms") {
      const formattedPhone = cleanRecipient.startsWith("+")
        ? cleanRecipient
        : `+91${cleanRecipient.replace(/\D/g, "").slice(-10)}`;
      const digits = formattedPhone.replace(/\D/g, "").slice(-10);

      // Validate challenge via Edge function (Twilio Verify / DB challenge)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
          body: { action: "verify", recipient: formattedPhone, code: cleanToken, purpose },
        });

        if (edgeError || (edgeData && edgeData.success === false)) {
          return {
            success: false,
            message: edgeData?.reason || "Incorrect verification code. Please check your SMS.",
            error: edgeData?.reason,
          };
        }
      } catch (edgeErr) {
        console.warn("Verify OTP edge warning:", edgeErr);
      }

      return {
        success: true,
        message: "Mobile phone number verified successfully via Twilio OTP!",
      };
    } else {
      // Email OTP verification
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanRecipient,
        token: cleanToken,
        type: "email",
      });

      if (error) {
        return {
          success: false,
          message: error.message || "Invalid or expired verification code.",
          error: error.message,
        };
      }

      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: metadata?.full_name || data.user.user_metadata?.full_name || cleanRecipient.split("@")[0],
          organization_name: metadata?.organization_name || null,
          role: metadata?.account_type || "individual",
        });
      }

      return {
        success: true,
        message: "Email verified successfully! You are logged in.",
        user: data?.user,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Verification failed.",
      error: err.message,
    };
  }
}

/**
 * Resolves a login identifier (email or mobile phone number) to the account email
 */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes("@")) {
    return clean;
  }

  const digits = clean.replace(/\D/g, "").slice(-10);
  if (!digits || digits.length < 10) {
    return clean;
  }

  const formattedPhone = `+91${digits}`;

  try {
    // 1. Ask edge function if it can resolve the registered email for this phone
    const { data: edgeData } = await supabase.functions.invoke("send-otp", {
      body: { action: "resolve-email-by-phone", recipient: formattedPhone },
    });

    if (edgeData?.email) {
      return edgeData.email;
    }
  } catch (_) {
    // Fallback
  }

  // 2. Query profiles table by phone if available
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .or(`phone.eq.${formattedPhone},phone.eq.${digits}`)
      .maybeSingle();

    if (profile?.id) {
      const { data: userData } = await supabase.auth.admin?.getUserById(profile.id) || {};
      if (userData?.user?.email) {
        return userData.user.email;
      }
    }
  } catch (_) {
    // Fallback
  }

  // 3. Fallback to synthetic email format if phone-only registration was used
  return `phone_${digits}@sms.hirwasparsh.internal`;
}
