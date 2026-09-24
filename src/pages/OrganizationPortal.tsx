import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { organizationService, MemberWithProfile } from "@/services/organizationService";
import { Organization, OrganizationMember, OrganizationType, OrganizationMemberRole } from "@/types/coreDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Globe,
  UserPlus,
  Trash2,
  Sparkles,
  TreePine,
  CheckCircle2,
  ArrowRightLeft,
  Settings,
} from "lucide-react";

export const OrganizationPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [orgList, setOrgList] = useState<Array<{ organization: Organization; membership: OrganizationMember }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [currentMembership, setCurrentMembership] = useState<OrganizationMember | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New Org Form
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState<OrganizationType>("ngo");
  const [newOrgReg, setNewOrgReg] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");
  const [newOrgWebsite, setNewOrgWebsite] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationMemberRole>("member");
  const [isInviting, setIsInviting] = useState(false);

  // Transfer Ownership
  const [newOwnerId, setNewOwnerId] = useState("");

  const loadOrganizations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await organizationService.getUserOrganizations(user.id);
      setOrgList(list);

      if (list.length > 0 && !selectedOrg) {
        setSelectedOrg(list[0].organization);
        setCurrentMembership(list[0].membership);
      }
    } catch (err: any) {
      toast({ title: "Failed to load organizations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const memberList = await organizationService.getOrganizationMembers(orgId);
      setMembers(memberList);
    } catch (err: any) {
      toast({ title: "Failed to load members", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
      const match = orgList.find((item) => item.organization.id === selectedOrg.id);
      if (match) setCurrentMembership(match.membership);
    }
  }, [selectedOrg]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOrgName.trim()) return;

    try {
      setIsCreatingOrg(true);
      const res = await organizationService.createOrganization(user.id, {
        name: newOrgName,
        type: newOrgType,
        registration_number: newOrgReg || undefined,
        contact_email: newOrgEmail || undefined,
        contact_phone: newOrgPhone || undefined,
        website: newOrgWebsite || undefined,
      });

      toast({ title: "Organization Created!", description: `${res.organization.name} is now ready.` });
      setNewOrgName("");
      setNewOrgReg("");
      setNewOrgEmail("");
      setNewOrgPhone("");
      setNewOrgWebsite("");
      await loadOrganizations();
      setSelectedOrg(res.organization);
      setCurrentMembership(res.member);
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrg || !inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const inv = await organizationService.inviteMember(selectedOrg.id, user.id, {
        invited_email: inviteEmail,
        member_role: inviteRole,
      });

      toast({
        title: "Invitation Generated!",
        description: `Invitation token created: ${inv.token.substring(0, 12)}...`,
      });
      setInviteEmail("");
    } catch (err: any) {
      toast({ title: "Invitation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: OrganizationMemberRole) => {
    if (!user || !selectedOrg) return;
    try {
      await organizationService.updateMemberRole(selectedOrg.id, targetUserId, newRole, user.id);
      toast({ title: "Role Updated", description: "Member role has been changed successfully." });
      loadMembers(selectedOrg.id);
    } catch (err: any) {
      toast({ title: "Role Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!user || !selectedOrg) return;
    if (!window.confirm("Are you sure you want to remove this member from the organization?")) return;

    try {
      await organizationService.removeMember(selectedOrg.id, targetUserId, user.id);
      toast({ title: "Member Removed", description: "Member has been removed from organization." });
      loadMembers(selectedOrg.id);
    } catch (err: any) {
      toast({ title: "Removal Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleTransferOwnership = async () => {
    if (!user || !selectedOrg || !newOwnerId) return;
    if (!window.confirm("Are you sure you want to transfer ownership? You will be demoted to Admin.")) return;

    try {
      await organizationService.transferOwnership(selectedOrg.id, newOwnerId, user.id);
      toast({ title: "Ownership Transferred", description: "Organization ownership transferred successfully." });
      loadOrganizations();
      loadMembers(selectedOrg.id);
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.message, variant: "destructive" });
    }
  };

  const isManager = currentMembership && ["owner", "admin", "manager"].includes(currentMembership.member_role);
  const isOwner = currentMembership?.member_role === "owner";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & Org Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-400" /> Multi-Organization Portal
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Manage institutional afforestation entities, teams, roles, and project boundaries.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {orgList.length > 0 && (
              <Select
                value={selectedOrg?.id}
                onValueChange={(val) => {
                  const match = orgList.find((item) => item.organization.id === val);
                  if (match) {
                    setSelectedOrg(match.organization);
                    setCurrentMembership(match.membership);
                  }
                }}
              >
                <SelectTrigger className="w-[240px] bg-slate-900 border-slate-700">
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                  {orgList.map(({ organization, membership }) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name} ({membership.member_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                  <Plus className="w-4 h-4" /> Create Org
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" /> Register Organization
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Establish an institutional entity for collective afforestation, CSR, or municipal planting.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateOrganization} className="space-y-4 pt-2">
                  <div>
                    <Label className="text-xs text-slate-300">Organization Name *</Label>
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g. Sahyadri Bio-Reserve Trust"
                      className="bg-slate-950 border-slate-700 mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300">Organization Type *</Label>
                    <Select value={newOrgType} onValueChange={(val: any) => setNewOrgType(val)}>
                      <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                        <SelectItem value="ngo">NGO / Non-Profit Trust</SelectItem>
                        <SelectItem value="corporate">Corporate CSR Donor</SelectItem>
                        <SelectItem value="government">Government Department</SelectItem>
                        <SelectItem value="community">Community / Gram Panchayat</SelectItem>
                        <SelectItem value="educational">Educational Institution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300">Registration Number</Label>
                    <Input
                      value={newOrgReg}
                      onChange={(e) => setNewOrgReg(e.target.value)}
                      placeholder="e.g. NGO-MH-2024-8891"
                      className="bg-slate-950 border-slate-700 mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-300">Official Email</Label>
                      <Input
                        type="email"
                        value={newOrgEmail}
                        onChange={(e) => setNewOrgEmail(e.target.value)}
                        placeholder="contact@org.in"
                        className="bg-slate-950 border-slate-700 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-300">Phone</Label>
                      <Input
                        value={newOrgPhone}
                        onChange={(e) => setNewOrgPhone(e.target.value)}
                        placeholder="+91 98765..."
                        className="bg-slate-950 border-slate-700 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300">Official Website</Label>
                    <Input
                      value={newOrgWebsite}
                      onChange={(e) => setNewOrgWebsite(e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-950 border-slate-700 mt-1"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreatingOrg || !newOrgName.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2"
                  >
                    {isCreatingOrg ? "Creating..." : "Establish Organization"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Selected Org Content */}
        {selectedOrg ? (
          <Tabs defaultValue="members" className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl">
                  {selectedOrg.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white">{selectedOrg.name}</h2>
                    {selectedOrg.is_verified && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-slate-700 text-slate-300 uppercase text-xs">
                      {selectedOrg.type}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Role: <span className="text-emerald-400 font-semibold uppercase">{currentMembership?.member_role}</span>
                  </p>
                </div>
              </div>

              <TabsList className="bg-slate-900 border border-slate-800">
                <TabsTrigger value="members" className="data-[state=active]:bg-emerald-600">
                  <Users className="w-4 h-4 mr-2" /> Team Members ({members.length})
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-600">
                  <Settings className="w-4 h-4 mr-2" /> Organization Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Team & Member Roster</h3>
                  <p className="text-xs text-slate-400">Control access levels and field worker assignments.</p>
                </div>

                {isManager && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 gap-2">
                        <UserPlus className="w-4 h-4" /> Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Invite New Member</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                          Send a 7-day invitation link to join {selectedOrg.name}.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleInviteMember} className="space-y-4 pt-2">
                        <div>
                          <Label className="text-xs text-slate-300">Member Email *</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@domain.com"
                            className="bg-slate-950 border-slate-700 mt-1"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-slate-300">Designated Role</Label>
                          <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                            <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="admin">Admin (Full Control)</SelectItem>
                              <SelectItem value="manager">Manager (Projects & Tasks)</SelectItem>
                              <SelectItem value="field_worker">Field Worker (Data Collection)</SelectItem>
                              <SelectItem value="member">Member (Standard Access)</SelectItem>
                              <SelectItem value="viewer">Viewer (Read-Only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="submit"
                          disabled={isInviting || !inviteEmail.trim()}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          {isInviting ? "Sending..." : "Generate Invitation"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Members Table Card */}
              <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/60 text-slate-400 text-xs border-b border-slate-800">
                        <tr>
                          <th className="p-4">Member</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Joined Date</th>
                          {isManager && <th className="p-4 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {members.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/30">
                            <td className="p-4">
                              <div className="font-medium text-white">{m.profile?.full_name || "Active Member"}</div>
                              <div className="text-xs text-slate-400">{m.profile?.phone_number || m.user_id}</div>
                            </td>
                            <td className="p-4">
                              {isManager && m.member_role !== "owner" ? (
                                <Select
                                  value={m.member_role}
                                  onValueChange={(val: any) => handleRoleChange(m.user_id, val)}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-950 border-slate-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="field_worker">Field Worker</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  className={
                                    m.member_role === "owner"
                                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                      : "bg-slate-800 text-slate-300"
                                  }
                                >
                                  {m.member_role.toUpperCase()}
                                </Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                {m.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-4 text-xs text-slate-400">
                              {new Date(m.joined_at).toLocaleDateString()}
                            </td>
                            {isManager && (
                              <td className="p-4 text-right">
                                {m.member_role !== "owner" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(m.user_id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/40 h-8"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Ownership Transfer Section for Owner */}
              {isOwner && (
                <Card className="bg-slate-900/40 border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" /> Transfer Organization Ownership
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Select an existing member to become the sole Owner of this organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-center gap-3">
                    <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                      <SelectTrigger className="w-full sm:w-[260px] bg-slate-950 border-slate-700">
                        <SelectValue placeholder="Select New Owner" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                        {members
                          .filter((m) => m.member_role !== "owner")
                          .map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profile?.full_name || m.user_id} ({m.member_role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      disabled={!newOwnerId}
                      onClick={handleTransferOwnership}
                      className="w-full sm:w-auto"
                    >
                      Confirm Ownership Transfer
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Organization Profile</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Official registry information and contact points.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Registration ID</span>
                    <span className="font-semibold text-white">{selectedOrg.registration_number || "Unregistered / Community"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Official Email</span>
                    <span className="font-semibold text-white">{selectedOrg.contact_email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Phone Number</span>
                    <span className="font-semibold text-white">{selectedOrg.contact_phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Website</span>
                    <span className="font-semibold text-white">{selectedOrg.website || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="bg-slate-900/60 border-slate-800 text-center py-12">
            <CardContent className="space-y-4">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Organizations Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You are not currently affiliated with any registered organization. Create an organization to begin.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrganizationPortal;
