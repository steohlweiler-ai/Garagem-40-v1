import React, { useState } from 'react';
import { Plus, ChevronRight, Boxes, FileText, RotateCcw } from 'lucide-react';
import StockDashboardMini from '../components/StockDashboardMini';
import StockByVehicle from '../components/StockByVehicle';
import ReceiveInvoice from '../components/ReceiveInvoice';
import InvoiceHistory from '../components/InvoiceHistory';
import { UserAccount } from '../types';

interface StockPageProps {
    user: UserAccount | null;
}

export const StockPage: React.FC<StockPageProps> = ({ user }) => {
    const [isStockByVehicleOpen, setIsStockByVehicleOpen] = useState(false);
    const [isReceiveInvoiceOpen, setIsReceiveInvoiceOpen] = useState(false);
    const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StockDashboardMini />

            <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight pl-2">Ações Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                <button onClick={() => setIsStockByVehicleOpen(true)} className="p-6 sm:p-8 bg-slate-900 text-white rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-2xl hover:scale-[1.02]">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center text-green-400"><Boxes size={28} /></div>
                    <div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase">Estoque por Veículo</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Reservas e Consumo</p></div>
                    <Plus size={20} className="text-green-500" />
                </button>

                <button onClick={() => setIsReceiveInvoiceOpen(true)} className="p-6 sm:p-8 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-sm hover:border-green-400">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FileText size={28} /></div>
                    <div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800">Receber Nota Fiscal</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Entrada de Peças</p></div>
                    <ChevronRight size={20} className="text-slate-200" />
                </button>

                <button onClick={() => setIsInvoiceHistoryOpen(true)} className="p-6 sm:p-8 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-sm hover:border-green-400">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><RotateCcw size={28} /></div>
                    <div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800">Histórico de Notas</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Consultar Recebimentos</p></div>
                    <ChevronRight size={20} className="text-slate-200" />
                </button>
            </div>

            {isStockByVehicleOpen && <StockByVehicle user={user} onClose={() => setIsStockByVehicleOpen(false)} />}
            {isReceiveInvoiceOpen && <ReceiveInvoice user={user} onClose={() => setIsReceiveInvoiceOpen(false)} onProcessed={() => setIsReceiveInvoiceOpen(false)} />}
            {isInvoiceHistoryOpen && <InvoiceHistory onClose={() => setIsInvoiceHistoryOpen(false)} />}
        </div>
    );
};
