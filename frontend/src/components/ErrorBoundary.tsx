import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('SlotSpot caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center selection:bg-brand-500 selection:text-white">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">SlotSpot Ready to Recover</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected runtime issue occurred. Click below to clear local cache and reload cleanly.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch {}
                  window.location.href = window.location.origin;
                }}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
              >
                Reset Cache & Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
