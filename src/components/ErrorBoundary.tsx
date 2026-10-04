import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 sm:p-8 my-6 bg-[#0c111d] border border-amber-500/30 rounded-[2.5rem] shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Proteção de Dados do Sistema
            </span>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
              {this.props.fallbackTitle || "Ajuste Necessário nos Dados do Atleta"}
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Foram identificados valores atípicos ou corrompidos nos registros deste atleta. O sistema protegeu a tela e permite recalcular ou sanitizar o histórico com um clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-6 py-3 rounded-2xl bg-brand-primary text-brand-dark font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recalcular & Corrigir Cargas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer"
            >
              Recarregar Tela
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
