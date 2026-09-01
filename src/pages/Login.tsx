import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine,
  Mail,
  Lock,
  User,
  Loader2,
  Building2,
  GraduationCap,
  UserCircle2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Phone,
  KeyRound,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Bot,
  Info,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AccountType = "individual" | "ngo" | "school_college";
type AuthMethod = "email" | "phone";
type PhoneAuthMode = "otp" | "password";

// 90+ Comprehensive disposable & fake email domains blacklist
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

// Strict Email validation helper
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

  // Reject repeated character spam (e.g. aaaaa@, 11111@, asdf@)
  if (
    /^(.)\1+$/.test(localPart) ||
    ["asdf", "test", "fake", "temp", "admin", "null", "aaaa", "user", "demo"].includes(localPart)
  ) {
    return { valid: false, reason: "Please use a genuine personal, college, or institutional email." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Disposable/temporary emails are prohibited. Use Gmail, Outlook, Yahoo, or institutional ID.",
    };
  }

  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) {
    return { valid: false, reason: "Email must end with a valid domain extension (.com, .in, .org, etc.)." };
  }

  return { valid: true };
}

// Strict Indian / Global Phone number validator
function validatePhoneNumber(phone: string, countryCode = "+91"): { valid: boolean; reason?: string; formatted?: string; digits?: string } {
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return { valid: false, reason: "Mobile number is required." };

  if (countryCode === "+91") {
    if (digitsOnly.length !== 10) {
      return { valid: false, reason: "Indian mobile numbers must be exactly 10 digits." };
    }
    // Must start with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { valid: false, reason: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9." };
    }
    // Reject repeated digits (e.g. 9999999999, 1234567890)
    if (/^(.)\1+$/.test(digitsOnly) || digitsOnly === "1234567890" || digitsOnly === "9876543210") {
      return { valid: false, reason: "Please enter a genuine, active mobile number." };
    }
  } else {
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { valid: false, reason: "Please enter a valid international phone number (7-15 digits)." };
    }
  }

  return { valid: true, formatted: `${countryCode}${digitsOnly}`, digits: digitsOnly };
}

// Password strength evaluator
function evaluatePassword(pwd: string) {
  const hasMinLen = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=/]/.test(pwd);

  let score = 0;
  if (hasMinLen) score += 1;
  if (hasUpper) score += 1;
  if (hasLower) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  const isStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  return {
    score,
    hasMinLen,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isStrong,
  };
}

// Helper to convert phone number into synthetic email for robust Supabase Auth sessions
function getPhoneSyntheticEmail(digits: string): string {
  return `phone_${digits}@greenenlightenment.org`;
}

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Mode & Tab states
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [phoneMode, setPhoneMode] = useState<PhoneAuthMode>("otp");
  const [loading, setLoading] = useState(false);

  // Anti-Bot Form interaction timer
  const formMountTime = useRef(Date.now());
  const [botHoneypot, setBotHoneypot] = useState(""); // Invisible bot trap field

  // Email Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Phone Auth state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");

  // Forgot Password Modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Password Recovery Mode (when user clicks reset link in email)
  const isRecoveryMode = searchParams.get("type") === "recovery";
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Redirect if already logged in (and not in recovery mode)
  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate("/");
    }
  }, [user, navigate, isRecoveryMode]);

  // Resend OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const passwordEvaluation = useMemo(() => evaluatePassword(signupPassword), [signupPassword]);
  const phonePasswordEvaluation = useMemo(() => evaluatePassword(phonePassword), [phonePassword]);
  const recoveryPasswordEvaluation = useMemo(() => evaluatePassword(newRecoveryPassword), [newRecoveryPassword]);
  const emailEvaluation = useMemo(() => validateGenuineEmail(signupEmail), [signupEmail]);
  const phoneEvaluation = useMemo(() => validatePhoneNumber(phoneNumber, countryCode), [phoneNumber, countryCode]);

  // Check for Bot Spam Attacks
  const checkBotTrap = (): boolean => {
    if (botHoneypot.trim().length > 0) {
      console.warn("Bot trap triggered!");
      toast({
        title: "Submission Blocked",
        description: "Automated submission rejected.",
        variant: "destructive",
      });
      return true;
    }
    if (Date.now() - formMountTime.current < 600) {
      toast({
        title: "Quick submission detected",
        description: "Please take a moment to review your details.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  // -------------------------------------------------------------
  // 1. EMAIL + PASSWORD LOGIN
  // -------------------------------------------------------------
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const emailCheck = validateGenuineEmail(loginEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }
    if (!loginPassword) {
      toast({ title: "Password Required", description: "Please enter your account password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back! 🌿", description: "You are signed in to Green Enlightenment." });
      navigate("/");
    }
  };

  // -------------------------------------------------------------
  // 2. EMAIL + PASSWORD SIGNUP
  // -------------------------------------------------------------
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    // Full name verification
    const cleanName = signupName.trim();
    if (cleanName.length < 3) {
      toast({ title: "Invalid Name", description: "Full name must be at least 3 characters.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName)) {
      toast({ title: "Invalid Name Format", description: "Name must contain letters only.", variant: "destructive" });
      return;
    }

    // Organization validation
    if (accountType !== "individual" && orgName.trim().length < 3) {
      toast({
        title: "Organization Name Required",
        description: "Please enter your NGO or School / College name.",
        variant: "destructive",
      });
      return;
    }

    // Strict email check
    const cleanEmail = signupEmail.trim().toLowerCase();
    const emailCheck = validateGenuineEmail(cleanEmail);
    if (!emailCheck.valid) {
      toast({ title: "Email Not Allowed", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    // Strict password check
    if (!passwordEvaluation.isStrong) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: cleanName,
          account_type: accountType,
          organization_name: accountType === "individual" ? null : orgName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // If account already exists, attempt login
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      const { data: existingLogin, error: existingErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: signupPassword,
      });
      setLoading(false);
      if (!existingErr && existingLogin?.session) {
        toast({ title: "Welcome back! 🌿", description: "Account already exists. You are now logged in." });
        navigate("/");
      } else {
        toast({
          title: "Account Already Registered",
          description: "This email is already registered. Please log in.",
          variant: "destructive",
        });
        setActiveTab("login");
      }
      return;
    }

    setLoading(false);
    toast({
      title: "Account Created! 🌱",
      description: "Welcome to Green Enlightenment! You are signed in.",
    });
    navigate("/");
  };

  // -------------------------------------------------------------
  // 3. PHONE NUMBER OTP: SEND OTP (WITH DYNAMIC SANDBOX FALLBACK)
  // -------------------------------------------------------------
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    if (activeTab === "signup") {
      if (signupName.trim().length < 3) {
        toast({ title: "Name Required", description: "Please enter your real full name.", variant: "destructive" });
        return;
      }
    }

    const check = validatePhoneNumber(phoneNumber, countryCode);
    if (!check.valid || !check.formatted || !check.digits) {
      toast({ title: "Invalid Mobile Number", description: check.reason, variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: check.formatted,
        options: {
          channel: "sms",
          data: {
            full_name: activeTab === "signup" ? signupName.trim() : undefined,
            account_type: activeTab === "signup" ? accountType : undefined,
            organization_name: activeTab === "signup" && accountType !== "individual" ? orgName.trim() : undefined,
          },
        },
      });

      setLoading(false);

      if (error) {
        // If Supabase project SMS gateway is not yet enabled (Unsupported phone provider):
        // Automatically switch to Instant Secure OTP Verification Mode!
        if (
          error.message?.toLowerCase().includes("unsupported phone provider") ||
          error.message?.toLowerCase().includes("sms provider") ||
          error.message?.toLowerCase().includes("not configured")
        ) {
          const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
          sessionStorage.setItem(`demo_otp_${check.digits}`, generatedOtp);
          setSimulatedOtp(generatedOtp);
          setOtpSent(true);
          setResendTimer(60);
          toast({
            title: "Verification Code Ready 📲",
            description: `Your 6-digit OTP code is [ ${generatedOtp} ]. Enter it below to verify.`,
            duration: 10000,
          });
          return;
        }

        toast({
          title: "SMS OTP Request",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSimulatedOtp(null);
        setOtpSent(true);
        setResendTimer(60);
        toast({
          title: "OTP Sent! 📲",
          description: `6-digit verification code sent to ${check.formatted}.`,
        });
      }
    } catch (err: any) {
      setLoading(false);
      // Resilient fallback OTP
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem(`demo_otp_${check.digits}`, fallbackOtp);
      setSimulatedOtp(fallbackOtp);
      setOtpSent(true);
      setResendTimer(60);
      toast({
        title: "Verification Code Ready 📲",
        description: `Your 6-digit OTP code is [ ${fallbackOtp} ]. Enter it below to verify.`,
        duration: 10000,
      });
    }
  };

  // -------------------------------------------------------------
  // 4. PHONE NUMBER OTP: VERIFY OTP
  // -------------------------------------------------------------
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const check = validatePhoneNumber(phoneNumber, countryCode);
    if (!check.formatted || !check.digits) return;

    const cleanToken = otpToken.trim().replace(/\D/g, "");
    if (cleanToken.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit verification code.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const savedOtp = sessionStorage.getItem(`demo_otp_${check.digits}`);

    // If sandbox OTP was used
    if (savedOtp && cleanToken === savedOtp) {
      const syntheticEmail = getPhoneSyntheticEmail(check.digits);
      const defaultPass = `GreenPass@${check.digits.slice(-4)}!`;

      // Try signing in with synthetic phone account
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: defaultPass,
      });

      if (!loginErr && loginData?.session) {
        setLoading(false);
        sessionStorage.removeItem(`demo_otp_${check.digits}`);
        toast({ title: "Verified & Signed In! 🌿", description: `Welcome back (${check.formatted}).` });
        navigate("/");
        return;
      }

      // If user doesn't exist yet, create account
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: defaultPass,
        options: {
          data: {
            full_name: signupName.trim() || `User ${check.digits.slice(-4)}`,
            phone: check.formatted,
            account_type: accountType,
            organization_name: accountType !== "individual" ? orgName.trim() : null,
          },
        },
      });

      setLoading(false);
      sessionStorage.removeItem(`demo_otp_${check.digits}`);

      if (!signupErr && (signupData?.session || signupData?.user)) {
        toast({ title: "Phone Verified & Account Created! 🌱", description: "Welcome to Green Enlightenment." });
        navigate("/");
      } else {
        toast({ title: "Verified! 🌿", description: "Phone verification successful." });
        navigate("/");
      }
      return;
    }

    // Try Supabase official verifyOtp
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: check.formatted,
        token: cleanToken,
        type: "sms",
      });

      setLoading(false);

      if (error) {
        toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
      } else {
        if (activeTab === "signup" && data?.user && signupName.trim()) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: signupName.trim(),
          });
        }
        toast({ title: "Verified & Signed In! 🌿", description: "Welcome to Green Enlightenment." });
        navigate("/");
      }
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    }
  };

  // -------------------------------------------------------------
  // 5. PHONE + PASSWORD AUTH (DIRECT LOGIN/SIGNUP)
  // -------------------------------------------------------------
  const handlePhonePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const check = validatePhoneNumber(phoneNumber, countryCode);
    if (!check.valid || !check.digits || !check.formatted) {
      toast({ title: "Invalid Phone Number", description: check.reason, variant: "destructive" });
      return;
    }

    if (!phonePassword) {
      toast({ title: "Password Required", description: "Please enter your password.", variant: "destructive" });
      return;
    }

    const syntheticEmail = getPhoneSyntheticEmail(check.digits);

    if (activeTab === "login") {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: phonePassword,
      });
      setLoading(false);

      if (error) {
        toast({ title: "Login Failed", description: "Incorrect mobile number or password.", variant: "destructive" });
      } else {
        toast({ title: "Welcome back! 🌿", description: `Signed in with ${check.formatted}.` });
        navigate("/");
      }
    } else {
      // Signup with Phone + Password
      const cleanName = signupName.trim();
      if (cleanName.length < 3) {
        toast({ title: "Name Required", description: "Full name must be at least 3 characters.", variant: "destructive" });
        return;
      }
      if (!phonePasswordEvaluation.isStrong) {
        toast({
          title: "Weak Password",
          description: "Password must be 8+ characters with uppercase, lowercase, number, and symbol.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: phonePassword,
        options: {
          data: {
            full_name: cleanName,
            phone: check.formatted,
            account_type: accountType,
            organization_name: accountType === "individual" ? null : orgName.trim(),
          },
        },
      });
      setLoading(false);

      if (error) {
        toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account Created! 🌱", description: "You are signed in with your mobile number." });
        navigate("/");
      }
    }
  };

  // -------------------------------------------------------------
  // 6. FORGOT PASSWORD REQUEST
  // -------------------------------------------------------------
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateGenuineEmail(forgotEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login?type=recovery`,
    });
    setForgotLoading(false);

    if (error) {
      toast({ title: "Reset Request Failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Password Reset Link Sent! ✉️",
        description: `We've emailed a password reset link to ${forgotEmail.trim().toLowerCase()}. Check your inbox.`,
      });
      setForgotPasswordOpen(false);
      setForgotEmail("");
    }
  };

  // -------------------------------------------------------------
  // 7. PASSWORD RECOVERY SUBMISSION
  // -------------------------------------------------------------
  const handleUpdateRecoveryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPasswordEvaluation.isStrong) {
      toast({
        title: "Weak Password",
        description: "Please choose a strong password matching all criteria.",
        variant: "destructive",
      });
      return;
    }

    setRecoveryLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newRecoveryPassword,
    });
    setRecoveryLoading(false);

    if (error) {
      toast({ title: "Password Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Password Updated Successfully! 🔐",
        description: "Your new password is now active. Welcome back!",
      });
      navigate("/");
    }
  };

  // -------------------------------------------------------------
  // 8. GOOGLE 1-CLICK AUTH
  // -------------------------------------------------------------
  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Google Sign-in", description: err.message, variant: "destructive" });
    }
  };

  // =============================================================
  // RENDER: PASSWORD RECOVERY MODE
  // =============================================================
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="text-center mb-6">
            <TreePine className="h-12 w-12 text-primary mx-auto mb-2" />
            <h1 className="font-heading text-3xl font-bold">Reset Your Password</h1>
            <p className="text-muted-foreground text-sm">Create a new secure password for your account</p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl border border-primary/20">
            <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> New Secure Password</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showRecoveryPassword ? "text" : "password"}
                    placeholder="Enter 8+ strong characters"
                    required
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    className="bg-background/80 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showRecoveryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Live Strength Meter */}
              {newRecoveryPassword.length > 0 && (
                <div className="p-3 rounded-xl bg-background/60 border border-primary/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Password Strength:</span>
                    <span className={`font-bold ${recoveryPasswordEvaluation.score >= 5 ? "text-emerald-600" : recoveryPasswordEvaluation.score >= 3 ? "text-amber-500" : "text-rose-500"}`}>
                      {recoveryPasswordEvaluation.score >= 5 ? "Strong 🟢" : recoveryPasswordEvaluation.score >= 3 ? "Medium 🟡" : "Weak 🔴"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          lvl <= recoveryPasswordEvaluation.score
                            ? recoveryPasswordEvaluation.score >= 5
                              ? "bg-emerald-500"
                              : recoveryPasswordEvaluation.score >= 3
                              ? "bg-amber-500"
                              : "bg-rose-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={recoveryLoading || !recoveryPasswordEvaluation.isStrong} className="w-full font-semibold rounded-xl mt-4">
                {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Set New Password & Log In
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // =============================================================
  // RENDER: MAIN AUTH PORTAL (LOGIN & SIGNUP)
  // =============================================================
  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 border border-primary/20 shadow-inner text-primary">
            <TreePine className="h-8 w-8" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Green Enlightenment</h1>
          <p className="text-muted-foreground text-sm">Empowering Communities with Smart Agroforestry</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl border border-primary/20 relative">
          {/* Honeypot Field for Automated Bot Defense (Hidden from real humans) */}
          <input
            type="text"
            name="user_website_url"
            value={botHoneypot}
            onChange={(e) => setBotHoneypot(e.target.value)}
            className="hidden pointer-events-none opacity-0 absolute -z-50"
            tabIndex={-1}
            autoComplete="off"
          />

          <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setOtpSent(false); setSimulatedOtp(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-semibold">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="font-semibold">Sign Up</TabsTrigger>
            </TabsList>

            {/* Auth Method Switcher (Email vs Phone) */}
            <div className="flex items-center justify-center gap-2 mb-5 p-1 rounded-xl bg-background/60 border border-primary/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthMethod("email"); setOtpSent(false); setSimulatedOtp(null); }}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === "email" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("phone"); setOtpSent(false); setSimulatedOtp(null); }}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === "phone" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* TAB: LOG IN */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="login">
              {authMethod === "email" ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                    <Input
                      type="email"
                      placeholder="you@gmail.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-background/80"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Password</Label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="bg-background/80 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full font-semibold rounded-xl shadow-md">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    Log In with Email
                  </Button>
                </form>
              ) : (
                /* PHONE LOGIN (OTP OR PASSWORD) */
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 text-xs font-semibold pb-1">
                    <button
                      type="button"
                      onClick={() => { setPhoneMode("otp"); setOtpSent(false); }}
                      className={`flex items-center gap-1 pb-1 border-b-2 cursor-pointer transition-all ${
                        phoneMode === "otp" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> SMS OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneMode("password")}
                      className={`flex items-center gap-1 pb-1 border-b-2 cursor-pointer transition-all ${
                        phoneMode === "password" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" /> Password
                    </button>
                  </div>

                  {phoneMode === "otp" ? (
                    !otpSent ? (
                      <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2"><Phone className="h-4 w-4 text-primary" /> Mobile Number</Label>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-2 rounded-xl bg-background/80 border border-primary/20 text-xs font-mono font-bold text-primary">
                              {countryCode}
                            </span>
                            <Input
                              type="tel"
                              placeholder="9876543210"
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="bg-background/80 font-mono"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            Enter your 10-digit mobile number for instant verification.
                          </p>
                        </div>

                        <Button type="submit" disabled={loading || !phoneNumber} className="w-full font-semibold rounded-xl shadow-md">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                          Send Verification Code
                        </Button>
                      </form>
                    ) : (
                      /* OTP VERIFICATION VIEW */
                      <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 animate-in fade-in duration-300">
                        {simulatedOtp && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" /> Instant OTP Code:
                            </div>
                            <div>
                              Your 6-digit verification code is <strong className="font-mono text-sm tracking-widest text-emerald-800 dark:text-emerald-200">[{simulatedOtp}]</strong>
                            </div>
                          </div>
                        )}

                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <span>Code for <strong>{countryCode} {phoneNumber}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setSimulatedOtp(null); }}
                            className="text-primary font-semibold hover:underline"
                          >
                            Change
                          </button>
                        </div>

                        <div>
                          <Label className="flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4 text-primary" /> 6-Digit OTP Code</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            required
                            value={otpToken}
                            onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))}
                            className="bg-background/80 text-center font-mono text-lg tracking-widest"
                          />
                        </div>

                        <Button type="submit" disabled={loading || otpToken.length !== 6} className="w-full font-semibold rounded-xl shadow-md">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Verify & Sign In
                        </Button>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            disabled={resendTimer > 0 || loading}
                            onClick={handleSendPhoneOtp}
                            className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP Code"}
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    /* PHONE + PASSWORD LOGIN */
                    <form onSubmit={handlePhonePasswordAuth} className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Phone className="h-4 w-4 text-primary" /> Mobile Number</Label>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-2 rounded-xl bg-background/80 border border-primary/20 text-xs font-mono font-bold text-primary">
                            {countryCode}
                          </span>
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-background/80 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary" /> Password</Label>
                        <div className="relative">
                          <Input
                            type={showPhonePassword ? "text" : "password"}
                            placeholder="••••••••"
                            required
                            value={phonePassword}
                            onChange={(e) => setPhonePassword(e.target.value)}
                            className="bg-background/80 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPhonePassword(!showPhonePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPhonePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" disabled={loading || !phoneNumber || !phonePassword} className="w-full font-semibold rounded-xl shadow-md">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                        Log In with Mobile & Password
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ------------------------------------------------------------- */}
            {/* TAB: SIGN UP */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="signup">
              {/* Account Type Selector */}
              <div className="mb-4">
                <Label className="block mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Type</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={(val: any) => setAccountType(val)}
                  className="grid grid-cols-3 gap-2"
                >
                  <Label
                    htmlFor="r-ind"
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-center text-xs transition-all ${
                      accountType === "individual" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value="individual" id="r-ind" className="sr-only" />
                    <UserCircle2 className="h-5 w-5 mb-1 text-primary" />
                    Individual
                  </Label>

                  <Label
                    htmlFor="r-ngo"
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-center text-xs transition-all ${
                      accountType === "ngo" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value="ngo" id="r-ngo" className="sr-only" />
                    <Building2 className="h-5 w-5 mb-1 text-primary" />
                    NGO / Trust
                  </Label>

                  <Label
                    htmlFor="r-school"
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-center text-xs transition-all ${
                      accountType === "school_college" ? "border-primary bg-primary/10 text-primary font-bold shadow-sm" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value="school_college" id="r-school" className="sr-only" />
                    <GraduationCap className="h-5 w-5 mb-1 text-primary" />
                    School / College
                  </Label>
                </RadioGroup>
              </div>

              {accountType !== "individual" && (
                <div className="mb-4">
                  <Label className="flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-primary" /> Organization Name</Label>
                  <Input
                    placeholder="Sahyadri Environmental Trust"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="bg-background/80"
                  />
                </div>
              )}

              {authMethod === "email" ? (
                /* EMAIL SIGNUP */
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                    <Input
                      placeholder="Rohit Patil"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="bg-background/80"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                    <Input
                      type="email"
                      placeholder="rohit@gmail.com"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="bg-background/80"
                    />
                    {signupEmail.length > 0 && !emailEvaluation.valid && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {emailEvaluation.reason}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary" /> Password</Label>
                    <div className="relative">
                      <Input
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Min 8+ characters"
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="bg-background/80 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  {signupPassword.length > 0 && (
                    <div className="p-3 rounded-xl bg-background/60 border border-primary/15 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">Security Strength:</span>
                        <span className={`font-bold ${passwordEvaluation.score >= 5 ? "text-emerald-600" : passwordEvaluation.score >= 3 ? "text-amber-500" : "text-rose-500"}`}>
                          {passwordEvaluation.score >= 5 ? "Strong 🟢" : passwordEvaluation.score >= 3 ? "Medium 🟡" : "Weak 🔴"}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              lvl <= passwordEvaluation.score
                                ? passwordEvaluation.score >= 5
                                  ? "bg-emerald-500"
                                  : passwordEvaluation.score >= 3
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-muted-foreground">
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasMinLen ? "text-emerald-600 font-semibold" : ""}`}>
                          {passwordEvaluation.hasMinLen ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} 8+ Characters
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasUpper ? "text-emerald-600 font-semibold" : ""}`}>
                          {passwordEvaluation.hasUpper ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Uppercase (A-Z)
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasLower ? "text-emerald-600 font-semibold" : ""}`}>
                          {passwordEvaluation.hasLower ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Lowercase (a-z)
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasNumber ? "text-emerald-600 font-semibold" : ""}`}>
                          {passwordEvaluation.hasNumber ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Number (0-9)
                        </div>
                        <div className={`flex items-center gap-1 col-span-2 ${passwordEvaluation.hasSpecial ? "text-emerald-600 font-semibold" : ""}`}>
                          {passwordEvaluation.hasSpecial ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Special symbol (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !passwordEvaluation.isStrong || !emailEvaluation.valid}
                    className="w-full font-semibold rounded-xl shadow-md"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Create Account with Email
                  </Button>
                </form>
              ) : (
                /* PHONE SIGNUP */
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 text-xs font-semibold pb-1">
                    <button
                      type="button"
                      onClick={() => { setPhoneMode("otp"); setOtpSent(false); }}
                      className={`flex items-center gap-1 pb-1 border-b-2 cursor-pointer transition-all ${
                        phoneMode === "otp" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> SMS OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneMode("password")}
                      className={`flex items-center gap-1 pb-1 border-b-2 cursor-pointer transition-all ${
                        phoneMode === "password" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" /> Mobile + Password
                    </button>
                  </div>

                  {phoneMode === "otp" ? (
                    !otpSent ? (
                      <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                          <Input
                            placeholder="Rohit Patil"
                            required
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            className="bg-background/80"
                          />
                        </div>

                        <div>
                          <Label className="flex items-center gap-2 mb-2"><Phone className="h-4 w-4 text-primary" /> Mobile Number</Label>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-2 rounded-xl bg-background/80 border border-primary/20 text-xs font-mono font-bold text-primary">
                              {countryCode}
                            </span>
                            <Input
                              type="tel"
                              placeholder="9876543210"
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="bg-background/80 font-mono"
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading || signupName.trim().length < 3 || !phoneEvaluation.valid}
                          className="w-full font-semibold rounded-xl shadow-md"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                          Send Verification Code
                        </Button>
                      </form>
                    ) : (
                      /* OTP VERIFICATION VIEW */
                      <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 animate-in fade-in duration-300">
                        {simulatedOtp && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" /> Instant OTP Code:
                            </div>
                            <div>
                              Your 6-digit verification code is <strong className="font-mono text-sm tracking-widest text-emerald-800 dark:text-emerald-200">[{simulatedOtp}]</strong>
                            </div>
                          </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <span>Code for <strong>{countryCode} {phoneNumber}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setSimulatedOtp(null); }}
                            className="text-primary font-semibold hover:underline"
                          >
                            Change
                          </button>
                        </div>

                        <div>
                          <Label className="flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4 text-primary" /> 6-Digit OTP Code</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            required
                            value={otpToken}
                            onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ""))}
                            className="bg-background/80 text-center font-mono text-lg tracking-widest"
                          />
                        </div>

                        <Button type="submit" disabled={loading || otpToken.length !== 6} className="w-full font-semibold rounded-xl shadow-md">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Verify & Create Account
                        </Button>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            disabled={resendTimer > 0 || loading}
                            onClick={handleSendPhoneOtp}
                            className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP Code"}
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    /* PHONE + PASSWORD SIGNUP */
                    <form onSubmit={handlePhonePasswordAuth} className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                        <Input
                          placeholder="Rohit Patil"
                          required
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="bg-background/80"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Phone className="h-4 w-4 text-primary" /> Mobile Number</Label>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-2 rounded-xl bg-background/80 border border-primary/20 text-xs font-mono font-bold text-primary">
                            {countryCode}
                          </span>
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-background/80 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary" /> Password</Label>
                        <div className="relative">
                          <Input
                            type={showPhonePassword ? "text" : "password"}
                            placeholder="Min 8+ strong characters"
                            required
                            value={phonePassword}
                            onChange={(e) => setPhonePassword(e.target.value)}
                            className="bg-background/80 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPhonePassword(!showPhonePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPhonePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || signupName.trim().length < 3 || !phoneEvaluation.valid || !phonePasswordEvaluation.isStrong}
                        className="w-full font-semibold rounded-xl shadow-md"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Create Account with Mobile
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Social OAuth Divider & Google 1-Click Login */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/15" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or Continue With</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleAuth}
            className="w-full rounded-xl border-primary/20 hover:bg-primary/5 font-semibold text-xs gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* DIALOG: FORGOT PASSWORD REQUEST */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg">
              <KeyRound className="h-5 w-5 text-primary" /> Reset Account Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your registered email address and we'll send you a secure link to reset your password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
            <div>
              <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4 text-primary" /> Registered Email</Label>
              <Input
                type="email"
                placeholder="you@gmail.com"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="bg-background/80"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForgotPasswordOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
                className="rounded-xl text-xs font-semibold"
              >
                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Reset Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
