import React from 'react';
import { UserAccount } from '../types';
import { Dashboard } from '../pages/Dashboard';
import ClientsTab from '../components/ClientsTab';
import { StockPage } from '../pages/Stock';
import Agendamentos from '../components/Agendamentos';
import { SettingsPage } from '../pages/Settings';
import { ShieldAlert } from 'lucide-react';

interface AppRoutesProps {
    activeTab: string;
    setTab: (tab: string) => void;
    onServiceClick: (id: string) => void;
    user: UserAccount | null;
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
    activeTab,
    setTab,
    onServiceClick,
    user,
    settingsTab,
    setSettingsTab
}) => {
    const canAccessClients = user?.role?.toLowerCase() === 'admin' || user?.permissions?.manage_clients;

    switch (activeTab) {
        case 'dashboard':
            return <Dashboard onServiceClick={onServiceClick} currentUser={user} />;

        case 'clients':
            return canAccessClients ? (
                <ClientsTab onSelectService={id => { onServiceClick(id); setTab('dashboard'); }} />
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                        <ShieldAlert size={40} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase text-slate-800">Acesso Restrito</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-2 max-w-xs mx-auto">
                            Seu usuário <span className="text-slate-800 border-b border-slate-300 mx-1">{user?.role || 'Sem cargo'}</span> não possui permissão para acessar a base de clientes.
                        </p>
                    </div>
                    <button
                        onClick={() => setTab('dashboard')}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mt-4 hover:scale-105 transition-transform"
                    >
                        Voltar ao Painel
                    </button>
                </div>
            );

        case 'stock':
            return <StockPage user={user} />;

        case 'agendamentos':
            return <Agendamentos onOpenService={(id) => { onServiceClick(id); setTab('dashboard'); }} />;

        case 'settings':
            return <SettingsPage user={user} settingsTab={settingsTab} setSettingsTab={setSettingsTab} />;

        default:
            return null;
    }
};
