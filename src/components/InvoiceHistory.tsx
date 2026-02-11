
import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Search, Calendar, ChevronRight, FileText,
  Package, Image as ImageIcon, Eye, ArrowLeft,
  Filter, Hash, DollarSign, Info, Check
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { Invoice, StockMovement, Product, Supplier } from '../types';
import { formatCurrency } from '../utils/helpers';

interface InvoiceHistoryProps {
  onClose: () => void;
}

const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [invData, supData, prodData, moveData] = await Promise.all([
        dataProvider.getInvoices(),
        dataProvider.getSuppliers(),
        dataProvider.getProducts(),
        dataProvider.getStockMovements()
      ]);
      setInvoices(invData);
      setSuppliers(supData);
      setProducts(prodData);
      setMovements(moveData);
    };
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const supplier = suppliers.find(s => s.id === inv.supplier_id);
      const matchesSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        supplier?.name.toLowerCase().includes(search.toLowerCase());

      const invDate = new Date(inv.date);
      const matchesStart = startDate ? invDate >= new Date(startDate + 'T00:00:00') : true;
      const matchesEnd = endDate ? invDate <= new Date(endDate + 'T23:59:59') : true;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [invoices, suppliers, search, startDate, endDate]);

  const invoiceItems = useMemo(() => {
    if (!selectedInvoice) return [];
    // Filtra movimentações que vieram desta nota
    return movements.filter(m => m.source === `NF #${selectedInvoice.number}`);
  }, [selectedInvoice, movements]);

  return (
    <div className="fixed inset-0 z-[190] bg-[#f8fafc] flex flex-col animate-in slide-in-from-right-5 font-['Arial']">

      {/* Header */}
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Histórico de Notas</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recebimentos Realizados</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 border-b shadow-sm space-y-4 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por Fornecedor ou Nº..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] font-bold outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] font-bold outline-none"
            />
          </div>
        </div>
      </div>

      {/* Lista de Notas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredInvoices.length > 0 ? filteredInvoices.map(inv => {
          const supplier = suppliers.find(s => s.id === inv.supplier_id);
          return (
            <button
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className="w-full bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all group"
            >
              <div className="flex gap-4 items-center text-left">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-800 tracking-tight leading-none mb-1">{inv.number}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{supplier?.name || 'Fornecedor Desconhecido'}</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-1.5">{new Date(inv.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 font-mono">{formatCurrency(inv.total)}</p>
                <ChevronRight size={16} className="text-slate-200 ml-auto mt-1" />
              </div>
            </button>
          );
        }) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <FileText size={32} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-10">Nenhuma nota encontrada com os filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Nota */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
          <div className="bg-[#f8fafc] w-full max-w-2xl rounded-t-[3.5rem] p-0 space-y-0 animate-in slide-in-from-bottom-20 max-h-[95vh] flex flex-col overflow-hidden font-['Arial']">

            {/* Modal Header */}
            <div className="p-8 pb-6 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-800 leading-none">Nota #{selectedInvoice.number}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Detalhes do Recebimento</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90 touch-target transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-8 custom-scrollbar">

              {/* Info Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fornecedor</p>
                  <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">
                    {suppliers.find(s => s.id === selectedInvoice.supplier_id)?.name}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data/Hora</p>
                  <p className="text-[11px] font-black text-slate-800">
                    {new Date(selectedInvoice.date).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Itens Recebidos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mx-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Package size={14} /> Itens Lançados ({invoiceItems.length})
                  </h4>
                  <span className="text-[11px] font-black text-green-600 font-mono">{formatCurrency(selectedInvoice.total)}</span>
                </div>

                <div className="space-y-3">
                  {invoiceItems.map(m => {
                    const prod = products.find(p => p.id === m.product_id);
                    return (
                      <div key={m.id} className="bg-white p-4 rounded-2xl border-2 border-slate-50 flex items-center justify-between shadow-sm">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{prod?.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Quantidade: {m.qty} {prod?.unit}</p>
                          </div>
                        </div>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Anexo da Nota */}
              {selectedInvoice.imageBase64 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Anexo da Nota</h4>
                  <div className="bg-white p-4 rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden">
                    <img
                      src={selectedInvoice.imageBase64}
                      alt="Anexo da NF"
                      className="w-full h-auto rounded-3xl object-contain bg-slate-50 min-h-[200px]"
                    />
                  </div>
                </div>
              )}

              <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[2rem] flex gap-4">
                <Info className="text-blue-500 shrink-0" size={24} />
                <p className="text-xs text-blue-900/70 leading-relaxed font-medium">
                  Esta nota já foi processada e as quantidades foram adicionadas ao estoque disponível. Os valores foram registrados como custo de entrada.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white border-t shrink-0">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[2px] shadow-xl"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;
