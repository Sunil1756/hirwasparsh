import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-red-500/30 bg-red-500/5 text-center space-y-4 my-4">
          <div className="h-12 w-12 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground">
              {this.props.fallbackTitle || "Unable to Render Satellite Viewport"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {this.props.fallbackMessage ||
                "A telemetry or rendering error occurred. You can retry loading or refresh the view."}
            </p>
            {this.state.error && (
              <pre className="mt-3 p-3 rounded-xl bg-background/80 border border-red-500/20 text-[11px] text-red-600 font-mono text-left max-w-lg mx-auto overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={this.handleReset}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Viewport
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-xl text-xs"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
