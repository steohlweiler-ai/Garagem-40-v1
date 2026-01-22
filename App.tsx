
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, Settings, Bell, Wrench, ChevronRight, Users, X, Clock, LayoutGrid, Car as CarIcon,
  AlertCircle, LogOut, Truck, CheckCircle2, StickyNote, ShieldAlert, Info, FileCode, Store, SlidersHorizontal,
  Calendar, ArrowRight, Printer, FileText, ChevronDown, Check, RotateCcw, User, Tag, UserCheck, ShieldCheck,
  CalendarDays, Trash2, Edit3, DollarSign, Palette, Briefcase, Share2, ArrowLeft, Package, Boxes, Filter
} from 'lucide-react';
import { dataProvider } from './services/dataProvider';
import { ServiceJob, ServiceStatus, FilterConfig, SortOption, Vehicle, Client, UserAccount, EvaluationTemplate, InspectionTemplateItem, ChargeType } from './types';
import ServiceCard from './components/ServiceCard';
import NewServiceWizard from './NewServiceWizard';
import ServiceDetail from './components/ServiceDetail';
import ClientsTab from './components/ClientsTab';
import Agendamentos from './components/Agendamentos';
import { formatDuration, calculateDelayStatus, formatCurrency } from './utils/helpers';
import VoiceInput from './components/VoiceInput';
import Auth from './components/Auth';
import DelaySettings from './components/DelaySettings';
import WorkshopSettingsComp from './components/WorkshopSettings';
import FilterModal from './components/FilterModal';
import ProfileTab from './components/ProfileTab';
import UserManagement from './components/UserManagement';
import ColorManagement from './components/ColorManagement';
import CatalogManagement from './components/CatalogManagement';
import StatusManagement from './components/StatusManagement';
import IntegrationsSettings from './components/IntegrationsSettings';
import ReceiveInvoice from './components/ReceiveInvoice';
import InvoiceHistory from './components/InvoiceHistory';
import StockByVehicle from './components/StockByVehicle';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [activeTab, setTab] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('hub');
  const [services, setServices] = useState<ServiceJob[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Restaurar sessão
  useEffect(() => {
    const savedUser = localStorage.getItem('g40_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('g40_user_session');
      }
    }
  }, []);



  // Data Provider Integration (Async Load)
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await dataProvider.getServices();
        setServices(data);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    fetchServices();
  }, []); // Run once on mount

  const [dashboardFilter, setDashboardFilter] = useState<string>('total');

  // Estado para filtros avançados do Dashboard
  const defaultFilters: FilterConfig = {
    statuses: [],
    sortBy: 'entrada_recente',
    startDate: undefined,
    endDate: undefined,
    startDeliveryDate: undefined,
    endDeliveryDate: undefined
  };
  const [dashboardAdvancedFilters, setDashboardAdvancedFilters] = useState<FilterConfig>(() => {
    const saved = localStorage.getItem('g40_dashboard_filters');
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  const [isReceiveInvoiceOpen, setIsReceiveInvoiceOpen] = useState(false);
  const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = useState(false);
  const [isStockByVehicleOpen, setIsStockByVehicleOpen] = useState(false);

  const [showToast, setShowToast] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null);

  useEffect(() => {
    if (editingTemplate) {
      setShowToast(`Edição de "${editingTemplate.name}" estará disponível em breve!`);
      setEditingTemplate(null);
    }
  }, [editingTemplate]);

  const refreshServices = async () => {
    try {
      const data = await dataProvider.getServices();
      setServices(data);
    } catch (err) {
      console.error('Failed to refresh services:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshServices();
      const interval = setInterval(refreshServices, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Persiste filtros no localStorage
  useEffect(() => {
    localStorage.setItem('g40_dashboard_filters', JSON.stringify(dashboardAdvancedFilters));
  }, [dashboardAdvancedFilters]);

  const handleLogin = async (userData: any) => {
    try {
      const users = await dataProvider.getUsers();
      let matchedUser = users.find(u => u.email === userData.email);

      // Se não houver nenhum usuário (primeiro acesso Supabase) ou usuário não encontrado
      if (!matchedUser) {
        // Se a lista estiver vazia, cria o primeiro admin
        if (users.length === 0) {
          const newUser = await dataProvider.createUser({
            name: userData.name || 'Admin',
            email: userData.email,
            role: 'admin',
            active: true,
            permissions: {
              access_clients: true,
              view_values_execution: true,
              view_values_reports: true,
              create_templates: true,
              manage_reminders: true
            }
          });
          if (newUser) matchedUser = newUser;
        } else {
          // Fallback para usuário existente ou recusa (aqui mantemos permissivo para demo)
          // matchedUser = users[0]; (Desabilitado para forçar consistência)
          // TODO: Retornar erro real se não encontrar user
          // Para manter comportamento anterior (mock), vamos pegar o primeiro se existir
          if (users.length > 0) matchedUser = users[0];
        }
      }

      if (matchedUser) {
        setUser(matchedUser);
        setIsAuthenticated(true);
        localStorage.setItem('g40_user_session', JSON.stringify(matchedUser));
      } else {
        alert("Usuário não encontrado e falha ao criar. Verifique o banco de dados.");
      }
    } catch (e) {
      console.error("Login error:", e);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('g40_user_session');
  };

  const [delayCriteria, setDelayCriteria] = useState<any>(null);
  const [allTemplates, setAllTemplates] = useState<EvaluationTemplate[]>([]);

  useEffect(() => {
    const loadSupportData = async () => {
      const [criteria, templates] = await Promise.all([
        dataProvider.getDelayCriteria(),
        dataProvider.getTemplates()
      ]);
      setDelayCriteria(criteria);
      setAllTemplates(templates);
    };
    if (isAuthenticated) loadSupportData();
  }, [isAuthenticated]);

  const stats = useMemo(() => {
    return {
      atrasado: services.filter(s => s.estimated_delivery && delayCriteria && calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority).isDelayed && s.status !== ServiceStatus.ENTREGUE).length,
      pendente: services.filter(s => s.status === ServiceStatus.PENDENTE).length,
      andamento: services.filter(s => s.status === ServiceStatus.EM_ANDAMENTO).length,
      lembrete: services.filter(s => s.status === ServiceStatus.LEMBRETE).length,
      pronto: services.filter(s => s.status === ServiceStatus.PRONTO).length,
      entregue: services.filter(s => s.status === ServiceStatus.ENTREGUE).length,
      total: services.filter(s => s.status !== ServiceStatus.ENTREGUE).length
    };
  }, [services, delayCriteria]);

  // State for vehicles and clients (cached for filtering)
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);

  // Load vehicles and clients for filtering
  useEffect(() => {
    const loadFilterData = async () => {
      const [vehicles, clients] = await Promise.all([
        dataProvider.getVehicles(),
        dataProvider.getClients()
      ]);
      setAllVehicles(vehicles);
      setAllClients(clients);
    };
    if (isAuthenticated) loadFilterData();
  }, [isAuthenticated, services]);

  const processedServices = useMemo(() => {
    let filtered = services.filter(s => {
      const v = allVehicles.find(veh => veh.id === s.vehicle_id);
      const c = allClients.find(cl => cl.id === s.client_id);
      const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const search = normalize(searchQuery);

      // 1. Busca por texto (Aprimorada: ignora acentos e case)
      const matchesSearch =
        normalize(v?.plate || '').includes(search) ||
        normalize(c?.name || '').includes(search) ||
        normalize(v?.brand || '').includes(search) ||
        normalize(v?.model || '').includes(search);
      if (!matchesSearch) return false;

      // 2. Filtro de KPI (Atalhos rápidos)
      if (dashboardFilter !== 'total') {
        const isLate = s.estimated_delivery && delayCriteria && calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority).isDelayed;
        if (dashboardFilter === 'Atrasado') {
          if (!(isLate && s.status !== ServiceStatus.ENTREGUE)) return false;
        } else {
          if (s.status !== dashboardFilter) return false;
        }
      }

      // 3. Filtros Avançados (Data Range)
      if (dashboardAdvancedFilters.startDate) {
        if (new Date(s.entry_at) < new Date(dashboardAdvancedFilters.startDate + 'T00:00:00')) return false;
      }
      if (dashboardAdvancedFilters.endDate) {
        if (new Date(s.entry_at) > new Date(dashboardAdvancedFilters.endDate + 'T23:59:59')) return false;
      }
      if (dashboardAdvancedFilters.startDeliveryDate) {
        if (!s.estimated_delivery) return false;
        if (new Date(s.estimated_delivery) < new Date(dashboardAdvancedFilters.startDeliveryDate + 'T00:00:00')) return false;
      }
      if (dashboardAdvancedFilters.endDeliveryDate) {
        if (!s.estimated_delivery) return false;
        if (new Date(s.estimated_delivery) > new Date(dashboardAdvancedFilters.endDeliveryDate + 'T23:59:59')) return false;
      }

      // 4. Filtros Avançados (Multi-Status)
      if (dashboardAdvancedFilters.statuses.length > 0) {
        const isLate = s.estimated_delivery && delayCriteria && calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority).isDelayed;
        const matchesMultiStatus = dashboardAdvancedFilters.statuses.some(st => {
          if (st === 'Atrasado') return isLate && s.status !== ServiceStatus.ENTREGUE;
          return s.status === st;
        });
        if (!matchesMultiStatus) return false;
      }

      return true;
    });

    // 5. Ordenação
    return filtered.sort((a, b) => {
      const lateA = a.estimated_delivery && delayCriteria && calculateDelayStatus(a.estimated_delivery, delayCriteria, a.priority).isDelayed ? 1 : 0;
      const lateB = b.estimated_delivery && delayCriteria && calculateDelayStatus(b.estimated_delivery, delayCriteria, b.priority).isDelayed ? 1 : 0;

      switch (dashboardAdvancedFilters.sortBy) {
        case 'atrasados':
          return lateB - lateA;
        case 'entrega_proxima':
          if (!a.estimated_delivery) return 1;
          if (!b.estimated_delivery) return -1;
          return new Date(a.estimated_delivery).getTime() - new Date(b.estimated_delivery).getTime();
        case 'entrada_antiga':
          return new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'entrada_recente':
        default:
          return new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime();
      }
    });
  }, [services, searchQuery, dashboardFilter, dashboardAdvancedFilters, delayCriteria, allVehicles, allClients]);

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: <LayoutGrid size={24} /> },
    { id: 'clients', label: 'Clientes', icon: <Users size={24} /> },
    { id: 'agendamentos', label: 'Agenda', icon: <CalendarDays size={24} /> },
  ];

  const settingsOptions = useMemo(() => {
    if (!user) return [];
    return [
      { id: 'profile', label: 'Meu Perfil', desc: 'Dados da conta', icon: <User size={20} /> },
      { id: 'stock', label: 'Estoque', desc: 'Peças e notas', icon: <Package size={20} /> },
      { id: 'templates', label: 'Fichas', desc: 'Modelos de inspeção', icon: <FileCode size={20} /> },
      { id: 'statuses', label: 'Status', desc: 'Etapas do fluxo', icon: <Tag size={20} />, adminOnly: true },
      { id: 'catalog', label: 'Veículos', desc: 'Marcas e modelos', icon: <Briefcase size={20} />, adminOnly: true },
      { id: 'colors', label: 'Cores', desc: 'Paleta do sistema', icon: <Palette size={20} />, adminOnly: true },
      { id: 'integrations', label: 'Conexões', desc: 'Google e n8n', icon: <Share2 size={20} />, adminOnly: true },
      { id: 'users', label: 'Equipe', desc: 'Colaboradores', icon: <Users size={20} />, adminOnly: true },
      { id: 'workshop', label: 'Oficina', desc: 'Dados da OS', icon: <Store size={20} />, adminOnly: true },
      { id: 'delay', label: 'Atrasos', desc: 'Regras de tempo', icon: <Clock size={20} />, adminOnly: true },
      { id: 'status', label: 'Diagnóstico', desc: 'Verificar conexão', icon: <ShieldAlert size={20} />, adminOnly: true }
    ].filter(t => !t.adminOnly || user.role === 'admin');
  }, [user]);

  if (!isAuthenticated || !user) return <Auth onLogin={handleLogin} />;

  const canAccessClients = user.role === 'admin' || user.permissions.access_clients;

  const isAdvancedFilterActive = dashboardAdvancedFilters.statuses.length > 0 || !!dashboardAdvancedFilters.startDate || !!dashboardAdvancedFilters.endDate || dashboardAdvancedFilters.sortBy !== 'entrada_recente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex text-slate-900 overflow-x-hidden relative">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-30 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <CarIcon size={20} className="text-slate-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase leading-none">GARAGEM<span className="text-green-500">40</span></h1>
          </div>

          <nav className="space-y-1">
            {navItems.filter(item => item.id !== 'clients' || canAccessClients).map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-semibold uppercase text-[10px] tracking-widest ${activeTab === item.id ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-white/10">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase truncate leading-none">{user.name}</p>
              <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest truncate mt-1">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-red-400 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all duration-300">

        {/* TOP BAR - Reduced height and improved spacing */}
        <header className="bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-3 sticky top-0 z-20 border-b border-slate-100 shadow-sm shrink-0">
          <div className="max-w-7xl mx-auto flex justify-between items-center mb-3 lg:mb-0 lg:h-10">
            <div className="flex items-center gap-3 lg:hidden" onClick={() => setTab('dashboard')}>
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg cursor-pointer">
                <CarIcon size={18} className="text-green-500" />
              </div>
              <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase leading-none cursor-pointer">G40</h1>
            </div>

            <div className="hidden lg:block">
              <h2 className="text-base font-black uppercase tracking-tight text-slate-800">
                {navItems.find(n => n.id === activeTab)?.label || 'Ajustes'}
              </h2>
            </div>

            <div className="flex gap-2">
              <button onClick={handleLogout} className="lg:hidden p-2.5 rounded-xl bg-white border border-slate-100 text-red-500 shadow-sm active:scale-90 transition-all"><LogOut size={18} /></button>
              <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl px-3 hidden lg:flex border border-slate-100">
                <Bell size={16} className="text-slate-400" />
                <div className="w-px h-5 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-black uppercase text-slate-600">{user.name}</p>
                  <div className="w-7 h-7 bg-slate-900 text-green-500 rounded-full flex items-center justify-center text-[10px] font-black">
                    {user.name.charAt(0)}
                  </div>
                </div>
              </div>
              <button onClick={() => { setTab('settings'); setSettingsTab('hub'); }} className={`p-2.5 rounded-xl border shadow-sm transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}><Settings size={18} /></button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto mt-2 lg:mt-4 relative group animate-in fade-in duration-300">
              <VoiceInput multiline={false} value={searchQuery} onTranscript={setSearchQuery} placeholder="Buscar placa, cliente, modelo..." className="!pl-11 !py-3.5 !bg-slate-100 !border-transparent !shadow-inner !text-sm" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          )}
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <section className="p-4 sm:p-6 lg:p-10 flex-1 max-w-7xl mx-auto w-full pb-32 lg:pb-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500">

              {/* Cards de KPI - Standardized Grid for cleaner mobile view */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-1">
                {[
                  { id: 'Atrasado', label: 'Atrasado', count: stats.atrasado, color: 'text-red-500', bg: 'bg-red-50' },
                  { id: ServiceStatus.PENDENTE, label: 'Pendente', count: stats.pendente, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { id: ServiceStatus.EM_ANDAMENTO, label: 'Andamento', count: stats.andamento, color: 'text-purple-500', bg: 'bg-purple-50' },
                  { id: ServiceStatus.LEMBRETE, label: 'Lembrete', count: stats.lembrete, color: 'text-amber-500', bg: 'bg-amber-50' },
                  { id: ServiceStatus.PRONTO, label: 'Pronto', count: stats.pronto, color: 'text-green-500', bg: 'bg-green-50' },
                  { id: 'total', label: 'Total', count: stats.total, color: 'text-slate-800', bg: 'bg-slate-100', highlight: true }
                ].map(card => {
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

              {/* Filtros e Contador - Visual Clean e Pill based */}
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

              {/* Lista de Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {processedServices.map(service => <ServiceCard key={service.id} service={service} onClick={() => setSelectedServiceId(service.id)} />)}

                {/* Empty State - Improved Visual hierarchy */}
                {processedServices.length === 0 && (
                  <div className="col-span-full py-20 sm:py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100/80 mx-2 animate-in fade-in duration-700">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Info size={32} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black px-12 uppercase tracking-[2px] leading-relaxed max-w-xs mx-auto">
                      Nenhuma ordem de serviço encontrada para os filtros atuais.
                    </p>
                    <button
                      onClick={() => { setDashboardFilter('total'); setDashboardAdvancedFilters(defaultFilters); setSearchQuery(''); }}
                      className="mt-8 text-[10px] font-black uppercase tracking-[3px] text-green-600 hover:text-green-700 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}



          {activeTab === 'clients' && canAccessClients && <ClientsTab onSelectService={id => { setSelectedServiceId(id); setTab('dashboard'); }} />}
          {activeTab === 'agendamentos' && <Agendamentos />}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {settingsTab === 'hub' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settingsOptions.map(option => (<button key={option.id} onClick={() => setSettingsTab(option.id)} className="p-5 sm:p-6 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-between group active:border-green-500 transition-all shadow-sm hover:shadow-md touch-target"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">{option.icon}</div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-tight leading-none">{option.label}</h3><p className="text-[10px] font-medium text-slate-400 mt-1.5 sm:mt-2 uppercase tracking-wide">{option.desc}</p></div><ChevronRight size={18} className="text-slate-200 group-hover:text-green-600" /></button>))}
                </div>
              )}

              {settingsTab !== 'hub' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2 sm:mb-4">
                    <button onClick={() => setSettingsTab('hub')} className="p-3 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
                    <h3 className="text-sm sm:text-lg font-bold uppercase text-slate-800">{settingsOptions.find(o => o.id === settingsTab)?.label}</h3>
                  </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {allTemplates.map(t => (<div key={t.id} onClick={() => setEditingTemplate(t)} className="p-5 sm:p-6 bg-white border-2 border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-green-500 transition-all shadow-sm cursor-pointer"><div><h3 className="text-sm sm:text-base font-bold uppercase text-slate-800 tracking-tight">{t.name}</h3></div><ChevronRight size={18} className="text-slate-300 group-hover:text-green-500" /></div>))}
                    </div>
                  )}
                  {settingsTab === 'statuses' && user.role === 'admin' && <StatusManagement />}
                  {settingsTab === 'catalog' && user.role === 'admin' && <CatalogManagement />}
                  {settingsTab === 'colors' && user.role === 'admin' && <ColorManagement />}
                  {settingsTab === 'integrations' && user.role === 'admin' && <IntegrationsSettings />}
                  {settingsTab === 'users' && user.role === 'admin' && <UserManagement />}
                  {settingsTab === 'delay' && user.role === 'admin' && <DelaySettings user={user} />}
                  {settingsTab === 'delay' && user.role === 'admin' && <DelaySettings user={user} />}
                  {settingsTab === 'workshop' && user.role === 'admin' && <WorkshopSettingsComp />}
                  {settingsTab === 'status' && user.role === 'admin' && (
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
                      <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl text-xs">
                        <p className="font-bold mb-1">Nota:</p>
                        <p>Se "Modo Ativo" for <strong>Mock</strong> mesmo com "Source Configurado" como <strong>supabase</strong>, significa que a conexão falhou ou as credenciais são inválidas.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* FAB - Adjusted position and shadow */}
      {(activeTab === 'dashboard' || activeTab === 'clients') && (
        <button
          onClick={() => setIsWizardOpen(true)}
          className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 lg:bottom-12 lg:right-12 w-16 h-16 bg-green-600 text-white rounded-[1.5rem] shadow-[0_15px_35px_rgba(22,163,74,0.3)] flex items-center justify-center active:scale-90 hover:bg-green-700 transition-all z-40 border-4 border-white"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {/* BOTTOM NAV (MOBILE ONLY) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t safe-bottom flex justify-around p-3 sm:p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-1 transition-all p-1 sm:p-2 rounded-2xl flex-1 ${activeTab === item.id ? 'text-green-600' : 'text-slate-300'}`}>
            <div className={`p-1.5 sm:p-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-green-50' : 'bg-transparent'}`}>
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22, strokeWidth: activeTab === item.id ? 3 : 2 })}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODAIS RESPONSIVOS */}
      {isWizardOpen && <NewServiceWizard onClose={() => setIsWizardOpen(false)} onCreated={(s) => { refreshServices(); setIsWizardOpen(false); setSelectedServiceId(s.id); }} />}
      {selectedServiceId && <ServiceDetail serviceId={selectedServiceId} onClose={() => setSelectedServiceId(null)} onUpdate={refreshServices} />}

      {isReceiveInvoiceOpen && <ReceiveInvoice user={user} onClose={() => setIsReceiveInvoiceOpen(false)} onProcessed={() => { setIsReceiveInvoiceOpen(false); refreshServices(); }} />}
      {isInvoiceHistoryOpen && <InvoiceHistory onClose={() => setIsInvoiceHistoryOpen(false)} />}
      {isStockByVehicleOpen && <StockByVehicle user={user} onClose={() => setIsStockByVehicleOpen(false)} />}

      {isFilterModalOpen && (
        <FilterModal
          currentFilters={dashboardAdvancedFilters}
          onApply={(f) => { setDashboardAdvancedFilters(f); setIsFilterModalOpen(false); }}
          onClose={() => setIsFilterModalOpen(false)}
          onClear={() => { setDashboardAdvancedFilters(defaultFilters); setIsFilterModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default App;
