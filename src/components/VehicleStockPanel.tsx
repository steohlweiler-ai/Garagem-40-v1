
import React, { useMemo, useState, useEffect } from 'react';
import {
  X, Package, Trash2, CheckCircle2, AlertCircle,
  ArrowRight, Info, User, Car, Hash, DollarSign,
  TrendingUp, ShoppingCart, Loader2
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Vehicle, Client, StockAllocation, Product, UserAccount } from '../types';
import { formatCurrency } from '../utils/helpers';

interface VehicleStockPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
  user: UserAccount | null;
}

const VehicleStockPanel: React.FC<VehicleStockPanelProps> = ({ vehicle, onClose, user }) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [cData, aData, pData] = await Promise.all([
        dataProvider.getClientById(vehicle.client_id),
        dataProvider.getAllocationsByVehicle(vehicle.id),
        dataProvider.getProducts()
      ]);
      setClient(cData);
      setAllocations(aData);
      setProducts(pData);
    };
    loadData();
  }, [vehicle]);

  const canAction = user?.role?.toLowerCase() === 'admin' || user?.role === 'stock_manager';

  const stats = useMemo(() => {
    const totalValue = allocations.reduce((acc, a) => {
      const p = products.find(prod => prod.id === a.product_id);
      return acc + (a.reserved_qty + a.consumed_qty) * (p?.cost || 0);
    }, 0);
    return { totalValue };
  }, [allocations, products]);

  const handleConsume = async (allocId: string) => {
    if (!canAction) return;
    setIsProcessing(allocId);
    await dataProvider.consumeAllocation(allocId, user?.id || 'system');

    // Refresh data
    const aData = await dataProvider.getAllocationsByVehicle(vehicle.id);
    setAllocations(aData);

    setIsProcessing(null);
  };

  const handleRelease = async (allocId: string) => {
    if (window.confirm("Deseja cancelar esta reserva e devolver o item ao estoque geral?")) {
      await dataProvider.releaseAllocation(allocId);

      // Refresh data
      const aData = await dataProvider.getAllocationsByVehicle(vehicle.id);
      setAllocations(aData);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in font-['Arial']">
      <div className="bg-[#f8fafc] w-full max-w-2xl rounded-t-[3.5rem] p-0 animate-in slide-in-from-bottom-20 max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 text-white p-8 pb-10 rounded-b-[3.5rem] shadow-2xl relative shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-green-400 backdrop-blur-sm">
                <Car size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black font-mono tracking-tighter uppercase leading-none">{vehicle.plate}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{vehicle.brand} {vehicle.model}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-4 bg-white/10 rounded-full text-white active:scale-90 touch-target"><X size={24} /></button>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-[2rem] border border-white/10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-300">
              <User size={18} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Proprietário</p>
              <p className="text-sm font-bold">{client?.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Custo Acumulado</p>
              <p className="text-sm font-black text-green-400 font-mono">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>

        {/* Listagem de Itens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 flex items-center gap-2">
              <Package size={14} /> Itens Alocados ({allocations.length})
            </h4>
          </div>

          <div className="space-y-4">
            {allocations.length > 0 ? allocations.map(alloc => {
              const prod = products.find(p => p.id === alloc.product_id);
              const isReserved = alloc.status === 'reserved';
              const qty = isReserved ? alloc.reserved_qty : alloc.consumed_qty;

              return (
                <div key={alloc.id} className={`bg-white rounded-[2.25rem] border-2 shadow-sm overflow-hidden transition-all ${isReserved ? 'border-indigo-50' : 'border-green-50'}`}>
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex gap-4 items-center flex-1">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isReserved ? 'bg-indigo-50 text-indigo-400' : 'bg-green-50 text-green-500'}`}>
                        <Package size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase text-slate-800 truncate leading-none mb-1">{prod?.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${isReserved ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                            {isReserved ? 'Reservado' : 'Consumido'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{qty} {prod?.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-800 font-mono">{formatCurrency(qty * (prod?.cost || 0))}</p>
                    </div>
                  </div>

                  {isReserved && (
                    <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-50">
                      <button
                        onClick={() => handleConsume(alloc.id)}
                        disabled={!canAction || !!isProcessing}
                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all ${canAction ? 'bg-indigo-600 text-white shadow-lg active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {isProcessing === alloc.id ? <Loader2 className="animate-spin" size={14} /> : <ShoppingCart size={14} />}
                        Confirmar Consumo
                      </button>
                      <button
                        onClick={() => handleRelease(alloc.id)}
                        disabled={!!isProcessing}
                        className="px-4 py-3 bg-white border border-slate-200 text-red-400 rounded-xl active:bg-red-50 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] mx-2">
                <Package className="text-slate-200 mx-auto mb-3" size={40} />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum item vinculado a este veículo</p>
              </div>
            )}
          </div>

          {!canAction && (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 mx-2">
              <AlertCircle className="text-orange-500 shrink-0" size={20} />
              <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                Seu perfil de <strong>Operador</strong> permite apenas visualizar as reservas. O consumo real deve ser confirmado por um Gestor.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t safe-bottom shrink-0">
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[2px] shadow-xl"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleStockPanel;
