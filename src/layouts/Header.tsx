import React from 'react';
import { Car as CarIcon, LogOut, Bell, Settings, Search, LayoutGrid, Users, Package, CalendarDays } from 'lucide-react';
import { UserAccount } from '../types';
import VoiceInput from '../components/VoiceInput';

interface HeaderProps {
    user: UserAccount;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    onSettingsClick: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
    user,
    activeTab,
    onTabChange,
    onLogout,
    onSettingsClick,
    searchQuery,
    onSearchChange
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: <LayoutGrid size={24} /> },
        { id: 'clients', label: 'Clientes', icon: <Users size={24} /> },
        { id: 'stock', label: 'Estoque', icon: <Package size={24} /> },
        { id: 'agendamentos', label: 'Agenda', icon: <CalendarDays size={24} /> },
    ];

    return (
        <header className="bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-3 sticky top-0 z-20 border-b border-slate-100 shadow-sm shrink-0">
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-3 lg:mb-0 lg:h-10">
                <div className="flex items-center gap-3 lg:hidden" onClick={() => onTabChange('dashboard')}>
                    <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg cursor-pointer">
                        <CarIcon size={18} className="text-green-500" />
                    </div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none cursor-pointer">G40</h1>
                </div>

                <div className="hidden lg:block">
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-800">
                        {navItems.find(n => n.id === activeTab)?.label || 'Ajustes'}
                    </h2>
                </div>

                <div className="flex gap-2">
                    <button onClick={onLogout} className="lg:hidden p-2.5 rounded-xl bg-white border border-slate-100 text-red-500 shadow-sm active:scale-90 transition-all"><LogOut size={18} /></button>
                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl px-3 hidden lg:flex border border-slate-100">
                        <Bell size={16} className="text-slate-400" />
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] font-black uppercase text-slate-600">{user.name}</p>
                            <div className="w-7 h-7 bg-slate-900 text-green-500 rounded-full flex items-center justify-center text-[10px] font-black">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onSettingsClick} className={`p-2.5 rounded-xl border shadow-sm transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}><Settings size={18} /></button>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="max-w-7xl mx-auto mt-2 lg:mt-4 relative group animate-in fade-in duration-300">
                    <VoiceInput multiline={false} value={searchQuery} onTranscript={onSearchChange} placeholder="Buscar placa, cliente, modelo..." className="!pl-11 !py-3.5 !bg-slate-100 !border-transparent !shadow-inner !text-sm" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
            )}
        </header>
    );
};
