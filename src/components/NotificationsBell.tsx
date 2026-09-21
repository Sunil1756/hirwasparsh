import { useEffect, useState } from "react";
import { Bell, Check, AlertTriangle, Heart, Compass, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  data: Record<string, any> | null;
};

const NotificationsBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read, created_at, data")
        .order("created_at", { ascending: false })
        .limit(20);
      setItems((data ?? []) as Notification[]);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    try {
      await supabase.from("notifications").update({ read: true }).in("id", ids);
    } catch {}
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 sm:w-96 p-0 z-50">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-sm">Notifications & Alerts</h3>
            {unread > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unread} new
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 px-2">
              <Check className="h-3 w-3 mr-1" /> Mark read
            </Button>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto divide-y divide-border/40">
          {items.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No notifications yet.</p>
          ) : (
            items.map((n) => {
              const isFieldAlert = n.type === "field_anomaly_dispatch";
              const isAdopterAdvisory = n.type === "tree_health_advisory";
              const actionRoute = n.data?.action_route || (isFieldAlert ? "/field-worker" : isAdopterAdvisory ? "/adopter" : null);

              return (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors ${
                    n.read
                      ? "opacity-75 bg-background hover:bg-muted/30"
                      : isFieldAlert
                      ? "bg-amber-500/10 border-l-2 border-l-amber-500"
                      : isAdopterAdvisory
                      ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                      : "bg-primary/5 border-l-2 border-l-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      {isFieldAlert ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      ) : isAdopterAdvisory ? (
                        <Heart className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate">{n.title}</span>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>

                  {n.body && <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3 mb-1.5">{n.body}</p>}

                  {n.data?.care_tip && (
                    <div className="p-1.5 rounded-lg bg-background/80 border text-[10px] text-emerald-700 dark:text-emerald-300 mb-1.5">
                      💡 <strong>Steward Note:</strong> {n.data.care_tip}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>

                    {actionRoute && (
                      <Link
                        to={actionRoute}
                        onClick={() => setOpen(false)}
                        className="font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        {isFieldAlert ? (
                          <>
                            <Compass className="h-3 w-3" /> View Waypoint
                          </>
                        ) : isAdopterAdvisory ? (
                          <>
                            <Heart className="h-3 w-3" /> View Sanctuary
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3" /> Inspect
                          </>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
