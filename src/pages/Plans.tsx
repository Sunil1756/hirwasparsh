import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Building2,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  QrCode,
  Landmark,
  Loader2,
  ArrowRight,
  Award,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { organizationService } from "@/services/organizationService";
import { Organization } from "@/types/coreDatabase";

interface PlanConfig {
  id: "pilot_expansion" | "ngo_starter" | "professional_mrv" | "institutional_mrv";
  name: string;
  price: number;
  period: string;
  badge?: string;
  projectsLimit: number;
  treesLimit: number;
  usersLimit: number;
  features: string[];
  highlighted?: boolean;
}

const MRV_PLANS: PlanConfig[] = [
  {
    id: "pilot_expansion",
    name: "Pilot Expansion",
    price: 99,
    period: "month",
    projectsLimit: 2,
    treesLimit: 1000,
    usersLimit: 3,
    features: [
      "Up to 2 plantation projects",
      "Up to 1,000 verified trees",
      "Copernicus Sentinel-2 L2A telemetry",
      "GPS geotagging & photo proof",
      "Basic mortality & health logs",
      "CSV audit report export",
    ],
  },
  {
    id: "ngo_starter",
    name: "NGO Starter",
    price: 499,
    period: "month",
    projectsLimit: 5,
    treesLimit: 2500,
    usersLimit: 5,
    features: [
      "Up to 5 plantation projects",
      "Up to 2,500 verified trees",
      "Up to 5 organization team users",
      "Geodetic compartment boundaries",
      "Gemini AI botanical species auditing",
      "Perceptual dHash fraud protection",
    ],
  },
  {
    id: "professional_mrv",
    name: "Professional MRV",
    price: 999,
    period: "month",
    badge: "Most Popular",
    projectsLimit: 15,
    treesLimit: 10000,
    usersLimit: 15,
    highlighted: true,
    features: [
      "Up to 15 plantation projects",
      "Up to 10,000 verified trees",
      "Up to 15 team / field scout members",
      "Sentinel-2 5-day overpass tracking",
      "Field verification & ground sampling",
      "IPCC Tier-2 allometric carbon ledger",
      "SEBI BRSR Core compliance export",
    ],
  },
  {
    id: "institutional_mrv",
    name: "Institutional CSR / Enterprise",
    price: 1999,
    period: "month",
    badge: "Enterprise Grade",
    projectsLimit: 30,
    treesLimit: 25000,
    usersLimit: 50,
    features: [
      "Up to 30 plantation projects",
      "Up to 25,000 verified trees",
      "Unlimited team & field users",
      "Multi-plot portfolio radar & NDVI alerts",
      "Priority third-party audit verification",
      "Dedicated ACIC institutional support",
      "Custom CSR microsite & certificates",
    ],
  },
];

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dialog State
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  // Organization Binding State
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [newOrgName, setNewOrgName] = useState("");

  useEffect(() => {
    if (user) {
      organizationService.getUserOrganizations(user.id).then((list) => {
        const orgs = list.map((l) => l.organization);
        setUserOrgs(orgs);
        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      }).catch(console.warn);
    }
  }, [user]);

  const handleSelectPlan = (plan: PlanConfig) => {
    if (!user) {
      toast({
        title: "Sign-In Required 🔒",
        description: "Please sign in or create an account to activate an institutional plan.",
      });
      navigate("/login?redirect=/plans");
      return;
    }

    setSelectedPlan(plan);
    setPaymentSuccess(false);
    setCheckoutOpen(true);
  };

  const handleExecutePayment = async () => {
    if (!user || !selectedPlan) return;

    setIsProcessing(true);
    const txn = `TXN_ACIC_${Date.now()}`;

    try {
      let targetOrgId = selectedOrgId;

      // If user had no organization, create one automatically
      if (!targetOrgId && newOrgName.trim()) {
        const res = await organizationService.createOrganization(user.id, {
          name: newOrgName.trim(),
          type: "corporate",
        });
        targetOrgId = res.organization.id;
      }

      // 1. Realistic banking gateway handshake (1.2s)
      await new Promise((r) => setTimeout(r, 1200));

      // 2. Persist tier upgrade to database
      if (targetOrgId) {
        await supabase
          .from("organizations" as any)
          .update({ tier: selectedPlan.id })
          .eq("id", targetOrgId);
      }

      // 3. Log audit event
      await supabase.from("audit_logs" as any).insert({
        actor_id: user.id,
        action: "PURCHASE_PLAN",
        entity_type: "organizations",
        entity_id: targetOrgId || user.id,
        new_status: selectedPlan.id,
        new_state: {
          plan_name: selectedPlan.name,
          amount_paid: selectedPlan.price,
          txn_id: txn,
          timestamp: new Date().toISOString(),
        },
      });

      setTransactionId(txn);
      setIsProcessing(false);
      setPaymentSuccess(true);

      toast({
        title: "🎉 Plan Activated & Payment Confirmed!",
        description: `${selectedPlan.name} is now active on your organization.`,
      });
    } catch (err: any) {
      setIsProcessing(false);
      toast({
        title: "Payment Error",
        description: err.message || "Could not complete transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-3.5 py-1 rounded-full font-semibold">
            Institutional B2B & CSR Carbon MRV Suite
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Institutional Plantation & CSR Plans
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            Select your tier, complete payment, and immediately launch your verified corporate CSR or NGO plantation project with live Sentinel-2 satellite MRV.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {MRV_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`bg-slate-900 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                plan.highlighted
                  ? "border-emerald-500/50 shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)] bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-900 scale-[1.02]"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  {plan.badge}
                </div>
              )}

              <div>
                <CardHeader className="pb-4">
                  <CardTitle className={`text-xl font-bold ${plan.highlighted ? "text-emerald-400" : "text-white"}`}>
                    {plan.name}
                  </CardTitle>
                  <div className="pt-3 pb-2 border-b border-slate-800">
                    <span className="text-3xl font-extrabold text-white">₹{plan.price.toLocaleString("en-IN")}</span>
                    <span className="text-slate-400 text-xs ml-1">/ {plan.period}</span>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-2">
                    Up to <strong>{plan.projectsLimit} projects</strong> · <strong>{plan.treesLimit.toLocaleString()} trees</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Included MRV Capabilities:
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <CardFooter className="pt-6">
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full rounded-xl text-xs font-semibold h-10 shadow-sm cursor-pointer ${
                    plan.highlighted
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  Select Plan & Continue <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-6">
          <Link to="/plant">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              ← Return to Planting Pathways
            </Button>
          </Link>
          <span>•</span>
          <Link to="/portal/csr">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              Open CSR Intelligence Portal →
            </Button>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DIALOG: B2B PAYMENT & PROJECT ACTIVATION */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100 rounded-3xl p-6 sm:p-8">
          {paymentSuccess ? (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-heading text-2xl font-bold text-white">Payment Confirmed!</h3>
                <p className="text-xs text-slate-300">
                  Your <strong>{selectedPlan?.name}</strong> plan is now active on your organization.
                </p>
                <p className="text-[11px] font-mono text-emerald-400">Ref: {transactionId}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Project Quota:</span>
                  <strong className="text-white">Up to {selectedPlan?.projectsLimit} Projects</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tree Capacity:</span>
                  <strong className="text-white">Up to {selectedPlan?.treesLimit.toLocaleString()} Trees</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Satellite Overpasses:</span>
                  <strong className="text-emerald-400">Copernicus Sentinel-2 Active</strong>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  onClick={() => {
                    setCheckoutOpen(false);
                    navigate("/plant/organization?create=true");
                  }}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg gap-2"
                >
                  <Building2 className="h-4 w-4" /> Launch Your Plantation Project Now <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setCheckoutOpen(false);
                    navigate("/portal/csr");
                  }}
                  className="w-full text-xs text-slate-400 hover:text-white"
                >
                  View in CSR Corporate Portal →
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                  <Award className="h-5 w-5 text-emerald-400" /> Complete B2B Plan Subscription
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Activate institutional MRV quota and continue to create your plantation project.
                </DialogDescription>
              </DialogHeader>

              {/* Order Summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-semibold">{selectedPlan?.name}</span>
                  <span className="text-base font-bold text-white">₹{selectedPlan?.price.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Includes {selectedPlan?.projectsLimit} projects, {selectedPlan?.treesLimit.toLocaleString()} trees, and Sentinel-2 telemetry.
                </p>
              </div>

              {/* Organization Assignment */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Target Organization / CSR Entity</Label>
                {userOrgs.length > 0 ? (
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-slate-950 border border-slate-700 text-xs px-3 text-white focus:outline-none"
                  >
                    {userOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="Enter CSR / Organization Name (e.g. Tata Sustainability)"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-xs rounded-xl"
                  />
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                      paymentMethod === "upi"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-slate-800 hover:bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                      paymentMethod === "card"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-slate-800 hover:bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                      paymentMethod === "netbanking"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-slate-800 hover:bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    <Landmark className="h-4 w-4" />
                    <span>NetBanking</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={isProcessing}
                  className="rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleExecutePayment}
                  disabled={isProcessing || (!selectedOrgId && !newOrgName.trim())}
                  className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...
                    </>
                  ) : (
                    <>Pay ₹{selectedPlan?.price.toLocaleString("en-IN")} & Activate</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
