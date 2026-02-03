
import {
  Client, Vehicle, ServiceJob, ServiceStatus, UserAccount,
  Product, Supplier, Invoice, StockMovement, StockAllocation,
  Appointment, ServiceTask, StatusConfig, WorkshopSettings,
  Reminder, EvaluationTemplate, VehicleColor, InspectionTemplateItem,
  StatusLogEntry, CatalogItem, IntegrationState
} from '../types';
import { generateUUID } from '../utils/helpers';
import { VEHICLE_CATALOG_INITIAL, INITIAL_COLORS } from '../constants';

const DB_KEY = 'oficinapro_v4_db';

class MockDB {
  private data: {
    clients: Client[];
    vehicles: Vehicle[];
    services: ServiceJob[];
    products: Product[];
    suppliers: Supplier[];
    invoices: Invoice[];
    stock_movements: StockMovement[];
    stock_allocations: StockAllocation[];
    workshopSettings: WorkshopSettings;
    delayCriteria: any;
    users: UserAccount[];
    statusConfigs: StatusConfig[];
    integrations: IntegrationState;
    appointments: Appointment[];
    colors: VehicleColor[];
    catalog: CatalogItem[];
    templates: EvaluationTemplate[];
  };

  constructor() {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      this.data = JSON.parse(saved);
      if (!this.data.stock_allocations) this.data.stock_allocations = [];
      if (!this.data.appointments) this.data.appointments = [];
      if (!this.data.colors) this.data.colors = [];
      if (!this.data.catalog) this.data.catalog = [];
      if (!this.data.templates || this.data.templates.length === 0) {
        this.data.templates = this.getDefaultTemplates();
      }
    } else {
      this.data = {
        clients: [],
        vehicles: [],
        services: [],
        products: [],
        suppliers: [],
        invoices: [],
        stock_movements: [],
        stock_allocations: [],
        workshopSettings: { name: 'GARAGEM 40', address: 'Rua das Oficinas, 123', phone: '(11) 98888-7777', cnpj: '00.000.000/0001-00' },
        delayCriteria: { active: true, thresholdDays: 0, thresholdHours: 2, considerWorkdays: true, considerBusinessHours: true, businessStart: '08:00', businessEnd: '18:00', priorityOverrides: [], autoMarkDelayed: true, autoNotify: false },
        users: [{ id: 'u1', name: 'Admin Master', email: 'admin@garagem40.com.br', phone: '', role: 'admin', active: true, permissions: { access_clients: true, view_values_execution: true, view_values_reports: true, create_templates: true, manage_reminders: true }, created_at: '' }],
        statusConfigs: [],
        integrations: { googleCalendarConnected: false, n8nConnected: false, n8nEvents: {} },
        appointments: [],
        colors: INITIAL_COLORS.map(c => ({ ...c, id: generateUUID() })),
        catalog: VEHICLE_CATALOG_INITIAL.map(c => ({ ...c, id: generateUUID() })),
        templates: this.getDefaultTemplates()
      };
      this.save();
    }
  }

  private getDefaultTemplates(): EvaluationTemplate[] {
    const latariaItems = [
      'Aerofólio', 'Aro Farol', 'Aro Roda', 'Assoalho', 'Batente', 'Borracha Porta', 'Borracha', 'Borr. P. Choque',
      'Borracha Capô', 'Borracha Parabrisa', 'Caixa de Ar', 'Caixa de Roda', 'Capô Dianteiro', 'Capô Traseiro',
      'Coluna Frente', 'Coluna Lateral', 'Dobradiça', 'Emblema', 'Espelho', 'Estribo', 'Farol', 'Fechadura',
      'Fecha Capô Dianteiro', 'Fecha Capô Traseiro', 'Frete', 'Friso', 'Forro Teto', 'Lâmpada', 'Lateral Dianteira LE',
      'Lateral Dianteira LD', 'Lateral Traseira Esquerda', 'Lateral Traseira Direita', 'Longarina', 'Maçaneta',
      'Máquina de Vidro', 'Painel Frontal', 'Moldura', 'Para-choque Dianteiro', 'Para-choque Traseiro',
      'Grade P. Choque', 'Paralamas Direito', 'Paralamas Esquerdo', 'Ponteira Parachoque', 'Porta Dianteira Direita',
      'Porta Dianteira Esquerda', 'Porta Traseira Direita', 'Porta Traseira Esquerda', 'Sinaleira Traseira',
      'Suporte P. Choque Traseiro', 'Tampa Porta Luvas', 'Tampa Traseira', 'Terminal Dianteiro', 'Terminal Traseiro',
      'Teto', 'Travessa', 'Vidro Parabrisa', 'Vidro Porta', 'Vidro Traseiro Lateral', 'Vidro Vigia'
    ];

    const generateItem = (label: string): InspectionTemplateItem => ({
      key: label.toLowerCase().replace(/\s+/g, '_'),
      label: label,
      allow_subitems: true,
      subitems: ['troca', 'chap.', 'pintura'],
      allow_notes: true,
      allow_media: true,
      is_active: true,
      allowed_charge_type: 'Ambos',
      default_charge_type: 'Fixo',
      default_fixed_value: 0,
      default_rate_per_hour: 120
    });

    return [
      {
        id: 'tmpl_full_v1',
        name: 'Ficha de Avaliação Completa',
        is_default: true,
        sections: [
          {
            section_name: 'Estrutura e Lataria',
            items: latariaItems.map(generateItem)
          },
          {
            section_name: 'Serviços Complementares',
            items: [
              { ...generateItem('Polimento'), subitems: ['executar'] },
              { ...generateItem('Espelhamento'), subitems: ['executar'] },
              { ...generateItem('Martelinho de Ouro'), subitems: ['executar'] },
              { ...generateItem('Mecânica'), subitems: ['executar'] }
            ]
          }
        ]
      }
    ];
  }

  private save() { localStorage.setItem(DB_KEY, JSON.stringify(this.data)); }

  // --- MÁQUINA DE ESTADOS CENTRALIZADA ---
  private recomputeServiceStatus(serviceId: string, actionSource: string = 'Sistema') {
    const service = this.getServiceById(serviceId);
    if (!service) return;

    // Se estiver entregue, não muda automaticamente (trava de segurança)
    if (service.status === ServiceStatus.ENTREGUE && actionSource === 'Sistema') return;

    let nextStatus = ServiceStatus.PENDENTE;

    const hasAnyTaskInProgress = service.tasks.some(t => t.status === 'in_progress');
    const hasActiveReminders = service.reminders?.some(r => r.status === 'active');
    const allTasksDone = service.tasks.length > 0 && service.tasks.every(t => t.status === 'done');

    // REGRA DE PRIORIDADE
    if (service.status === ServiceStatus.ENTREGUE && actionSource !== 'Manual') {
      nextStatus = ServiceStatus.ENTREGUE;
    } else if (hasAnyTaskInProgress) {
      nextStatus = ServiceStatus.EM_ANDAMENTO;
    } else if (hasActiveReminders) {
      nextStatus = ServiceStatus.LEMBRETE;
    } else if (allTasksDone) {
      nextStatus = ServiceStatus.PRONTO;
    } else {
      nextStatus = ServiceStatus.PENDENTE;
    }

    if (service.status !== nextStatus) {
      const currentUser = this.data.users[0];
      const log: StatusLogEntry = {
        id: generateUUID(),
        status: nextStatus,
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action_source: actionSource
      };

      service.status = nextStatus;
      service.status_history = [...(service.status_history || []), log];
      this.save();
      console.log(`[STATUS MACHINE] OS ${serviceId} -> ${nextStatus} (${actionSource})`);
    }
  }

  getProducts() { return this.data.products; }
  getProductById(id: string) { return this.data.products.find(p => p.id === id); }
  getClients() { return this.data.clients; }
  getClientById(id: string) { return this.data.clients.find(c => c.id === id); }
  getVehicles() { return this.data.vehicles; }
  getVehicleById(id: string) { return this.data.vehicles.find(v => v.id === id); }
  getVehiclesByClient(clientId: string) { return this.data.vehicles.filter(v => v.client_id === clientId); }
  getServices() { return this.data.services; }
  getServiceById(id: string) { return this.data.services.find(s => s.id === id); }
  getServicesByVehicle(vehicleId: string) { return this.data.services.filter(s => s.vehicle_id === vehicleId); }
  getStockAllocations() { return this.data.stock_allocations; }
  getAllocationsByVehicle(vehicleId: string) { return this.data.stock_allocations.filter(a => a.vehicle_id === vehicleId); }
  getStockMovements() { return this.data.stock_movements; }

  addStockMovement(m: Omit<StockMovement, 'id' | 'date'>) {
    const newM: StockMovement = { ...m, id: generateUUID(), date: new Date().toISOString() };
    this.data.stock_movements.unshift(newM);
    const prod = this.getProductById(m.product_id);
    if (prod) {
      if (m.type === 'IN') prod.current_stock += m.qty;
      else prod.current_stock -= m.qty;
    }
    this.save();
    return newM;
  }

  allocateProduct(data: { product_id: string, vehicle_id: string, qty: number }) {
    const prod = this.getProductById(data.product_id);
    if (!prod || prod.current_stock < data.qty) return null;
    const newAlloc: StockAllocation = {
      id: generateUUID(), product_id: data.product_id, vehicle_id: data.vehicle_id,
      reserved_qty: data.qty, consumed_qty: 0, status: 'reserved', date_allocated: new Date().toISOString()
    };
    this.data.stock_allocations.push(newAlloc);
    this.save();
    return newAlloc;
  }

  consumeAllocation(allocId: string, userId: string) {
    const idx = this.data.stock_allocations.findIndex(a => a.id === allocId);
    if (idx === -1) return;
    const alloc = this.data.stock_allocations[idx];
    this.addStockMovement({
      product_id: alloc.product_id, vehicle_id: alloc.vehicle_id, qty: alloc.reserved_qty,
      type: 'OUT', source: `Consumo OS ${this.getVehicleById(alloc.vehicle_id)?.plate}`, created_by: userId
    });
    this.data.stock_allocations[idx] = { ...alloc, status: 'consumed', consumed_qty: alloc.reserved_qty, reserved_qty: 0 };
    this.save();
  }

  releaseAllocation(allocId: string) {
    this.data.stock_allocations = this.data.stock_allocations.filter(a => a.id !== allocId);
    this.save();
  }

  getDelayCriteria() { return this.data.delayCriteria; }
  getUsers() { return this.data.users; }
  getWorkshopSettings() { return this.data.workshopSettings; }
  getStatusConfigs() { return this.data.statusConfigs || []; }
  getIntegrations() { return this.data.integrations; }
  updateIntegrations(updates: any) { this.data.integrations = { ...this.data.integrations, ...updates }; this.save(); }
  updateN8nEvent(key: string, val: boolean) { this.data.integrations.n8nEvents[key] = val; this.save(); }
  updateStatusConfig(key: ServiceStatus, updates: any) {
    const idx = this.data.statusConfigs.findIndex(c => c.key === key);
    if (idx !== -1) { this.data.statusConfigs[idx] = { ...this.data.statusConfigs[idx], ...updates }; this.save(); }
  }

  addClient(c: any) { const nc = { ...c, id: generateUUID() }; this.data.clients.push(nc); this.save(); return nc; }
  updateClient(id: string, u: any) {
    const idx = this.data.clients.findIndex(c => c.id === id);
    if (idx !== -1) { this.data.clients[idx] = { ...this.data.clients[idx], ...u }; this.save(); }
  }
  addVehicle(v: any) { const nv = { ...v, id: generateUUID() }; this.data.vehicles.push(nv); this.save(); return nv; }
  updateVehicle(id: string, u: any) {
    const idx = this.data.vehicles.findIndex(v => v.id === id);
    if (idx !== -1) { this.data.vehicles[idx] = { ...this.data.vehicles[idx], ...u }; this.save(); }
  }

  addService(s: any) {
    const ns: ServiceJob = {
      ...s,
      id: generateUUID(),
      entry_at: new Date().toISOString(),
      tasks: [],
      reminders: [],
      status: ServiceStatus.PENDENTE,
      status_history: [{
        id: generateUUID(),
        status: ServiceStatus.PENDENTE,
        timestamp: new Date().toISOString(),
        user_name: 'Sistema',
        action_source: 'Criação'
      }]
    };
    this.data.services.push(ns);
    this.save();
    return ns;
  }

  updateService(id: string, u: any) {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.services[idx] = { ...this.data.services[idx], ...u };
      this.save();
      this.recomputeServiceStatus(id, u.status ? 'Manual' : 'Sistema');
    }
  }

  deliverService(id: string) {
    const currentUser = this.data.users[0];
    const log: StatusLogEntry = {
      id: generateUUID(),
      status: ServiceStatus.ENTREGUE,
      timestamp: new Date().toISOString(),
      user_id: currentUser.id,
      user_name: currentUser.name,
      action_source: 'Entrega'
    };

    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.services[idx].status = ServiceStatus.ENTREGUE;
      this.data.services[idx].status_history = [...(this.data.services[idx].status_history || []), log];
      this.save();
    }
  }

  addTask(sid: string, t: string, e: any = {}) {
    const s = this.getServiceById(sid);
    if (!s) return null;
    const newTask: ServiceTask = {
      id: generateUUID(), service_id: sid, title: t, status: 'todo', order: s.tasks.length,
      charge_type: e.charge_type || 'Fixo', rate_per_hour: e.rate_per_hour || 120, fixed_value: e.fixed_value || 0,
      manual_override_value: null, from_template_id: e.from_template_id || null, ...e
    };
    s.tasks.push(newTask);
    this.save();
    this.recomputeServiceStatus(sid, 'Inclusão de Etapa');
    return newTask;
  }

  updateTask(sid: string, tid: string, u: any) {
    const s = this.getServiceById(sid);
    if (!s) return;
    const idx = s.tasks.findIndex(t => t.id === tid);
    if (idx !== -1) {
      const oldStatus = s.tasks[idx].status;
      s.tasks[idx] = { ...s.tasks[idx], ...u };
      this.save();
      if (u.status && u.status !== oldStatus) {
        this.recomputeServiceStatus(sid, `Alteração Etapa (${u.status})`);
      }
    }
  }

  deleteTask(sid: string, tid: string) {
    const s = this.getServiceById(sid);
    if (!s) return;
    s.tasks = s.tasks.filter(t => t.id !== tid);
    this.save();
    this.save();
    this.recomputeServiceStatus(sid, 'Exclusão de Etapa');
  }

  getTaskHistory(sid: string): any[] {
    // Mock implementation: return empty array or fake history
    return [];
  }

  getTemplates() { return this.data.templates || []; }
  saveTemplate(t: any) {
    if (!this.data.templates) this.data.templates = [];
    if (t.id) {
      const idx = this.data.templates.findIndex(temp => temp.id === t.id);
      if (idx !== -1) this.data.templates[idx] = t;
      else this.data.templates.push(t);
    } else { this.data.templates.push({ ...t, id: generateUUID() }); }
    this.save();
  }
  addToCatalog(brand: string, model: string) {
    if (!this.data.catalog) this.data.catalog = [];
    const exists = this.data.catalog.some(c => c.brand === brand && c.model === model);
    if (!exists) { const ni = { id: generateUUID(), brand, model }; this.data.catalog.push(ni); this.save(); return ni; }
  }
  getCatalog() { return this.data.catalog || []; }
  updateCatalogItem(id: string, u: any) {
    const idx = this.data.catalog.findIndex(c => c.id === id);
    if (idx !== -1) { this.data.catalog[idx] = { ...this.data.catalog[idx], ...u }; this.save(); }
  }
  deleteCatalogItem(id: string) { this.data.catalog = (this.data.catalog || []).filter(c => c.id !== id); this.save(); }
  getColors() { return this.data.colors || []; }
  addColor(c: any) { const nc = { ...c, id: generateUUID() }; if (!this.data.colors) this.data.colors = []; this.data.colors.push(nc); this.save(); return nc; }
  updateColor(id: string, u: any) {
    const idx = this.data.colors.findIndex(c => c.id === id);
    if (idx !== -1) { this.data.colors[idx] = { ...this.data.colors[idx], ...u }; this.save(); }
  }
  deleteColor(id: string) { this.data.colors = (this.data.colors || []).filter(c => c.id !== id); this.save(); }
  getInvoices() { return this.data.invoices; }
  addInvoice(i: any) { const ni = { ...i, id: generateUUID(), status: 'processed' }; this.data.invoices.unshift(ni); this.save(); return ni; }
  updateProduct(id: string, u: any) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) { this.data.products[idx] = { ...this.data.products[idx], ...u }; this.save(); }
  }
  getSuppliers() { return this.data.suppliers; }
  getAppointments() { return this.data.appointments || []; }
  addAppointment(a: any) { const na = { ...a, id: generateUUID() }; if (!this.data.appointments) this.data.appointments = []; this.data.appointments.push(na); this.save(); return na; }
  deleteAppointment(id: string) { this.data.appointments = (this.data.appointments || []).filter(a => a.id !== id); this.save(); }
  updateDelayCriteria(c: any, uid: string, un: string) { this.data.delayCriteria = { ...c }; this.save(); }
  updateWorkshopSettings(s: any) { this.data.workshopSettings = { ...s }; this.save(); }
  createUser(u: any) { const nu = { ...u, id: generateUUID(), created_at: new Date().toISOString() }; this.data.users.push(nu); this.save(); return nu; }
  updateUser(id: string, u: any) {
    const idx = this.data.users.findIndex(user => user.id === id);
    if (idx !== -1) { this.data.users[idx] = { ...this.data.users[idx], ...u }; this.save(); }
  }
  deleteTemplate(id: string) { this.data.templates = (this.data.templates || []).filter(t => t.id !== id); this.save(); }
}

export const db = new MockDB();
