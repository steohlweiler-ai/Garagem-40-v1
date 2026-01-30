
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

    // ===================== STORAGE =====================

    async uploadFile(file: File, bucket: string = 'evidencias'): Promise<string | null> {
        if (this.useSupabase) {
            return await supabaseDB.uploadFile(file, bucket);
        }
        // Mock fallback
        console.warn('[DataProvider] Upload is not persistent in mock mode.');
        return URL.createObjectURL(file);
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

    // ===================== PERFORMANCE OPTIMIZED QUERIES =====================

    async getServiceCounts(): Promise<Record<string, number>> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getServiceCounts();
            } catch (e) {
                console.warn('Supabase getServiceCounts failed, using fallback.', e);
            }
        }
        // Mock fallback - count from in-memory services
        const services = mockDB.getServices();
        const counts: Record<string, number> = {};
        services.forEach(s => {
            counts[s.status] = (counts[s.status] || 0) + 1;
        });
        counts['total'] = services.filter(s => s.status !== 'Entregue').length;
        return counts;
    }

    async getServicesFiltered(options: {
        excludeStatuses?: string[];
        statuses?: string[];
        limit?: number;
        offset?: number;
        sortBy?: 'priority' | 'entry_recent' | 'entry_oldest' | 'delivery';
    }): Promise<{
        data: ServiceJob[];
        total: number;
        hasMore: boolean;
    }> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.getServicesFiltered(options);
            } catch (e) {
                console.warn('Supabase getServicesFiltered failed, using fallback.', e);
            }
        }

        // Mock fallback - filter and paginate in memory
        const { excludeStatuses = [], statuses = [], limit = 20, offset = 0 } = options;
        let services = mockDB.getServices();

        if (statuses.length > 0) {
            services = services.filter(s => statuses.includes(s.status));
        } else if (excludeStatuses.length > 0) {
            services = services.filter(s => !excludeStatuses.includes(s.status));
        }

        // Sort: Lembrete first, then by entry_at ascending
        services.sort((a, b) => {
            const aIsLembrete = a.status === 'Lembrete' ? 0 : 1;
            const bIsLembrete = b.status === 'Lembrete' ? 0 : 1;
            if (aIsLembrete !== bIsLembrete) return aIsLembrete - bIsLembrete;
            return new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime();
        });

        const total = services.length;
        const data = services.slice(offset, offset + limit);
        const hasMore = offset + data.length < total;

        return { data, total, hasMore };
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

    async analyzeOldMedia(): Promise<number> {
        if (this.useSupabase) return await supabaseDB.analyzeOldMedia();
        return 0; // Mock support pending
    }

    async cleanupOldMedia(): Promise<{ success: boolean; count: number }> {
        if (this.useSupabase) return await supabaseDB.cleanupOldMedia();
        return { success: true, count: 0 };
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

    async getTemplates(activeOnly: boolean = true) {
        if (this.useSupabase) {
            const data = await supabaseDB.getTemplates(activeOnly);
            if (data) return data;
        }
        return mockDB.getTemplates();
    }

    async addTemplate(name: string, active: boolean) {
        if (this.useSupabase) return await supabaseDB.addTemplate(name, active);
        console.warn('Mock addTemplate not implemented');
        return null;
    }

    async updateTemplate(id: string, updates: { name?: string, active?: boolean }) {
        if (this.useSupabase) return await supabaseDB.updateTemplate(id, updates);
        console.warn('Mock updateTemplate not implemented');
        return true;
    }

    async deleteTemplate(id: string) {
        if (this.useSupabase) return await supabaseDB.deleteTemplate(id);
        console.warn('Mock deleteTemplate not implemented');
        return true;
    }

    async addTemplateItem(templateId: string, item: Partial<import('../types').InspectionTemplateItem>) {
        if (this.useSupabase) return await supabaseDB.addTemplateItem(templateId, item);
        console.warn('Mock addTemplateItem not implemented');
        return true;
    }

    async updateTemplateItem(id: string, updates: Partial<import('../types').InspectionTemplateItem>) {
        if (this.useSupabase) return await supabaseDB.updateTemplateItem(id, updates);
        console.warn('Mock updateTemplateItem not implemented');
        return true;
    }

    async deleteTemplateItem(id: string) {
        if (this.useSupabase) return await supabaseDB.deleteTemplateItem(id);
        console.warn('Mock deleteTemplateItem not implemented');
        return true;
    }

    async getAppointments(): Promise<Appointment[]> {
        if (this.useSupabase) return await supabaseDB.getAppointments();
        return mockDB.getAppointments();
    }

    async getAllReminders(includeCompleted = false): Promise<import('../types').ReminderWithService[]> {
        if (this.useSupabase) return await supabaseDB.getAllReminders(includeCompleted);
        console.warn('[DataProvider] getAllReminders mock not implemented');
        return [];
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

    async updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
        if (this.useSupabase) return await supabaseDB.updateAppointment(id, updates);
        // Fallback mock não implementado
        console.warn('[DataProvider] updateAppointment mock not implemented');
        return false;
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

    async getColors(includeInactive: boolean = false) {
        if (this.useSupabase) {
            const data = await supabaseDB.getColors(includeInactive);
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
                    if (s.estimated_delivery) {
                        await this.syncDeliveryAppointment(result);
                    }
                    return result;
                }
            } catch (e) {
                console.warn('Supabase addService failed, falling back to mock.', e);
            }
        }
        const result = mockDB.addService(s);
        if (result && s.estimated_delivery) {
            this.syncDeliveryAppointment(result);
        }
        return result;
    }

    async updateService(id: string, u: Partial<ServiceJob>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                const success = await supabaseDB.updateService(id, u);
                if (success) {
                    console.log('[DataProvider] Service updated in Supabase:', id);
                    if (u.estimated_delivery !== undefined || u.vehicle_id) {
                        // Fetch full service if needed to get plate? For now, assuming optimistic update or let the specific handler fetch
                        // We need the service to know the plate if vehicle_id is not passed.
                        // But 'syncDeliveryAppointment' will handle checking if appointment exists.
                        const fullService = await this.getServiceById(id);
                        if (fullService) await this.syncDeliveryAppointment(fullService);
                    }
                    return true;
                }
            } catch (e) {
                console.warn('Supabase updateService failed, falling back to mock.', e);
            }
        }
        mockDB.updateService(id, u);
        // Mock sync
        if (u.estimated_delivery !== undefined) {
            const s = mockDB.getServiceById(id);
            if (s) this.syncDeliveryAppointment(s);
        }
        return true;
    }

    // ===================== SYNC HELPERS =====================

    private async syncDeliveryAppointment(service: ServiceJob) {
        console.log('[DataProvider] syncDeliveryAppointment called for service:', service.id, 'estimated_delivery:', service.estimated_delivery);

        // 1. Check if appointment already exists by service_id
        const allApps = await this.getAppointments();
        const existingApp = allApps.find(a => a.service_id === service.id);

        // 2. If Service has no delivery date (cleared), remove appointment
        if (!service.estimated_delivery) {
            if (existingApp) {
                await this.deleteAppointment(existingApp.id);
            }
            return;
        }

        // 3. Prepare data
        const dateObj = new Date(service.estimated_delivery);
        const dateStr = dateObj.toISOString().split('T')[0];
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // 4. Get vehicle and client data
        let plate = '???';
        let vehicleBrand = '';
        let vehicleModel = '';
        let clientName = '';
        let clientPhone = '';

        if (service.vehicle_id) {
            const v = await this.getVehicleById(service.vehicle_id);
            if (v) {
                plate = v.plate;
                vehicleBrand = v.brand || '';
                vehicleModel = v.model || '';
            }
        }

        if (service.client_id) {
            const c = await this.getClientById(service.client_id);
            if (c) {
                clientName = c.name || '';
                clientPhone = c.phone || '';
            }
        }

        const appData: Partial<Appointment> = {
            service_id: service.id,
            title: `Entrega: ${plate}`,
            description: `Entrega prevista da OS`,
            date: dateStr,
            time: timeStr,
            vehicle_plate: plate,
            vehicle_brand: vehicleBrand,
            vehicle_model: vehicleModel,
            client_name: clientName,
            client_phone: clientPhone,
            type: 'service_delivery',
            notify_enabled: true,
            notify_before_minutes: 15
        };

        // 5. Use addAppointment which handles upsert for service_delivery type
        await this.addAppointment(appData);
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
        // Mock fallback (simulate persistence by returning object with ID)
        return {
            id: reminder.id || crypto.randomUUID(),
            title: reminder.title || 'Novo Lembrete',
            date: reminder.date || new Date().toISOString(),
            time: reminder.time || '12:00',
            status: 'active',
            ...reminder
        } as Reminder;
    }

    async updateReminder(id: string, updates: Partial<Reminder>): Promise<boolean> {
        if (this.useSupabase) {
            try {
                return await supabaseDB.updateReminder(id, updates);
            } catch (e) {
                console.warn('Supabase updateReminder failed.', e);
                return false;
            }
        }
        return true;
    }

    async deleteReminder(id: string): Promise<boolean> {
        if (this.useSupabase) {
            try {
                // @ts-ignore
                return await supabaseDB.deleteReminder(id);
            } catch (e) {
                console.warn('Supabase deleteReminder failed.', e);
                return false;
            }
        }
        return true;
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

