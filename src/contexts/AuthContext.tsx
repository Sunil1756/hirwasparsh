import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "moderator" | "user" | "government";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: UserRole[];
  isAdmin: boolean;
  isGovernment: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  isAdmin: false,
  isGovernment: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || []).map((r: any) => r.role as UserRole));
  };

  const syncUserProfile = async (authUser: User) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!profile) {
        const metadata = authUser.user_metadata || {};
        const name = metadata.full_name || metadata.name || authUser.email?.split("@")[0] || "User";
        await supabase.from("profiles").upsert({
          id: authUser.id,
          full_name: name,
          avatar_url: metadata.avatar_url || metadata.picture || null,
          role: metadata.account_type || "individual",
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
  };

  const isAdmin = roles.includes("admin");
  const isGovernment = roles.includes("government");

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isGovernment, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
