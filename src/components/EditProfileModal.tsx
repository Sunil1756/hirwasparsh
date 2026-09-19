import { useState, useEffect } from "react";
import { User, Building2, Sparkles, CheckCircle2, Loader2, Edit3, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile?: {
    full_name?: string | null;
    organization_name?: string | null;
    avatar_url?: string | null;
    account_type?: string | null;
  } | null;
}

const AVATAR_PRESETS = [
  { id: "tree-pine", emoji: "🌲", label: "Pine Guardian" },
  { id: "tree-banyan", emoji: "🌳", label: "Banyan Sage" },
  { id: "sprout", emoji: "🌿", label: "Eco Warrior" },
  { id: "sunflower", emoji: "🌻", label: "Sunflower Hero" },
  { id: "leaf", emoji: "🍃", label: "Green Ranger" },
  { id: "earth", emoji: "🌍", label: "Earth Guardian" },
];

export const EditProfileModal = ({ open, onOpenChange, currentProfile }: EditProfileModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFullName(currentProfile?.full_name || (user.user_metadata?.full_name as string) || "");
      setOrganizationName(currentProfile?.organization_name || (user.user_metadata?.organization_name as string) || "");
      setAvatarUrl(currentProfile?.avatar_url || (user.user_metadata?.avatar_url as string) || "");
    }
  }, [open, user, currentProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = fullName.trim();
    if (trimmedName.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Your display name / username must be at least 3 characters.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Update Supabase profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          organization_name: organizationName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
          organization_name: organizationName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        },
      });

      // 3. Invalidate React queries so UI refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });

      toast({
        title: "Profile Updated! ✨",
        description: `Your username has been updated to "${trimmedName}".`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Could not save your profile changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Edit3 className="h-5 w-5 text-primary" /> Edit Profile & Username
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update your public display name, organization details, and avatar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Avatar Icon Selector */}
          <div>
            <Label className="block mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Profile Avatar
            </Label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatarUrl(preset.emoji)}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl transition-all border shrink-0 ${
                    avatarUrl === preset.emoji
                      ? "border-primary bg-primary/20 scale-110 shadow-sm"
                      : "border-border hover:bg-muted"
                  }`}
                  title={preset.label}
                >
                  {preset.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Username / Full Name */}
          <div>
            <Label className="flex items-center gap-2 mb-1.5 text-xs">
              <User className="h-3.5 w-3.5 text-primary" /> Username / Full Name
            </Label>
            <Input
              placeholder="e.g. Sunil Patil"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-background/80"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              This name is shown publicly on your planted trees, certificates, and leaderboard.
            </p>
          </div>

          {/* Organization Name */}
          <div>
            <Label className="flex items-center gap-2 mb-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Organization / College Name (Optional)
            </Label>
            <Input
              placeholder="e.g. Sahyadri Environmental Foundation"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="bg-background/80"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || fullName.trim().length < 3}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-md"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
