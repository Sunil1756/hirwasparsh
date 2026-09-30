import React, { useState } from "react";
import { motion } from "framer-motion";
import { TreePine, Users, BarChart3, Map, Leaf, Award, Camera, Repeat, ShieldCheck, Building2, UploadCloud, MapPin, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPreview() {
  const [accountType, setAccountType] = useState<"individual" | "professional">("individual");

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Top Navbar Simulation */}
      <div className="bg-background border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <TreePine className="h-6 w-6 text-primary" />
          <span className="font-bold font-heading text-lg">Green Enlightenment</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 bg-muted/50">
            {accountType === "individual" ? "Personal Account" : "Professional Account"}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAccountType(prev => prev === "individual" ? "professional" : "individual")}
            className="gap-2 font-medium"
          >
            <Repeat className="h-4 w-4" />
            Switch to {accountType === "individual" ? "Professional" : "Personal"}
          </Button>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {accountType === "individual" ? <IndividualDashboard /> : <ProfessionalDashboard />}
      </div>
    </div>
  );
}

function IndividualDashboard() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Welcome back, Alex! 👋</h1>
          <p className="text-muted-foreground mt-1">You're making a real difference. Keep growing!</p>
        </div>
        <Button className="gap-2 shadow-lg">
          <Camera className="h-4 w-4" /> Register New Tree
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Planted Trees</p>
                <h3 className="text-4xl font-bold mt-2 text-primary">12</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><TreePine className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Survival Rate</p>
                <h3 className="text-4xl font-bold mt-2">100%</h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl text-green-600"><ShieldCheck className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eco Points</p>
                <h3 className="text-4xl font-bold mt-2 text-amber-500">1,250</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Award className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4 font-heading">My Tree Map</h2>
      <Card className="h-[400px] flex items-center justify-center bg-muted/30 border-dashed">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground font-medium">Interactive Map goes here</p>
        </div>
      </Card>
    </motion.div>
  );
}

function ProfessionalDashboard() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Global Earth NGO</h1>
          <p className="text-muted-foreground mt-1">Professional Afforestation & Field Monitoring Dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <UploadCloud className="h-4 w-4" /> Bulk KML Upload
          </Button>
          <Button className="gap-2 shadow-lg">
            <Building2 className="h-4 w-4" /> Create New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Trees Managed</p>
            <h3 className="text-3xl font-bold mt-2">45,200</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Projects</p>
            <h3 className="text-3xl font-bold mt-2">8</h3>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Overdue Inspections</p>
            <h3 className="text-3xl font-bold mt-2 text-amber-600">312</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Field Workers</p>
            <h3 className="text-3xl font-bold mt-2">24</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="col-span-2 min-h-[300px]">
          <CardHeader>
            <CardTitle>Survival Rate by Project</CardTitle>
            <CardDescription>Verified via Field Audits & Sentinel-2 Satellite</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground border-t bg-muted/10">
            [ Bar Chart Component: 92% / 88% / 95% ]
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Field Worker Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20" />
                  <div>
                    <p className="font-medium">Worker #{i}</p>
                    <p className="text-xs text-muted-foreground">Last active 2h ago</p>
                  </div>
                </div>
                <Badge variant="secondary">{15 * i} obs.</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
