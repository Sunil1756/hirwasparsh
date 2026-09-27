import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Check,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  CreditCard,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { EnterpriseAiCheckoutModal } from "@/components/ai/EnterpriseAiCheckoutModal";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<any>("enterprise_dedicated_annual");

  const plans = [
    {
      id: "starter_pilot",
      name: "Community / NGO Starter",
      badge: "Free Pilot",
      priceMonthly: 0,
      priceAnnual: 0,
      periodLabel: "forever free for small plots",
      description: "Essential geodetic mapping and baseline satellite telemetry for local community tree drives.",
      features: [
        "Up to 5 Hectares (~12.5 Acres) monitored",
        "Up to 1,000 trees registered",
        "Copernicus Sentinel-2 L2A optical NDVI tracking",
        "Mobile GPS geotagging & photo upload",
        "Standard multi-source confidence matrix",
        "Community leaderboard & public tree map",
      ],
      ctaText: "Start Free Pilot",
      ctaLink: "/plant/organization?create=true",
      highlighted: false,
    },
    {
      id: "ngo_pro",
      name: "NGO & Plantation Pro",
      badge: "Most Popular for NGOs",
      priceMonthly: 5999,
      priceAnnual: 4999,
      periodLabel: "per month, billed annually (or ₹5 / tree / year)",
      description: "Full-scale MRV workspace for afforestation NGOs, forest trusts, and agroforestry cooperatives.",
      features: [
        "Up to 100 Hectares (~250 Acres) monitored",
        "Up to 25,000 trees registered",
        "Automated Copernicus Sentinel-2 STAC 5-day overpasses",
        "Google Gemini 2.5 Botanical AI species validation",
        "Perceptual dHash duplicate photo anti-fraud defense",
        "Drone orthomosaic survey uploads",
        "Automated field scout task dispatch",
        "CSV & KML bulk manifest importer",
      ],
      ctaText: "Get NGO Pro Workspace",
      ctaLink: "/ngo-workspace",
      highlighted: true,
    },
    {
      id: "csr_enterprise",
      name: "Corporate CSR Enterprise",
      badge: "Institutional Grade",
      priceMonthly: 29999,
      priceAnnual: 24999,
      periodLabel: "per month, billed annually (or ₹2,500 / ha / year)",
      description: "Audit-ready ESG carbon accounting and BRSR compliance reports for corporate CSR funds.",
      features: [
        "Unlimited Hectares & Tree Portfolio across India",
        "SEBI BRSR Core Principle 6 Environmental Export (PDF/CSV)",
        "IPCC Tier-2 Allometric Carbon Ledger & Certificates",
        "Dedicated Third-Party Auditor sign-off portal",
        "Spectral anomaly early-warning radar (mortality alert)",
        "Branded CSR ESG sustainability public microsite",
        "Rest API & Webhook data stream access",
        "Dedicated ACIC Technical Account Manager",
      ],
      ctaText: "Access CSR Enterprise Portal",
      ctaLink: "/csr-portal",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3.5 py-1 rounded-full font-semibold">
          ACIC Incubated Startup B2B Pricing
        </Badge>
        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
          Transparent, Institutional MRV Pricing
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Predictable SaaS subscription and unit-based pricing for NGOs, corporate CSR sustainability funds,
          and government agroforestry missions. Zero synthetic data. 100% Copernicus Sentinel-2 verified.
        </p>

        {/* Billing Toggle */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              billingCycle === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual Billing <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const price = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;

          return (
            <Card
              key={plan.id}
              className={`rounded-3xl border flex flex-col justify-between backdrop-blur-md transition-all duration-300 ${
                plan.highlighted
                  ? "border-2 border-primary shadow-2xl bg-gradient-to-b from-primary/10 via-card to-card scale-[1.02]"
                  : "border-border/40 shadow-lg bg-card/70 hover:border-primary/40"
              }`}
            >
              <div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        plan.highlighted
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold font-heading mt-2">{plan.name}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price display */}
                  <div className="pb-4 border-b border-border/30">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading">
                        {price === 0 ? "₹0" : `₹${price.toLocaleString("en-IN")}`}
                      </span>
                      {price > 0 && <span className="text-xs text-muted-foreground">/ month</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{plan.periodLabel}</div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-xs">
                    <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                      Included Capabilities:
                    </div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-6 flex flex-col gap-2">
                {price > 0 ? (
                  <>
                    <Button
                      onClick={() => {
                        setCheckoutTier(plan.id === "csr_enterprise" ? "enterprise_dedicated_annual" : "pro_botanical_annual");
                        setCheckoutModalOpen(true);
                      }}
                      variant={plan.highlighted ? "default" : "outline"}
                      className={`w-full rounded-xl text-xs font-semibold h-10 shadow-sm gap-2 ${
                        plan.highlighted
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "border-primary/30 hover:bg-primary/10"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Subscribe & Pay with UPI / Card
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground"
                    >
                      <Link to={plan.ctaLink}>
                        Explore Workspace & DPR <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl text-xs font-semibold h-10 shadow-sm border-primary/30 hover:bg-primary/10"
                  >
                    <Link to={plan.ctaLink}>
                      {plan.ctaText} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Interactive Multi-Gateway Checkout Modal */}
      <EnterpriseAiCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        initialTier={checkoutTier}
      />

      {/* Enterprise & Institutional Payment Gateways Breakdown */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Institutional Payment & Invoicing Gateways
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure B2B and institutional billing compliant with Indian commercial tax standards (GST 18%).
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1">
            256-Bit SSL Encrypted
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <QrCode className="h-4 w-4" />
              <span>Razorpay UPI & QR</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Instant activation via Virtual Payment Address (VPA / UPI ID) and dynamic QR codes in INR. Automated 18% GST calculation with downloadable tax invoices.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <CreditCard className="h-4 w-4" />
              <span>Credit & Debit Cards</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Visa, Mastercard, RuPay, and American Express corporate cards accepted with PCI-DSS tokenized security and instant receipt generation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Building2 className="h-4 w-4" />
              <span>NetBanking & RTGS/NEFT</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Direct institutional transfers supported across State Bank of India, HDFC Bank, ICICI Bank, Axis Bank, and all major scheduled Indian banks.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Corporate PO & Invoicing</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Formal purchase order (PO) generation and 30-day net invoicing for CSR foundations, municipal corporations, and state forest agencies.
            </p>
          </div>
        </div>
      </div>

      {/* Sovereign & State Forest Department Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-primary/20 bg-gradient-to-r from-purple-500/10 via-background to-primary/10 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 bg-purple-500/10">
            Government & Sovereign Tier
          </Badge>
          <h3 className="font-heading text-lg sm:text-xl font-bold">
            State Forest Departments & National Missions
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Custom on-premise or cloud deployments with GIS integration, high-resolution Planet 3m daily constellation feeds,
            and automated district-level afforestation audits across Maharashtra and India.
          </p>
        </div>

        <Button asChild variant="outline" className="rounded-xl border-purple-500/30 text-xs font-semibold">
          <Link to="/contact">
            Schedule Institutional Briefing <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
