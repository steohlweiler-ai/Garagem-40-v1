import React from 'react';
import { LayoutGrid, Users, Package, CalendarDays } from 'lucide-react';

interface MobileNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, onTabChange }) => {
    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: <LayoutGrid size={24} /> },
        { id: 'clients', label: 'Clientes', icon: <Users size={24} /> },
        { id: 'stock', label: 'Estoque', icon: <Package size={24} /> },
        { id: 'agendamentos', label: 'Agenda', icon: <CalendarDays size={24} /> },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t safe-bottom flex justify-around p-3 sm:p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
            {navItems.map(item => (
                <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex flex-col items-center gap-1 transition-all p-1 sm:p-2 rounded-2xl flex-1 ${activeTab === item.id ? 'text-green-600' : 'text-slate-300'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-green-50' : 'bg-transparent'}`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22, strokeWidth: activeTab === item.id ? 3 : 2 })}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
