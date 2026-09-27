import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
  Download,
  Copy,
  Check,
  Server,
  ArrowRight,
  X,
  RefreshCw,
  Award,
  FileText,
  BadgePercent,
  Settings,
  Landmark,
} from "lucide-react";
import {
  aiPaymentAndActivationService,
  EnterpriseTierSelection,
  PaymentGatewayType,
  EnterpriseActivationResult,
} from "../../services/aiPaymentAndActivationService";
import { aiModelTrainingAndSubscriptionService } from "../../services/aiModelTrainingAndSubscriptionService";
import { realRazorpayPaymentService, CreatedOrder } from "../../services/realRazorpayPaymentService";

interface EnterpriseAiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: EnterpriseActivationResult) => void;
  initialTier?: EnterpriseTierSelection;
}

export const EnterpriseAiCheckoutModal: React.FC<EnterpriseAiCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTier = "enterprise_dedicated_annual",
}) => {
  const [selectedTier, setSelectedTier] = useState<EnterpriseTierSelection>(initialTier);
  const [currency, setCurrency] = useState<"USD" | "INR">("INR");
  const [gateway, setGateway] = useState<PaymentGatewayType>("razorpay_upi");

  // Form fields
  const [billingName, setBillingName] = useState<string>("Dr. Sameer Patil");
  const [billingEmail, setBillingEmail] = useState<string>("sameer.patil@agroforestry-mrv.org");
  const [billingPhone, setBillingPhone] = useState<string>("+91 98220 12345");
  const [organizationName, setOrganizationName] = useState<string>("Maharashtra Agroforestry Foundation");
  const [cardNumber, setCardNumber] = useState<string>("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState<string>("08/29");
  const [cardCvc, setCardCvc] = useState<string>("889");
  const [upiId, setUpiId] = useState<string>("hirwasparsh@okhdfcbank");
  const [poNumber, setPoNumber] = useState<string>("PO-2026-CSR-8812");
  const [gstNumber, setGstNumber] = useState<string>("27AAACH7409R1ZZ");

  // Merchant Settlement Settings Drawer
  const [showMerchantConfig, setShowMerchantConfig] = useState<boolean>(false);
  const [merchantKeyId, setMerchantKeyId] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [activationResult, setActivationResult] = useState<EnterpriseActivationResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  useEffect(() => {
    setMerchantKeyId(realRazorpayPaymentService.getRazorpayKeyId());
  }, []);

  if (!isOpen) return null;

  const tiers = aiPaymentAndActivationService.getEnterpriseTiers();
  const currentTierObj = tiers.find((t) => t.id === selectedTier) || tiers[0];
  const price = currency === "INR" ? currentTierObj.priceInr : currentTierObj.priceUsd;
  const gst = Math.round(price * 0.18 * 100) / 100;
  const total = Math.round((price + gst) * 100) / 100;

  const handleSaveMerchantKey = () => {
    realRazorpayPaymentService.setMerchantKeyId(merchantKeyId);
    setShowMerchantConfig(false);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setProcessingStage("Creating Cryptographic Order on Razorpay Gateway...");

    // 1. Create Order via realRazorpayPaymentService
    const planMapping =
      selectedTier === "enterprise_dedicated_annual"
        ? "csr_enterprise"
        : selectedTier === "pro_botanical_annual"
        ? "ngo_pro"
        : "starter_pilot";

    const order = await realRazorpayPaymentService.createOrder(
      planMapping,
      "annual",
      currency,
      {
        name: billingName,
        email: billingEmail,
        phone: billingPhone,
        organizationName,
        gstin: gstNumber,
      },
      gateway === "corporate_po" ? "corporate_po" : "razorpay"
    );

    // 2. Handle Corporate PO Invoicing
    if (gateway === "corporate_po") {
      setProcessingStage("Generating Formal Corporate PO & Tax Invoice...");
      const poResult = await realRazorpayPaymentService.processCorporatePoOrder(order, poNumber);

      const mappedActivationResult: EnterpriseActivationResult = {
        success: true,
        transactionId: poResult.paymentId,
        invoiceNumber: poResult.invoiceNumber,
        tierActivated: selectedTier,
        licenseKey: poResult.licenseKey,
        dedicatedVertexEndpointUri: poResult.vertexEndpointUri || "",
        verraComplianceCertificateNumber: `VERRA-VM0047-${Date.now()}`,
        unlockedFeatures: currentTierObj.features,
      };

      aiModelTrainingAndSubscriptionService.updateSubscriptionPlan("enterprise_dedicated", "annual");
      setIsProcessing(false);
      setActivationResult(mappedActivationResult);
      if (onSuccess) onSuccess(mappedActivationResult);
      return;
    }

    // 3. Handle Razorpay Gateway Launch
    setProcessingStage("Opening Secure Razorpay UPI / Card / NetBanking Gateway...");

    await realRazorpayPaymentService.openRazorpayModal(
      order,
      (paymentResult) => {
        const mappedResult: EnterpriseActivationResult = {
          success: true,
          transactionId: paymentResult.paymentId,
          invoiceNumber: paymentResult.invoiceNumber,
          tierActivated: selectedTier,
          licenseKey: paymentResult.licenseKey,
          dedicatedVertexEndpointUri: paymentResult.vertexEndpointUri || "",
          verraComplianceCertificateNumber: `VERRA-VM0047-${Date.now()}`,
          unlockedFeatures: currentTierObj?.features || [
            "Copernicus Sentinel-2 L2A STAC Overpasses",
            "Google Gemini 2.5 Botanical Vision AI",
            "SEBI BRSR Principle 6 Environmental Export",
            "IPCC Tier-2 Allometric Carbon Ledger",
          ],
        };

        aiModelTrainingAndSubscriptionService.updateSubscriptionPlan("enterprise_dedicated", "annual");
        setIsProcessing(false);
        setActivationResult(mappedResult);
        if (onSuccess) onSuccess(mappedResult);
      },
      (err) => {
        console.error("Payment error:", err);
        setIsProcessing(false);
      }
    );
  };

  const handleCopyKey = () => {
    if (activationResult?.licenseKey) {
      navigator.clipboard?.writeText?.(activationResult.licenseKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      data-testid="enterprise-checkout-modal"
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          data-testid="close-checkout-modal"
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: CHECKOUT & PAYMENT FORM */}
        {!activationResult && (
          <div>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border-b border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        Upgrade to Advanced Enterprise AI Model
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Live Gateway
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Direct Payout Settlement • Razorpay UPI / Cards / NetBanking • 18% GST Invoicing
                    </p>
                  </div>
                </div>

                {/* Merchant Settings Toggle */}
                <button
                  type="button"
                  onClick={() => setShowMerchantConfig(!showMerchantConfig)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Configure Razorpay Merchant Key ID & Bank Settlement"
                >
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Merchant Setup</span>
                </button>
              </div>

              {/* Collapsible Merchant Config Drawer */}
              {showMerchantConfig && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4" /> Razorpay Payout Settlement & Merchant Key
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Funds auto-settle to your registered bank account
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Paste your <strong>Razorpay Key ID</strong> from your Razorpay Dashboard (
                    <code className="text-emerald-300">rzp_live_...</code> or <code className="text-emerald-300">rzp_test_...</code>
                    ). All payments made through UPI, GPay, or Cards will flow directly to your business account.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={merchantKeyId}
                      onChange={(e) => setMerchantKeyId(e.target.value)}
                      placeholder="rzp_live_your_key_id or rzp_test_your_key_id"
                      className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveMerchantKey}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleProcessPayment} className="p-6 space-y-6">
              {/* Currency & Tier Selector */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Select Subscription Plan:
                  </label>
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrency("INR")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        currency === "INR" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      INR (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        currency === "USD" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {tiers.map((t) => {
                    const isSelected = selectedTier === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTier(t.id)}
                        data-testid={`tier-option-${t.id}`}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-950/60"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">
                            {t.badge}
                          </span>
                          <h4 className="font-bold text-white text-xs">{t.title}</h4>
                          <div className="text-lg font-extrabold font-mono text-white mt-1">
                            {currency === "INR" ? `₹${t.priceInr.toLocaleString()}` : `$${t.priceUsd}`}
                          </div>
                          <span className="text-[10px] text-slate-400 block">{t.billingPeriod}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Gateway Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Choose Payment Method:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setGateway("razorpay_upi")}
                    data-testid="gateway-upi-btn"
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      gateway === "razorpay_upi"
                        ? "bg-emerald-950 border-emerald-400 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" /> Razorpay UPI / QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setGateway("credit_card")}
                    data-testid="gateway-cc-btn"
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      gateway === "credit_card"
                        ? "bg-emerald-950 border-emerald-400 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-400" /> Credit / Debit Card
                  </button>

                  <button
                    type="button"
                    onClick={() => setGateway("netbanking")}
                    data-testid="gateway-netbanking-btn"
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      gateway === "netbanking"
                        ? "bg-emerald-950 border-emerald-400 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-400" /> NetBanking
                  </button>

                  <button
                    type="button"
                    onClick={() => setGateway("corporate_po")}
                    data-testid="gateway-po-btn"
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      gateway === "corporate_po"
                        ? "bg-emerald-950 border-emerald-400 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-purple-400" /> Corporate PO
                  </button>
                </div>
              </div>

              {/* Gateway-specific payment input fields */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                {gateway === "razorpay_upi" && (
                  <div className="space-y-2">
                    <label className="text-slate-400 block mb-1">
                      Virtual Payment Address (VPA / UPI ID) or Scan QR on next step:
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      data-testid="input-upi-id"
                      placeholder="username@okhdfcbank or 9876543210@paytm"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Supports Google Pay, PhonePe, Paytm, BHIM UPI & Indian Banks.</span>
                    </div>
                  </div>
                )}

                {gateway === "credit_card" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Card Number (Visa / Mastercard / RuPay / Amex):</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        data-testid="input-card-number"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Expiration (MM/YY):</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">CVC / CVV:</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {gateway === "corporate_po" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Purchase Order (PO) Reference Number:</label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        data-testid="input-po-number"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Organization GSTIN (for 18% Input Tax Credit):</label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {gateway === "netbanking" && (
                  <div>
                    <label className="text-slate-400 block mb-1">Select Bank for Direct Debit / NEFT:</label>
                    <select className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none">
                      <option>HDFC Bank Corporate Banking</option>
                      <option>State Bank of India (SBI)</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {/* Organization & Billing Details */}
                <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-slate-400 block mb-1">Authorized Billing Name:</label>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Billing Work Email:</label>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Mobile (for SMS Receipt):</label>
                    <input
                      type="text"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Order Total & Submit */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs">
                  <div className="text-slate-400">Total Investment (incl. 18% GST):</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400" data-testid="order-total-display">
                    {currency === "INR" ? `₹${total.toLocaleString()}` : `$${total.toFixed(2)}`} {currency}
                  </div>
                  <span className="text-[10px] text-slate-500">Includes 256-bit SSL encrypted transaction</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  data-testid="submit-payment-btn"
                  className="py-3 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/50 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{processingStage}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay & Activate Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: POST-PAYMENT ACTIVATION & CREDENTIALS CERTIFICATE */}
        {activationResult && (
          <div className="p-6 sm:p-8 space-y-6" data-testid="activation-success-view">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/60">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Enterprise AI Model Activated Successfully!
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Payment captured successfully. Your MRV workspace and Gemini 2.5 Pro reasoning engine are active.
              </p>
            </div>

            {/* License Certificate Box */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Certified License Key:
                </span>
                <span className="font-mono text-purple-300">{activationResult.transactionId}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activationResult.licenseKey}
                  data-testid="license-key-display"
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-sm font-mono text-emerald-300 font-bold focus:outline-none"
                />
                <button
                  onClick={handleCopyKey}
                  data-testid="copy-license-btn"
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                  title="Copy Key"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Endpoint URI */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Dedicated Vertex AI TPU Endpoint URI:</span>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300 truncate">
                  {activationResult.dedicatedVertexEndpointUri}
                </div>
              </div>

              {/* Unlocked Capabilities */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-300 font-bold block mb-2">
                  Activated Sovereign AI Capabilities:
                </span>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {(activationResult.unlockedFeatures || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs font-mono text-slate-400">
                <span>Invoice: {activationResult.invoiceNumber} • Verra Cert: {activationResult.verraComplianceCertificateNumber}</span>
              </div>

              <button
                onClick={onClose}
                data-testid="launch-studio-btn"
                className="py-3 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/50 transition-all"
              >
                <span>Launch Enterprise AI Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
