import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, User, Building2, ShieldCheck, TreePine } from "lucide-react";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Green Enlightenment
          </h1>
          <p className="text-xl text-slate-400">
            Start free. Upgrade when your plantation program grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Individual */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <User className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">👤 Individual</CardTitle>
              <CardDescription className="text-slate-400 text-base min-h-[48px]">
                Monitor your own trees and plantation activities.
              </CardDescription>
              <div className="pt-4 pb-2">
                <span className="text-4xl font-bold text-white">FREE</span>
                <span className="text-slate-400 text-sm ml-2">forever</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {['Personal dashboard', 'Basic tree registration', 'Tree GPS location', 'Tree photographs', 'Monitoring history', 'Basic statistics'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/login" className="w-full">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                  Start Free
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* First NGO/Organization Project */}
          <Card className="bg-slate-900 border-emerald-500/50 flex flex-col relative overflow-hidden shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              FIRST PROJECT
            </div>
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <TreePine className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">🌱 First NGO/Organization Project</CardTitle>
              <CardDescription className="text-slate-400 text-base min-h-[48px]">
                Start your first plantation monitoring project at no cost.
              </CardDescription>
              <div className="pt-4 pb-2">
                <span className="text-4xl font-bold text-white">FREE</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {[
                  '1 Project Limit',
                  'Up to 500 trees',
                  'Up to 3 organization users',
                  'GPS tree registration',
                  'Basic monitoring & map',
                  'Basic project dashboard & reports'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className={i < 3 ? 'font-medium text-emerald-400' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/portal" className="w-full">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" size="lg">
                  Start Free Project
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Institutional MRV */}
          <Card className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl text-white">🏢 Institutional MRV</CardTitle>
              <CardDescription className="text-slate-400 text-base min-h-[48px]">
                Manage multiple plantation projects with organizational monitoring and MRV tools.
              </CardDescription>
              <div className="pt-4 pb-2">
                <span className="text-slate-400 text-sm">Starting at</span>
                <span className="text-4xl font-bold text-white ml-2">₹99</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {['Multiple projects', 'Advanced tree limits (1000 - 25,000+)', 'Larger teams', 'Field verification workflows', 'Audit history', 'Advanced MRV reports & analytics'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/plans" className="w-full">
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" variant="outline" size="lg">
                  View MRV Plans
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
