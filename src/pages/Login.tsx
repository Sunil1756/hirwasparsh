import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendOtpCode, verifyOtpCode, resolveLoginEmail } from "@/services/otpService";

type AccountType = "individual" | "ngo" | "school_college";

// Comprehensive disposable email domains blacklist
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
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { valid: false, reason: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9." };
    }
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
  const hasMinLen = pwd.length >= 6;
  const hasIdealLen = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=/]/.test(pwd);

  let score = 0;
  if (hasMinLen) score += 1;
  if (hasIdealLen) score += 1;
  if (hasUpper) score += 1;
  if (hasLower) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  const isStrong = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  return {
    score,
    hasMinLen,
    hasIdealLen,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: hasMinLen,
    isStrong,
  };
}

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Mode & Tab states
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // Anti-Bot Form interaction timer
  const formMountTime = useRef(Date.now());
  const [botHoneypot, setBotHoneypot] = useState("");

  // Direct Log-In State (Email OR Mobile + Password — NO OTP REQUIRED)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign-Up State (Full Registration with One-Time Twilio SMS OTP)
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Sign-Up SMS OTP Modal / Step
  const [signupOtpStep, setSignupOtpStep] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot Password Modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Password Recovery Mode
  const isRecoveryMode = searchParams.get("type") === "recovery";
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Dynamic redirect destination
  const redirectParam = searchParams.get("redirect");
  const redirectTarget = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  // Redirect if already logged in (and not in recovery mode)
  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate(redirectTarget);
    }
  }, [user, navigate, isRecoveryMode, redirectTarget]);

  // Resend OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const passwordEvaluation = useMemo(() => evaluatePassword(signupPassword), [signupPassword]);
  const recoveryPasswordEvaluation = useMemo(() => evaluatePassword(newRecoveryPassword), [newRecoveryPassword]);

  // Anti-bot check
  const checkBotTrap = (): boolean => {
    if (botHoneypot.trim().length > 0) {
      toast({
        title: "Submission Blocked",
        description: "Automated submission rejected.",
        variant: "destructive",
      });
      return true;
    }
    const duration = Date.now() - formMountTime.current;
    if (duration < 400) {
      toast({
        title: "Submission Too Fast",
        description: "Please verify your input before submitting.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  // -------------------------------------------------------------
  // 1. DIRECT LOG IN: EMAIL OR MOBILE + PASSWORD (NO OTP)
  // -------------------------------------------------------------
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const trimmedIdentifier = loginIdentifier.trim();
    if (!trimmedIdentifier) {
      toast({
        title: "Identifier Required",
        description: "Please enter your registered email address or mobile number.",
        variant: "destructive",
      });
      return;
    }

    if (!loginPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your account password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Resolve identifier (email or phone) to target account email
      const targetEmail = await resolveLoginEmail(trimmedIdentifier);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: loginPassword,
      });

      setLoading(false);

      if (error || !data.user) {
        toast({
          title: "Invalid Email/Mobile or Password",
          description: "Please check your login details or use 'Forgot Password?' to reset.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back! 🌿",
          description: `Signed in successfully as ${trimmedIdentifier}.`,
        });
        navigate(redirectTarget);
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Sign-In Failed",
        description: err.message || "Could not log in. Please try again.",
        variant: "destructive",
      });
    }
  };

  // -------------------------------------------------------------
  // 2. SIGN UP: INITIATE TWILIO SMS OTP TO MOBILE
  // -------------------------------------------------------------
  const handleInitiateSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (cleanName.length < 3) {
      toast({ title: "Name Required", description: "Full name must be at least 3 characters.", variant: "destructive" });
      return;
    }

    if (accountType !== "individual" && orgName.trim().length < 3) {
      toast({ title: "Organization Required", description: "Please enter your NGO or College name.", variant: "destructive" });
      return;
    }

    const emailCheck = validateGenuineEmail(cleanEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    const phoneCheck = validatePhoneNumber(signupPhone, "+91");
    if (!phoneCheck.valid || !phoneCheck.formatted) {
      toast({ title: "Invalid Mobile Number", description: phoneCheck.reason, variant: "destructive" });
      return;
    }

    if (!passwordEvaluation.isStrong) {
      toast({
        title: "Strong Password Required",
        description: "Password must be 8+ characters with uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const res = await sendOtpCode({
      recipient: phoneCheck.formatted,
      channel: "sms",
      purpose: "signup",
      metadata: {
        full_name: cleanName,
        email: cleanEmail,
        account_type: accountType,
        organization_name: accountType !== "individual" ? orgName.trim() : null,
      },
    });

    setLoading(false);

    if (res.success) {
      setSignupOtpStep(true);
      setResendTimer(60);
      toast({
        title: "Twilio OTP Dispatched! 📲",
        description: res.message,
      });
    } else {
      toast({
        title: "SMS Delivery Failed",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  // -------------------------------------------------------------
  // 3. SIGN UP: VERIFY OTP & CREATE ACCOUNT WITH PASSWORD
  // -------------------------------------------------------------
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const phoneCheck = validatePhoneNumber(signupPhone, "+91");
    if (!phoneCheck.formatted || !phoneCheck.digits) return;

    const cleanToken = otpToken.trim().replace(/\D/g, "");
    if (cleanToken.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit verification code.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // 1. Verify Twilio SMS OTP
    const verifyRes = await verifyOtpCode({
      recipient: phoneCheck.formatted,
      code: cleanToken,
      channel: "sms",
      purpose: "signup",
      metadata: {
        full_name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        account_type: accountType,
        organization_name: accountType !== "individual" ? orgName.trim() : null,
      },
    });

    if (!verifyRes.success) {
      setLoading(false);
      toast({ title: "Verification Failed", description: verifyRes.message, variant: "destructive" });
      return;
    }

    // 2. Register user in Supabase Auth with chosen Email & Password
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanName = signupName.trim();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: cleanName,
          phone: phoneCheck.formatted,
          account_type: accountType,
          organization_name: accountType !== "individual" ? orgName.trim() : null,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      toast({ title: "Registration Failed", description: signUpError.message, variant: "destructive" });
      return;
    }

    if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
      setLoading(false);
      toast({
        title: "Account Already Exists",
        description: "This email is already registered. Please log in with your password.",
        variant: "destructive",
      });
      setSignupOtpStep(false);
      setActiveTab("login");
      setLoginIdentifier(cleanEmail);
      return;
    }

    // 3. Upsert Profile record in profiles table
    if (authData?.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        full_name: cleanName,
        organization_name: accountType !== "individual" ? orgName.trim() : null,
        account_type: accountType,
      });
    }

    setLoading(false);
    toast({
      title: "Account Created Successfully! 🌱",
      description: "Welcome to Green Enlightenment NGO. You are signed in.",
    });
    navigate(redirectTarget);
  };

  // -------------------------------------------------------------
  // 4. FORGOT PASSWORD REQUEST
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
  // 5. PASSWORD RECOVERY SUBMISSION
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

  // RENDER: PASSWORD RECOVERY VIEW
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Set New Password</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create a new secure password for your Green Enlightenment account.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl border border-primary/20">
            <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">New Password</span>
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

              {newRecoveryPassword.length > 0 && (
                <div className="p-3 rounded-xl bg-background/60 border border-primary/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Password Strength:</span>
                    <span className={`font-bold ${recoveryPasswordEvaluation.score >= 5 ? "text-emerald-600" : recoveryPasswordEvaluation.score >= 3 ? "text-amber-500" : "text-rose-500"}`}>
                      {recoveryPasswordEvaluation.score >= 5 ? "Strong 🔒" : recoveryPasswordEvaluation.score >= 3 ? "Medium ⚠️" : "Weak ❌"}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 5, 6].map((lvl) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center px-4 bg-gradient-to-b from-background via-emerald-950/5 to-background">
      <div className="w-full max-w-md">
        {/* Anti-Bot trap */}
        <input
          type="text"
          name="bot_trap"
          tabIndex={-1}
          autoComplete="off"
          value={botHoneypot}
          onChange={(e) => setBotHoneypot(e.target.value)}
          className="sr-only opacity-0 absolute pointer-events-none h-0 w-0"
        />

        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
            <TreePine className="h-3.5 w-3.5" /> Green Enlightenment NGO
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "login" ? "Welcome Back" : "Join the Movement"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {activeTab === "login"
              ? "Sign in with your email or mobile number and password."
              : "Create your account with mobile verification to adopt and track trees."}
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/60 backdrop-blur-xl bg-card/95">
          <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setSignupOtpStep(false); }} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 p-1 bg-muted/70 rounded-2xl">
              <TabsTrigger value="login" className="rounded-xl text-xs sm:text-sm font-semibold py-2">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl text-xs sm:text-sm font-semibold py-2">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* ------------------------------------------------------------- */}
            {/* TAB: LOG IN (DIRECT PASSWORD LOGIN — NO OTP) */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="login" className="space-y-4 mt-0 focus-visible:outline-none">
              <form onSubmit={handleDirectLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Email Address or Mobile Number</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="name@gmail.com or 9876543210"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="bg-background/80 pr-10 rounded-xl text-sm"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-medium">Password</Label>
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
                      className="bg-background/80 pr-10 rounded-xl text-sm"
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

                <Button type="submit" disabled={loading} className="w-full rounded-xl font-semibold shadow-md mt-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Log In
                </Button>
              </form>
            </TabsContent>

            {/* ------------------------------------------------------------- */}
            {/* TAB: SIGN UP (ONE-TIME TWILIO SMS OTP VERIFICATION) */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="signup" className="space-y-4 mt-0 focus-visible:outline-none">
              {!signupOtpStep ? (
                /* STEP 1: REGISTRATION DETAILS FORM */
                <form onSubmit={handleInitiateSignupOtp} className="space-y-4">
                  {/* Persona Selector */}
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Account Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType("individual")}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all ${
                          accountType === "individual"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <UserCircle2 className="h-4 w-4" />
                        <span>Individual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType("ngo")}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all ${
                          accountType === "ngo"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>NGO / Trust</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType("school_college")}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all ${
                          accountType === "school_college"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>School / College</span>
                      </button>
                    </div>
                  </div>

                  {/* Organization Name (If NGO or College) */}
                  {accountType !== "individual" && (
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">
                        {accountType === "ngo" ? "NGO / Trust Name" : "School / College Name"}
                      </Label>
                      <Input
                        type="text"
                        placeholder={accountType === "ngo" ? "Sahyadri Environmental Trust" : "K.T.H.M. College"}
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="bg-background/80 rounded-xl text-sm"
                      />
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Full Name</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Rohit Patil"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="bg-background/80 pr-10 rounded-xl text-sm"
                      />
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Email Address</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="rohit@gmail.com"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="bg-background/80 pr-10 rounded-xl text-sm"
                      />
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Mobile Phone Number */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Mobile Number (for SMS Verification)</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 rounded-xl border bg-muted/50 font-semibold text-xs text-foreground shrink-0">
                        +91
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          required
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ""))}
                          className="bg-background/80 rounded-xl text-sm pr-10"
                        />
                        <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> A one-time 6-digit SMS verification code will be sent via Twilio.
                    </p>
                  </div>

                  {/* Create Password */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Create Password</Label>
                    <div className="relative">
                      <Input
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Min 8+ strong characters"
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="bg-background/80 pr-10 rounded-xl text-sm"
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

                  {signupPassword.length > 0 && (
                    <div className="p-3 rounded-xl bg-background/60 border space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">Strength:</span>
                        <span className={`font-bold ${passwordEvaluation.score >= 5 ? "text-emerald-600" : passwordEvaluation.score >= 3 ? "text-amber-500" : "text-rose-500"}`}>
                          {passwordEvaluation.score >= 5 ? "Strong 🔒" : passwordEvaluation.score >= 3 ? "Medium ⚠️" : "Weak ❌"}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {[1, 2, 3, 4, 5, 6].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1.5 rounded-full transition-all ${
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
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !passwordEvaluation.isStrong || signupName.trim().length < 3 || signupPhone.length !== 10}
                    className="w-full rounded-xl font-semibold shadow-md mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Sign Up & Verify Mobile
                  </Button>
                </form>
              ) : (
                /* STEP 2: ENTER TWILIO SMS OTP CODE */
                <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 animate-in fade-in duration-300">
                  <div className="text-center p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                    <span className="text-xs text-muted-foreground">SMS verification code sent to</span>
                    <div className="font-bold text-sm text-foreground">
                      +91 {signupPhone.slice(0, 2)}******{signupPhone.slice(-2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignupOtpStep(false)}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Edit Registration Details
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium block text-center">Enter 6-Digit Twilio OTP Code</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpToken} onChange={setOtpToken}>
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="h-11 w-11 text-base rounded-xl border border-input shadow-sm bg-background/90"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || otpToken.length !== 6}
                    className="w-full rounded-xl font-semibold shadow-md"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Verify OTP & Complete Registration
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleInitiateSignupOtp}
                      className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP Code"}
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Security Footer */}
        <div className="text-center mt-6 text-[11px] text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> End-to-End Encrypted Identity & Twilio SMS Verification
          </p>
          <p>By continuing, you agree to Green Enlightenment terms and tree stewardship policies.</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DIALOG: FORGOT PASSWORD REQUEST */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="h-5 w-5 text-primary" /> Reset Account Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your registered email address and we'll send a secure password reset link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
            <div>
              <Label className="flex items-center gap-2 mb-2 text-xs">
                <Mail className="h-3.5 w-3.5 text-primary" /> Registered Email
              </Label>
              <Input
                type="email"
                placeholder="you@gmail.com"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="bg-background/80 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
