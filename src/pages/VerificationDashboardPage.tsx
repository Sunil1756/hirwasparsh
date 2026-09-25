import React from "react";
import { VerificationDashboard } from "../components/verification/VerificationDashboard";

const VerificationDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <VerificationDashboard />
    </div>
  );
};

export default VerificationDashboardPage;
