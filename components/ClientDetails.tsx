import React, { useState, useEffect } from 'react';
import {
    X, Phone, MapPin, Info, Car, Calendar, Printer, Filter, ChevronDown, AlignLeft,
    CheckCircle2, Clock, PlayCircle, Package, AlertCircle, Edit2, Bell, FileWarning
} from 'lucide-react';
import { Client, Vehicle, ServiceStatus, WorkshopSettings, DelayCriteria } from '../types';
import { useClientStats, StatType } from '../hooks/useClientStats';
import { dataProvider } from '../services/dataProvider';
import { formatCurrency } from '../utils/helpers';
import ClientReportPrint, { ReportConfig } from './ClientReportPrint';
import VoiceInput from './VoiceInput';

interface ClientDetailsProps {
    client: Client;
    onClose: () => void;
    onEdit: () => void;
    vehicles: Vehicle[];
    onSelectService: (id: string) => void;
}

const STAT_CONFIG: Record<StatType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    all: { label: 'Todos', icon: <AlignLeft size={14} />, color: 'text-slate-600', bg: 'bg-slate-100' },
    delayed: { label: 'Atrasado', icon: <AlertCircle size={14} />, color: 'text-red-600', bg: 'bg-red-100' },
    in_shop: { label: 'Na Oficina', icon: <Car size={14} />, color: 'text-blue-600', bg: 'bg-blue-100' },
    pending: { label: 'Pendente', icon: <Clock size={14} />, color: 'text-amber-600', bg: 'bg-amber-100' },
    in_progress: { label: 'Em Andamento', icon: <PlayCircle size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    reminder: { label: 'Lembrete', icon: <Bell size={14} />, color: 'text-purple-600', bg: 'bg-purple-100' },
    done: { label: 'Pronto', icon: <CheckCircle2 size={14} />, color: 'text-green-600', bg: 'bg-green-100' },
    delivered: { label: 'Entregue', icon: <Package size={14} />, color: 'text-slate-400', bg: 'bg-slate-100' }
};

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, onClose, onEdit, vehicles, onSelectService }) => {
    // State
    const [showFilters, setShowFilters] = useState(false);
    const [workshop, setWorkshop] = useState<WorkshopSettings | null>(null);
    const [delayCriteria, setDelayCriteria] = useState<DelayCriteria | null>(null);

    // Hook with delayCriteria
    const { stats, filteredServices, isLoading, filters } = useClientStats(client, vehicles, delayCriteria);

    // Report State
    const [showReportConfig, setShowReportConfig] = useState(false);
    const [reportConfig, setReportConfig] = useState<ReportConfig>({
        showValues: true,
        showNotes: false,
        showTimes: false,
        technicalMode: false
    });

    useEffect(() => {
        Promise.all([
            dataProvider.getWorkshopSettings(),
            dataProvider.getDelayCriteria()
        ]).then(([ws, dc]) => {
            setWorkshop(ws);
            setDelayCriteria(dc);
        });
    }, []);

    // Technical Mode Toggle Logic
    const handleTechnicalModeChange = (enabled: boolean) => {
        setReportConfig(prev => ({
            ...prev,
            technicalMode: enabled,
            showValues: enabled ? false : prev.showValues,
            showNotes: enabled ? true : prev.showNotes
        }));
    };

    const handlePrint = () => {
        window.print();
        // Optional: close modal dependent on UX preference, let's keep it open
        // setShowReportConfig(false);
    };

    return (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in" id="client-details-modal">
            <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20">

                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-2xl font-black uppercase text-slate-800 leading-none">{client.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Dashboard do Cliente</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="p-4 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={20} /></button>
                        <button onClick={onClose} className="p-4 bg-slate-100 rounded-full text-slate-400 hover:text-red-400 transition-colors"><X size={20} /></button>
                    </div>
                </div>

                {/* Client Info Summary */}
                <div className="px-8 pb-6 shrink-0">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 shrink-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Phone size={10} /> Contato</p>
                            <p className="text-xs font-black text-slate-800">{client.phone}</p>
                        </div>
                        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 shrink-0 max-w-[200px]">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={10} /> Endereço</p>
                            <p className="text-xs font-black text-slate-800 truncate">{client.address || 'Não informado'}</p>
                        </div>
                    </div>
                </div>

                {/* Smart Filters (Chips) */}
                <div className="px-8 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {(Object.keys(STAT_CONFIG) as StatType[]).map((key) => {
                            const isActive = filters.activeTab === key;
                            const conf = STAT_CONFIG[key];
                            const count = stats[key];

                            if (count === 0 && key !== 'all') return null; // Hide empty states for cleaner look? Or keep for consistency. keeping for now if count > 0 OR active

                            return (
                                <button
                                    key={key}
                                    onClick={() => filters.setActiveTab(key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all shrink-0 ${isActive
                                        ? `border-slate-800 bg-slate-800 text-white shadow-lg shadow-slate-200`
                                        : `border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100`
                                        }`}
                                >
                                    {React.cloneElement(conf.icon as React.ReactElement, { size: 14, className: isActive ? 'text-white' : conf.color })}
                                    <span className="text-[10px] font-black uppercase tracking-wide">{conf.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-900'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Advanced Filter Drawer Trigger */}
                <div className="px-8 py-2 shrink-0 flex justify-between items-center bg-slate-50/50">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <Filter size={12} /> Filtros Avançados {(filters.dateRange.start || filters.dateRange.end) && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                        <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowReportConfig(true)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Printer size={12} /> Gerar Relatório PDF
                    </button>
                </div>

                {/* Filters Drawer */}
                {showFilters && (
                    <div className="px-8 py-4 bg-slate-50 border-y border-slate-100 shrink-0 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Data Início</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={e => filters.setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-full p-3 rounded-xl border-none text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-slate-200 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Data Fim</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={e => filters.setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-full p-3 rounded-xl border-none text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-slate-200 outline-none"
                                />
                            </div>
                        </div>
                        {/* Sort options could go here */}
                    </div>
                )}

                {/* Main Content: Service List */}
                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-3 custom-scrollbar">
                    {isLoading ? (
                        <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto" /></div>
                    ) : filteredServices.length > 0 ? (
                        filteredServices.map(service => (
                            <button
                                key={service.id}
                                onClick={() => onSelectService(service.id)}
                                className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.99] transition-all flex justify-between items-center group text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${service.status === ServiceStatus.ENTREGUE ? 'bg-slate-100 text-slate-400' :
                                        service.status === ServiceStatus.PRONTO ? 'bg-green-100 text-green-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                        <span className="text-[10px] font-black uppercase">{new Date(service.entry_at).getDate()}</span>
                                        <span className="text-[8px] font-bold uppercase">{new Date(service.entry_at).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                                            {service.vehicle_model}
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{service.vehicle_plate}</span>
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${service.status === ServiceStatus.ENTREGUE ? 'bg-slate-100 text-slate-500' :
                                                service.status === ServiceStatus.PRONTO ? 'bg-green-100 text-green-700' :
                                                    service.status === ServiceStatus.PENDENTE ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>{service.status}</span>
                                            <span className="text-[9px] font-mono font-bold text-slate-400">#{service.id.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-800">{formatCurrency(service.total_value)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{service.tasks.length} {service.tasks.length === 1 ? 'Item' : 'Itens'}</p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-4 opacity-50">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300"><Car size={32} /></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum serviço encontrado com este filtro</p>
                        </div>
                    )}
                </div>

                {/* Floating Report Config Modal */}
                {showReportConfig && (
                    <div className="absolute inset-x-8 bottom-8 bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white animate-in slide-in-from-bottom-10 z-50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Printer size={20} className="text-indigo-400" /> Configurar Relatório</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                    {filteredServices.length} Serviços selecionados para impressão
                                </p>
                            </div>
                            <button onClick={() => setShowReportConfig(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={16} /></button>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-8">
                            {/* Modo Laudo Técnico - Prominent Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer group w-full pb-4 border-b border-slate-700 mb-2">
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${reportConfig.technicalMode ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${reportConfig.technicalMode ? 'translate-x-5' : ''}`} />
                                </div>
                                <input type="checkbox" className="hidden" checked={reportConfig.technicalMode} onChange={e => handleTechnicalModeChange(e.target.checked)} />
                                <div>
                                    <span className={`text-sm font-black uppercase transition-colors ${reportConfig.technicalMode ? 'text-amber-400' : 'text-slate-300 group-hover:text-white'}`}>Modo Laudo Técnico</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Oculta valores e exibe diagnóstico</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 cursor-pointer group ${reportConfig.technicalMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${reportConfig.showValues ? 'bg-green-500' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${reportConfig.showValues ? 'translate-x-4' : ''}`} />
                                </div>
                                <input type="checkbox" className="hidden" checked={reportConfig.showValues} onChange={e => setReportConfig(p => ({ ...p, showValues: e.target.checked }))} disabled={reportConfig.technicalMode} />
                                <span className="text-xs font-bold uppercase text-slate-300 group-hover:text-white transition-colors">Exibir Valores (R$)</span>
                            </label>

                            <label className={`flex items-center gap-3 cursor-pointer group ${reportConfig.technicalMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${reportConfig.showNotes ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${reportConfig.showNotes ? 'translate-x-4' : ''}`} />
                                </div>
                                <input type="checkbox" className="hidden" checked={reportConfig.showNotes} onChange={e => setReportConfig(p => ({ ...p, showNotes: e.target.checked }))} disabled={reportConfig.technicalMode} />
                                <span className="text-xs font-bold uppercase text-slate-300 group-hover:text-white transition-colors">Observações Técnicas</span>
                            </label>
                        </div>


                        <button
                            onClick={handlePrint}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Printer size={16} /> Imprimir Dashboard
                        </button>
                    </div>
                )}

            </div>

            {/* Hidden Print Component - Always rendered but hidden via CSS media queries */}
            <ClientReportPrint
                client={client}
                services={filteredServices}
                workshop={workshop}
                config={reportConfig}
                startDate={filters.dateRange.start}
                endDate={filters.dateRange.end}
            />
        </div>
    );
};

export default ClientDetails;
