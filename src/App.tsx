import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import ComponentErrorBoundary from './components/ComponentErrorBoundary';
import Auth from './components/Auth';
import NewServiceWizard from './components/wizards/NewServiceWizard';
import ServiceDetail from './components/ServiceDetail';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { ServicesProvider, useServices } from './providers/ServicesProvider';
import { MainLayout } from './layouts/MainLayout';
import { AppRoutes } from './routes/AppRoutes';
import { notificationService } from './services/NotificationService';
import { useBackButton } from './hooks/useBackButton';

const LoadingSkeleton: React.FC = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Carregando...
            </p>
        </div>
    </div>
);

const InnerApp: React.FC = () => {
    const { user, isAuthenticated, login, logout, isLoading } = useAuth();
    const { refresh, searchQuery, setSearchQuery } = useServices();

    const [activeTab, setTab] = useState('dashboard');
    const [settingsTab, setSettingsTab] = useState('hub');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

    // Initialize Notification Service
    useEffect(() => {
        if (isAuthenticated) {
            notificationService.start();
        }
        return () => {
            notificationService.stop();
        };
    }, [isAuthenticated]);

    // Hardware Back Button Logic
    useBackButton({
        isWizardOpen,
        setIsWizardOpen,
        selectedServiceId,
        setSelectedServiceId,
        activeTab,
        setTab,
        settingsTab,
        setSettingsTab
    });

    // Show skeleton during auth initialization
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!isAuthenticated || !user) {
        return <Auth onLogin={login} />;
    }

    const handleCreateService = (service: any) => {
        refresh();
        setIsWizardOpen(false);
        setSelectedServiceId(service.id);
    };

    const showFAB = (activeTab === 'dashboard' || activeTab === 'clients');

    return (
        <GlobalErrorBoundary>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: { background: '#363636', color: '#fff' },
                }}
            />

            <MainLayout
                user={user}
                activeTab={activeTab}
                onTabChange={setTab}
                onLogout={logout}
                onSettingsClick={() => { setTab('settings'); setSettingsTab('hub'); }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                canAccessClients={user.role?.toLowerCase() === 'admin' || user.permissions?.manage_clients}
            >
                <AppRoutes
                    activeTab={activeTab}
                    setTab={setTab}
                    onServiceClick={setSelectedServiceId}
                    user={user}
                    settingsTab={settingsTab}
                    setSettingsTab={setSettingsTab}
                />
            </MainLayout>

            {/* Floating Action Button */}
            {showFAB && (
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 lg:bottom-12 lg:right-12 w-16 h-16 bg-green-600 text-white rounded-[1.5rem] shadow-[0_15px_35px_rgba(22,163,74,0.3)] flex items-center justify-center active:scale-90 hover:bg-green-700 transition-all z-40 border-4 border-white"
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            )}

            {/* Global Modals */}
            {isWizardOpen && (
                <NewServiceWizard
                    onClose={() => setIsWizardOpen(false)}
                    onCreated={handleCreateService}
                />
            )}

            {selectedServiceId && (
                <ServiceDetail
                    serviceId={selectedServiceId}
                    onClose={() => setSelectedServiceId(null)}
                    onUpdate={refresh}
                    user={user}
                />
            )}
        </GlobalErrorBoundary>
    );
};

const App: React.FC = () => {
    return (
        <ComponentErrorBoundary
            componentName="AuthProvider"
            fallbackMessage="Falha crítica ao inicializar autenticação. Recarregue a página ou limpe o cache do navegador."
        >
            <AuthProvider>
                <ServicesProvider>
                    <InnerApp />
                </ServicesProvider>
            </AuthProvider>
        </ComponentErrorBoundary>
    );
};

export default App;
