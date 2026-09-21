import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("dynamically imported module") ||
      error?.message?.includes("Loading chunk");

    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GlobalErrorBoundary captured rendering exception:", error, errorInfo);

    // Auto-reload once if dynamic import chunk failed due to new deployment
    if (this.state.isChunkError) {
      const storageKey = "hirwasparsh_chunk_reload_timestamp";
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        console.warn("Dynamic import chunk mismatch detected (likely new deployment). Auto-reloading page...");
        window.location.reload();
      }
    }
  }

  private handleRecoverHome = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-8 max-w-lg w-full text-center space-y-6 border-2 border-primary/20 shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {this.state.isChunkError
                  ? "Platform Update Detected"
                  : "Green Enlightenment Protected Mode"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {this.state.isChunkError
                  ? "A new version of Green Enlightenment has been deployed. Please reload to load the latest verified build."
                  : "A rendering exception occurred. Our zero-crash resilience guard prevented platform instability."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-2xl bg-muted/60 border text-left overflow-x-auto max-h-32 text-[11px] font-mono text-muted-foreground">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                onClick={this.handleReload}
                className="w-full sm:w-auto rounded-xl gap-2 font-semibold text-xs shadow-md"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Application
              </Button>

              <Button
                variant="outline"
                onClick={this.handleRecoverHome}
                className="w-full sm:w-auto rounded-xl gap-2 text-xs"
              >
                <Home className="h-3.5 w-3.5" /> Return to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
