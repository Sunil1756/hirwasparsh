import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  fallbackUrl?: string;
}

export const ProtectedRoute = ({ children, fallbackUrl = "/login" }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Verifying security session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const fullCurrentPath = `${location.pathname}${location.search}`;
    const redirectParam = encodeURIComponent(fullCurrentPath);
    return <Navigate to={`${fallbackUrl}?redirect=${redirectParam}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
