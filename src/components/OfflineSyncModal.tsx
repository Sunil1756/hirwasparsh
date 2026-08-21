import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  CloudUpload,
  Layers,
  MapPin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getOfflineTreeQueue,
  syncOfflineTreesWithSupabase,
  clearOfflineQueue,
  removeOfflineTree,
  OfflineTreeQueueItem,
} from "@/lib/offlineSyncService";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export function OfflineSyncModal() {
  const { t, language } = useLanguage();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<OfflineTreeQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshQueue = () => {
    setQueue(getOfflineTreeQueue());
  };

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success(
        language === "mr"
          ? "इंटरनेट कनेक्ट झाले! आपण आता झाडे सिंक करू शकता."
          : "Internet Connected! Ready to sync offline trees."
      );
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(
        language === "mr"
          ? "इंटरनेट डिस्कनेक्ट झाले. झाडे सुरक्षितपणे स्थानिकरित्या सेव्ह केली जातील."
          : "Offline mode active. Plantations will be saved locally."
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [language]);

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast.error(
        language === "mr"
          ? "सिंक करण्यासाठी कृपया इंटरनेट सुरू करा."
          : "Please connect to the internet to sync."
      );
      return;
    }

    setIsSyncing(true);
    try {
      const { syncedCount, failedCount } = await syncOfflineTreesWithSupabase();
      refreshQueue();
      if (syncedCount > 0) {
        toast.success(
          language === "mr"
            ? `${syncedCount} झाडे यशस्वीरित्या क्लाउडवर सिंक झाली!`
            : `Successfully synced ${syncedCount} trees to cloud!`
        );
      }
      if (failedCount > 0) {
        toast.error(`Failed to sync ${failedCount} trees. Will retry.`);
      }
    } catch (e: any) {
      toast.error("Sync error: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    removeOfflineTree(id);
    refreshQueue();
    toast.success("Removed from offline queue.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={refreshQueue}
          className={`flex items-center justify-center gap-1 h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
            !isOnline || queue.length > 0
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          }`}
          title="Rural Offline Sync"
        >
          {!isOnline ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Offline ({queue.length})</span>
            </>
          ) : queue.length > 0 ? (
            <>
              <CloudUpload className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold">{queue.length}</span>
            </>
          ) : (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Online</span>
            </>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CloudUpload className="h-5 w-5 text-primary" /> Rural Offline Field Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Status Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isOnline
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {isOnline ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-600" />
              )}
              <span>{isOnline ? "Network Connected" : "Operating in Offline Mode"}</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {queue.length} Queued
            </Badge>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {language === "mr"
              ? "दुर्गम ग्रामीण भागात किंवा जंगलात नेटवर्क नसतानाही झाडांची नोंदणी करा. इंटरनेट सुरू झाल्यावर 'सिंक करा' बटनावर क्लिक करा."
              : "Record plantations in remote forest and rural areas without cellular network. Once back online, tap Sync to push records to Supabase."}
          </p>

          {/* Queue List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Queued Field Trees ({queue.length})
              </span>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearOfflineQueue();
                    refreshQueue();
                    toast.success("Offline queue cleared.");
                  }}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-background/50 border border-primary/10 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5 opacity-60" />
                <p>All local trees are fully synchronized with the cloud.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.localId}
                    className="p-3 rounded-xl bg-background/60 border border-primary/15 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-foreground">{item.tree_name}</div>
                      <div className="text-muted-foreground text-[11px]">{item.species}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-primary" />
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.localId)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={queue.length === 0 || isSyncing}
              className="gap-2 font-semibold shadow-md bg-primary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : `Sync ${queue.length} Trees`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
