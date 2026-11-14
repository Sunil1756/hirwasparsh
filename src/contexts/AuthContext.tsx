import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  AppRole,
  RbacPermission,
  resolvePrimaryRole,
  hasRbacPermission,
} from "@/lib/rbacService";
import { identifyUser, resetUser } from "@/lib/analytics";

type UserRole = "admin" | "moderator" | "user" | "government" | "field_worker" | "tree_adopter";

type AuthContextType = {
  user: User | null;
  profile: { id: string; full_name?: string | null; role?: string | null; [key: string]: any } | null;
  session: Session | null;
  loading: boolean;
  roles: UserRole[];
  primaryRole: AppRole;
  activeRole: AppRole;
  isAdmin: boolean;
  isFieldWorker: boolean;
  isTreeAdopter: boolean;
  isGovernment: boolean;
  can: (permission: RbacPermission) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  roles: [],
  primaryRole: "tree_adopter",
  activeRole: "tree_adopter",
  isAdmin: false,
  isFieldWorker: false,
  isTreeAdopter: true,
  isGovernment: false,
  can: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ id: string; full_name?: string | null; role?: string | null; [key: string]: any } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profileRole, setProfileRole] = useState<string | null>(null);

  // Clean up any legacy simulated role tokens on startup
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hirwasparsh_simulated_role");
        sessionStorage.removeItem("hirwasparsh_simulated_role");
      }
    } catch {}
  }, []);

  const fetchRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (data && data.length > 0) {
        setRoles(data.map((r: any) => r.role as UserRole));
      }
    } catch (e) {
      console.warn("Could not fetch user_roles:", e);
    }
  };

  const syncUserProfile = async (authUser: User) => {
    try {
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (dbProfile) {
        setProfile(dbProfile);
        if (dbProfile.role) {
          setProfileRole(dbProfile.role);
        }
      } else {
        const metadata = authUser.user_metadata || {};
        const name = metadata.full_name || metadata.name || authUser.email?.split("@")[0] || "User";
        let initialRole = metadata.account_type || "individual";
        let initialOrg: string | null = metadata.organization_name || null;

        try {
          const pendingRole = localStorage.getItem("pending_oauth_account_type");
          if (pendingRole) {
            initialRole = pendingRole;
            localStorage.removeItem("pending_oauth_account_type");
          }
          const pendingOrg = localStorage.getItem("pending_oauth_org_name");
          if (pendingOrg) {
            initialOrg = pendingOrg;
            localStorage.removeItem("pending_oauth_org_name");
          }
        } catch {}

        setProfileRole(initialRole);
        setProfile({ id: authUser.id, full_name: name, role: initialRole });
        await supabase.from("profiles").upsert({
          id: authUser.id,
          full_name: name,
          avatar_url: metadata.avatar_url || metadata.picture || null,
          role: initialRole,
          account_type: initialRole,
          organization_name: initialOrg,
        });
      }
    } catch (e) {
      console.warn("Could not sync user profile:", e);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
            syncUserProfile(session.user);
            identifyUser(session.user.id, {
              role: session.user.user_metadata?.account_type || "individual",
              organization_name: session.user.user_metadata?.organization_name,
            });
          }, 0);
        } else {
          setRoles([]);
          setProfileRole(null);
          setProfile(null);
          resetUser();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchRoles(session.user.id);
        syncUserProfile(session.user);
        identifyUser(session.user.id, {
          role: session.user.user_metadata?.account_type || "individual",
          organization_name: session.user.user_metadata?.organization_name,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfileRole(null);
    setProfile(null);
    resetUser();
  };

  const primaryRole = resolvePrimaryRole(roles, profileRole);
  const activeRole: AppRole = primaryRole;

  const isAdmin = primaryRole === "admin" || roles.includes("admin") || profileRole === "admin";
  const isGovernment = primaryRole === "government" || roles.includes("government") || profileRole === "government";
  const isFieldWorker =
    primaryRole === "field_worker" ||
    roles.includes("field_worker") ||
    roles.includes("moderator") ||
    profileRole === "field_worker" ||
    profileRole === "moderator" ||
    profileRole === "ngo";
  const isTreeAdopter = primaryRole === "tree_adopter" || primaryRole === "user";

  const can = (permission: RbacPermission): boolean => {
    return hasRbacPermission(activeRole, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        roles,
        primaryRole,
        activeRole,
        isAdmin,
        isFieldWorker,
        isTreeAdopter,
        isGovernment,
        can,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
