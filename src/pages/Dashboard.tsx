import React, { useState } from 'react';
import {
    WifiOff, RefreshCw, Info, SlidersHorizontal,
    Car as CarIcon, AlertCircle, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { ServiceStatus, FilterConfig, SortOption, UserAccount } from '../types';
import ServiceCard from '../components/ServiceCard';
import FilterModal from '../components/FilterModal';
import { useServices } from '../providers/ServicesProvider';

interface DashboardProps {
    onServiceClick: (id: string) => void;
    currentUser: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onServiceClick, currentUser }) => {
    const {
        processedServices,
        stats,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        handleSmartRetry,
        loadMore,
        dashboardFilter,
        setDashboardFilter,
        advancedFilters,
        setAdvancedFilters,
        isOffline
    } = useServices();

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Cards Configuration
    const statCards = [
        { id: 'Atrasado', label: 'Atrasado', count: stats.atrasado, color: 'text-red-500', bg: 'bg-red-50' },
        { id: ServiceStatus.PENDENTE, label: 'Pendente', count: stats.pendente, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: ServiceStatus.EM_ANDAMENTO, label: 'Andamento', count: stats.andamento, color: 'text-purple-500', bg: 'bg-purple-50' },
        { id: ServiceStatus.LEMBRETE, label: 'Lembrete', count: stats.lembrete, color: 'text-amber-500', bg: 'bg-amber-50' },
        { id: ServiceStatus.PRONTO, label: 'Pronto', count: stats.pronto, color: 'text-green-500', bg: 'bg-green-50' },
        { id: 'total', label: 'Total', count: stats.total, color: 'text-slate-800', bg: 'bg-slate-100', highlight: true }
    ];

    const defaultFilters: FilterConfig = {
        statuses: [],
        sortBy: 'entrada_recente' as SortOption,
        startDate: undefined,
        endDate: undefined,
        startDeliveryDate: undefined,
        endDeliveryDate: undefined
    };

    const isAdvancedFilterActive =
        advancedFilters.statuses.length > 0 ||
        !!advancedFilters.startDate ||
        !!advancedFilters.endDate ||
        advancedFilters.sortBy !== 'entrada_recente';

    return (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500">
            {isOffline && (
                <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-3xl flex items-center gap-4 text-amber-800 animate-pulse transition-all mx-1 mb-2">
                    <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                        <WifiOff size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Modo Offline</h3>
                        <p className="text-[10px] font-medium text-amber-700/70 mt-1 uppercase tracking-tight">
                            Sua conexão caiu. Os dados podem estar desatualizados.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-1">
                {statCards.map(card => {
                    const isSelected = dashboardFilter === card.id;
                    return (
                        <button
                            key={card.id}
                            onClick={() => setDashboardFilter(card.id)}
                            className={`p-3.5 sm:p-5 flex flex-col items-start rounded-[1.5rem] text-left transition-all border-2 ${isSelected
                                ? (card.highlight ? 'border-green-500 bg-white' : 'border-slate-800 bg-slate-900')
                                : 'bg-white border-slate-100 shadow-none'
                                } ${isSelected ? 'shadow-xl scale-[1.03] z-10' : 'hover:border-slate-200'}`}
                        >
                            <p className={`text-2xl sm:text-3xl font-black tracking-tighter leading-none ${isSelected
                                ? (card.highlight ? 'text-green-600' : 'text-white')
                                : card.color
                                }`}>{card.count}</p>
                            <p className={`text-[8px] font-black uppercase mt-2 tracking-widest whitespace-nowrap ${isSelected
                                ? (card.highlight ? 'text-green-700/60' : 'text-white/40')
                                : 'text-slate-400'
                                }`}>{card.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
                        {processedServices.length} {processedServices.length === 1 ? 'Veículo' : 'Veículos'}
                        {dashboardFilter !== 'total' && (
                            <span className="text-slate-400 opacity-60"> em {dashboardFilter.toUpperCase()}</span>
                        )}
                    </h3>
                </div>

                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isAdvancedFilterActive
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                >
                    <SlidersHorizontal size={12} className={isAdvancedFilterActive ? 'text-green-400' : ''} />
                    Filtros
                    {isAdvancedFilterActive && <span className="w-1.5 h-1.5 bg-green-500 rounded-full ml-0.5 animate-pulse" />}
                </button>
            </div>

            {/* Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {processedServices.map(service => (
                    <ServiceCard
                        key={service.id}
                        service={service}
                        onClick={() => onServiceClick(service.id)}
                        currentUser={currentUser}
                        delayCriteria={useServices().delayCriteria} // Accessing directly from provider via hook reuse or prop
                    />
                ))}

                {/* Empty / Error States */}
                {(!isLoading && processedServices.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in zoom-in duration-500">
                        {error ? (
                            <>
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                    <WifiOff size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Conexão Instável</h3>
                                <p className="text-slate-500 text-xs max-w-[250px] mb-6">
                                    {error.message || 'Não foi possível carregar os dados. Verifique sua internet.'}
                                </p>
                                <button
                                    onClick={handleSmartRetry}
                                    className="px-6 py-3 bg-red-600 active:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <RefreshCw size={14} />
                                    Tentar Novamente
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-inner">
                                    <Info size={40} className="text-slate-300" />
                                </div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[3px] max-w-[200px] leading-relaxed">
                                    Nenhuma ordem de serviço encontrada para os filtros atuais.
                                </p>
                                <button
                                    onClick={() => { setDashboardFilter('total'); setAdvancedFilters(defaultFilters); }} // Reset search is handled via header in layout
                                    className="mt-8 text-[10px] font-black uppercase tracking-[3px] text-green-600 hover:text-green-700 transition-colors"
                                >
                                    Limpar Filtros
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Load More Trigger */}
                {processedServices.length > 0 && hasMore && (
                    <div className="col-span-full flex justify-center py-6">
                        <button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:border-slate-400 hover:shadow-md transition-all disabled:opacity-50"
                        >
                            {isLoadingMore ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Carregando...
                                </>
                            ) : (
                                <>Carregar Mais</>
                            )}
                        </button>
                    </div>
                )}

                {/* Initial Loading */}
                {isLoading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20">
                        <svg className="animate-spin h-10 w-10 text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Carregando veículos...</p>
                    </div>
                )}
            </div>

            {isFilterModalOpen && (
                <FilterModal
                    currentFilters={advancedFilters}
                    onApply={(f) => { setAdvancedFilters(f); setIsFilterModalOpen(false); }}
                    onClose={() => setIsFilterModalOpen(false)}
                    onClear={() => { setAdvancedFilters(defaultFilters); setIsFilterModalOpen(false); }}
                />
            )}
        </div>
    );
};
