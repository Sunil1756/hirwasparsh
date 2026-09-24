import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AnalyticsTracker } from "@/lib/analytics";

// Lazy-loaded pages to eliminate blank-screen render blocking and minimize initial bundle size
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const PlantTree = lazy(() => import("./pages/PlantTree"));
const PlantChooser = lazy(() => import("./pages/PlantChooser"));
const OrganizationPlantation = lazy(() => import("./pages/OrganizationPlantation"));
const CommunityDashboard = lazy(() => import("./pages/CommunityDashboard"));
const TreeMap = lazy(() => import("./pages/TreeMap"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const GovernmentDashboard = lazy(() => import("./pages/GovernmentDashboard"));
const FieldWorkerDashboard = lazy(() => import("./pages/FieldWorkerDashboard"));
const TreeAdopterDashboard = lazy(() => import("./pages/TreeAdopterDashboard"));
const Login = lazy(() => import("./pages/Login"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TreeProfile = lazy(() => import("./pages/TreeProfile"));
const GrowthUpdates = lazy(() => import("./pages/GrowthUpdates"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const BulkOnboardPage = lazy(() => import("./pages/BulkOnboardPage"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
const CSRCorporatePortal = lazy(() => import("./pages/CSRCorporatePortal"));
const NGOWorkspacePage = lazy(() => import("./pages/NGOWorkspacePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const TreeStory = lazy(() => import("./pages/TreeStory"));

const PageLoadingFallback = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
    <div className="h-9 w-9 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
    <span className="text-xs text-muted-foreground font-medium">Loading verified module...</span>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnalyticsTracker />
          <AuthProvider>
            <Navbar />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/plant" element={<PlantChooser />} />
                <Route path="/plant/individual" element={<ProtectedRoute><PlantTree /></ProtectedRoute>} />
                <Route path="/plant/organization" element={<OrganizationPlantation />} />
                <Route path="/plant/bulk" element={<ProtectedRoute><BulkOnboardPage /></ProtectedRoute>} />
                <Route path="/bulk-onboard" element={<ProtectedRoute><BulkOnboardPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<CommunityDashboard />} />
                <Route path="/adopter" element={<RoleProtectedRoute requiredRole={["tree_adopter", "user", "admin"]}><TreeAdopterDashboard /></RoleProtectedRoute>} />
                <Route path="/my-trees" element={<RoleProtectedRoute requiredRole={["tree_adopter", "user", "admin"]}><TreeAdopterDashboard /></RoleProtectedRoute>} />
                <Route path="/field-worker" element={<RoleProtectedRoute requiredRole={["field_worker", "admin"]}><FieldWorkerDashboard /></RoleProtectedRoute>} />
                <Route path="/scouting" element={<RoleProtectedRoute requiredRole={["field_worker", "admin"]}><FieldWorkerDashboard /></RoleProtectedRoute>} />
                <Route path="/tree-map" element={<TreeMap />} />
                <Route path="/analytics" element={<Navigate to="/intelligence" replace />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/admin" element={<RoleProtectedRoute requiredRole="admin"><AdminDashboard /></RoleProtectedRoute>} />
                <Route path="/admin-login" element={<Navigate to="/login?redirect=/admin" replace />} />
                <Route path="/admin/audit-log" element={<RoleProtectedRoute requiredRole="admin"><AdminAuditLog /></RoleProtectedRoute>} />
                <Route path="/government" element={<RoleProtectedRoute requiredRole={["government", "admin"]}><GovernmentDashboard /></RoleProtectedRoute>} />
                <Route path="/login" element={<Login />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/tree/:id" element={<TreeProfile />} />
                <Route path="/tree-story/:id" element={<TreeStory />} />
                <Route path="/challenges" element={<Navigate to="/dashboard" replace />} />
                <Route path="/drives" element={<Navigate to="/plant" replace />} />
                <Route path="/tree-health" element={<Navigate to="/intelligence" replace />} />
                <Route path="/growth-updates" element={<GrowthUpdates />} />
                <Route path="/satellite" element={<Navigate to="/tree-map" replace />} />
                <Route path="/green-impact" element={<Navigate to="/dashboard" replace />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/csr-portal" element={<ProtectedRoute><CSRCorporatePortal /></ProtectedRoute>} />
                <Route path="/ngo-workspace" element={<RoleProtectedRoute requiredRole={["field_worker", "admin"]}><NGOWorkspacePage /></RoleProtectedRoute>} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/verify/cert/:serialNo" element={<CertificateVerify />} />
                <Route path="/verify/cert" element={<CertificateVerify />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Footer />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
