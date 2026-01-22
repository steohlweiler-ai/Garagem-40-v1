
import { db as mockDB } from './mockDatabase';
import { supabaseDB } from './supabaseService';
import { ServiceJob, Client, Vehicle, ServiceTask, Reminder, Appointment, IntegrationState, CatalogItem, WorkshopSettings, DelayCriteria, VehicleColor, ServiceStatus, StatusConfig, UserAccount, Product, Invoice, StockMovement, Supplier, StockAllocation } from '../types';

type DataSource = 'mock' | 'supabase';

// Check for VITE_USE_MOCK explicit flag first, otherwise fallback to VITE_DATA_SOURCE or default to 'mock'
// @ts-ignore
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
// @ts-ignore
const DATA_SOURCE: DataSource = USE_MOCK ? 'mock' : ((import.meta.env.VITE_DATA_SOURCE as DataSource) || 'mock');

class DataProvider {
    private useSupabase = DATA_SOURCE === 'supabase';

    constructor() {
        console.log(`[DataProvider] Initialized with source: ${DATA_SOURCE} (useSupabase: ${this.useSupabase})`);
    }

    // ===================== LEITURA =====================

    async getClients(): Promise<Client[]> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getClients();
            } catch (e) {
                console.warn('Supabase fetch failed, falling back to mock.', e);
            }
        }
        return Promise.resolve(mockDB.getClients());
    }

    async getVehicles(): Promise<Vehicle[]> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getVehicles();
            } catch (e) {
                console.warn('Supabase vehicle fetch failed, fallback mock.', e);
            }
        }
        return Promise.resolve(mockDB.getVehicles());
    }

    async getServices(): Promise<ServiceJob[]> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getServices();
            } catch (e) {
                console.warn('Supabase service fetch failed, fallback mock.', e);
            }
        }
        return Promise.resolve(mockDB.getServices());
    }

    async getServiceById(id: string): Promise<ServiceJob | null> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getServiceById(id);
            } catch (e) {
                console.warn('Supabase getServiceById failed, fallback mock.', e);
            }
        }
        return Promise.resolve(mockDB.getServiceById(id) || null);
    }

    // ===================== LEITURA DE SUPORTE =====================

    async getProducts() {
        if (this.useSupabase) return await supabaseDB.getProducts();
        return mockDB.getProducts();
    }

    async updateProduct(id: string, u: Partial<Product>) {
        if (this.useSupabase) return await supabaseDB.updateProduct(id, u);
        mockDB.updateProduct(id, u);
        return true;
    }

    async addInvoice(i: Partial<Invoice>) {
        if (this.useSupabase) return await supabaseDB.addInvoice(i);
        return mockDB.addInvoice(i);
    }

    async addStockMovement(m: Partial<StockMovement>) {
        if (this.useSupabase) return await supabaseDB.addStockMovement(m);
        return (mockDB as any).addStockMovement(m);
    }

    async getInvoices() {
        if (this.useSupabase) return await supabaseDB.getInvoices();
        return mockDB.getInvoices();
    }

    async getSuppliers() {
        if (this.useSupabase) return await supabaseDB.getSuppliers();
        return mockDB.getSuppliers();
    }

    async getStockMovements() {
        if (this.useSupabase) return await supabaseDB.getStockMovements();
        return mockDB.getStockMovements();
    }

    async allocateProduct(p: { product_id: string, vehicle_id: string, qty: number }) {
        if (this.useSupabase) return await supabaseDB.allocateProduct(p);
        return mockDB.allocateProduct(p);
    }

    async consumeAllocation(allocId: string, userId: string) {
        if (this.useSupabase) return await supabaseDB.consumeAllocation(allocId, userId);
        return mockDB.consumeAllocation(allocId, userId);
    }

    async releaseAllocation(allocId: string) {
        if (this.useSupabase) return await supabaseDB.releaseAllocation(allocId);
        return mockDB.releaseAllocation(allocId);
    }

    async getStockAllocations() {
        if (this.useSupabase) return await supabaseDB.getStockAllocations();
        return mockDB.getStockAllocations();
    }

    async getAllocationsByVehicle(vehicleId: string) {
        if (this.useSupabase) {
            const all = await supabaseDB.getStockAllocations();
            return all.filter(a => a.vehicle_id === vehicleId);
        }
        return mockDB.getAllocationsByVehicle(vehicleId);
    }

    async getUsers() {
        if (this.useSupabase) {
            const data = await supabaseDB.getUsers();
            if (data && data.length > 0) return data;
        }
        return mockDB.getUsers();
    }

    async createUser(u: Partial<UserAccount>) {
        if (this.useSupabase) return await supabaseDB.createUser(u);
        return mockDB.createUser(u);
    }

    async updateUser(id: string, u: Partial<UserAccount>) {
        if (this.useSupabase) return await supabaseDB.updateUser(id, u);
        mockDB.updateUser(id, u);
        return true;
    }

    async getDelayCriteria() {
        if (this.useSupabase) {
            const data = await supabaseDB.getDelayCriteria();
            if (data) return data;
        }
        return mockDB.getDelayCriteria();
    }

    async getWorkshopSettings() {
        if (this.useSupabase) {
            const data = await supabaseDB.getWorkshopSettings();
            if (data) return data;
        }
        return mockDB.getWorkshopSettings();
    }

    async updateWorkshopSettings(settings: Partial<WorkshopSettings>) {
        if (this.useSupabase) return await supabaseDB.updateWorkshopSettings(settings);
        mockDB.updateWorkshopSettings(settings);
        return true;
    }

    async updateDelayCriteria(criteria: any) {
        if (this.useSupabase) return await supabaseDB.updateDelayCriteria(criteria);
        mockDB.updateDelayCriteria(criteria, 'system', 'Admin');
        return true;
    }

    async getStatusConfigs() {
        if (this.useSupabase) {
            const data = await supabaseDB.getStatusConfigs();
            if (data && data.length > 0) return data;
        }
        return mockDB.getStatusConfigs();
    }

    async updateStatusConfig(key: ServiceStatus, u: Partial<StatusConfig>) {
        if (this.useSupabase) return await supabaseDB.updateStatusConfig(key, u);
        mockDB.updateStatusConfig(key, u);
        return true;
    }

    async getTemplates() {
        if (this.useSupabase) {
            const data = await supabaseDB.getTemplates();
            if (data && data.length > 0) return data;
        }
        return mockDB.getTemplates();
    }

    async getAppointments(): Promise<Appointment[]> {
        if (this.useSupabase) return await supabaseDB.getAppointments();
        return mockDB.getAppointments();
    }

    async addAppointment(a: Partial<Appointment>): Promise<Appointment | null> {
        if (this.useSupabase) return await supabaseDB.addAppointment(a);
        return mockDB.addAppointment(a);
    }

    async deleteAppointment(id: string): Promise<boolean> {
        if (this.useSupabase) return await supabaseDB.deleteAppointment(id);
        mockDB.deleteAppointment(id);
        return true;
    }

    async getIntegrations(): Promise<IntegrationState> {
        if (this.useSupabase) return await supabaseDB.getIntegrations();
        return mockDB.getIntegrations();
    }

    async updateIntegrations(updates: Partial<IntegrationState>): Promise<boolean> {
        if (this.useSupabase) return await supabaseDB.updateIntegrations(updates);
        mockDB.updateIntegrations(updates);
        return true;
    }

    async updateN8nEvent(key: string, value: boolean): Promise<boolean> {
        if (this.useSupabase) {
            const current = await supabaseDB.getIntegrations();
            const newEvents = { ...current.n8nEvents, [key]: value };
            return await supabaseDB.updateIntegrations({ ...current, n8nEvents: newEvents });
        }
        mockDB.updateN8nEvent(key, value);
        return true;
    }

    async getCatalog() {
        if (this.useSupabase) {
            const data = await supabaseDB.getCatalog();
            if (data && data.length > 0) return data;
        }
        return mockDB.getCatalog();
    }

    async updateCatalogItem(id: string, updates: Partial<CatalogItem>) {
        if (this.useSupabase) return await supabaseDB.updateCatalogItem(id, updates);
        mockDB.updateCatalogItem(id, updates);
        return true;
    }

    async addToCatalog(brand: string, model: string) {
        if (this.useSupabase) return await supabaseDB.addToCatalog(brand, model);
        return mockDB.addToCatalog(brand, model);
    }

    async deleteCatalogItem(id: string) {
        if (this.useSupabase) return await supabaseDB.deleteCatalogItem(id);
        mockDB.deleteCatalogItem(id);
        return true;
    }

    async getColors() {
        if (this.useSupabase) {
            const data = await supabaseDB.getColors();
            if (data && data.length > 0) return data;
        }
        return mockDB.getColors();
    }

    async addColor(c: Partial<VehicleColor>) {
        if (this.useSupabase) return await supabaseDB.addColor(c);
        return mockDB.addColor(c);
    }

    async updateColor(id: string, u: Partial<VehicleColor>) {
        if (this.useSupabase) return await supabaseDB.updateColor(id, u);
        mockDB.updateColor(id, u);
        return true;
    }

    async deleteColor(id: string) {
        if (this.useSupabase) return await supabaseDB.deleteColor(id);
        mockDB.deleteColor(id);
        return true;
    }

    // ===================== ESCRITA - CLIENTES =====================

    async addClient(c: Omit<Client, 'id'>): Promise<Client | null> {
        if (this.useSupabase) {
            try {
                const result = await supabaseDB.addClient(c);
                if (result) {
                    console.log('[DataProvider] Client added to Supabase:', result.id);
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addClient failed, falling back to mock.', e);
            }
        }
        return mockDB.addClient(c);
    }

    async updateClient(id: string, c: Partial<Client>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.updateClient(id, c);
            } catch (e) {
                console.warn('Supabase updateClient failed, falling back to mock.', e);
            }
        }
        mockDB.updateClient(id, c);
        return true;
    }

    // ===================== ESCRITA - VEÍCULOS =====================

    async addVehicle(v: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
        if (this.useSupabase) {
            try {
                const result = await supabaseDB.addVehicle(v);
                if (result) {
                    console.log('[DataProvider] Vehicle added to Supabase:', result.id);
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addVehicle failed, falling back to mock.', e);
            }
        }
        return mockDB.addVehicle(v);
    }

    async updateVehicle(id: string, v: Partial<Vehicle>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.updateVehicle(id, v);
            } catch (e) {
                console.warn('Supabase updateVehicle failed, falling back to mock.', e);
            }
        }
        mockDB.updateVehicle(id, v);
        return true;
    }

    // ===================== ESCRITA - SERVIÇOS =====================

    async addService(s: Partial<ServiceJob>): Promise<ServiceJob | null> {
        if (this.useSupabase) {
            try {
                const result = await supabaseDB.addService(s);
                if (result) {
                    console.log('[DataProvider] Service added to Supabase:', result.id);
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addService failed, falling back to mock.', e);
            }
        }
        return mockDB.addService(s);
    }

    async updateService(id: string, u: Partial<ServiceJob>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                const success = await supabaseDB.updateService(id, u);
                if (success) {
                    console.log('[DataProvider] Service updated in Supabase:', id);
                    return true;
                }
            } catch (e) {
                console.warn('Supabase updateService failed, falling back to mock.', e);
            }
        }
        mockDB.updateService(id, u);
        return true;
    }

    // ===================== ESCRITA - TASKS =====================

    async addTask(serviceId: string, title: string, extras?: Partial<ServiceTask>): Promise<ServiceTask | null> {
        if (this.useSupabase) {
            try {
                const result = await supabaseDB.addTask(serviceId, { title, ...extras });
                if (result) {
                    console.log('[DataProvider] Task added to Supabase:', result.id);
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addTask failed, falling back to mock.', e);
            }
        }
        return mockDB.addTask(serviceId, title, extras);
    }

    async updateTask(serviceId: string, taskId: string, u: Partial<ServiceTask>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                const success = await supabaseDB.updateTask(taskId, u);
                if (success) {
                    console.log('[DataProvider] Task updated in Supabase:', taskId);
                    return true;
                }
            } catch (e) {
                console.warn('Supabase updateTask failed, falling back to mock.', e);
            }
        }
        mockDB.updateTask(serviceId, taskId, u);
        return true;
    }

    // ===================== ESCRITA - REMINDERS =====================

    async addReminder(serviceId: string, reminder: Partial<Reminder>): Promise<Reminder | null> {
        if (this.useSupabase) {
            try {
                const result = await supabaseDB.addReminder(serviceId, reminder);
                if (result) {
                    console.log('[DataProvider] Reminder added to Supabase:', result.id);
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addReminder failed, falling back to mock.', e);
            }
        }
        // Mock doesn't have addReminder, so we handle it differently
        return null;
    }

    // ===================== HELPERS (Relacionais) =====================

    async getClientById(id: string) {
        if (this.useSupabase) return await supabaseDB.getClientById(id);
        return mockDB.getClientById(id);
    }

    async getVehicleById(id: string) {
        if (this.useSupabase) return await supabaseDB.getVehicleById(id);
        return mockDB.getVehicleById(id);
    }

    async getVehiclesByClient(clientId: string) {
        if (this.useSupabase) return await supabaseDB.getVehiclesByClient(clientId);
        return mockDB.getVehiclesByClient(clientId);
    }

    async getServicesByVehicle(vehicleId: string) {
        if (this.useSupabase) return await supabaseDB.getServicesByVehicle(vehicleId);
        return mockDB.getServicesByVehicle(vehicleId);
    }

    getDebugInfo() {
        return {
            source: DATA_SOURCE,
            usingSupabase: this.useSupabase,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Defined' : 'Missing',
            supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Defined' : 'Missing',
        };
    }
}

export const dataProvider = new DataProvider();

