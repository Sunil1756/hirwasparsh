import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
  Sparkles,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Send,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AccountType = "individual" | "ngo" | "school_college";

// Disposable email domains blacklist
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
  "sample.com",
  "dummy.com",
  "invalid.com",
]);

function validateGenuineEmail(email: string): { valid: boolean; reason?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, reason: "Email address is required." };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email address (e.g. name@gmail.com)." };
  }

  const [localPart, domain] = trimmed.split("@");
  if (!localPart || localPart.length < 2) {
    return { valid: false, reason: "Email username is too short." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Disposable/temporary emails are prohibited. Use Gmail, Outlook, Yahoo, or institutional ID.",
    };
  }

  return { valid: true };
}

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

  const isStrong = hasMinLen;

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

  // Tab & Loading State
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // Anti-Bot
  const formMountTime = useRef(Date.now());
  const [botHoneypot, setBotHoneypot] = useState("");

  // Sign-In State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  // Sign-Up State
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot Password Dialog
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Password Recovery Mode
  const isRecoveryMode = searchParams.get("type") === "recovery";
  const [newRecoveryPassword, setNewRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Dynamic redirect
  const redirectParam = searchParams.get("redirect");
  const redirectTarget = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate(redirectTarget);
    }
  }, [user, navigate, isRecoveryMode, redirectTarget]);

  const signupPasswordEval = useMemo(() => evaluatePassword(signupPassword), [signupPassword]);
  const recoveryPasswordEval = useMemo(() => evaluatePassword(newRecoveryPassword), [newRecoveryPassword]);

  const checkBotTrap = (): boolean => {
    if (botHoneypot.trim().length > 0) {
      toast({ title: "Submission Blocked", description: "Automated submission rejected.", variant: "destructive" });
      return true;
    }
    const duration = Date.now() - formMountTime.current;
    if (duration < 200) {
      toast({ title: "Submission Too Fast", description: "Please review your input.", variant: "destructive" });
      return true;
    }
    return false;
  };

  // -------------------------------------------------------------
  // 1. DIRECT REAL SIGN-IN (Supabase Auth)
  // -------------------------------------------------------------
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const emailTrimmed = loginEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      toast({ title: "Email Required", description: "Please enter your registered email address.", variant: "destructive" });
      return;
    }

    if (!loginPassword) {
      toast({ title: "Password Required", description: "Please enter your password.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: loginPassword,
      });

      if (error) {
        setLoading(false);
        toast({
          title: "Sign-In Failed",
          description: error.message || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        setLoading(false);
        toast({
          title: "Welcome Back! 🌿",
          description: `Signed in successfully as ${data.user.email}.`,
        });
        navigate(redirectTarget);
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Sign-In Error",
        description: err?.message || "Could not connect to authentication service.",
        variant: "destructive",
      });
    }
  };

  // -------------------------------------------------------------
  // 2. DIRECT REAL SIGN-UP (Supabase Auth)
  // -------------------------------------------------------------
  const handleDirectSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkBotTrap()) return;

    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      toast({ title: "Name Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (accountType !== "individual" && orgName.trim().length < 2) {
      toast({ title: "Organization Name Required", description: "Please enter your NGO, Trust, or College name.", variant: "destructive" });
      return;
    }

    const emailCheck = validateGenuineEmail(cleanEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: cleanName,
            account_type: accountType,
            organization_name: accountType !== "individual" ? orgName.trim() : null,
            phone: signupPhone.trim() || undefined,
          },
        },
      });

      if (signUpError) {
        setLoading(false);
        toast({ title: "Registration Failed", description: signUpError.message, variant: "destructive" });
        return;
      }

      // Check if user already exists
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setLoading(false);
        toast({
          title: "Account Already Exists",
          description: "An account with this email is already registered. Please sign in.",
          variant: "destructive",
        });
        setLoginEmail(cleanEmail);
        setActiveTab("login");
        return;
      }

      // Create or update profile row in public.profiles
      if (authData?.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          full_name: cleanName,
          organization_name: accountType !== "individual" ? orgName.trim() : null,
          account_type: accountType,
        });
      }

      setLoading(false);

      if (authData?.session) {
        toast({
          title: "Welcome to Green Enlightenment! 🌱",
          description: "Your account has been created successfully.",
        });
        navigate(redirectTarget);
      } else {
        toast({
          title: "Account Created! ✉️",
          description: "Please check your email inbox to confirm your address, or sign in below.",
        });
        setLoginEmail(cleanEmail);
        setActiveTab("login");
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Registration Error",
        description: err?.message || "Could not register account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // -------------------------------------------------------------
  // 3. MAGIC LINK PASSWORDLESS SIGN-IN
  // -------------------------------------------------------------
  const handleSendMagicLink = async () => {
    const emailTrimmed = loginEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      toast({ title: "Email Required", description: "Please enter your email above to receive a Magic Link.", variant: "destructive" });
      return;
    }

    setMagicLinkLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrimmed,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTarget}`,
        },
      });

      setMagicLinkLoading(false);
      if (error) {
        toast({ title: "Magic Link Failed", description: error.message, variant: "destructive" });
      } else {
        setIsMagicLinkSent(true);
        toast({
          title: "Magic Link Sent! ✉️",
          description: `We've sent a one-click login link to ${emailTrimmed}. Click it in your email to sign in.`,
        });
      }
    } catch (err: any) {
      setMagicLinkLoading(false);
      toast({ title: "Error", description: err?.message || "Could not send Magic Link.", variant: "destructive" });
    }
  };

  // -------------------------------------------------------------
  // 4. FORGOT PASSWORD
  // -------------------------------------------------------------
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateGenuineEmail(forgotEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    setForgotLoading(true);
    try {
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
    } catch (err: any) {
      setForgotLoading(false);
      toast({ title: "Error", description: err?.message || "Could not send reset email.", variant: "destructive" });
    }
  };

  // -------------------------------------------------------------
  // 5. UPDATE PASSWORD ON RECOVERY
  // -------------------------------------------------------------
  const handleUpdateRecoveryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecoveryPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newRecoveryPassword,
      });
      setRecoveryLoading(false);

      if (error) {
        toast({ title: "Password Update Failed", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Password Updated Successfully! 🔐",
          description: "Your new password is active. Welcome back!",
        });
        navigate("/");
      }
    } catch (err: any) {
      setRecoveryLoading(false);
      toast({ title: "Error", description: err?.message || "Could not update password.", variant: "destructive" });
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

          <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-primary/20">
            <form onSubmit={handleUpdateRecoveryPassword} className="space-y-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">New Password</Label>
                <div className="relative">
                  <Input
                    type={showRecoveryPassword ? "text" : "password"}
                    placeholder="Enter at least 6 characters"
                    required
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    className="bg-background/80 pr-10 rounded-xl"
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

              <Button
                type="submit"
                disabled={recoveryLoading || newRecoveryPassword.length < 6}
                className="w-full font-semibold rounded-xl mt-4 bg-primary text-primary-foreground"
              >
                {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Save Password & Continue
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20 shadow-sm">
            <TreePine className="h-3.5 w-3.5" /> Green Enlightenment Platform
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "login" ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {activeTab === "login"
              ? "Sign in with your email and password to access your dashboard."
              : "Register to plant, adopt, and track verified trees with live satellite MRV."}
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-border/60 backdrop-blur-xl bg-card/95">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 p-1 bg-muted/70 rounded-2xl">
              <TabsTrigger value="login" className="rounded-xl text-xs sm:text-sm font-semibold py-2">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl text-xs sm:text-sm font-semibold py-2">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* ------------------------------------------------------------- */}
            {/* TAB: SIGN IN */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="login" className="space-y-4 mt-0 focus-visible:outline-none">
              <form onSubmit={handleDirectLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Email Address</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="name@gmail.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
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
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setForgotPasswordOpen(true);
                      }}
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl font-semibold shadow-md mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Sign In
                </Button>

                {/* Passwordless Magic Link Alternative */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={magicLinkLoading || isMagicLinkSent}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium cursor-pointer"
                  >
                    {magicLinkLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {isMagicLinkSent ? "Magic Link Sent! Check Email" : "Sign In with Magic Link (Email OTP)"}
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* ------------------------------------------------------------- */}
            {/* TAB: CREATE ACCOUNT */}
            {/* ------------------------------------------------------------- */}
            <TabsContent value="signup" className="space-y-4 mt-0 focus-visible:outline-none">
              <form onSubmit={handleDirectSignUp} className="space-y-4">
                {/* Persona Selector */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">I am joining as</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("individual")}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
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
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                        accountType === "ngo"
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>NGO / CSR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("school_college")}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                        accountType === "school_college"
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>School/College</span>
                    </button>
                  </div>
                </div>

                {/* Organization Name (If NGO or College) */}
                {accountType !== "individual" && (
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">
                      {accountType === "ngo" ? "NGO / Trust / Company Name" : "School / College Name"}
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

                {/* Optional Mobile Phone */}
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Mobile Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={15}
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      className="bg-background/80 rounded-xl text-sm pr-10"
                    />
                    <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Create Password</Label>
                  <div className="relative">
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
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

                <Button
                  type="submit"
                  disabled={loading || signupName.trim().length < 2 || signupPassword.length < 6}
                  className="w-full rounded-xl font-semibold shadow-md mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Create Account & Get Started
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Security Footer */}
        <div className="text-center mt-6 text-[11px] text-muted-foreground space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium text-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure Supabase Auth & Verifiable Identity
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
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
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
