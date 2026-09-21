import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  AppRole,
  RbacPermission,
  resolvePrimaryRole,
  hasRbacPermission,
} from "@/lib/rbacService";

type UserRole = "admin" | "moderator" | "user" | "government" | "field_worker" | "tree_adopter";

type AuthContextType = {
  user: User | null;
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profile) {
        if (profile.role) {
          setProfileRole(profile.role);
        }
      } else {
        const metadata = authUser.user_metadata || {};
        const name = metadata.full_name || metadata.name || authUser.email?.split("@")[0] || "User";
        const initialRole = metadata.account_type || "individual";
        setProfileRole(initialRole);
        await supabase.from("profiles").upsert({
          id: authUser.id,
          full_name: name,
          avatar_url: metadata.avatar_url || metadata.picture || null,
          role: initialRole,
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
          }, 0);
        } else {
          setRoles([]);
          setProfileRole(null);
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfileRole(null);
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
