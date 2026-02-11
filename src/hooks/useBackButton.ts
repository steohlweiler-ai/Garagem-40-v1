import { useEffect } from 'react';

interface UseBackButtonProps {
    isWizardOpen: boolean;
    setIsWizardOpen: (open: boolean) => void;
    selectedServiceId: string | null;
    setSelectedServiceId: (id: string | null) => void;
    activeTab: string;
    setTab: (tab: string) => void;
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
}

export const useBackButton = ({
    isWizardOpen,
    setIsWizardOpen,
    selectedServiceId,
    setSelectedServiceId,
    activeTab,
    setTab,
    settingsTab,
    setSettingsTab,
}: UseBackButtonProps) => {
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (isWizardOpen) {
                event.preventDefault();
                if (window.confirm('Deseja cancelar a abertura da OS? Dados não salvos serão perdidos.')) {
                    setIsWizardOpen(false);
                } else {
                    window.history.pushState(null, '', window.location.pathname);
                }
                return;
            }

            if (selectedServiceId) {
                setSelectedServiceId(null);
                return;
            }

            if (activeTab === 'settings' && settingsTab !== 'hub') {
                setSettingsTab('hub');
                return;
            }

            if (['dashboard', 'clients', 'stock', 'agendamentos'].includes(activeTab)) {
                if (!window.confirm('Deseja sair do sistema?')) {
                    window.history.pushState(null, '', window.location.pathname);
                }
            } else {
                setTab('dashboard');
            }
        };

        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isWizardOpen, selectedServiceId, activeTab, settingsTab, setIsWizardOpen, setSelectedServiceId, setTab, setSettingsTab]);
};
