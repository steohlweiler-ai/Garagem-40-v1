import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = {
        hasError: false,
        error: null
    };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fee2e2', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#991b1b' }}>
                    <div style={{ maxWidth: '600px', width: '100%', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#dc2626' }}>CRITICAL UI ERROR</h1>
                        <p style={{ marginBottom: '16px' }}>O sistema encontrou um erro crítico de renderização.</p>

                        <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', overflowX: 'auto', marginBottom: '24px', fontFamily: 'monospace', fontSize: '12px', color: '#374151' }}>
                            <strong>{this.state.error?.name}:</strong> {this.state.error?.message}
                        </div>

                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            LIMPAR DADOS E REINICIAR (NUCLEAR RESET)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
