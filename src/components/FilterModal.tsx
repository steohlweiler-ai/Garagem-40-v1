
import React, { useState } from 'react';
import { X, Calendar, Check, SlidersHorizontal, ArrowUpDown, Tag, RotateCcw } from 'lucide-react';
import { ServiceStatus, FilterConfig, SortOption } from '../types';

interface FilterModalProps {
  currentFilters: FilterConfig;
  onApply: (filters: FilterConfig) => void;
  onClose: () => void;
  onClear: () => void;
}

const FilterModal = React.memo<FilterModalProps>(({ currentFilters, onApply, onClose, onClear }) => {
  const [tempFilters, setTempFilters] = useState<FilterConfig>({ ...currentFilters });

  const statusOptions: (ServiceStatus | 'Atrasado')[] = [
    ...Object.values(ServiceStatus),
    'Atrasado'
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'atrasados', label: 'Atrasados primeiro' },
    { value: 'entrega_proxima', label: 'Entrega mais próxima' },
    { value: 'entrada_recente', label: 'Entrada mais recente' },
    { value: 'entrada_antiga', label: 'Entrada mais antiga' },
    { value: 'status', label: 'Por Status' }
  ];

  const toggleStatus = (status: ServiceStatus | 'Atrasado') => {
    setTempFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const activeCount = tempFilters.statuses.length
    + (tempFilters.startDate ? 1 : 0) + (tempFilters.endDate ? 1 : 0)
    + (tempFilters.startDeliveryDate ? 1 : 0) + (tempFilters.endDeliveryDate ? 1 : 0);

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-t-[3.5rem] shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in slide-in-from-bottom-20 duration-500 font-['Arial']">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <button
            onClick={onClear}
            className="text-[11px] font-black uppercase tracking-widest text-red-500 active:scale-95 transition-all py-2 px-4"
          >
            Limpar
          </button>

          <div className="text-center">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Filtrar Resultados</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[3px] mt-1">
              {activeCount} {activeCount === 1 ? 'Filtro Ativo' : 'Filtros Ativos'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-4 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-all touch-target"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

          {/* Ordenação */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 text-slate-400">
              <ArrowUpDown size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-[3px]">Ordenar Por</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {sortOptions.map(option => {
                const isActive = tempFilters.sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                      : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">{option.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'border-green-500' : 'border-slate-300'
                      }`}>
                      {isActive && <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-in zoom-in" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Status */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 text-slate-400">
              <Tag size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-[3px]">Status do Serviço</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map(status => {
                const isActive = tempFilters.statuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${isActive
                      ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                      : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shrink-0 ${isActive ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200'
                      }`}>
                      {isActive && <Check size={14} strokeWidth={4} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{status}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Data de Entrada */}
          <section className="space-y-5 pb-8">
            <div className="flex items-center gap-3 text-slate-400">
              <Calendar size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-[3px]">Período de Entrada</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                <input
                  type="date"
                  value={tempFilters.startDate || ''}
                  onChange={e => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xs font-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                <input
                  type="date"
                  value={tempFilters.endDate || ''}
                  onChange={e => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xs font-black outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Data de Entrega */}
          <section className="space-y-5 pb-8">
            <div className="flex items-center gap-3 text-slate-400">
              <Calendar size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-[3px]">Período de Entrega</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                <input
                  type="date"
                  value={tempFilters.startDeliveryDate || ''}
                  onChange={e => setTempFilters({ ...tempFilters, startDeliveryDate: e.target.value })}
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xs font-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                <input
                  type="date"
                  value={tempFilters.endDeliveryDate || ''}
                  onChange={e => setTempFilters({ ...tempFilters, endDeliveryDate: e.target.value })}
                  className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-xs font-black outline-none transition-all"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-white safe-bottom shrink-0">
          <button
            onClick={() => onApply(tempFilters)}
            className="w-full py-6 bg-green-600 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[2px] shadow-2xl shadow-green-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            Aplicar Filtros <Check size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default FilterModal;
