import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ComponentErrorBoundaryProps {
    children: ReactNode;
    componentName?: string;
    fallbackMessage?: string;
}

interface ComponentErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    showDetails: boolean;
}

class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
    constructor(props: ComponentErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { componentName } = this.props;
        const context = componentName ? `[${componentName}]` : '[ComponentErrorBoundary]';

        console.error(`${context} Critical Error:`, {
            error,
            errorInfo,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString()
        });

        this.setState({ errorInfo });
    }

    handleReload = () => {
        console.log('[ComponentErrorBoundary] Manual reload triggered');
        window.location.reload();
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (this.state.hasError) {
            const { componentName, fallbackMessage } = this.props;
            const { error, errorInfo, showDetails } = this.state;

            return (
                <div className="min-h-[400px] bg-red-50 rounded-[2.5rem] border-2 border-red-200 p-8 flex items-center justify-center animate-in fade-in">
                    <div className="max-w-2xl w-full space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                                <AlertCircle size={28} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-black uppercase text-red-800 tracking-tight leading-none">
                                    Erro de Renderização
                                </h2>
                                <p className="text-xs font-bold text-red-600 uppercase mt-2 tracking-wide">
                                    {componentName || 'Componente desconhecido'}
                                </p>
                            </div>
                        </div>

                        {/* User Message */}
                        <div className="bg-white p-6 rounded-2xl border-2 border-red-100">
                            <p className="text-sm font-bold text-slate-700">
                                {fallbackMessage || 'O sistema encontrou um problema ao carregar este componente. Tente recarregar a página.'}
                            </p>
                        </div>

                        {/* Technical Details Toggle */}
                        <button
                            onClick={this.toggleDetails}
                            className="w-full flex items-center justify-between p-4 bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <span>Ver detalhes técnicos</span>
                            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {/* Technical Details */}
                        {showDetails && (
                            <div className="bg-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        Erro
                                    </p>
                                    <p className="text-xs font-mono text-red-400 break-all">
                                        {error?.name}: {error?.message}
                                    </p>
                                </div>

                                {errorInfo?.componentStack && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                            Component Stack
                                        </p>
                                        <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                                            {errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        Timestamp
                                    </p>
                                    <p className="text-xs font-mono text-slate-300">
                                        {new Date().toISOString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reload Button */}
                        <button
                            onClick={this.handleReload}
                            className="w-full flex items-center justify-center gap-3 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                        >
                            <RefreshCw size={20} />
                            Recarregar Página
                        </button>

                        {/* Help Text */}
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Se o problema persistir, limpe o cache do navegador ou entre em contato com o suporte
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ComponentErrorBoundary;
