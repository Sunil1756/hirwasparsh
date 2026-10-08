import { useState } from "react";

export function useSyncConflicts() {
  return {
    conflicts: [],
    loading: false,
    resolveConflict: async () => {},
    resolveAll: async () => {},
  };
}
