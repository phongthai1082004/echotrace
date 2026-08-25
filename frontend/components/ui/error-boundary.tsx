"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}


export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {

    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }


    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }


      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}


export function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4">
        <AlertTriangle size={48} className="text-red-500 mx-auto" strokeWidth={1.5} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>

      <p className="text-sm text-gray-600 mb-4 max-w-sm text-center">
        {error.message || "An unexpected error occurred"}
      </p>

      {process.env.NODE_ENV === "development" && (
        <details className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded max-w-lg">
          <summary className="cursor-pointer font-medium">Error details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{error.stack}</pre>
        </details>
      )}

      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}


export class AsyncErrorBoundary extends Component<
  ErrorBoundaryProps & { onAsyncError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onAsyncError?: (error: Error) => void }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };


    window.addEventListener("unhandledrejection", (event) => {
      this.setState({
        hasError: true,
        error: event.reason,
      });
      this.props.onAsyncError?.(event.reason);
    });
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}
