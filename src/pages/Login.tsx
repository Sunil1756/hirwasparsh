import { useState } from "react";
import { motion } from "framer-motion";
import { TreePine, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent, type: string) => {
    e.preventDefault();
    toast({ title: type === "login" ? "Welcome back! 🌿" : "Account created! 🌱", description: "Redirecting to your dashboard..." });
  };

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <TreePine className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-heading text-3xl font-bold">Hirwa Sparsh</h1>
          <p className="text-muted-foreground text-sm">Connecting People with Nature</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, "login")} className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input type="email" placeholder="you@example.com" required />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4" /> Password</Label>
                  <Input type="password" placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full">Log In</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={(e) => handleSubmit(e, "signup")} className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4" /> Full Name</Label>
                  <Input placeholder="Your full name" required />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input type="email" placeholder="you@example.com" required />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4" /> Password</Label>
                  <Input type="password" placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
