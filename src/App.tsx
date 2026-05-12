import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import About from "./pages/About";
import PlantTree from "./pages/PlantTree";
import CommunityDashboard from "./pages/CommunityDashboard";
import TreeMap from "./pages/TreeMap";
import Analytics from "./pages/Analytics";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import Login from "./pages/Login";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import TreeProfile from "./pages/TreeProfile";
import PlantationDrives from "./pages/PlantationDrives";
import TreeHealth from "./pages/TreeHealth";
import GrowthUpdates from "./pages/GrowthUpdates";
import SatelliteMonitoring from "./pages/SatelliteMonitoring";
import GreenImpact from "./pages/GreenImpact";
import TreeStory from "./pages/TreeStory";
import Challenges from "./pages/Challenges";
import Intelligence from "./pages/Intelligence";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/plant" element={<PlantTree />} />
          <Route path="/dashboard" element={<CommunityDashboard />} />
          <Route path="/tree-map" element={<TreeMap />} />
          <Route path="/analytics" element={<Navigate to="/intelligence" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/government" element={<GovernmentDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/tree/:id" element={<TreeProfile />} />
          <Route path="/tree-story/:id" element={<TreeStory />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/drives" element={<PlantationDrives />} />
           <Route path="/tree-health" element={<TreeHealth />} />
           <Route path="/growth-updates" element={<GrowthUpdates />} />
           <Route path="/satellite" element={<SatelliteMonitoring />} />
           <Route path="/green-impact" element={<GreenImpact />} />
           <Route path="/intelligence" element={<Intelligence />} />
           <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
