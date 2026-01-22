
import React, { useState, useMemo, useEffect } from 'react';
import {
  Package, Search, Plus, ChevronRight, Car, User,
  ArrowLeft, SlidersHorizontal, Info, ShieldCheck,
  Filter, CheckCircle2, LayoutGrid, Clock, ShoppingCart,
  X, RotateCcw, Calendar, ArrowUpDown, Tag
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { ServiceStatus, UserAccount, Vehicle, FilterConfig, SortOption, StockAllocation, ServiceJob } from '../types';
import VoiceInput from './VoiceInput';
import StatusBadge from './StatusBadge';
import StockDashboardMini from './StockDashboardMini';
import VehicleStockPanel from './VehicleStockPanel';
import AllocateToVehicleModal from './AllocateToVehicleModal';
import FilterModal from './FilterModal';

interface StockByVehicleProps {
  user: UserAccount | null;
  onClose: () => void;
}

const StockByVehicle: React.FC<StockByVehicleProps> = ({ user, onClose }) => {
  const [search, setSearch] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [services, setServices] = useState<ServiceJob[]>([]);
  const [delayCriteria, setDelayCriteria] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const [vData, aData, sData, dData] = await Promise.all([
        dataProvider.getVehicles(),
        dataProvider.getStockAllocations(),
        dataProvider.getServices(),
        dataProvider.getDelayCriteria()
      ]);
      setAllVehicles(vData);
      setAllocations(aData);
      setServices(sData);
      setDelayCriteria(dData);
    };
    loadData();
  }, []);

  const defaultFilters: FilterConfig = {
    statuses: [],
    sortBy: 'entrada_recente',
    startDate: undefined,
    endDate: undefined
  };

  const [advancedFilters, setAdvancedFilters] = useState<FilterConfig>(defaultFilters);

  const activeFilterCount = useMemo(() => {
    let count = advancedFilters.statuses.length;
    if (advancedFilters.startDate) count++;
    if (advancedFilters.endDate) count++;
    if (advancedFilters.sortBy !== 'entrada_recente') count++;
    return count;
  }, [advancedFilters]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const vehiclesWithStock = useMemo(() => {
    let list = allVehicles.map(v => {
      const vAllocations = allocations.filter(a => a.vehicle_id === v.id);
      const activeService = services.find(s => s.vehicle_id === v.id && s.status !== ServiceStatus.ENTREGUE);
      return {
        ...v,
        currentStatus: activeService?.status || null,
        entryAt: activeService?.entry_at || '',
        stockItemsCount: vAllocations.length,
        hasReserved: vAllocations.some(a => a.status === 'reserved'),
        service_id: activeService?.id
      };
    });

    // Filtro de Busca
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(v => v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
    }

    // Filtro de Itens alocados (regra da tela)
    list = list.filter(v => v.stockItemsCount > 0);

    // Filtros Avançados
    if (advancedFilters.statuses.length > 0) {
      list = list.filter(v => v.currentStatus && advancedFilters.statuses.includes(v.currentStatus as ServiceStatus));
    }

    if (advancedFilters.startDate) {
      list = list.filter(v => v.entryAt && new Date(v.entryAt) >= new Date(advancedFilters.startDate + 'T00:00:00'));
    }

    if (advancedFilters.endDate) {
      list = list.filter(v => v.entryAt && new Date(v.entryAt) <= new Date(advancedFilters.endDate + 'T23:59:59'));
    }

    // Ordenação
    return list.sort((a, b) => {
      switch (advancedFilters.sortBy) {
        case 'entrada_recente':
          return new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime();
        case 'entrada_antiga':
          return new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime();
        case 'status':
          return (a.currentStatus || '').localeCompare(b.currentStatus || '');
        default:
          return 0;
      }
    });
  }, [search, advancedFilters]);

  /* Fix: Update signature to handle 'Atrasado' string literal used in filter config */
  const removeStatusFilter = (status: ServiceStatus | 'Atrasado') => {
    setAdvancedFilters(prev => ({
      ...prev,
      statuses: prev.statuses.filter(s => s !== status)
    }));
  };

  const removeDateFilter = () => {
    setAdvancedFilters(prev => ({ ...prev, startDate: undefined, endDate: undefined }));
  };

  const removeSortFilter = () => {
    setAdvancedFilters(prev => ({ ...prev, sortBy: 'entrada_recente' }));
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex flex-col animate-in slide-in-from-right-5 font-['Arial']">

      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="text-green-500" size={18} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Estoque por Veículo</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Relação de Consumo e Reservas</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar pb-32">

        {/* Dashboard Mini */}
        <StockDashboardMini />

        {/* Busca e Filtro Principal */}
        <div className="bg-white p-6 rounded-[3rem] border-2 border-slate-50 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <VoiceInput
                multiline={false}
                value={search}
                onTranscript={setSearch}
                placeholder="Placa ou modelo..."
                className="!pl-12 !py-5 !bg-slate-100 !border-transparent !text-base !font-black !uppercase"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${activeFilterCount > 0 ? 'bg-green-600 text-white shadow-green-100' : 'bg-white border-2 border-slate-100 text-slate-400'
                }`}
            >
              <SlidersHorizontal size={24} />
              {activeFilterCount > 0 && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-slate-900 text-white text-[10px] font-black rounded-full border-4 border-white flex items-center justify-center animate-in zoom-in">
                  {activeFilterCount}
                </div>
              )}
            </button>
          </div>

          {/* Chips de Filtros Ativos */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
              {advancedFilters.statuses.map(st => (
                <div key={st} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 animate-in zoom-in">
                  <Tag size={10} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{st}</span>
                  <button onClick={() => removeStatusFilter(st)} className="p-1 hover:bg-green-100 rounded-md transition-colors"><X size={12} /></button>
                </div>
              ))}
              {(advancedFilters.startDate || advancedFilters.endDate) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 animate-in zoom-in">
                  <Calendar size={10} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Data</span>
                  <button onClick={removeDateFilter} className="p-1 hover:bg-blue-100 rounded-md transition-colors"><X size={12} /></button>
                </div>
              )}
              {advancedFilters.sortBy !== 'entrada_recente' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl animate-in zoom-in">
                  <ArrowUpDown size={10} className="text-green-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Ordem</span>
                  <button onClick={removeSortFilter} className="p-1 hover:bg-white/10 rounded-md transition-colors"><X size={12} /></button>
                </div>
              )}
              <button
                onClick={() => setAdvancedFilters(defaultFilters)}
                className="flex items-center gap-1.5 px-3 py-2 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red rounded-xl transition-all"
              >
                <RotateCcw size={12} /> Limpar Tudo
              </button>
            </div>
          )}
        </div>

        {/* Lista de Veículos Resultante */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">
              {vehiclesWithStock.length} {vehiclesWithStock.length === 1 ? 'Veículo encontrado' : 'Veículos encontrados'}
            </h3>
          </div>

          {vehiclesWithStock.length > 0 ? vehiclesWithStock.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              className="w-full bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all group"
            >
              <div className="flex gap-5 items-center flex-1">
                <div className="relative">
                  <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">
                    <Car size={32} />
                  </div>
                  {v.hasReserved && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 border-4 border-white rounded-full animate-pulse shadow-md" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-lg font-black font-mono tracking-tighter uppercase leading-none mb-2 text-slate-800">{v.plate}</p>
                  <div className="flex items-center gap-2">
                    {/* Fix: Argument type error by explicitly handling truthiness and enum casting */}
                    {v.currentStatus && <StatusBadge status={v.currentStatus as any} size="sm" />}
                    <span className="text-[11px] font-bold text-slate-400 uppercase">{v.model}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{v.stockItemsCount}</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase leading-none tracking-widest mt-1">Peças</p>
                </div>
                <ChevronRight size={22} className="text-slate-200 group-hover:text-green-600 transition-colors" />
              </div>
            </button>
          )) : (
            <div className="py-24 text-center space-y-6 bg-white/50 rounded-[3.5rem] border-2 border-dashed border-slate-200 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Search size={40} className="text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Sem resultados</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-12 leading-relaxed">
                  Nenhum veículo com peças alocadas corresponde aos filtros ativos.
                </p>
              </div>
              <button
                onClick={() => { setSearch(''); setAdvancedFilters(defaultFilters); }}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Resetar Todos os Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAB - Alocar Item */}
      <div className="fixed bottom-10 left-0 right-0 px-8 z-[160] max-w-2xl mx-auto flex gap-4">
        <button
          onClick={() => setIsAllocateOpen(true)}
          className="flex-1 py-6 bg-green-600 text-white rounded-[2rem] shadow-2xl shadow-green-100 font-black uppercase text-[12px] tracking-[2px] flex items-center justify-center gap-3 active:scale-95 transition-all border-4 border-white"
        >
          <Plus size={24} strokeWidth={4} /> Alocar Peça
        </button>
      </div>

      {/* Modais */}
      {selectedVehicle && (
        <VehicleStockPanel
          vehicle={selectedVehicle}
          user={user}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {isAllocateOpen && (
        <AllocateToVehicleModal
          onClose={() => setIsAllocateOpen(false)}
          onSuccess={() => {
            setIsAllocateOpen(false);
            showToast("Item alocado com sucesso!");
          }}
        />
      )}

      {isFilterModalOpen && (
        <FilterModal
          currentFilters={advancedFilters}
          onClose={() => setIsFilterModalOpen(false)}
          onClear={() => { setAdvancedFilters(defaultFilters); setIsFilterModalOpen(false); }}
          onApply={(filters) => { setAdvancedFilters(filters); setIsFilterModalOpen(false); }}
        />
      )}

    </div>
  );
};

export default StockByVehicle;
