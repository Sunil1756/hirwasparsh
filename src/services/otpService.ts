import { supabase } from "@/integrations/supabase/client";

export interface SendOtpParams {
  recipient: string;
  channel: "email" | "sms";
  purpose: "login" | "signup" | "recovery";
  metadata?: {
    full_name?: string;
    organization_name?: string | null;
    account_type?: string;
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
 * Dispatches a 6-digit OTP verification code to the recipient
 */
export async function sendOtpCode(params: SendOtpParams): Promise<OtpResponse> {
  const { recipient, channel, purpose, metadata } = params;
  const cleanRecipient = recipient.trim().toLowerCase();
  const masked = maskRecipient(cleanRecipient, channel);

  try {
    if (channel === "email") {
      // 1. Send via Supabase Auth Email OTP
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: cleanRecipient,
        options: {
          shouldCreateUser: purpose === "signup",
          data: metadata || {},
        },
      });

      if (authError) {
        // If user not found on login tab
        if (
          purpose === "login" &&
          (authError.message.toLowerCase().includes("signups not allowed") ||
            authError.message.toLowerCase().includes("user not found"))
        ) {
          return {
            success: false,
            message: "No registered account found with this email. Please switch to the Sign Up tab first.",
            error: authError.message,
          };
        }

        // Try edge function fallback if available
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
          // ignore fallback error and return original
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
      // 2. Send via Phone / SMS OTP
      const formattedPhone = cleanRecipient.startsWith("+")
        ? cleanRecipient
        : `+91${cleanRecipient.replace(/\D/g, "").slice(-10)}`;

      // Attempt Supabase native phone auth first
      const { error: phoneError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: "sms",
          data: metadata || {},
        },
      });

      if (phoneError) {
        // Fallback to Edge function if SMS provider not configured in Supabase auth
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
            body: { action: "send", recipient: formattedPhone, channel: "sms", purpose, metadata },
          });

          if (!edgeError && edgeData?.success) {
            return {
              success: true,
              message: `Verification code sent to ${masked}.`,
              maskedRecipient: masked,
            };
          }
        } catch (_) {
          // continue to provider notice
        }

        const isProviderIssue =
          phoneError.message.toLowerCase().includes("unsupported phone provider") ||
          phoneError.message.toLowerCase().includes("sms provider");

        return {
          success: false,
          message: isProviderIssue
            ? "SMS delivery is not configured in this database environment. Please use 'Mobile + Password' or 'Email OTP' for instant verification."
            : phoneError.message,
          error: phoneError.message,
        };
      }

      return {
        success: true,
        message: `Verification code sent to ${masked}.`,
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
    if (channel === "email") {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanRecipient,
        token: cleanToken,
        type: "email",
      });

      if (error) {
        // Try fallback to Edge Function verification
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
            body: { action: "verify", recipient: cleanRecipient, code: cleanToken, purpose },
          });

          if (!edgeError && edgeData?.success) {
            return {
              success: true,
              message: "Verification successful! Welcome.",
            };
          }
        } catch (_) {
          // ignore
        }

        return {
          success: false,
          message: error.message || "Invalid or expired verification code.",
          error: error.message,
        };
      }

      // Upsert profile in Supabase profiles table
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
    } else {
      // Phone OTP Verification
      const formattedPhone = cleanRecipient.startsWith("+")
        ? cleanRecipient
        : `+91${cleanRecipient.replace(/\D/g, "").slice(-10)}`;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: cleanToken,
        type: "sms",
      });

      if (error) {
        // Try fallback to Edge Function verification
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke("send-otp", {
            body: { action: "verify", recipient: formattedPhone, code: cleanToken, purpose },
          });

          if (!edgeError && edgeData?.success) {
            return {
              success: true,
              message: "Verification successful! Welcome.",
            };
          }
        } catch (_) {
          // ignore
        }

        return {
          success: false,
          message: error.message || "Invalid or expired OTP code.",
          error: error.message,
        };
      }

      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: metadata?.full_name || `User ${formattedPhone.slice(-4)}`,
          organization_name: metadata?.organization_name || null,
          role: metadata?.account_type || "individual",
        });
      }

      return {
        success: true,
        message: "Mobile verified successfully! You are logged in.",
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
