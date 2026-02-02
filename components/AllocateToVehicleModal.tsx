
import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Search, Package, Car, Check, ChevronRight,
  ArrowRight, AlertCircle, Info, ShieldCheck, Database
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Product, Vehicle } from '../types';
import VoiceInput from './VoiceInput';
import { formatCurrency } from '../utils/helpers';

interface AllocateToVehicleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AllocateToVehicleModal: React.FC<AllocateToVehicleModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [vData, pData] = await Promise.all([
        dataProvider.getVehicles(),
        dataProvider.getProducts()
      ]);
      setVehicles(vData);
      setProducts(pData);
    };
    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = searchVehicle.toLowerCase();
    if (!q) return [];
    return vehicles.filter(v => v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)).slice(0, 5);
  }, [searchVehicle, vehicles]);

  const filteredProducts = useMemo(() => {
    const q = searchProduct.toLowerCase();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [searchProduct, products]);

  const handleConfirm = async () => {
    if (!selectedVehicle || !selectedProduct) return;
    const res = await dataProvider.allocateProduct({
      product_id: selectedProduct.id,
      vehicle_id: selectedVehicle.id,
      qty: qty
    });

    if (res) {
      onSuccess();
    } else {
      // The atomic RPC returns null if failed, but ideally we'd get the message. 
      // Since we updated allocateProduct to return null on failure, we default to generic error.
      // Improvement: We can check stock locally before calling to give better UI feedback,
      // but the RPC is the final source of truth.
      alert("Erro: Não foi possível realizar a reserva. Verifique o estoque disponível.");
    }
  };

  return (
    <div className="fixed inset-0 z-[220] bg-slate-900/70 backdrop-blur-md flex items-center justify-center sm:p-4 animate-in fade-in font-['Arial']">
      <div className="bg-white w-full sm:max-w-md h-full sm:h-auto sm:rounded-[3rem] p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight leading-none">Alocação de Peças</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Reserva de item para veículo</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-full text-slate-400 touch-target"><X size={20} /></button>
        </div>

        {/* Stepper Visual */}
        <div className="flex gap-2 shrink-0">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-green-500' : 'bg-slate-100'}`} />
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-[200px] space-y-6 custom-scrollbar pr-1 sm:pr-2">

          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">1. Qual o Veículo?</label>
                <VoiceInput
                  multiline={false}
                  value={searchVehicle}
                  onTranscript={setSearchVehicle}
                  placeholder="Placa ou modelo..."
                />
              </div>
              <div className="space-y-2">
                {filteredVehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVehicle(v); setStep(2); }}
                    className="w-full p-4 sm:p-5 bg-white border-2 border-slate-50 rounded-2xl flex items-center justify-between group active:border-green-500 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                        <Car size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black font-mono tracking-tighter uppercase">{v.plate}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{v.brand} {v.model}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-200" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-2">
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 rounded-2xl border border-green-100">
                <Car size={16} className="text-green-600" />
                <span className="text-[10px] sm:text-xs font-black text-green-800 font-mono">{selectedVehicle?.plate} Selecionado</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">2. Qual o Item?</label>
                <VoiceInput
                  multiline={false}
                  value={searchProduct}
                  onTranscript={setSearchProduct}
                  placeholder="Peça ou SKU..."
                />
              </div>
              <div className="space-y-2">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProduct(p); setStep(3); }}
                    className="w-full p-4 sm:p-5 bg-white border-2 border-slate-50 rounded-2xl flex items-center justify-between group active:border-green-500 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                        <Package size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase">{p.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[7px] font-black bg-slate-100 px-1 rounded uppercase">SKU: {p.sku}</span>
                          {p.current_stock <= (p.min_stock || 5) ? (
                            <span className="text-[7px] font-black text-red-500 uppercase flex items-center gap-1">
                              <AlertCircle size={8} /> Disp: {p.current_stock}
                            </span>
                          ) : (
                            <span className="text-[7px] font-black text-green-600 uppercase">Disp: {p.current_stock}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-200" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="bg-slate-50 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-700 font-mono">{selectedVehicle?.plate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-700">{selectedProduct?.name}</span>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">Quantidade</label>
                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-black text-slate-400 active:bg-slate-100">-</button>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(selectedProduct?.current_stock || 1, qty + 1))}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-xl font-black text-slate-400 active:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-center text-[8px] sm:text-[9px] font-bold text-orange-500 uppercase mt-4 tracking-widest">Estoque disponível: {selectedProduct?.current_stock} {selectedProduct?.unit}</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
                <ShieldCheck size={20} className="text-indigo-500 shrink-0" />
                <p className="text-[9px] sm:text-[10px] text-indigo-800 font-medium leading-relaxed">
                  Esta ação reserva o item. A saída física ocorre ao marcar como "Consumido".
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t shrink-0 safe-bottom">
          {step > 1 && (
            <button onClick={() => setStep((step - 1) as any)} className="flex-1 py-4 sm:py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] sm:text-[11px]">Voltar</button>
          )}
          <button
            onClick={step === 3 ? handleConfirm : undefined}
            disabled={step < 3}
            className={`flex-[2] py-4 sm:py-5 rounded-2xl font-black uppercase text-[10px] sm:text-[11px] tracking-[1px] sm:tracking-[2px] shadow-xl flex items-center justify-center gap-2 transition-all ${step === 3 ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-100 text-slate-300'
              }`}
          >
            {step === 3 ? 'Confirmar Reserva' : 'Dados Incompletos'}
            <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateToVehicleModal;
