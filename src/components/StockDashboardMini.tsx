
import React, { useMemo, useState, useEffect } from 'react';
import { Package, ShieldAlert, Clock, CheckCircle2, TrendingDown } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { ServiceStatus, Product, StockAllocation, ServiceJob } from '../types';

const StockDashboardMini: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [services, setServices] = useState<ServiceJob[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [pData, aData, sData] = await Promise.all([
        dataProvider.getProducts(),
        dataProvider.getStockAllocations(),
        dataProvider.getServices()
      ]);
      setProducts(pData);
      setAllocations(aData);
      setServices(sData);
    };
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalItems = products.length;
    const criticalItems = products.filter(p => p.current_stock <= (p.min_stock || 0)).length;
    const reservedCount = allocations.filter(a => a.status === 'reserved').length;

    // Agrupamento por status da OS
    const byStatus: Record<string, number> = {
      [ServiceStatus.PENDENTE]: 0,
      [ServiceStatus.EM_ANDAMENTO]: 0,
      [ServiceStatus.LEMBRETE]: 0,
      [ServiceStatus.PRONTO]: 0,
      'ATRASADO': 0
    };

    allocations.forEach(alloc => {
      if (alloc.status === 'reserved') {
        const service = services.find(s => s.vehicle_id === alloc.vehicle_id && s.status !== ServiceStatus.ENTREGUE);
        if (service) {
          // Aqui poderíamos checar atraso real, mas para o mock usamos o status da OS
          byStatus[service.status] = (byStatus[service.status] || 0) + 1;
        }
      }
    });

    return { totalItems, criticalItems, reservedCount, byStatus };
  }, [products, allocations, services]);

  // Fix: Explicitly cast values to number array for Math.max
  const byStatusValues = Object.values(stats.byStatus) as number[];
  const maxVal = Math.max(...byStatusValues, 1);

  return (
    <div className="space-y-6">
      {/* Cards de KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-xl">
          <div className="flex justify-between items-start mb-2">
            <Package size={20} className="text-green-400" />
            <span className="text-[10px] font-black opacity-40 uppercase">Total</span>
          </div>
          <p className="text-2xl font-black">{stats.totalItems}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">SKUs no Catálogo</p>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border-2 border-orange-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <TrendingDown size={20} className="text-orange-500" />
            <span className="text-[10px] font-black text-orange-200 uppercase">Crítico</span>
          </div>
          <p className="text-2xl font-black text-orange-600">{stats.criticalItems}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Baixo Estoque</p>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border-2 border-indigo-100 shadow-sm col-span-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-indigo-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reservas Ativas</span>
            </div>
            <p className="text-2xl font-black text-indigo-600">{stats.reservedCount} <span className="text-xs text-slate-300 font-medium">itens alocados</span></p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* Gráfico de Barras CSS */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 text-center">Reservas por Status de OS</h4>

        <div className="flex items-end justify-around h-32 px-2">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            // Fix: Cast count to number for proper comparison and arithmetic
            const numCount = count as number;
            return (
              <div key={status} className="flex flex-col items-center gap-2 group w-full max-w-[40px]">
                <div className="relative w-full flex flex-col items-center">
                  {numCount > 0 && (
                    <span className="absolute -top-6 text-[10px] font-black text-slate-800 animate-in fade-in zoom-in">{numCount}</span>
                  )}
                  <div
                    className={`w-4 sm:w-6 rounded-t-lg transition-all duration-700 bg-slate-100 group-hover:bg-green-500`}
                    style={{ height: `${(numCount / maxVal) * 100}%`, minHeight: numCount > 0 ? '4px' : '0px' }}
                  />
                </div>
                <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter text-center h-4 flex items-center">{status.substring(0, 8)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StockDashboardMini;
