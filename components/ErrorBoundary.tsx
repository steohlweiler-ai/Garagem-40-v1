import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React rendering errors (like hook mismatch #310) and displays a fallback UI
 * instead of crashing the entire application
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details for debugging
        console.error('🚨 React Error Boundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        this.setState({
            errorInfo
        });
    }

    handleReset = () => {
        // Reset error state and attempt to recover
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-slate-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle size={32} className="text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800">
                                    Algo deu errado
                                </h1>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Ocorreu um erro inesperado na renderização
                                </p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                                <p className="text-xs font-mono text-slate-700 mb-2">
                                    <strong>Erro:</strong> {this.state.error.message}
                                </p>
                                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                                    <details className="mt-3">
                                        <summary className="text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800">
                                            Stack Trace (Dev Mode)
                                        </summary>
                                        <pre className="text-[10px] text-slate-600 mt-2 overflow-auto max-h-40 bg-white p-3 rounded border border-slate-200">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-blue-500 text-white rounded-xl px-6 py-3 font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Tentar Novamente
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 bg-slate-200 text-slate-700 rounded-xl px-6 py-3 font-bold text-sm hover:bg-slate-300 transition-colors"
                            >
                                Recarregar Página
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 text-center mt-6">
                            Se o problema persistir, entre em contato com o suporte técnico.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
