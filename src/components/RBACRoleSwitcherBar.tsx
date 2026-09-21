import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, APP_ROLES } from "@/lib/rbacService";
import { Shield, Sparkles, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const RBACRoleSwitcherBar = () => {
  const { user, activeRole, activeRoleOverride, switchSimulatedRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const rolesToDisplay: AppRole[] = ["admin", "field_worker", "tree_adopter", "government"];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-2xl">
      <div className="glass-card rounded-2xl sm:rounded-full border border-primary/30 shadow-2xl p-1.5 sm:p-2 bg-background/90 backdrop-blur-xl transition-all">
        <div className="flex items-center justify-between gap-2 px-2 py-1 sm:py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="p-1 rounded-lg bg-primary/10 text-primary">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold tracking-tight text-foreground hidden sm:inline">
              RBAC Persona Simulator
            </span>
            {activeRoleOverride && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400">
                Simulated
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {rolesToDisplay.map((roleKey) => {
              const roleDef = APP_ROLES[roleKey];
              const isSelected = activeRole === roleKey;
              const isCurrentRoute = location.pathname === roleDef.dashboardRoute;

              return (
                <button
                  key={roleKey}
                  onClick={() => switchSimulatedRole(isSelected && activeRoleOverride ? null : roleKey)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                  }`}
                >
                  <span className="truncate">{roleDef.displayName.split("/")[0].trim()}</span>
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Quick jump to active role's dashboard */}
            <Link to={APP_ROLES[activeRole]?.dashboardRoute || "/dashboard"}>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] font-bold rounded-lg text-primary hover:bg-primary/10">
                <Sparkles className="h-3 w-3 mr-1" /> Jump
              </Button>
            </Link>

            {activeRoleOverride && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => switchSimulatedRole(null)}
                title="Reset to real authenticated role"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              aria-label="Toggle role bar"
            >
              {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="text-[10px] text-muted-foreground px-3 py-1 border-t border-border/30 mt-1 flex items-center justify-between gap-2">
            <span className="truncate">
              Active: <strong>{APP_ROLES[activeRole]?.displayName}</strong> ({APP_ROLES[activeRole]?.permissions.length} RBAC permissions enabled)
            </span>
            <span className="shrink-0 text-primary font-medium hidden md:inline">
              Route: {APP_ROLES[activeRole]?.dashboardRoute}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RBACRoleSwitcherBar;
