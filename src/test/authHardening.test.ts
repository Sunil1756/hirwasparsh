import { describe, it, expect } from "vitest";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com",
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "dispostable.com",
  "trashmail.com",
  "yopmail.com",
  "fake.com",
  "test.com",
  "asdf.com",
  "example.com",
  "temp-mail.org",
  "throwawaymail.com",
  "fakeinbox.com",
  "getairmail.com",
  "maildrop.cc",
  "sharklasers.com",
  "nada.ltd",
  "mohmal.com",
  "crazymailing.com",
  "burnermail.io",
  "10mail.org",
  "generator.email",
  "emailondeck.com",
  "mytemp.email",
  "tempail.com",
  "fakemailgenerator.com",
  "inboxbear.com",
  "fakemail.net",
  "tmail.ws",
  "trash-mail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "sample.com",
  "dummy.com",
  "invalid.com",
  "mailsac.com",
  "burner.email",
  "getnada.com",
  "spamgourmet.com",
  "throwaway.email",
  "mytempmail.com",
  "tempemail.net",
  "emailfake.com",
  "throwawaymail.net",
  "temporary-mail.net",
  "crazymail.com",
  "mailnesia.com",
  "tmailor.com",
  "protonmail.invalid",
  "spam4.me",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "tempmailaddress.com",
  "discard.email",
  "discardmail.com",
  "spambox.us",
  "trashmail.net",
  "trashmail.me",
  "trashmail.org",
]);

function validateGenuineEmail(email: string): { valid: boolean; reason?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, reason: "Email address is required." };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email address (e.g. name@gmail.com)." };
  }

  const [localPart, domain] = trimmed.split("@");
  if (!localPart || localPart.length < 3) {
    return { valid: false, reason: "Email username is too short (min 3 characters)." };
  }

  if (
    /^(.)\1+$/.test(localPart) ||
    ["asdf", "test", "fake", "temp", "admin", "null", "aaaa", "user", "demo"].includes(localPart)
  ) {
    return { valid: false, reason: "Please enter a real personal or corporate email username." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Temporary and disposable email domains are blocked for security.",
    };
  }

  return { valid: true };
}

function evaluatePassword(pwd: string) {
  const hasMinLen = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

  let score = 0;
  if (hasMinLen) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  return {
    score,
    hasMinLen,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isStrong: score >= 5,
  };
}

function validatePhoneNumber(raw: string, code = "+91") {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { valid: false, reason: "Mobile number is required." };

  if (code === "+91") {
    let clean = digits;
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(2);
    }
    if (clean.length !== 10) {
      return { valid: false, reason: "Indian mobile number must be exactly 10 digits." };
    }
    if (!/^[6-9]/.test(clean)) {
      return { valid: false, reason: "Indian mobile numbers must start with 6, 7, 8, or 9." };
    }
    if (/^(.)\1{9}$/.test(clean)) {
      return { valid: false, reason: "Repeated invalid digits detected (e.g. 9999999999)." };
    }
    return { valid: true, formatted: `+91${clean}`, digits: clean };
  }

  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, reason: "Phone number must be between 8 and 15 digits." };
  }

  return { valid: true, formatted: `${code}${digits}`, digits };
}

describe("Authentication Hardening & Validation Suite", () => {
  describe("validateGenuineEmail", () => {
    it("accepts legitimate user and corporate emails", () => {
      expect(validateGenuineEmail("rohit.patil@gmail.com").valid).toBe(true);
      expect(validateGenuineEmail("contact@sahyadri-ngo.org").valid).toBe(true);
      expect(validateGenuineEmail("priya_sharma12@outlook.com").valid).toBe(true);
    });

    it("rejects disposable / temporary email domains", () => {
      expect(validateGenuineEmail("user123@tempmail.com").valid).toBe(false);
      expect(validateGenuineEmail("random_user@mailinator.com").valid).toBe(false);
      expect(validateGenuineEmail("test@yopmail.com").valid).toBe(false);
      expect(validateGenuineEmail("hacker@guerrillamail.com").valid).toBe(false);
    });

    it("rejects generic / spammy usernames and repeated characters", () => {
      expect(validateGenuineEmail("aaaaaa@gmail.com").valid).toBe(false);
      expect(validateGenuineEmail("asdf@gmail.com").valid).toBe(false);
      expect(validateGenuineEmail("test@gmail.com").valid).toBe(false);
      expect(validateGenuineEmail("ab@gmail.com").valid).toBe(false);
    });
  });

  describe("evaluatePassword", () => {
    it("correctly identifies strong 5-tier passwords", () => {
      const evalStrong = evaluatePassword("GreenPlant#2026");
      expect(evalStrong.isStrong).toBe(true);
      expect(evalStrong.score).toBe(5);
      expect(evalStrong.hasMinLen).toBe(true);
      expect(evalStrong.hasUpper).toBe(true);
      expect(evalStrong.hasLower).toBe(true);
      expect(evalStrong.hasNumber).toBe(true);
      expect(evalStrong.hasSpecial).toBe(true);
    });

    it("rejects weak passwords lacking numbers or symbols or length", () => {
      expect(evaluatePassword("short").isStrong).toBe(false);
      expect(evaluatePassword("alllowercase123").isStrong).toBe(false);
      expect(evaluatePassword("NOLOWERCASE123!").isStrong).toBe(false);
      expect(evaluatePassword("NoSpecialOrNumbers").isStrong).toBe(false);
    });
  });

  describe("validatePhoneNumber", () => {
    it("validates and formats legitimate 10-digit Indian numbers", () => {
      const res = validatePhoneNumber("9876543210", "+91");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+919876543210");
      expect(res.digits).toBe("9876543210");
    });

    it("strips country code prefix when typed in input", () => {
      const res = validatePhoneNumber("+91 98765 43210", "+91");
      expect(res.valid).toBe(true);
      expect(res.formatted).toBe("+919876543210");
    });

    it("rejects numbers starting with invalid digits (0-5) or repeated digits", () => {
      expect(validatePhoneNumber("1234567890", "+91").valid).toBe(false);
      expect(validatePhoneNumber("9999999999", "+91").valid).toBe(false);
      expect(validatePhoneNumber("8888888888", "+91").valid).toBe(false);
      expect(validatePhoneNumber("98765", "+91").valid).toBe(false);
    });
  });
});
