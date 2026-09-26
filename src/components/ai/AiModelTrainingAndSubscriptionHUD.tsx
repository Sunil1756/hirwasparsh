import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Zap,
  CreditCard,
  Key,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Download,
  Flame,
  Award,
  DollarSign,
  TrendingUp,
  Server,
  Play,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Database,
  ExternalLink,
} from "lucide-react";
import {
  aiModelTrainingAndSubscriptionService,
  AiSubscriptionPlan,
  UserSubscriptionState,
  MarketplaceAiModel,
  SftTrainingJob,
  SftTrainingHyperparameters,
} from "../../services/aiModelTrainingAndSubscriptionService";
import { EnterpriseAiCheckoutModal } from "./EnterpriseAiCheckoutModal";

interface AiModelTrainingAndSubscriptionHUDProps {
  className?: string;
}

export const AiModelTrainingAndSubscriptionHUD: React.FC<AiModelTrainingAndSubscriptionHUDProps> = ({
  className = "",
}) => {
  const [activeMainTab, setActiveMainTab] = useState<"subscriptions" | "marketplace" | "training">("subscriptions");
  const [plans] = useState<AiSubscriptionPlan[]>(aiModelTrainingAndSubscriptionService.getSubscriptionPlans());
  const [subscriptionState, setSubscriptionState] = useState<UserSubscriptionState>(
    aiModelTrainingAndSubscriptionService.getCurrentSubscriptionState()
  );
  const [marketplaceModels, setMarketplaceModels] = useState<MarketplaceAiModel[]>(
    aiModelTrainingAndSubscriptionService.getMarketplaceModels()
  );
  const [trainingJobs, setTrainingJobs] = useState<SftTrainingJob[]>(
    aiModelTrainingAndSubscriptionService.getTrainingJobs()
  );

  // Training form state
  const [jobName, setJobName] = useState<string>("GE-BioVision-WesternGhats-SFT-v2");
  const [baseModel, setBaseModel] = useState<"gemini-2.5-pro" | "gemini-2.5-flash">("gemini-2.5-pro");
  const [epochs, setEpochs] = useState<number>(5);
  const [loraRank, setLoraRank] = useState<number>(32);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [sampleCount, setSampleCount] = useState<number>(25000);
  const [isLaunchingTraining, setIsLaunchingTraining] = useState<boolean>(false);

  // Notification / Receipt message state
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);

  const handleSwitchPlan = (planId: string) => {
    const updated = aiModelTrainingAndSubscriptionService.updateSubscriptionPlan(planId, subscriptionState.billingCycle);
    setSubscriptionState(updated);
    setNotificationMsg(`Subscription successfully changed to: ${planId.replace(/_/g, " ").toUpperCase()}`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handlePurchaseModel = (modelId: string, purchaseType: "perpetual_license" | "dedicated_monthly_endpoint") => {
    const res = aiModelTrainingAndSubscriptionService.purchaseMarketplaceModel(modelId, purchaseType);
    setMarketplaceModels(aiModelTrainingAndSubscriptionService.getMarketplaceModels());
    setSubscriptionState(aiModelTrainingAndSubscriptionService.getCurrentSubscriptionState());
    setNotificationMsg(`Purchase Confirmed! Receipt: ${res.receiptId}`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleLaunchTrainingJob = () => {
    setIsLaunchingTraining(true);
    setTimeout(() => {
      const newJob = aiModelTrainingAndSubscriptionService.launchVertexAiTrainingJob(jobName, {
        baseModel,
        epochs,
        loraRank,
        batchSize,
        datasetSampleCount: sampleCount,
      });
      setTrainingJobs(aiModelTrainingAndSubscriptionService.getTrainingJobs());
      setIsLaunchingTraining(false);
      setNotificationMsg(`Vertex AI SFT Training Job Launched! Job ID: ${newJob.jobId}`);
      setTimeout(() => setNotificationMsg(null), 5000);
    }, 600);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard?.writeText?.(subscriptionState.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleExportWeights = (jobId: string, format: "onnx" | "tflite") => {
    const res = aiModelTrainingAndSubscriptionService.exportModelWeights(jobId, format);
    setNotificationMsg(`Export Ready: ${res.exportUri} (${(res.bundleSizeBytes / 1000000).toFixed(1)} MB)`);
    setTimeout(() => setNotificationMsg(null), 6000);
  };

  const currentPlan = plans.find((p) => p.id === subscriptionState.activePlanId) || plans[0];
  const quotaPercent = Math.min(100, Math.round((subscriptionState.monthlyScansUsed / subscriptionState.monthlyQuotaLimit) * 100));

  return (
    <div
      className={`bg-slate-900/95 border border-indigo-500/40 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100 ${className}`}
      data-testid="ai-training-subscription-hud"
    >
      {/* 1. MASTER HEADER */}
      <div className="p-5 sm:p-7 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                AI Model Training, Subscription & Marketplace Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Vertex AI & Gemini SFT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Custom Model Fine-Tuning • Specialized Forestry Models • API Quotas & Enterprise Dedicated TPU Provisioning
            </p>
          </div>
        </div>

        {/* Global Action / Status Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCheckoutModalOpen(true)}
            data-testid="open-checkout-modal-header-btn"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Buy Advanced Version ($299/mo)</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Credit: ${subscriptionState.tokenCreditBalanceUsd.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notificationMsg && (
        <div
          className="p-3 bg-indigo-950/90 border-b border-indigo-500/40 text-xs font-semibold text-indigo-200 flex items-center justify-between px-6 transition-all"
          data-testid="notification-toast"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notificationMsg}</span>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVIGATION TABS */}
      <div className="border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6 flex items-center gap-4 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveMainTab("subscriptions")}
          data-testid="tab-nav-subscriptions"
          className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeMainTab === "subscriptions"
              ? "border-indigo-500 text-indigo-300 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>1. AI Subscriptions & API Keys</span>
        </button>

        <button
          onClick={() => setActiveMainTab("marketplace")}
          data-testid="tab-nav-marketplace"
          className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeMainTab === "marketplace"
              ? "border-indigo-500 text-indigo-300 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>2. Forestry Model Marketplace ({marketplaceModels.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab("training")}
          data-testid="tab-nav-training"
          className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
            activeMainTab === "training"
              ? "border-indigo-500 text-indigo-300 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Brain className="w-4 h-4 text-emerald-400" />
          <span>3. Vertex AI Custom Fine-Tuning Studio</span>
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTIONS & API KEYS */}
      {activeMainTab === "subscriptions" && (
        <div className="p-4 sm:p-6 space-y-6" data-testid="panel-subscriptions">
          {/* Active Usage & API Key Bar */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Quota Meter */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Monthly AI Scan Quota</span>
                <span className="text-indigo-400 font-mono font-bold">
                  {subscriptionState.monthlyScansUsed.toLocaleString()} / {subscriptionState.monthlyQuotaLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>{quotaPercent}% Used</span>
                <span>Renews in 24 days</span>
              </div>
            </div>

            {/* API Key Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-semibold">Active AI Vision API Key</span>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={subscriptionState.apiKey}
                  data-testid="api-key-input"
                  className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
                />
                <button
                  onClick={handleCopyApiKey}
                  data-testid="copy-api-key-btn"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                  title="Copy API Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Scope: read/write multimodal vision & carbon MRV</span>
            </div>

            {/* Dedicated TPU Endpoints */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-semibold">Provisioned Dedicated Endpoints</span>
              <div className="space-y-1">
                {subscriptionState.activeDedicatedEndpoints.map((ep, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <Server className="w-3 h-3 text-emerald-400" />
                    <span>{ep}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subscription Plans Tier Cards */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Choose AI Vision & Model Subscription Tier:</h3>
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const isActive = subscriptionState.activePlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    data-testid={`plan-card-${plan.id}`}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? "bg-gradient-to-b from-indigo-950/80 to-slate-950 border-indigo-500 shadow-xl shadow-indigo-950/50"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-base">{plan.name}</h4>
                          <span className="text-[11px] text-slate-400">{plan.monthlyQuotaScans.toLocaleString()} scans / mo</span>
                        </div>
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Active Tier
                          </span>
                        )}
                      </div>

                      <div className="pt-1">
                        <div className="text-2xl font-extrabold font-mono text-white">
                          ${plan.monthlyPriceUsd} <span className="text-xs text-slate-400 font-sans font-normal">/ month (₹{plan.monthlyPriceInr})</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                        {plan.features.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[11px]">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5">
                      <button
                        onClick={() => handleSwitchPlan(plan.id)}
                        disabled={isActive}
                        data-testid={`btn-select-plan-${plan.id}`}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
                          isActive
                            ? "bg-slate-800 text-slate-400 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40"
                        }`}
                      >
                        {isActive ? "Current Active Plan" : "Upgrade / Select Plan"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORESTRY MODEL MARKETPLACE */}
      {activeMainTab === "marketplace" && (
        <div className="p-4 sm:p-6 space-y-6" data-testid="panel-marketplace">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Pre-Trained Specialized Forestry AI Models</h3>
              <p className="text-xs text-slate-400">
                Buy perpetual weights or subscribe to dedicated Google Cloud Vertex AI TPU endpoints.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono text-purple-300 border border-slate-700">
              Verra VM0047 MRV Compatible
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {marketplaceModels.map((model) => (
              <div
                key={model.id}
                data-testid={`marketplace-card-${model.id}`}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{model.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                          v{model.version}
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-400 font-medium">{model.tagline}</span>
                    </div>

                    {model.isPurchased && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Purchased
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>

                  {/* Benchmark strip */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Top-1 Accuracy</span>
                      <strong className="text-emerald-400 font-mono">{model.accuracyBenchmarkPct}%</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">P95 Latency</span>
                      <strong className="text-purple-300 font-mono">{model.latencyP95Ms} ms</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Species Covered</span>
                      <strong className="text-amber-400 font-mono">{model.supportedSpeciesCount} native</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    <strong>Provenance: </strong>
                    <span className="text-slate-300">{model.trainingDatasetProvenance}</span>
                  </div>
                </div>

                {/* Pricing & Purchase Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Licensing Options</span>
                    <div className="text-xs font-mono">
                      <strong className="text-white">${model.perpetualLicensePriceUsd}</strong> license /{" "}
                      <span className="text-indigo-400">${model.monthlyEndpointPriceUsd}/mo</span> cloud endpoint
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePurchaseModel(model.id, "perpetual_license")}
                      data-testid={`buy-license-${model.id}`}
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-950/40"
                    >
                      Buy License (${model.perpetualLicensePriceUsd})
                    </button>

                    <button
                      onClick={() => handlePurchaseModel(model.id, "dedicated_monthly_endpoint")}
                      data-testid={`sub-endpoint-${model.id}`}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
                    >
                      Subscribe Endpoint
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VERTEX AI FINE-TUNING & TRAINING */}
      {activeMainTab === "training" && (
        <div className="p-4 sm:p-6 space-y-6" data-testid="panel-training">
          {/* Training Hyperparameter Studio Form */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Google Cloud Vertex AI Supervised Fine-Tuning (SFT) Hyperparameter Studio
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Target: TPU v5e Cluster</span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Job Name / Model Tag:</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  data-testid="input-job-name"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Base Architecture:</label>
                <select
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value as any)}
                  data-testid="select-base-model"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Multimodal)</option>
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Ultra Fast)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">LoRA Adapter Rank (r):</label>
                <select
                  value={loraRank}
                  onChange={(e) => setLoraRank(Number(e.target.value))}
                  data-testid="select-lora-rank"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value={16}>Rank 16 (Lightweight, 45MB)</option>
                  <option value={32}>Rank 32 (Recommended, 85MB)</option>
                  <option value={64}>Rank 64 (Full Expressivity, 160MB)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Epochs (Iterations):</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  data-testid="input-epochs"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Batch Size:</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  data-testid="select-batch-size"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value={16}>16 Samples</option>
                  <option value={32}>32 Samples (Optimal TPU throughput)</option>
                  <option value={64}>64 Samples</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Training Dataset Samples:</label>
                <input
                  type="number"
                  step={5000}
                  min={5000}
                  value={sampleCount}
                  onChange={(e) => setSampleCount(Number(e.target.value))}
                  data-testid="input-samples"
                  className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleLaunchTrainingJob}
                disabled={isLaunchingTraining}
                data-testid="launch-training-btn"
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
              >
                {isLaunchingTraining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Provisioning TPU Pod...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Launch Supervised Fine-Tuning Job</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active / Historical Training Jobs Table */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm">Fine-Tuning Job History & Live Progress</h3>

            <div className="space-y-4">
              {trainingJobs.map((job) => (
                <div
                  key={job.jobId}
                  data-testid={`training-job-${job.jobId}`}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">{job.jobName}</strong>
                        <span className="font-mono text-xs text-purple-400">({job.jobId})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Base: {job.hyperparameters.baseModel} • {job.hyperparameters.datasetSampleCount.toLocaleString()} samples • {job.hyperparameters.epochs} epochs
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                          job.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">${job.estimatedCostUsd} USD</span>
                    </div>
                  </div>

                  {/* Metrics strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Top-1 Accuracy</span>
                      <strong className="text-emerald-400 font-mono">{job.top1AccuracyPct}%</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">F1 Score</span>
                      <strong className="text-indigo-400 font-mono">{job.f1Score}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Train / Val Loss</span>
                      <strong className="text-slate-300 font-mono">{job.trainLoss} / {job.validationLoss}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Checkpoint URI</span>
                      <span className="text-purple-300 font-mono text-[10px] truncate block">{job.checkpointUri}</span>
                    </div>
                  </div>

                  {/* Logs snippet */}
                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-400 font-mono text-[10px] max-h-24 overflow-y-auto space-y-0.5">
                    {job.trainingLogs.map((log, lIdx) => (
                      <div key={lIdx}>{log}</div>
                    ))}
                  </div>

                  {/* Export weights actions */}
                  <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-slate-800">
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verra VM0047 MRV Certified Checkpoint
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportWeights(job.jobId, "onnx")}
                        data-testid={`export-onnx-${job.jobId}`}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-all"
                      >
                        <Download className="w-3 h-3" /> ONNX (84MB)
                      </button>

                      <button
                        onClick={() => handleExportWeights(job.jobId, "tflite")}
                        data-testid={`export-tflite-${job.jobId}`}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-all"
                      >
                        <Download className="w-3 h-3" /> TFLite (18MB)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Checkout & Instant Activation Modal */}
      <EnterpriseAiCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={(result) => {
          setSubscriptionState(aiModelTrainingAndSubscriptionService.getCurrentSubscriptionState());
          setNotificationMsg(`Enterprise AI Activated! License: ${result.licenseKey}`);
        }}
      />
    </div>
  );
};
