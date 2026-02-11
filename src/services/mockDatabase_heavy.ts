
import {
    Client, Vehicle, ServiceJob, ServiceStatus, UserAccount,
    Product, Supplier, Invoice, StockMovement, StockAllocation,
    Appointment, ServiceTask, StatusConfig, WorkshopSettings,
    Reminder, EvaluationTemplate, VehicleColor, InspectionTemplateItem,
    StatusLogEntry
} from '../types';
import { generateUUID } from '../utils/helpers';
import { VEHICLE_CATALOG_INITIAL, INITIAL_COLORS } from '../utils/constants';

const DB_KEY = 'oficinapro_v4_db_HEAVY';

export interface CatalogItem {
    id: string;
    brand: string;
    model: string;
}

export interface IntegrationState {
    googleCalendarConnected: boolean;
    lastSync?: string;
    n8nConnected: boolean;
    n8nEvents: Record<string, boolean>;
}

class MockDBHeavy {
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
        // FORCE RESET ON LOAD for Stress Testing
        this.data = this.generateHeavyData();
    }

    private generateHeavyData() {
        const clients: Client[] = Array.from({ length: 20 }).map((_, i) => ({
            id: `c_${i}`,
            organization_id: 'org1',
            name: i === 0
                ? 'Condomínio Residencial Parque das Flores Bloco C Apt 402' // Teste de layout
                : `Cliente Teste ${i}`,
            phone: '(11) 99999-9999'
        }));

        const vehicles: Vehicle[] = Array.from({ length: 40 }).map((_, i) => ({
            id: `v_${i}`,
            organization_id: 'org1',
            client_id: `c_${i % 20}`,
            plate: `ABC${1000 + i}`,
            brand: i % 3 === 0 ? 'Mercedes-Benz' : 'Volkswagen',
            model: i === 0
                ? 'Sprinter 415 CDI Teto Alto Longa Rodado Duplo' // Teste de overflow
                : `Veículo Modelo ${i}`,
            color: 'Branco'
        }));

        const services: ServiceJob[] = Array.from({ length: 60 }).map((_, i) => {
            // Distribuição de datas: 20% muito antigas, 30% mês passado, 50% recentes
            const daysAgo = i < 12 ? 180 : i < 30 ? 30 : Math.floor(Math.random() * 5);
            const entryDate = new Date();
            entryDate.setDate(entryDate.getDate() - daysAgo);

            // Distribuição de status
            let status = ServiceStatus.PRONTO;
            if (i < 10) status = ServiceStatus.PENDENTE;
            else if (i < 25) status = ServiceStatus.EM_ANDAMENTO;
            else if (i < 35) status = ServiceStatus.LEMBRETE;
            else if (i < 50) status = ServiceStatus.ENTREGUE;

            // Cria atrasados artificiais
            const estimated = new Date(entryDate);
            estimated.setDate(estimated.getDate() + 2);

            return {
                id: `s_${i}`,
                organization_id: 'org1',
                vehicle_id: `v_${i % 40}`,
                client_id: `c_${i % 20}`,
                status: status,
                status_history: [],
                entry_at: entryDate.toISOString(),
                estimated_delivery: estimated.toISOString(),
                total_value: Math.random() * 5000,
                tasks: Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map((_, j) => ({
                    id: `t_${i}_${j}`,
                    service_id: `s_${i}`,
                    title: `Tarefa ${j}`,
                    status: Math.random() > 0.5 ? 'done' : 'todo',
                    charge_type: 'Fixo',
                    rate_per_hour: 100,
                    fixed_value: 200,
                    manual_override_value: null,
                    from_template_id: null,
                    order: j
                })),
                reminders: [],
                priority: i % 10 === 0 ? 'alta' : 'media'
            } as ServiceJob;
        });

        return {
            clients,
            vehicles,
            services,
            products: [],
            suppliers: [],
            invoices: [],
            stock_movements: [],
            stock_allocations: [],
            workshopSettings: { name: 'GARAGEM 40 (LOAD TEST)', address: 'Stress Test Environment', phone: '0000', cnpj: '00' },
            delayCriteria: { active: true, thresholdDays: 0, thresholdHours: 2, considerWorkdays: true, considerBusinessHours: true, businessStart: '08:00', businessEnd: '18:00', priorityOverrides: [], autoMarkDelayed: true, autoNotify: false },
            users: [{ id: 'u1', name: 'Tester', email: 'test@g40.com', phone: '', role: 'admin', active: true, permissions: { manage_team: true, manage_clients: true, manage_inventory: true, config_rates: true, config_vehicles: true, config_system: true, view_financials: true }, created_at: '', organization_id: 'org_1' }] as UserAccount[],
            statusConfigs: [],
            integrations: { googleCalendarConnected: false, n8nConnected: false, n8nEvents: {} },
            appointments: [],
            colors: [],
            catalog: [],
            templates: []
        };
    }

    // --- MÉTODOS DE LEITURA (IGUAIS AO ORIGINAL) ---
    getServices() { return this.data.services; }
    getServiceById(id: string) { return this.data.services.find(s => s.id === id); }
    getVehicles() { return this.data.vehicles; }
    getClients() { return this.data.clients; }
    getUsers() { return this.data.users; }
    getDelayCriteria() { return this.data.delayCriteria; }
    getTemplates() { return this.data.templates; }

    // (Outros métodos simplificados para leitura apenas, pois é stress test de UI)
    getProducts() { return []; }
    getSuppliers() { return []; }
    getInvoices() { return []; }
    getStockMovements() { return []; }
    getStockAllocations() { return []; }
    getWorkshopSettings() { return this.data.workshopSettings; }
    getStatusConfigs() { return []; }
    getIntegrations() { return this.data.integrations; }
    getAppointments() { return []; }
    getColors() { return []; }
    getCatalog() { return []; }

    // Métodos de escrita (dummies)
    addService(s: any) { alert('Modo Leitura (Heavy)'); return s; }
    updateService() { }
    addTask() { }
    updateTask() { }
    deliverService() { }
}

export const dbHeavy = new MockDBHeavy();
