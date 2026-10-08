import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, PhoneCall, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: "Online payment coming soon",
      description: "Please contact us to activate this plan.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Institutional MRV Plans
          </h1>
          <p className="text-xl text-slate-400">
            Scale your plantation program with digital monitoring and MRV.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pilot Expansion */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl text-white">Pilot Expansion</CardTitle>
              <div className="pt-4 pb-2 border-b border-slate-800">
                <span className="text-3xl font-bold text-white">₹99</span>
                <span className="text-slate-400 text-sm ml-1">/ mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 2 projects</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 1,000 trees</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Basic monitoring</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> GPS & Photos</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Tree history</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Basic analytics</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={handleUpgrade}>Select Plan</Button>
            </CardFooter>
          </Card>

          {/* NGO Starter */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl text-white">NGO Starter</CardTitle>
              <div className="pt-4 pb-2 border-b border-slate-800">
                <span className="text-3xl font-bold text-white">₹499</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 5 projects</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 2,500 trees</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 5 users</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Project maps</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> GPS tree registry & monitoring</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Basic MRV report & CSV export</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={handleUpgrade}>Select Plan</Button>
            </CardFooter>
          </Card>

          {/* Professional MRV */}
          <Card className="bg-slate-900 border-emerald-500/50 flex flex-col relative overflow-hidden shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle className="text-xl text-emerald-400">Professional MRV</CardTitle>
              <div className="pt-4 pb-2 border-b border-emerald-900/50">
                <span className="text-3xl font-bold text-white">₹999</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 15 projects</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 10,000 trees</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 15 users</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Advanced monitoring</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Field verification & Evidence history</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Health/status analytics</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Advanced MRV reports</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Organization branding & Data export</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpgrade}>Select Plan</Button>
            </CardFooter>
          </Card>

          {/* Institutional MRV */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl text-white">Institutional MRV</CardTitle>
              <div className="pt-4 pb-2 border-b border-slate-800">
                <span className="text-3xl font-bold text-white">₹1,999</span>
                <span className="text-slate-400 text-sm ml-1">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 30 projects</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Up to 25,000 trees</li>
                <li className="flex items-start gap-3 text-slate-300 font-medium text-emerald-400"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Larger team</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Organization dashboard & multi-project analytics</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Field verification & Audit history</li>
                <li className="flex items-start gap-3 text-slate-300"><Check className="w-4 h-4 mt-0.5 shrink-0" /> Priority support</li>
                <li className="flex items-start gap-3 text-slate-300 text-xs italic mt-4">Future advanced environmental & satellite capabilities when implemented</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={handleUpgrade}>Select Plan</Button>
            </CardFooter>
          </Card>

        </div>
        
        <div className="text-center mt-12">
          <Link to="/">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
