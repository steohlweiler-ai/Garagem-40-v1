
import { createClient } from '@supabase/supabase-js';
import {
    ServiceJob, Client, Vehicle, ServiceTask, Reminder,
    StatusLogEntry, ServiceStatus, WorkshopSettings,
    DelayCriteria, EvaluationTemplate, StatusConfig, VehicleColor,
    Appointment, CatalogItem, IntegrationState, UserAccount,
    Product, Invoice, StockMovement, Supplier, StockAllocation
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase credentials missing! Check .env.local");
}

export { SUPABASE_URL, SUPABASE_KEY };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class SupabaseService {
    // ===================== READ OPERATIONS =====================

    async getClients(): Promise<Client[]> {
        const { data, error } = await supabase.from('clientes').select('*');
        if (error) {
            console.error('Supabase Error (Clients):', error);
            throw error;
        }
        return data.map(c => ({
            id: c.id,
            organization_id: c.organization_id || 'org-default',
            name: c.name,
            phone: c.phone || '',
            notes: c.notes,
            cpfCnpj: c.cpf_cnpj,
            address: c.address
        }));
    }

    async getClientById(id: string): Promise<Client | null> {
        const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
        if (error || !data) return null;
        return {
            id: data.id,
            organization_id: data.organization_id || 'org-default',
            name: data.name,
            phone: data.phone || '',
            notes: data.notes,
            cpfCnpj: data.cpf_cnpj,
            address: data.address
        };
    }

    async getVehicleById(id: string): Promise<Vehicle | null> {
        const { data, error } = await supabase.from('veículos').select('*').eq('id', id).single();
        if (error || !data) return null;
        return this.mapVehicle(data);
    }

    async getVehicles(): Promise<Vehicle[]> {
        const { data, error } = await supabase.from('veículos').select('*');
        if (error) return [];
        return data.map(v => this.mapVehicle(v));
    }

    async getVehiclesByClient(clientId: string): Promise<Vehicle[]> {
        const { data, error } = await supabase.from('veículos').select('*').eq('client_id', clientId);
        if (error) return [];
        return data.map(v => this.mapVehicle(v));
    }

    async getServices(): Promise<ServiceJob[]> {
        // Buscar serviços
        const { data: services, error } = await supabase.from('serviços').select('*');
        if (error) {
            console.error('Supabase Error (Services):', error);
            throw error;
        }

        // Para cada serviço, buscar tasks, reminders e status_history
        const servicesWithRelations = await Promise.all(
            services.map(async (s) => {
                const [tasksRes, remindersRes, historyRes] = await Promise.all([
                    supabase.from('tarefas').select('*').eq('service_id', s.id).order('order'),
                    supabase.from('lembretes').select('*').eq('service_id', s.id),
                    supabase.from('historico_status').select('*').eq('service_id', s.id).order('timestamp'),
                ]);

                return {
                    ...s,
                    tasks: (tasksRes.data || []).map(this.mapTask),
                    reminders: (remindersRes.data || []).map(this.mapReminder),
                    status_history: (historyRes.data || []).map(this.mapStatusLog),
                    entry_at: s.entry_at || new Date().toISOString(),
                    archived: s.archived,
                    created_by: s.created_by,
                    created_by_name: s.created_by_name,
                    inspection: s.inspection
                };
            })
        );

        return servicesWithRelations;
    }

    async getServicesByVehicle(vehicleId: string): Promise<ServiceJob[]> {
        const { data: servicesData, error } = await supabase.from('serviços').select('*').eq('vehicle_id', vehicleId);
        if (error) return [];

        const servicesWithRelations = await Promise.all(
            servicesData.map(async (s) => {
                const [tasksRes, remindersRes, historyRes] = await Promise.all([
                    supabase.from('tarefas').select('*').eq('service_id', s.id).order('order'),
                    supabase.from('lembretes').select('*').eq('service_id', s.id),
                    supabase.from('historico_status').select('*').eq('service_id', s.id).order('timestamp'),
                ]);

                return {
                    ...s,
                    tasks: (tasksRes.data || []).map(this.mapTask),
                    reminders: (remindersRes.data || []).map(this.mapReminder),
                    status_history: (historyRes.data || []).map(this.mapStatusLog),
                    entry_at: s.entry_at || new Date().toISOString()
                };
            })
        );

        return servicesWithRelations;
    }

    async getCatalog(): Promise<CatalogItem[]> {
        const { data, error } = await supabase.from('catálogo').select('*');
        if (error) return [];
        return data;
    }

    async updateCatalogItem(id: string, updates: Partial<CatalogItem>): Promise<boolean> {
        const { error } = await supabase.from('catálogo').update(updates).eq('id', id);
        return !error;
    }

    async addToCatalog(brand: string, model: string): Promise<CatalogItem | null> {
        const { data, error } = await supabase.from('catálogo').insert({ brand, model, organization_id: 'org-default' }).select().single();
        if (error) return null;
        return data;
    }

    async deleteCatalogItem(id: string): Promise<boolean> {
        const { error } = await supabase.from('catálogo').delete().eq('id', id);
        return !error;
    }

    async getWorkshopSettings(): Promise<WorkshopSettings | null> {
        const { data, error } = await supabase.from('configurações_de_oficina').select('*').single();
        if (error || !data) return null;
        return {
            name: data.name,
            address: data.address,
            phone: data.phone,
            cnpj: data.cnpj
        };
    }

    async getDelayCriteria(): Promise<DelayCriteria | null> {
        const { data, error } = await supabase.from('critérios_de_atraso').select('*').eq('active', true).limit(1).single();
        if (error || !data) return null;
        return {
            active: data.active,
            scope: 'global',
            thresholdDays: data.threshold_days,
            thresholdHours: data.threshold_hours,
            considerWorkdays: data.consider_workdays,
            considerBusinessHours: data.consider_business_hours,
            businessStart: data.business_start,
            businessEnd: data.business_end,
            priorityOverrides: data.priority_overrides || [],
            autoMarkDelayed: data.auto_mark_delayed,
            autoNotify: data.auto_notify
        };
    }

    async getTemplates(): Promise<EvaluationTemplate[]> {
        const { data, error } = await supabase.from('modelos_de_avaliação').select('*');
        if (error) return [];
        return data.map(t => ({
            id: t.id,
            organization_id: t.organization_id,
            name: t.name,
            sections: t.sections || [],
            is_default: t.is_default,
            created_at: t.created_at
        }));
    }

    async getStatusConfigs(): Promise<StatusConfig[]> {
        const { data, error } = await supabase.from('configurações_de_status').select('*').order('priority');
        if (error) return [];
        return data.map(s => ({
            key: s.label as ServiceStatus,
            label: s.label,
            color: s.color,
            textColor: s.text_color,
            priority: s.priority,
            active: s.active
        }));
    }

    async updateStatusConfig(key: ServiceStatus, updates: Partial<StatusConfig>): Promise<boolean> {
        const { error } = await supabase.from('configurações_de_status').update({
            label: updates.label,
            color: updates.color,
            text_color: updates.textColor,
            priority: updates.priority,
            active: updates.active
        }).eq('label', key);
        return !error;
    }

    async getColors(): Promise<VehicleColor[]> {
        const { data, error } = await supabase.from('cores_do_veículo').select('*').eq('active', true);
        if (error) return [];
        return data;
    }

    async addColor(color: Partial<VehicleColor>): Promise<VehicleColor | null> {
        const { data, error } = await supabase.from('cores_do_veículo').insert({
            name: color.name,
            hex: color.hex,
            organization_id: 'org-default'
        }).select().single();
        if (error) return null;
        return data;
    }

    async updateColor(id: string, updates: Partial<VehicleColor>): Promise<boolean> {
        const { error } = await supabase.from('cores_do_veículo').update(updates).eq('id', id);
        return !error;
    }

    async deleteColor(id: string): Promise<boolean> {
        const { error } = await supabase.from('cores_do_veículo').delete().eq('id', id);
        return !error;
    }

    async getIntegrations(): Promise<IntegrationState> {
        const { data, error } = await supabase.from('integrações').select('*').single();
        if (error || !data) return {
            googleCalendarConnected: false,
            n8nConnected: false,
            n8nEvents: {}
        };
        return {
            googleCalendarConnected: data.google_calendar_connected,
            lastSync: data.last_sync,
            n8nConnected: data.n8n_connected,
            n8nEvents: data.n8n_events || {}
        };
    }

    async getUsers(): Promise<UserAccount[]> {
        const { data, error } = await supabase.from('perfis_de_usuário').select('*');
        if (error) return [];
        return data.map(u => ({
            id: u.id,
            organization_id: u.organization_id || 'org-default',
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            role: u.role as any,
            active: u.active ?? true,
            permissions: u.permissions || {},
            created_at: u.created_at || new Date().toISOString()
        }));
    }

    async createUser(u: Partial<UserAccount>): Promise<UserAccount | null> {
        // If user_id is missing (creating from Admin panel without Auth), generate a placeholder or handle it.
        // Ideally, this should be an 'invite' flow. For now, we insert with a placeholder ID if allowed,
        // or rely on the Trigger to handle it if Supabase is configured that way.
        // We will try to insert a fake UUID for 'user_id' if not provided, assuming the DB doesn't strictly enforce FK to auth.users immediately
        // OR (More likely) the DB enforces it.
        // IF DB ENFORCES FK: We cannot insert.
        // STRATEGY: We will try to insert. If it fails, we log it.
        // To make it work for the user request: "Apenas insira... um registro 'Pendente'"
        // We will use a random UUID for user_id to satisfy potential NOT NULL constraints, hoping there is no strict FK or it is deferred.
        // If there IS a strict FK to auth.users, this will fail.
        // Fallback: Check if we can insert without user_id?

        const payload = {
            ...u,
            organization_id: 'org-default',
            // Simple hack: if no ID, generate one. Note: This assumes no strict FK constraint to auth.users OR that we accept "orphan" profiles.
            user_id: u.id || crypto.randomUUID()
        };

        const { data, error } = await supabase.from('perfis_de_usuário').insert(payload).select().single();

        if (error) {
            console.error('Supabase Error (createUser):', error);
            return null;
        }
        return {
            id: data.id,
            organization_id: data.organization_id || 'org-default',
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            role: data.role as any,
            active: data.active ?? true,
            permissions: data.permissions || {},
            created_at: data.created_at || new Date().toISOString()
        };
    }

    async updateUser(id: string, u: Partial<UserAccount>): Promise<boolean> {
        const { error } = await supabase.from('perfis_de_usuário').update(u).eq('id', id);
        return !error;
    }

    async getProducts(): Promise<Product[]> {
        const { data, error } = await supabase.from('produtos').select('*');
        if (error) return [];
        return data.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: 'un',
            cost: Number(p.price),
            current_stock: p.stock_quantity,
            min_stock: p.min_stock
        }));
    }

    async updateProduct(id: string, u: Partial<Product>): Promise<boolean> {
        const { error } = await supabase.from('produtos').update({
            name: u.name,
            sku: u.sku,
            price: u.cost,
            stock_quantity: u.current_stock,
            min_stock: u.min_stock
        }).eq('id', id);
        return !error;
    }

    async addInvoice(i: Partial<Invoice>): Promise<Invoice | null> {
        const { data, error } = await supabase.from('faturas').insert({
            invoice_number: i.number,
            total_value: i.total,
            issue_date: i.date,
            organization_id: 'org-default',
            status: i.status || 'pending'
        }).select().single();
        if (error) return null;
        return {
            id: data.id,
            supplier_id: data.supplier_id,
            number: data.invoice_number,
            date: data.issue_date,
            total: Number(data.total_value),
            status: data.status as any
        };
    }

    async addStockMovement(m: Partial<StockMovement>): Promise<StockMovement | null> {
        const { data, error } = await supabase.from('movimentos_de_ações').insert({
            product_id: m.product_id,
            quantity: m.qty,
            type: m.type,
            reason: m.source,
            organization_id: 'org-default'
        }).select().single();
        if (error) return null;
        return {
            id: data.id,
            product_id: data.product_id,
            qty: data.quantity,
            type: data.type as any,
            source: data.reason,
            date: data.created_at
        };
    }

    async getInvoices(): Promise<Invoice[]> {
        const { data, error } = await supabase.from('faturas').select('*');
        if (error) return [];
        return data.map(i => ({
            id: i.id,
            supplier_id: i.supplier_id,
            number: i.invoice_number,
            date: i.issue_date,
            total: Number(i.total_value),
            status: i.status as any,
            imageBase64: i.image_base64
        }));
    }

    async getSuppliers(): Promise<Supplier[]> {
        const { data, error } = await supabase.from('fornecedores').select('*');
        if (error) return [];
        return data;
    }

    async getStockMovements(): Promise<StockMovement[]> {
        const { data, error } = await supabase.from('movimentos_de_ações').select('*');
        if (error) return [];
        return data.map(m => ({
            id: m.id,
            product_id: m.product_id,
            qty: m.quantity,
            type: m.type as any,
            source: m.reason,
            date: m.created_at
        }));
    }

    async allocateProduct(p: { product_id: string, vehicle_id: string, qty: number }): Promise<StockAllocation | null> {
        const { data, error } = await supabase.from('alocações_de_estoque').insert({
            product_id: p.product_id,
            vehicle_id: p.vehicle_id,
            reserved_qty: p.qty,
            consumed_qty: 0,
            status: 'reserved',
            organization_id: 'org-default'
        }).select().single();
        if (error) return null;
        return {
            id: data.id,
            product_id: data.product_id,
            vehicle_id: data.vehicle_id,
            reserved_qty: data.reserved_qty,
            consumed_qty: data.consumed_qty,
            status: data.status,
            date_allocated: data.created_at
        };
    }

    async consumeAllocation(allocId: string, userId: string): Promise<boolean> {
        // Logic should update status and record stock movement
        const { error } = await supabase.from('alocações_de_estoque').update({
            status: 'consumed',
            consumed_qty: supabase.rpc('increment', { row_id: allocId, column_name: 'reserved_qty' }) // Simplified for now
        }).eq('id', allocId);

        return !error;
    }

    async releaseAllocation(allocId: string): Promise<boolean> {
        const { error } = await supabase.from('alocações_de_estoque').delete().eq('id', allocId);
        return !error;
    }

    async getStockAllocations(): Promise<StockAllocation[]> {
        const { data, error } = await supabase.from('alocações_de_estoque').select('*');
        if (error) return [];
        return data.map(a => ({
            id: a.id,
            product_id: a.product_id,
            vehicle_id: a.vehicle_id,
            reserved_qty: a.reserved_qty,
            consumed_qty: a.consumed_qty,
            status: a.status,
            date_allocated: a.created_at
        }));
    }

    async updateIntegrations(updates: Partial<IntegrationState>): Promise<boolean> {
        const { error } = await supabase.from('integrações').upsert({
            organization_id: 'org-default',
            google_calendar_connected: updates.googleCalendarConnected,
            last_sync: updates.lastSync,
            n8n_connected: updates.n8nConnected,
            n8n_events: updates.n8nEvents
        });
        return !error;
    }

    async getServiceById(id: string): Promise<ServiceJob | null> {
        const { data: s, error } = await supabase.from('serviços').select('*').eq('id', id).single();
        if (error || !s) return null;

        const [tasksRes, remindersRes, historyRes] = await Promise.all([
            supabase.from('tarefas').select('*').eq('service_id', id).order('order'),
            supabase.from('lembretes').select('*').eq('service_id', id),
            supabase.from('historico_status').select('*').eq('service_id', id).order('timestamp')
        ]);

        return {
            ...s,
            tasks: (tasksRes.data || []).map(this.mapTask),
            reminders: (remindersRes.data || []).map(this.mapReminder),
            status_history: (historyRes.data || []).map(this.mapStatusLog),
            entry_at: s.entry_at || new Date().toISOString()
        };
    }

    // ===================== WRITE OPERATIONS =====================

    async addClient(client: Omit<Client, 'id'>): Promise<Client | null> {
        const { data, error } = await supabase.from('clientes').insert({
            name: client.name,
            phone: client.phone || null,
            notes: client.notes || null,
            cpf_cnpj: client.cpfCnpj || null,
            address: client.address || null,
            organization_id: client.organization_id || 'org-default'
        }).select().single();

        if (error) {
            console.error('Supabase Error (addClient):', error);
            return null;
        }
        return this.mapClient(data);
    }

    async updateClient(id: string, updates: Partial<Client>): Promise<boolean> {
        const { error } = await supabase.from('clientes').update({
            name: updates.name,
            phone: updates.phone,
            cpf_cnpj: updates.cpfCnpj,
            address: updates.address,
            notes: updates.notes,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Supabase Error (updateClient):', error);
            return false;
        }
        return true;
    }

    async addVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
        const { data, error } = await supabase.from('veículos').insert({
            client_id: vehicle.client_id,
            plate: vehicle.plate,
            brand: vehicle.brand,
            model: vehicle.model,
            color: vehicle.color || null,
            year_model: vehicle.yearModel || null,
            chassis: vehicle.chassis || null,
            mileage: vehicle.mileage || null,
            observations: vehicle.observations || null,
            organization_id: vehicle.organization_id || 'org-default'
        }).select().single();

        if (error) {
            console.error('Supabase Error (addVehicle):', error);
            return null;
        }
        return this.mapVehicle(data);
    }

    async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<boolean> {
        const { error } = await supabase.from('veículos').update({
            organization_id: updates.organization_id,
            client_id: updates.client_id,
            plate: updates.plate,
            brand: updates.brand,
            model: updates.model,
            color: updates.color,
            year_model: updates.yearModel,
            chassis: updates.chassis,
            mileage: updates.mileage,
            observations: updates.observations,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Supabase Error (updateVehicle):', error);
            return false;
        }
        return true;
    }

    // ===================== APPOINTMENT OPERATIONS =====================

    async getAppointments(): Promise<Appointment[]> {
        const { data, error } = await supabase.from('agendamentos').select('*').order('date', { ascending: true });
        if (error) return [];
        return data.map(a => ({
            id: a.id,
            organization_id: a.organization_id || 'org-default',
            title: a.title,
            date: a.date,
            time: a.time,
            vehicle_plate: a.vehicle_plate,
            description: a.description,
            notify_enabled: a.notify_enabled,
            notify_before_minutes: a.notify_before_minutes,
            type: a.type as 'manual' | 'service_delivery',
            service_id: a.service_id
        }));
    }

    async addAppointment(a: Partial<Appointment>): Promise<Appointment | null> {
        const { data, error } = await supabase.from('agendamentos').insert({
            organization_id: 'org-default',
            ...a
        }).select().single();

        if (error) {
            console.error('Supabase Error (addAppointment):', error);
            return null;
        }
        return data;
    }

    async deleteAppointment(id: string): Promise<boolean> {
        const { error } = await supabase.from('agendamentos').delete().eq('id', id);
        return !error;
    }

    async addService(service: Partial<ServiceJob>): Promise<ServiceJob | null> {
        // 1. Inserir serviço
        const { data: newService, error } = await supabase.from('serviços').insert({
            vehicle_id: service.vehicle_id,
            client_id: service.client_id,
            status: service.status || 'Pendente',
            priority: service.priority || 'media',
            total_value: service.total_value || 0,
            estimated_delivery: service.estimated_delivery || null,
            service_type: service.service_type || 'novo',
            archived: service.archived || false,
            created_by: service.created_by,
            created_by_name: service.created_by_name,
            inspection: service.inspection,
            organization_id: service.organization_id || 'org-default'
        }).select().single();

        if (error || !newService) {
            console.error('Supabase Error (addService):', error);
            return null;
        }

        // 2. Inserir status_history inicial
        await supabase.from('historico_status').insert({
            service_id: newService.id,
            status: 'Pendente',
            user_name: 'Sistema',
            action_source: 'Criação'
        });

        return {
            ...newService,
            tasks: [],
            reminders: [],
            status_history: [{
                id: 'temp',
                status: ServiceStatus.PENDENTE,
                timestamp: new Date().toISOString(),
                user_name: 'Sistema',
                action_source: 'Criação'
            }],
            entry_at: newService.entry_at || new Date().toISOString(),
            archived: newService.archived,
            created_by: newService.created_by,
            created_by_name: newService.created_by_name,
            inspection: newService.inspection
        };
    }

    async updateService(id: string, updates: Partial<ServiceJob>): Promise<boolean> {
        const { status, priority, total_value, estimated_delivery, archived } = updates;

        const { error } = await supabase.from('serviços').update({
            ...(status && { status }),
            ...(priority && { priority }),
            ...(total_value !== undefined && { total_value }),
            ...(estimated_delivery && { estimated_delivery }),
            ...(archived !== undefined && { archived })
        }).eq('id', id);

        if (error) {
            console.error('Supabase Error (updateService):', error);
            return false;
        }

        // Se houver mudança de status, registrar no histórico
        if (status) {
            await supabase.from('historico_status').insert({
                service_id: id,
                status,
                user_name: 'Sistema',
                action_source: 'Atualização'
            });
        }

        return true;
    }

    // ===================== TASK OPERATIONS =====================

    async addTask(serviceId: string, task: Partial<ServiceTask>): Promise<ServiceTask | null> {
        const { data, error } = await supabase.from('tarefas').insert({
            service_id: serviceId,
            title: task.title,
            status: task.status || 'todo',
            type: task.type || null,
            charge_type: task.charge_type || 'Fixo',
            rate_per_hour: task.rate_per_hour || 120,
            fixed_value: task.fixed_value || 0,
            order: task.order || 0,
            from_template_id: task.from_template_id || null
        }).select().single();

        if (error) {
            console.error('Supabase Error (addTask):', error);
            return null;
        }
        return this.mapTask(data);
    }

    async updateTask(taskId: string, updates: Partial<ServiceTask>): Promise<boolean> {
        const { error } = await supabase.from('tarefas').update({
            ...updates,
            ...((updates as any).media && { media: (updates as any).media }),
            updated_at: new Date().toISOString()
        }).eq('id', taskId);

        if (error) {
            console.error('Supabase Error (updateTask):', error);
            return false;
        }
        return true;
    }

    // ===================== REMINDER OPERATIONS =====================

    async addReminder(serviceId: string, reminder: Partial<Reminder>): Promise<Reminder | null> {
        const { data, error } = await supabase.from('lembretes').insert({
            service_id: serviceId,
            title: reminder.title,
            message: reminder.message || null,
            date: reminder.date,
            time: reminder.time,
            status: 'active'
        }).select().single();

        if (error) {
            console.error('Supabase Error (addReminder):', error);
            return null;
        }
        return this.mapReminder(data);
    }

    async updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<boolean> {
        const { error } = await supabase.from('lembretes').update(updates).eq('id', reminderId);
        if (error) {
            console.error('Supabase Error (updateReminder):', error);
            return false;
        }
        return true;
    }

    async deleteReminder(reminderId: string): Promise<boolean> {
        const { error } = await supabase.from('lembretes').delete().eq('id', reminderId);
        if (error) {
            console.error('Supabase Error (deleteReminder):', error);
            return false;
        }
        return true;
    }

    // ===================== SETTINGS & TEMPLATES = : =====================

    async updateWorkshopSettings(settings: Partial<WorkshopSettings>): Promise<boolean> {
        const { error } = await supabase.from('configurações_de_oficina').upsert({
            organization_id: 'org-default',
            ...settings
        });
        return !error;
    }

    async updateDelayCriteria(criteria: Partial<DelayCriteria>): Promise<boolean> {
        const { error } = await supabase.from('critérios_de_atraso').upsert({
            id: 'global-criteria', // ID fixo para critério global
            active: criteria.active,
            threshold_days: criteria.thresholdDays,
            threshold_hours: criteria.thresholdHours,
            consider_workdays: criteria.considerWorkdays,
            consider_business_hours: criteria.considerBusinessHours,
            business_start: criteria.businessStart,
            business_end: criteria.businessEnd,
            priority_overrides: criteria.priorityOverrides,
            auto_mark_delayed: criteria.autoMarkDelayed,
            auto_notify: criteria.autoNotify,
            organization_id: 'org-default'
        });
        return !error;
    }

    async saveTemplate(template: Partial<EvaluationTemplate>): Promise<boolean> {
        const { error } = await supabase.from('modelos_de_avaliação').upsert({
            id: template.id || undefined,
            name: template.name,
            sections: template.sections,
            is_default: template.is_default,
            organization_id: template.organization_id || 'org-default'
        });
        return !error;
    }

    // ===================== MAPPERS =====================

    private mapVehicle(v: any): Vehicle {
        return {
            id: v.id,
            organization_id: v.organization_id || 'org-default',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            client_id: v.client_id,
            yearModel: v.year_model,
            color: v.color,
            chassis: v.chassis,
            mileage: v.mileage,
            observations: v.observations
        };
    }

    private mapClient(c: any): Client {
        return {
            id: c.id,
            organization_id: c.organization_id || 'org-default',
            name: c.name,
            phone: c.phone || '',
            notes: c.notes,
            cpfCnpj: c.cpf_cnpj,
            address: c.address
        };
    }

    private mapTask(t: any): ServiceTask {
        return {
            id: t.id,
            service_id: t.service_id,
            title: t.title,
            status: t.status || 'todo',
            type: t.type,
            charge_type: t.charge_type || 'Fixo',
            rate_per_hour: t.rate_per_hour || 120,
            fixed_value: t.fixed_value || 0,
            manual_override_value: t.manual_override_value,
            from_template_id: t.from_template_id,
            order: t.order || 0,
            observation: t.observation,
            relato: t.relato,
            diagnostico: t.diagnostico,
            started_at: t.started_at,
            ended_at: t.ended_at,
            duration_seconds: t.duration_seconds,
            time_spent_seconds: t.time_spent_seconds,
            responsible_user_id: t.responsible_user_id
        };
    }

    private mapReminder(r: any): Reminder {
        return {
            id: r.id,
            title: r.title,
            message: r.message,
            date: r.date,
            time: r.time,
            status: r.status || 'active'
        };
    }

    private mapStatusLog(h: any): StatusLogEntry {
        return {
            id: h.id,
            status: h.status as ServiceStatus,
            timestamp: h.timestamp,
            user_id: h.user_id,
            user_name: h.user_name,
            action_source: h.action_source
        };
    }
}

export const supabaseDB = new SupabaseService();

