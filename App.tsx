
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
import StockDashboardMini from './components/StockDashboardMini';
import TemplateManager from './components/TemplateManagement';
import RatesSettings from './components/RatesSettings';
import UpdatePassword from './components/UpdatePassword';
import { notificationService } from './services/NotificationService';
import { supabase } from './services/supabaseService';


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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // ===================== PERFORMANCE OPTIMIZATION STATES =====================
  const [statsCounts, setStatsCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreServices, setHasMoreServices] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const PAGE_SIZE = 20;

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

  // Listen for PASSWORD_RECOVERY event from Supabase Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Recuperar perfil do usuário ao entrar via Magic Link
        const { data: profile } = await supabase
          .from('perfis_de_usuário')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          const loggedUser: UserAccount = {
            id: session.user.id,
            name: profile.name,
            email: session.user.email || '',
            role: profile.papel,
            active: true,
            permissions: {
              manage_team: false,
              manage_clients: false,
              manage_inventory: false,
              config_rates: false,
              config_vehicles: false,
              config_system: false,
              view_financials: false
            },
            organization_id: profile.organization_id || 'org_1',
            phone: profile.phone || '',
            created_at: profile.created_at || new Date().toISOString()
          };
          setUser(loggedUser);
          setIsAuthenticated(true);
          localStorage.setItem('g40_user_session', JSON.stringify(loggedUser));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Inicializar serviço de notificações quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      notificationService.start();
    }
    return () => {
      notificationService.stop();
    };
  }, [isAuthenticated]);



  // ===================== ACTION-FIRST VIEW LOADING =====================
  // Load stats (counts) separately - fast query for chips
  const loadStats = async () => {
    try {
      const counts = await dataProvider.getServiceCounts();
      setStatsCounts(counts);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Load services with Action-First filtering and pagination
  const loadServices = async (reset: boolean = false) => {
    try {
      if (reset) {
        setIsInitialLoad(true);
        setCurrentPage(0);
      } else {
        setIsLoadingMore(true);
      }

      const offset = reset ? 0 : currentPage * PAGE_SIZE;

      // Action-First Logic: Determine which statuses to filter
      let excludeStatuses: string[] = [];
      let filterStatuses: string[] = [];

      const isDefaultView = dashboardFilter === 'total' &&
        dashboardAdvancedFilters.statuses.length === 0 &&
        !dashboardAdvancedFilters.startDate &&
        !dashboardAdvancedFilters.endDate;

      if (isDefaultView) {
        // Action-First: Exclude finalized statuses by default
        excludeStatuses = ['Pronto', 'Entregue'];
      } else if (dashboardFilter !== 'total' && dashboardFilter !== 'Atrasado') {
        // Specific status selected via chip
        filterStatuses = [dashboardFilter];
      }

      const result = await dataProvider.getServicesFiltered({
        excludeStatuses,
        statuses: filterStatuses,
        limit: PAGE_SIZE,
        offset,
        sortBy: 'priority'
      });

      if (reset) {
        setServices(result.data);
      } else {
        setServices(prev => [...prev, ...result.data]);
      }

      setHasMoreServices(result.hasMore);
      setCurrentPage(prev => reset ? 1 : prev + 1);
      setIsInitialLoad(false);
      setIsLoadingMore(false);
    } catch (err) {
      console.error('Failed to load services:', err);
      setIsLoadingMore(false);
      setIsInitialLoad(false);
    }
  };

  // Load more services (infinite scroll)
  const loadMoreServices = () => {
    if (!isLoadingMore && hasMoreServices) {
      loadServices(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadStats();
    loadServices(true);
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


  const refreshServices = async () => {
    await Promise.all([loadStats(), loadServices(true)]);
  };

  // Reload when filter changes
  useEffect(() => {
    if (isAuthenticated) {
      loadServices(true);
    }
  }, [dashboardFilter, dashboardAdvancedFilters]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      const interval = setInterval(loadStats, 15000); // Stats refresh every 15s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Persiste filtros no localStorage
  useEffect(() => {
    localStorage.setItem('g40_dashboard_filters', JSON.stringify(dashboardAdvancedFilters));
  }, [dashboardAdvancedFilters]);

  // ===================== HARDWARE BACK BUTTON LOGIC =====================
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Rule 1 & 2: Modals (Wizard, Detail, etc.)
      if (isWizardOpen) {
        event.preventDefault(); // Try to prevent, though browsers are tricky
        // Dirty check for Wizard is complex without accessing internal state directly here.
        // For simpler Global Handler, we will just confirm closing if Wizard is open.
        // Ideally Wizard should manage its own dirty state, but we are at App level.
        // We can just ask:
        if (window.confirm('Deseja cancelar a abertura da OS? Dados não salvos serão perdidos.')) {
          setIsWizardOpen(false);
        } else {
          // Push state back to prevent exit if user cancels
          window.history.pushState(null, '', window.location.pathname);
        }
        return;
      }

      if (selectedServiceId) {
        // Just close detail
        setSelectedServiceId(null);
        return;
      }

      if (isReceiveInvoiceOpen) { setIsReceiveInvoiceOpen(false); return; }
      if (isInvoiceHistoryOpen) { setIsInvoiceHistoryOpen(false); return; }
      if (isStockByVehicleOpen) { setIsStockByVehicleOpen(false); return; }
      if (isFilterModalOpen) { setIsFilterModalOpen(false); return; }

      // Rule 1: Sub-tabs (Settings)
      if (activeTab === 'settings' && settingsTab !== 'hub') {
        setSettingsTab('hub');
        return;
      }

      // Rule 3: Exit App (Dashboard)
      // If we are on Dashboard or main tabs, clarify exit
      if (activeTab === 'dashboard' || activeTab === 'clients' || activeTab === 'stock' || activeTab === 'agendamentos') {
        // Browser default behavior will exit if we don't push state.
        // If we want to show custom confirmation:
        if (!window.confirm('Deseja sair do sistema?')) {
          window.history.pushState(null, '', window.location.pathname);
        }
      } else {
        // If on other tabs (e.g. settings root), go back to dashboard
        setTab('dashboard');
      }
    };

    // Initialize history state to allow capture
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    isWizardOpen, selectedServiceId, isReceiveInvoiceOpen, isInvoiceHistoryOpen, isStockByVehicleOpen, isFilterModalOpen,
    activeTab, settingsTab
  ]);

  const handleLogin = async (userData: any) => {
    try {
      // Se já vier com ID e Role (do Supabase/AuthService), usamos direto
      if (userData.id && userData.role) {
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('g40_user_session', JSON.stringify(userData));
        return;
      }

      // Lógica legada para Mock / Fallback
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
              manage_team: true,
              manage_clients: true,
              manage_inventory: true,
              config_rates: true,
              config_vehicles: true,
              config_system: true,
              view_financials: true
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

  // Stats now come from fast count API query
  const stats = useMemo(() => {
    return {
      atrasado: statsCounts['Atrasado'] || 0,
      pendente: statsCounts['Pendente'] || 0,
      andamento: statsCounts['Em Andamento'] || 0,
      lembrete: statsCounts['Lembrete'] || 0,
      pronto: statsCounts['Pronto'] || 0,
      entregue: statsCounts['Entregue'] || 0,
      total: statsCounts['total'] || 0
    };
  }, [statsCounts]);

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
    { id: 'stock', label: 'Estoque', icon: <Package size={24} /> },
    { id: 'agendamentos', label: 'Agenda', icon: <CalendarDays size={24} /> },
  ];

  const settingsOptions = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role?.toLowerCase() === 'admin';

    const allOptions = [
      { id: 'profile', label: 'Meu Perfil', desc: 'Dados da conta', icon: <User size={20} />, perm: null },
      { id: 'stock', label: 'Estoque', desc: 'Peças e notas', icon: <Package size={20} />, perm: 'manage_inventory' },
      { id: 'templates', label: 'Fichas', desc: 'Modelos de inspeção', icon: <FileCode size={20} />, perm: null },
      { id: 'rates', label: 'Mão de Obra', desc: 'Valores por hora', icon: <DollarSign size={20} />, perm: 'config_rates' },
      { id: 'statuses', label: 'Status', desc: 'Etapas do fluxo', icon: <Tag size={20} />, perm: 'config_system' },
      { id: 'catalog', label: 'Veículos', desc: 'Marcas e modelos', icon: <Briefcase size={20} />, perm: 'config_vehicles' },
      { id: 'colors', label: 'Cores', desc: 'Paleta do sistema', icon: <Palette size={20} />, perm: 'config_vehicles' },
      { id: 'integrations', label: 'Conexões', desc: 'Google e n8n', icon: <Share2 size={20} />, perm: 'config_system' },
      { id: 'users', label: 'Equipe', desc: 'Colaboradores', icon: <Users size={20} />, perm: 'manage_team' },
      { id: 'workshop', label: 'Oficina', desc: 'Dados da OS', icon: <Store size={20} />, perm: 'config_system' },
      { id: 'delay', label: 'Atrasos', desc: 'Regras de tempo', icon: <Clock size={20} />, perm: 'config_system' },
      { id: 'status', label: 'Diagnóstico', desc: 'Verificar conexão', icon: <ShieldAlert size={20} />, perm: null }
    ];

    return allOptions.filter(opt =>
      opt.perm === null || isAdmin || (user.permissions as any)?.[opt.perm]
    );
  }, [user]);

  // Show password recovery screen if PASSWORD_RECOVERY event was received
  if (isPasswordRecovery) {
    return (
      <UpdatePassword
        onComplete={() => {
          setIsPasswordRecovery(false);
          setShowToast('Senha atualizada com sucesso!');
        }}
        onBack={() => setIsPasswordRecovery(false)}
      />
    );
  }

  if (!isAuthenticated || !user) return <Auth onLogin={handleLogin} />;

  const canAccessClients = user.role?.toLowerCase() === 'admin' || user.permissions?.manage_clients;

  const isAdvancedFilterActive = dashboardAdvancedFilters.statuses.length > 0 || !!dashboardAdvancedFilters.startDate || !!dashboardAdvancedFilters.endDate || dashboardAdvancedFilters.sortBy !== 'entrada_recente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex text-slate-900 overflow-x-hidden relative">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-50 shadow-2xl">
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
              <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest truncate mt-1">{user.role || 'Sem cargo'}</p>
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
                    {user?.name?.charAt(0) || 'U'}
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
        <section className="p-2 sm:p-6 lg:p-10 flex-1 max-w-7xl mx-auto w-full pb-32 lg:pb-10">
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

                {/* Load More / Infinite Scroll Trigger */}
                {processedServices.length > 0 && hasMoreServices && (
                  <div className="col-span-full flex justify-center py-6">
                    <button
                      onClick={loadMoreServices}
                      disabled={isLoadingMore}
                      className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 font-bold uppercase text-[10px] tracking-widest hover:border-slate-400 hover:shadow-md transition-all disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Carregando...
                        </>
                      ) : (
                        <>Carregar Mais</>
                      )}
                    </button>
                  </div>
                )}

                {/* Initial Loading State */}
                {isInitialLoad && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20">
                    <svg className="animate-spin h-10 w-10 text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Carregando veículos...</p>
                  </div>
                )}
              </div>

            </div>
          )}



          {activeTab === 'clients' && (
            canAccessClients ? (
              <ClientsTab onSelectService={id => { setSelectedServiceId(id); setTab('dashboard'); }} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                  <ShieldAlert size={40} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-slate-800">Acesso Restrito</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-2 max-w-xs mx-auto">
                    Seu usuário <span className="text-slate-800 border-b border-slate-300 mx-1">{user.role || 'Sem cargo'}</span> não possui permissão para acessar a base de clientes.
                  </p>
                </div>
                <button
                  onClick={() => setTab('dashboard')}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mt-4 hover:scale-105 transition-transform"
                >
                  Voltar ao Painel
                </button>
              </div>
            )
          )}

          {activeTab === 'stock' && (
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
            </div>
          )}

          {activeTab === 'agendamentos' && (
            <Agendamentos
              onOpenService={(serviceId) => {
                setSelectedServiceId(serviceId);
                setTab('dashboard');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {settingsTab === 'hub' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settingsOptions.map(option => (<button key={option.id} onClick={() => setSettingsTab(option.id)} className="p-5 sm:p-6 bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-between group active:border-green-500 transition-all shadow-sm hover:shadow-md touch-target"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">{option.icon}</div><div className="flex-1 text-left"><h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-tight leading-none">{option.label}</h3><p className="text-[10px] font-medium text-slate-400 mt-1.5 sm:mt-2 uppercase tracking-wide">{option.desc}</p></div><ChevronRight size={18} className="text-slate-200 group-hover:text-green-600" /></button>))}
                </div>
              )}



              // ... (in component body)

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
                    // ... stock content same as before ...
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
                  {settingsTab === 'users' && <UserManagement />}
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t safe-bottom flex justify-around p-3 sm:p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
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
      {selectedServiceId && <ServiceDetail serviceId={selectedServiceId} onClose={() => setSelectedServiceId(null)} onUpdate={refreshServices} user={user} />}

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
