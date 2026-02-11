import React from 'react';
import { Car as CarIcon, LogOut, User, LayoutGrid, Users, Package, CalendarDays } from 'lucide-react';
import { UserAccount } from '../types';

interface SidebarProps {
    user: UserAccount;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    canAccessClients: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, onTabChange, onLogout, canAccessClients }) => {
    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: <LayoutGrid size={24} /> },
        { id: 'clients', label: 'Clientes', icon: <Users size={24} /> },
        { id: 'stock', label: 'Estoque', icon: <Package size={24} /> },
        { id: 'agendamentos', label: 'Agenda', icon: <CalendarDays size={24} /> },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-50 shadow-2xl">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                        <CarIcon size={20} className="text-slate-900" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tighter uppercase leading-none">GARAGEM<span className="text-green-500">40</span></h1>
                </div>

                <nav className="space-y-1">
                    {navItems.filter(item => item.id !== 'clients' || canAccessClients).map(item => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold uppercase text-[10px] tracking-widest ${activeTab === item.id ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-white/10">
                        <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase truncate leading-none">{user.name}</p>
                        <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest truncate mt-1">{user.role || 'Sem cargo'}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-red-400 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all"
                >
                    <LogOut size={16} /> Sair
                </button>
            </div>
        </aside>
    );
};
