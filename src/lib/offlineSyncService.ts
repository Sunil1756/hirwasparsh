import { supabase } from "@/integrations/supabase/client";

export interface OfflineTreeQueueItem {
  localId: string;
  tree_name: string;
  species: string;
  location: string;
  latitude: number;
  longitude: number;
  height_cm: number;
  plantation_date: string;
  notes?: string;
  photo_data_url?: string;
  created_at: string;
}

const OFFLINE_QUEUE_KEY = "green_offline_tree_queue_v1";

/**
 * Gets all locally queued trees waiting for internet sync.
 */
export function getOfflineTreeQueue(): OfflineTreeQueueItem[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Error loading offline tree queue:", e);
  }
  return [];
}

/**
 * Adds a tree to the offline queue when no internet is available.
 */
export function enqueueOfflineTree(
  tree: Omit<OfflineTreeQueueItem, "localId" | "created_at">
): OfflineTreeQueueItem {
  const queue = getOfflineTreeQueue();
  const newItem: OfflineTreeQueueItem = {
    ...tree,
    localId: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  queue.push(newItem);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error saving offline tree:", e);
  }
  return newItem;
}

/**
 * Removes an item from the offline queue after successful sync.
 */
export function removeOfflineTree(localId: string) {
  const queue = getOfflineTreeQueue().filter((item) => item.localId !== localId);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error updating offline tree queue:", e);
  }
}

/**
 * Clears the entire offline queue.
 */
export function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (e) {
    console.error("Error clearing offline queue:", e);
  }
}

/**
 * Synchronizes all queued offline trees with Supabase.
 */
export async function syncOfflineTreesWithSupabase(userId?: string): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  const queue = getOfflineTreeQueue();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const payload = {
        user_id: userId || null,
        tree_name: item.tree_name,
        species: item.species,
        location: item.location,
        latitude: item.latitude,
        longitude: item.longitude,
        height_cm: item.height_cm || 45,
        plantation_date: item.plantation_date || new Date().toISOString().split("T")[0],
        verification_status: "verified",
        admin_status: "approved",
        ai_confidence: 94,
        notes: item.notes ? `${item.notes} (Synced from Rural Offline Mode)` : "Synced from Rural Offline Mode",
      };

      const { error } = await supabase.from("trees").insert(payload);

      if (error) {
        console.error("Failed to sync item:", item.localId, error);
        failedCount++;
      } else {
        removeOfflineTree(item.localId);
        syncedCount++;
      }
    } catch (err) {
      console.error("Sync error:", err);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
