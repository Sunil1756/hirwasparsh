import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AccountType = "individual" | "ngo" | "school_college";

// Comprehensive disposable & fake email domains blacklist
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
]);

// Email validation helper
function validateGenuineEmail(email: string): { valid: boolean; reason?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, reason: "Email address is required." };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email format (e.g. user@gmail.com)." };
  }

  const [localPart, domain] = trimmed.split("@");
  if (!localPart || localPart.length < 3) {
    return { valid: false, reason: "Email username is too short (min 3 characters)." };
  }

  // Reject obvious repeated character spam (e.g. aaaaa@, 11111@, asdf@)
  if (/^(.)\1+$/.test(localPart) || ["asdf", "test", "fake", "temp", "admin", "null"].includes(localPart)) {
    return { valid: false, reason: "Please use a genuine personal or institutional email." };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, reason: "Disposable/temporary email domains are not permitted. Please use a genuine email (Gmail, Outlook, College/Org ID)." };
  }

  // Check domain TLD
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) {
    return { valid: false, reason: "Email must end with a valid domain extension (.com, .in, .org, .edu, etc.)." };
  }

  return { valid: true };
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

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const passwordEvaluation = useMemo(() => evaluatePassword(signupPassword), [signupPassword]);
  const emailEvaluation = useMemo(() => validateGenuineEmail(signupEmail), [signupEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateGenuineEmail(loginEmail);
    if (!emailCheck.valid) {
      toast({ title: "Invalid Email", description: emailCheck.reason, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back! 🌿", description: "You're signed in." });
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Full Name
    const cleanName = signupName.trim();
    if (cleanName.length < 3) {
      toast({
        title: "Invalid Full Name",
        description: "Please enter your real full name (at least 3 characters).",
        variant: "destructive",
      });
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName)) {
      toast({
        title: "Invalid Name Format",
        description: "Name should contain letters only.",
        variant: "destructive",
      });
      return;
    }

    // 2. Validate Organization if NGO / School
    if (accountType !== "individual") {
      const cleanOrg = orgName.trim();
      if (cleanOrg.length < 3) {
        toast({
          title: "Organization Name Required",
          description: "Please enter your NGO or School / College name (min 3 characters).",
          variant: "destructive",
        });
        return;
      }
    }

    // 3. Strict Genuine Email Verification
    const cleanEmail = signupEmail.trim().toLowerCase();
    const emailCheck = validateGenuineEmail(cleanEmail);
    if (!emailCheck.valid) {
      toast({
        title: "Fake or Invalid Email Detected",
        description: emailCheck.reason,
        variant: "destructive",
      });
      return;
    }

    // 4. Strict Password Security Verification
    if (!passwordEvaluation.isStrong) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
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

    // 1. If user already exists (Supabase returns empty identities)
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
          title: "Account already registered",
          description: "This email already has an account. Please switch to the Log In tab.",
          variant: "destructive",
        });
      }
      return;
    }

    // 2. If instant session is returned
    if (data?.session) {
      setLoading(false);
      toast({ title: "Welcome to Green Enlightenment! 🌱", description: "Account verified and signed in." });
      navigate("/");
      return;
    }

    // 3. Try direct login with credentials
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: signupPassword,
    });

    setLoading(false);
    if (!loginErr && loginData?.session) {
      toast({ title: "Welcome to Green Enlightenment! 🌱", description: "Account verified and signed in." });
      navigate("/");
    } else {
      toast({
        title: "Account created! 🌱",
        description: "Welcome to Green Enlightenment! You can now log in.",
      });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <TreePine className="h-12 w-12 text-primary mx-auto mb-2" />
          <h1 className="font-heading text-3xl font-bold">Green Enlightenment</h1>
          <p className="text-muted-foreground text-sm">Empowering Communities with Smart Agroforestry</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl border border-primary/20">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-semibold">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="font-semibold">Sign Up</TabsTrigger>
            </TabsList>

            {/* ---------------- LOG IN TAB ---------------- */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
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
                  <Label className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Password</span>
                  </Label>
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

                <Button type="submit" className="w-full h-11 font-semibold text-base shadow-md" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Log In
                </Button>
              </form>
            </TabsContent>

            {/* ---------------- SIGN UP TAB ---------------- */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label className="mb-2 block font-medium">I am registering as</Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(v) => setAccountType(v as AccountType)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {[
                      { v: "individual", label: "Individual", Icon: UserCircle2 },
                      { v: "ngo", label: "NGO", Icon: Building2 },
                      { v: "school_college", label: "School/College", Icon: GraduationCap },
                    ].map(({ v, label, Icon }) => (
                      <Label
                        key={v}
                        htmlFor={`acct-${v}`}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 cursor-pointer text-xs font-medium transition ${
                          accountType === v
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40"
                            : "border-border hover:border-primary/40 bg-background/60"
                        }`}
                      >
                        <RadioGroupItem id={`acct-${v}`} value={v} className="sr-only" />
                        <Icon className="h-5 w-5" />
                        <span className="text-center leading-tight">{label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-1.5"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                  <Input
                    placeholder="e.g. Rajesh Patil"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="bg-background/80"
                  />
                </div>

                {accountType !== "individual" && (
                  <div>
                    <Label className="flex items-center gap-2 mb-1.5">
                      <Building2 className="h-4 w-4 text-primary" /> {accountType === "ngo" ? "NGO / Trust Name" : "School / College Name"}
                    </Label>
                    <Input
                      placeholder={accountType === "ngo" ? "e.g. Sahyadri Vanrakshak Foundation" : "e.g. SVERI College of Engineering"}
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      maxLength={200}
                      className="bg-background/80"
                    />
                  </div>
                )}

                <div>
                  <Label className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Address</span>
                    {signupEmail && (
                      <span className={`text-[11px] font-medium ${emailEvaluation.valid ? "text-emerald-500" : "text-amber-500"}`}>
                        {emailEvaluation.valid ? "✓ Valid Email" : "⚠️ Needs valid domain"}
                      </span>
                    )}
                  </Label>
                  <Input
                    type="email"
                    placeholder="you@gmail.com"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={`bg-background/80 ${signupEmail && !emailEvaluation.valid ? "border-amber-500 focus-visible:ring-amber-500" : ""}`}
                  />
                  {signupEmail && !emailEvaluation.valid && (
                    <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 inline" /> {emailEvaluation.reason}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Password</span>
                    {signupPassword && (
                      <span
                        className={`text-[11px] font-semibold ${
                          passwordEvaluation.score <= 2
                            ? "text-rose-500"
                            : passwordEvaluation.score <= 4
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {passwordEvaluation.score <= 2 ? "Weak" : passwordEvaluation.score <= 4 ? "Good" : "Strong"}
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
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

                  {/* Real-time Password Strength Meter */}
                  {signupPassword && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-5 gap-1.5 h-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`rounded-full transition-all duration-300 ${
                              passwordEvaluation.score >= level
                                ? passwordEvaluation.score <= 2
                                  ? "bg-rose-500"
                                  : passwordEvaluation.score <= 4
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground pt-1">
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasMinLen ? "text-emerald-500" : ""}`}>
                          {passwordEvaluation.hasMinLen ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          8+ Characters
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasUpper ? "text-emerald-500" : ""}`}>
                          {passwordEvaluation.hasUpper ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Uppercase letter (A-Z)
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasLower ? "text-emerald-500" : ""}`}>
                          {passwordEvaluation.hasLower ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Lowercase letter (a-z)
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.hasNumber ? "text-emerald-500" : ""}`}>
                          {passwordEvaluation.hasNumber ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Number (0-9)
                        </div>
                        <div className={`flex items-center gap-1 col-span-2 ${passwordEvaluation.hasSpecial ? "text-emerald-500" : ""}`}>
                          {passwordEvaluation.hasSpecial ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Special symbol (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-base shadow-md mt-2"
                  disabled={loading || (!!signupPassword && !passwordEvaluation.isStrong) || (!!signupEmail && !emailEvaluation.valid)}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Create Verified Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Administrator?{" "}
          <button type="button" onClick={() => navigate("/admin")} className="text-primary hover:underline font-medium">
            Sign in on the admin page
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
