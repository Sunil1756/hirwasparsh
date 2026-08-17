import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TreePine, Mail, Lock, User, Loader2, Building2, GraduationCap, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AccountType = "individual" | "ngo" | "school_college";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
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
    if (accountType !== "individual" && !orgName.trim()) {
      toast({ title: "Organization name required", description: "Please enter your NGO or school/college name.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupName,
          account_type: accountType,
          organization_name: accountType === "individual" ? null : orgName.trim(),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created! 🌱", description: "Please check your email to verify your account." });
    }
  };

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <TreePine className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-heading text-3xl font-bold">Green Enlightenment</h1>
          <p className="text-muted-foreground text-sm">Connecting People with Nature</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input type="email" placeholder="you@example.com" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4" /> Password</Label>
                  <Input type="password" placeholder="••••••••" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Log In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label className="mb-2 block">I'm registering as</Label>
                  <RadioGroup value={accountType} onValueChange={(v) => setAccountType(v as AccountType)} className="grid grid-cols-3 gap-2">
                    {[
                      { v: "individual", label: "Individual", Icon: UserCircle2 },
                      { v: "ngo", label: "NGO", Icon: Building2 },
                      { v: "school_college", label: "School / College", Icon: GraduationCap },
                    ].map(({ v, label, Icon }) => (
                      <Label
                        key={v}
                        htmlFor={`acct-${v}`}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer text-xs font-medium transition ${
                          accountType === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
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
                  <Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4" /> Full Name</Label>
                  <Input placeholder="Your full name" required value={signupName} onChange={e => setSignupName(e.target.value)} />
                </div>
                {accountType !== "individual" && (
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4" /> {accountType === "ngo" ? "NGO Name" : "School / College Name"}
                    </Label>
                    <Input placeholder={accountType === "ngo" ? "e.g. Green Earth Foundation" : "e.g. St. Xavier's College"} required value={orgName} onChange={e => setOrgName(e.target.value)} maxLength={200} />
                  </div>
                )}
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input type="email" placeholder="you@example.com" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4" /> Password</Label>
                  <Input type="password" placeholder="••••••••" required minLength={6} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
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
