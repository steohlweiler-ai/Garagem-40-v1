import React, { useMemo } from 'react';
import {
    User, Package, FileCode, DollarSign, Tag, Briefcase, Palette, Share2, Users, Store, Clock, ShieldAlert,
    ChevronRight, ArrowLeft, Boxes, FileText, RotateCcw, Plus
} from 'lucide-react';
import { UserAccount } from '../types';
import ProfileTab from '../components/ProfileTab';
import UserManagement from '../components/UserManagement';
import ColorManagement from '../components/ColorManagement';
import CatalogManagement from '../components/CatalogManagement';
import StatusManagement from '../components/StatusManagement';
import IntegrationsSettings from '../components/IntegrationsSettings';
import ReceiveInvoice from '../components/ReceiveInvoice';
import InvoiceHistory from '../components/InvoiceHistory';
import StockByVehicle from '../components/StockByVehicle';
import TemplateManager from '../components/TemplateManagement';
import RatesSettings from '../components/RatesSettings';
import DelaySettings from '../components/DelaySettings';
import WorkshopSettingsComp from '../components/WorkshopSettings';
import { dataProvider } from '../services/dataProvider';

interface SettingsPageProps {
    user: UserAccount | null;
    settingsTab: string;
    setSettingsTab: (tab: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, settingsTab, setSettingsTab }) => {
    const [isStockByVehicleOpen, setIsStockByVehicleOpen] = React.useState(false);
    const [isReceiveInvoiceOpen, setIsReceiveInvoiceOpen] = React.useState(false);
    const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = React.useState(false);

    const settingsOptions = useMemo(() => {
        if (!user) return [];
        const isAdmin = user.role?.toLowerCase() === 'admin';

        const allOptions = [
            { id: 'profile', label: 'Meu Perfil', desc: 'Dados da conta', icon: <User size={20} />, perm: null },
            { id: 'stock', label: 'Estoque', desc: 'Peças e notas', icon: <Package size={20} />, perm: 'manage_inventory' },
            { id: 'templates', label: 'Fichas', desc: 'Modelos de inspeção', icon: <FileCode size={20} />, perm: 'config_system' },
            { id: 'rates', label: 'Mão de Obra', desc: 'Valores por hora', icon: <DollarSign size={20} />, perm: 'config_rates' },
            { id: 'statuses', label: 'Status', desc: 'Etapas do fluxo', icon: <Tag size={20} />, perm: 'config_system' },
            { id: 'catalog', label: 'Veículos', desc: 'Marcas e modelos', icon: <Briefcase size={20} />, perm: 'config_vehicles' },
            { id: 'colors', label: 'Cores', desc: 'Paleta do sistema', icon: <Palette size={20} />, perm: 'config_vehicles' },
            { id: 'integrations', label: 'Conexões', desc: 'Google e n8n', icon: <Share2 size={20} />, perm: 'config_system' },
            { id: 'users', label: 'Equipe', desc: 'Colaboradores', icon: <Users size={20} />, perm: 'manage_team' },
            { id: 'workshop', label: 'Oficina', desc: 'Dados da OS', icon: <Store size={20} />, perm: 'config_system' },
            { id: 'delay', label: 'Atrasos', desc: 'Regras de tempo', icon: <Clock size={20} />, perm: 'config_system' },
            { id: 'status', label: 'Diagnóstico', desc: 'Verificar conexão', icon: <ShieldAlert size={20} />, perm: 'config_system' }
        ];

        return allOptions.filter(opt =>
            opt.perm === null || isAdmin || (user.permissions as any)?.[opt.perm]
        );
    }, [user]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {settingsTab === 'hub' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settingsOptions.map(option => (<button key={option.id} onClick={() => setSettingsTab(option.id)} className="p-5 sm:p-6 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-between group active:border-green-500 transition-all shadow-sm hover:shadow-md touch-target"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">{option.icon}</div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-tight leading-none">{option.label}</h3><p className="text-[10px] font-medium text-slate-400 mt-1.5 sm:mt-2 uppercase tracking-wide">{option.desc}</p></div><ChevronRight size={18} className="text-slate-200 group-hover:text-green-600" /></button>))}
                </div>
            )}


            {settingsTab !== 'hub' && (
                <div className="space-y-6">
                    {settingsTab !== 'templates' && settingsTab !== 'rates' && (
                        <div className="flex items-center gap-4 mb-2 sm:mb-4">
                            <button onClick={() => setSettingsTab('hub')} className="p-3 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
                            <h3 className="text-sm sm:text-lg font-bold uppercase text-slate-800">{settingsOptions.find(o => o.id === settingsTab)?.label}</h3>
                        </div>
                    )}

                    {settingsTab === 'profile' && <ProfileTab user={user} />}
                    {settingsTab === 'stock' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-2 border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 md:col-span-2">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-green-500 shadow-xl">
                                    <Package size={32} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">Módulo de Estoque</h2>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Gestão de Itens e Peças</p>
                                </div>
                            </div>
                            <button onClick={() => setIsStockByVehicleOpen(true)} className="p-6 sm:p-8 bg-slate-900 text-white rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-2xl"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center text-green-400"><Boxes size={28} /></div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase">Estoque por Veículo</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Reservas e Consumo</p></div><Plus size={20} className="text-green-500" /></button>
                            <button onClick={() => setIsReceiveInvoiceOpen(true)} className="p-6 sm:p-8 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-sm"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FileText size={28} /></div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800">Receber Nota Fiscal</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Entrada de Peças</p></div><ChevronRight size={20} className="text-slate-200" /></button>
                            <button onClick={() => setIsInvoiceHistoryOpen(true)} className="p-6 sm:p-8 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-5 sm:gap-6 group transition-all shadow-sm md:col-span-2"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><RotateCcw size={28} /></div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800">Histórico de Notas</h3><p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Consultar Recebimentos</p></div><ChevronRight size={20} className="text-slate-200" /></button>
                        </div>
                    )}

                    {settingsTab === 'templates' && (
                        <TemplateManager onClose={() => setSettingsTab('hub')} />
                    )}
                    {settingsTab === 'statuses' && <StatusManagement />}
                    {settingsTab === 'catalog' && <CatalogManagement />}
                    {settingsTab === 'colors' && <ColorManagement />}
                    {settingsTab === 'integrations' && <IntegrationsSettings />}
                    {settingsTab === 'users' && <UserManagement currentUser={user} />}
                    {settingsTab === 'delay' && <DelaySettings user={user} />}
                    {settingsTab === 'workshop' && <WorkshopSettingsComp />}
                    {settingsTab === 'rates' && <RatesSettings onClose={() => setSettingsTab('hub')} />}
                    {settingsTab === 'status' && (
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                            <h2 className="text-xl font-bold uppercase">Diagnóstico de Conexão</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Data Source Configurado</p>
                                    <p className="text-lg font-mono font-bold text-slate-800">{dataProvider.getDebugInfo().source}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Modo Ativo</p>
                                    <p className={`text-lg font-mono font-bold ${dataProvider.getDebugInfo().usingSupabase ? 'text-green-600' : 'text-amber-600'}`}>
                                        {dataProvider.getDebugInfo().usingSupabase ? 'Supabase' : 'Mock (Local)'}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase">URL do Supabase</p>
                                    <p className={`text-lg font-mono font-bold ${dataProvider.getDebugInfo().supabaseUrl === 'Defined' ? 'text-green-600' : 'text-red-500'}`}>
                                        {dataProvider.getDebugInfo().supabaseUrl}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Chave Anon</p>
                                    <p className={`text-lg font-mono font-bold ${dataProvider.getDebugInfo().supabaseKey === 'Defined' ? 'text-green-600' : 'text-red-500'}`}>
                                        {dataProvider.getDebugInfo().supabaseKey}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-100 italic space-y-4">
                                <h3 className="text-sm font-bold uppercase text-red-600 flex items-center gap-2">
                                    <ShieldAlert size={16} /> Zona de Recuperação
                                </h3>
                                <p className="text-[10px] text-slate-500 uppercase font-medium">
                                    Se o aplicativo estiver travado ou com dados inconsistentes, use o botão abaixo para limpar o cache local e forçar um recarregamento limpo.
                                </p>
                                <button
                                    onClick={() => {
                                        if (confirm('Isso irá limpar todos os filtros e preferências locais e deslogar você. Deseja continuar?')) {
                                            // Clear all app-specific storage
                                            Object.keys(localStorage).forEach(key => {
                                                if (key.startsWith('g40_') || key.includes('supabase.auth.token')) {
                                                    localStorage.removeItem(key);
                                                }
                                            });
                                            window.location.href = '/';
                                        }
                                    }}
                                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border-2 border-red-100 active:scale-95"
                                >
                                    Resetar Estado do Aplicativo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isStockByVehicleOpen && <StockByVehicle user={user} onClose={() => setIsStockByVehicleOpen(false)} />}
            {isReceiveInvoiceOpen && <ReceiveInvoice user={user} onClose={() => setIsReceiveInvoiceOpen(false)} onProcessed={() => setIsReceiveInvoiceOpen(false)} />}
            {isInvoiceHistoryOpen && <InvoiceHistory onClose={() => setIsInvoiceHistoryOpen(false)} />}
        </div>
    );
};
