import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Target, Users, Plus, Loader2, TreePine, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const PlantationDrives = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    event_name: "",
    organizer_name: "",
    location: "",
    event_date: "",
    target_trees: "100",
    description: "",
  });

  const { data: drives = [], isLoading } = useQuery({
    queryKey: ["drives"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("plantation_drives")
          .select("*")
          .order("event_date", { ascending: true });
        if (error) {
          console.warn("plantation_drives query:", error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn("plantation_drives query error:", err);
        return [];
      }
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["drive-participants"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("drive_participants").select("*");
        if (error) {
          console.warn("drive_participants query:", error.message);
          return [];
        }
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: treeCounts = [] } = useQuery({
    queryKey: ["drive-tree-counts"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("trees").select("drive_id");
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const createDrive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("plantation_drives").insert({
        ...form,
        target_trees: parseInt(form.target_trees),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      setOpen(false);
      setForm({ event_name: "", organizer_name: "", location: "", event_date: "", target_trees: "100", description: "" });
      toast({ title: "Drive Created! 🌱", description: "Your plantation drive is now live." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinDrive = useMutation({
    mutationFn: async (driveId: string) => {
      const { error } = await supabase.from("drive_participants").insert({ drive_id: driveId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive-participants"] });
      toast({ title: "Joined! 🎉", description: "You've joined the plantation drive." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getParticipantCount = (driveId: string) => participants.filter(p => p.drive_id === driveId).length;
  const getTreeCount = (driveId: string) => treeCounts.filter(t => t.drive_id === driveId).length;
  const hasJoined = (driveId: string) => user ? participants.some(p => p.drive_id === driveId && p.user_id === user.id) : false;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-4">
              <Calendar className="h-4 w-4" /> Plantation Events
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Plantation Drives</h1>
            <p className="text-muted-foreground">Join or create community plantation events</p>
          </div>

          {user && (
            <div className="flex justify-end mb-6">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Create Drive</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Plantation Drive</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Event Name</Label>
                      <Input placeholder="e.g., Green Campus Drive" value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Organizer Name</Label>
                      <Input placeholder="e.g., Green Club, Solapur" value={form.organizer_name} onChange={e => setForm(f => ({ ...f, organizer_name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Location</Label>
                        <Input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label>Target Trees</Label>
                      <Input type="number" value={form.target_trees} onChange={e => setForm(f => ({ ...f, target_trees: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea placeholder="Describe your event..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => createDrive.mutate()} disabled={createDrive.isPending || !form.event_name || !form.event_date}>
                      {createDrive.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Drive
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Loading drives...</p>
            </div>
          ) : drives.length === 0 ? (
            <div className="text-center py-20">
              <TreePine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No drives yet</h3>
              <p className="text-muted-foreground">Create the first plantation drive for your community!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drives.map((d) => {
                const planted = getTreeCount(d.id);
                const pct = Math.min(100, Math.round((planted / d.target_trees) * 100));
                const pCount = getParticipantCount(d.id);
                const joined = hasJoined(d.id);
                const isPast = new Date(d.event_date) < new Date();

                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 hover:nature-glow transition-shadow">
                    <h3 className="font-heading text-lg font-semibold mb-1">{d.event_name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{d.organizer_name}</p>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" /> {d.location}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" /> {new Date(d.event_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" /> {pCount} participants
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-primary">{planted}/{d.target_trees} trees</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    {user ? (
                      joined ? (
                        <Link to={`/plant?drive=${d.id}`}>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <TreePine className="h-4 w-4" /> Plant Under This Drive
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" className="w-full" disabled={isPast || joinDrive.isPending}
                          onClick={() => joinDrive.mutate(d.id)}>
                          {isPast ? "Event Ended" : "Join Drive"}
                        </Button>
                      )
                    ) : (
                      <Link to="/login">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <LogIn className="h-4 w-4" /> Login to Join
                        </Button>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PlantationDrives;
