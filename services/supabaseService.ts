
import { createClient } from '@supabase/supabase-js';
import {
    ServiceJob, Client, Vehicle, ServiceTask, Reminder, ReminderWithService,
    StatusLogEntry, ServiceStatus, WorkshopSettings,
    DelayCriteria, EvaluationTemplate, StatusConfig, VehicleColor,
    Appointment, CatalogItem, IntegrationState, UserAccount,
    Product, Invoice, StockMovement, Supplier, StockAllocation, ChargeType
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase credentials missing! Check .env.local");
}

export { SUPABASE_URL, SUPABASE_KEY };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class SupabaseService {
    // ===================== STORAGE OPERATIONS =====================

    async uploadFile(file: File, bucket: string, path?: string): Promise<string | null> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${path ? path + '/' : ''}${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            console.error('Supabase Storage Error (uploadFile):', uploadError);
            return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    }

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
        const { data, error } = await supabase
            .from('configuracoes_oficina')
            .select('id, name, address, phone, cnpj, valor_hora_chapeacao, valor_hora_pintura, valor_hora_mecanica')
            .limit(1)
            .single();

        if (data) {
            return {
                id: data.id,
                name: data.name,
                address: data.address,
                phone: data.phone,
                cnpj: data.cnpj,
                valor_hora_chapeacao: data.valor_hora_chapeacao,
                valor_hora_pintura: data.valor_hora_pintura,
                valor_hora_mecanica: data.valor_hora_mecanica
            };
        }

        // AUTO-CREATE if missing (to solve ID not found error)
        console.warn("Settings row missing. Creating default row...");
        const defaultSettings = {
            name: 'Oficina Padrão',
            address: '',
            phone: '',
            cnpj: '',
            valor_hora_chapeacao: 50,
            valor_hora_pintura: 50,
            valor_hora_mecanica: 50
        };

        const { data: newData, error: createError } = await supabase
            .from('configuracoes_oficina')
            .insert(defaultSettings)
            .select()
            .single();

        if (createError || !newData) {
            console.error("Failed to auto-create settings:", createError);
            return null;
        }

        return {
            id: newData.id,
            name: newData.name,
            address: newData.address,
            phone: newData.phone,
            cnpj: newData.cnpj,
            valor_hora_chapeacao: newData.valor_hora_chapeacao,
            valor_hora_pintura: newData.valor_hora_pintura,
            valor_hora_mecanica: newData.valor_hora_mecanica
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

    async getTemplates(activeOnly: boolean = true): Promise<EvaluationTemplate[]> {
        // 1. Fetch Templates
        let query = supabase
            .from('service_templates')
            .select('*')
            .order('name');

        if (activeOnly) {
            query = query.eq('active', true);
        }

        const { data: templates, error: tmplError } = await query;

        if (tmplError || !templates) {
            console.error('Error fetching service_templates:', tmplError);
            return [];
        }

        // 2. Fetch Items for these templates
        const templateIds = templates.map(t => t.id);
        const { data: items, error: itemsError } = await supabase
            .from('template_items')
            .select('*')
            .in('template_id', templateIds);

        if (itemsError) {
            console.error('Error fetching template_items:', itemsError);
            return [];
        }

        console.log('DEBUG: Raw Template Items from DB:', items); // Log raw items to check default_price existence and format

        // 3. Map to structure
        const result: EvaluationTemplate[] = templates.map(t => {
            const tItems = items?.filter(i => i.template_id === t.id) || [];

            // Group by category
            const categories = Array.from(new Set(tItems.map(i => i.category || 'Geral')));
            const sections = categories.map(cat => {
                const catItems = tItems.filter(i => (i.category || 'Geral') === cat);
                return {
                    section_name: cat,
                    items: catItems.map(i => ({
                        id: i.id,
                        key: i.id,
                        label: i.name,
                        allow_subitems: true,
                        subitems: [
                            i.troca_ativo ? 'Troca' : null,
                            i.chap_ativo ? 'Chap.' : null,
                            i.pintura_ativo ? 'Pintura' : null
                        ].filter(Boolean) as string[],
                        allow_notes: true,
                        allow_media: true,
                        is_active: true,
                        allowed_charge_type: 'Ambos' as const,
                        default_charge_type: (i.billing_type === 'fixed' ? 'Fixo' : 'Hora') as ChargeType,
                        default_rate_per_hour: i.billing_type === 'hour' ? (Number(i.default_price) || 0) : 120,
                        default_fixed_value: i.billing_type === 'fixed' ? (Number(i.default_price) || 0) : 0,
                        default_price: Number(i.default_price) || 0,
                        price: Number(i.default_price) || 0,
                        defaultPrice: Number(i.default_price) || 0,

                        // New granular mapping
                        chap_ativo: i.chap_ativo,
                        chap_tipo_cobranca: i.chap_tipo_cobranca,
                        chap_padrao: Number(i.chap_padrao) || 0,
                        pintura_ativo: i.pintura_ativo,
                        pintura_tipo_cobranca: i.pintura_tipo_cobranca,
                        pintura_padrao: Number(i.pintura_padrao) || 0,
                        troca_ativo: i.troca_ativo,
                        troca_valor: Number(i.troca_valor) || 0
                    }))
                };
            });

            return {
                id: t.id,
                organization_id: 'org-default',
                name: t.name,
                active: t.active,
                sections: sections,
                is_default: t.name === 'Chapeação e Pintura' || sections.length > 0, // Heuristic for default
                created_at: new Date().toISOString()
            };
        });

        return result;
    }

    async addTemplate(name: string, active: boolean): Promise<EvaluationTemplate | null> {
        const { data, error } = await supabase.from('service_templates').insert({
            name,
            active,
            organization_id: 'org-default'
        }).select().single();

        if (error) {
            console.error('Error creating template:', error);
            return null;
        }

        return {
            id: data.id,
            organization_id: data.organization_id,
            name: data.name,
            active: data.active,
            sections: [],
            is_default: data.active,
            created_at: data.created_at
        };
    }

    async updateTemplate(id: string, updates: { name?: string, active?: boolean }): Promise<boolean> {
        const { error } = await supabase.from('service_templates').update(updates).eq('id', id);
        return !error;
    }

    async deleteTemplate(id: string): Promise<boolean> {
        const { error } = await supabase.from('service_templates').delete().eq('id', id);
        return !error;
    }

    async addTemplateItem(templateId: string, item: Partial<EvaluationTemplate | any>): Promise<boolean> {
        // Mapping from InspectionTemplateItem (frontend) to DB columns
        const payload: any = {
            template_id: templateId,
            organization_id: 'org-default',
            name: item.label || item.name,
            category: item.category,
            default_price: item.default_price || item.price || 0,
            billing_type: (item.default_charge_type === 'Hora' || item.type === 'hour') ? 'hour' : 'fixed',

            // New Granular Fields
            chap_ativo: item.chap_ativo,
            chap_tipo_cobranca: item.chap_tipo_cobranca,
            chap_padrao: item.chap_padrao,

            pintura_ativo: item.pintura_ativo,
            pintura_tipo_cobranca: item.pintura_tipo_cobranca,
            pintura_padrao: item.pintura_padrao,

            troca_ativo: item.troca_ativo,
            troca_valor: item.troca_valor
        };

        const { error } = await supabase.from('template_items').insert(payload);
        return !error;
    }

    async updateTemplateItem(id: string, updates: Partial<EvaluationTemplate | any>): Promise<boolean> {
        const payload: any = { updated_at: new Date().toISOString() };

        if (updates.label !== undefined) payload.name = updates.label;
        if (updates.name !== undefined) payload.name = updates.name; // Fallback

        if (updates.category !== undefined) payload.category = updates.category;

        if (updates.default_price !== undefined) payload.default_price = updates.default_price;
        if (updates.price !== undefined) payload.default_price = updates.price; // Fallback

        if (updates.default_charge_type !== undefined) {
            payload.billing_type = updates.default_charge_type === 'Hora' ? 'hour' : 'fixed';
        }
        if (updates.type !== undefined) { // Fallback
            payload.billing_type = updates.type === 'hour' ? 'hour' : 'fixed';
        }

        // Expanded fields
        if (updates.chap_ativo !== undefined) payload.chap_ativo = updates.chap_ativo;
        if (updates.chap_tipo_cobranca !== undefined) payload.chap_tipo_cobranca = updates.chap_tipo_cobranca;
        if (updates.chap_padrao !== undefined) payload.chap_padrao = updates.chap_padrao;

        if (updates.pintura_ativo !== undefined) payload.pintura_ativo = updates.pintura_ativo;
        if (updates.pintura_tipo_cobranca !== undefined) payload.pintura_tipo_cobranca = updates.pintura_tipo_cobranca;
        if (updates.pintura_padrao !== undefined) payload.pintura_padrao = updates.pintura_padrao;

        if (updates.troca_ativo !== undefined) payload.troca_ativo = updates.troca_ativo;
        if (updates.troca_valor !== undefined) payload.troca_valor = updates.troca_valor;

        const { error } = await supabase.from('template_items').update(payload).eq('id', id);
        return !error;
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

    async getColors(includeInactive: boolean = false): Promise<VehicleColor[]> {
        let query = supabase.from('cores_do_veículo').select('*');
        if (!includeInactive) {
            query = query.eq('active', true);
        }
        const { data, error } = await query;
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
            name: u.nome || u.name || 'Usuário',
            email: u.email,
            phone: u.phone || '',
            role: (u.papel || u.role || 'operador') as any,
            active: u.ativo ?? true,
            permissions: u.permissoes || u.permissions || {},
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
            name: data.nome || data.name || 'Usuário',
            email: data.email,
            phone: data.phone || '',
            role: (data.papel || data.role || 'operador') as any,
            active: data.active ?? true,
            permissions: data.permissions || {},
            created_at: data.created_at || new Date().toISOString()
        };
    }

    async updateUser(id: string, u: Partial<UserAccount>): Promise<boolean> {
        // Map frontend field names to database column names (Portuguese)
        const payload: Record<string, any> = {};
        if (u.name !== undefined) payload.nome = u.name;
        if (u.email !== undefined) payload.email = u.email;
        if (u.role !== undefined) payload.papel = u.role;
        if (u.permissions !== undefined) payload.permissoes = u.permissions;
        // Note: 'phone' and 'ativo' columns may not exist yet

        const { error } = await supabase.from('perfis_de_usuário').update(payload).eq('id', id);
        if (error) {
            console.error('Supabase Error (updateUser):', error);
        }
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

    // ===================== PERFORMANCE OPTIMIZED QUERIES =====================

    /**
     * Fast count query - returns service counts grouped by status
     * Used for KPI chips without loading full service data
     */
    async getServiceCounts(): Promise<Record<string, number>> {
        // Use individual count queries per status (Supabase limitation - no GROUP BY)
        const statuses = ['Pendente', 'Em Andamento', 'Lembrete', 'Pronto', 'Entregue'];

        const countPromises = statuses.map(async (status) => {
            const { count, error } = await supabase
                .from('serviços')
                .select('*', { count: 'exact', head: true })
                .eq('status', status);

            return { status, count: error ? 0 : (count || 0) };
        });

        // Also get total (excluding Entregue for active total)
        const totalActivePromise = supabase
            .from('serviços')
            .select('*', { count: 'exact', head: true })
            .not('status', 'eq', 'Entregue');

        const [results, totalActiveRes] = await Promise.all([
            Promise.all(countPromises),
            totalActivePromise
        ]);

        const counts: Record<string, number> = {};
        results.forEach(r => {
            counts[r.status] = r.count;
        });
        counts['total'] = totalActiveRes.count || 0;

        return counts;
    }

    /**
     * Filtered and paginated service query
     * Implements Action-First View: excludes finalized statuses by default
     */
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
        const {
            excludeStatuses = [],
            statuses = [],
            limit = 20,
            offset = 0,
            sortBy = 'priority'
        } = options;

        // Build base query
        let query = supabase.from('serviços').select('*', { count: 'exact' });

        // Apply status filters
        if (statuses.length > 0) {
            query = query.in('status', statuses);
        } else if (excludeStatuses.length > 0) {
            for (const status of excludeStatuses) {
                query = query.not('status', 'eq', status);
            }
        }

        // Apply base sorting (will be refined client-side for priority)
        query = query.order('entry_at', { ascending: true });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: services, error, count } = await query;

        if (error) {
            console.error('Supabase Error (getServicesFiltered):', error);
            throw error;
        }

        if (!services || services.length === 0) {
            return { data: [], total: count || 0, hasMore: false };
        }

        // Fetch relations for the paginated services (batched)
        const serviceIds = services.map(s => s.id);

        const [tasksRes, remindersRes, historyRes] = await Promise.all([
            supabase.from('tarefas').select('*').in('service_id', serviceIds).order('order'),
            supabase.from('lembretes').select('*').in('service_id', serviceIds),
            supabase.from('historico_status').select('*').in('service_id', serviceIds).order('timestamp')
        ]);

        // Map relations to services
        const servicesWithRelations = services.map(s => ({
            ...s,
            tasks: (tasksRes.data || []).filter(t => t.service_id === s.id).map(this.mapTask),
            reminders: (remindersRes.data || []).filter(r => r.service_id === s.id).map(this.mapReminder),
            status_history: (historyRes.data || []).filter(h => h.service_id === s.id).map(this.mapStatusLog),
            entry_at: s.entry_at || new Date().toISOString(),
            archived: s.archived,
            created_by: s.created_by,
            created_by_name: s.created_by_name,
            inspection: s.inspection
        }));

        // Client-side sort: Lembrete first, then by entry_at ascending (oldest first)
        if (sortBy === 'priority') {
            servicesWithRelations.sort((a, b) => {
                const aIsLembrete = a.status === 'Lembrete' ? 0 : 1;
                const bIsLembrete = b.status === 'Lembrete' ? 0 : 1;

                if (aIsLembrete !== bIsLembrete) return aIsLembrete - bIsLembrete;

                return new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime();
            });
        }

        const total = count || 0;
        const hasMore = offset + services.length < total;

        return { data: servicesWithRelations, total, hasMore };
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
        if (error) {
            console.error('[Supabase] Error fetching appointments:', error);
            return [];
        }
        return data.map(a => ({
            id: a.id,
            organization_id: a.organization_id || 'org-default',
            title: a.title,
            date: a.date,
            time: a.time,
            vehicle_plate: a.vehicle_plate,
            vehicle_brand: a.vehicle_brand,
            vehicle_model: a.vehicle_model,
            client_name: a.client_name,
            client_phone: a.client_phone,
            description: a.description,
            notify_enabled: a.notify_enabled ?? true,
            notify_before_minutes: a.notify_before_minutes ?? 15,
            type: a.type as 'manual' | 'service_delivery',
            service_id: a.service_id
        }));
    }

    async addAppointment(a: Partial<Appointment>): Promise<Appointment | null> {
        console.log('[Supabase] addAppointment called with:', JSON.stringify(a, null, 2));

        // Remove custom ID if present (Supabase auto-generates UUIDs)
        const { id, ...appointmentData } = a;

        // If this is a service_delivery appointment, use upsert based on service_id
        if (a.type === 'service_delivery' && a.service_id) {
            console.log('[Supabase] Using upsert for service_delivery appointment');
            const { data, error } = await supabase.from('agendamentos')
                .upsert({
                    organization_id: 'org-default',
                    ...appointmentData
                }, { onConflict: 'service_id' })
                .select()
                .single();

            if (error) {
                console.error('[Supabase] Error (addAppointment upsert):', error);
                return null;
            }
            console.log('[Supabase] Appointment upserted successfully:', data);
            return data;
        }

        // Regular appointment insert
        console.log('[Supabase] Using regular insert for manual appointment');
        const { data, error } = await supabase.from('agendamentos').insert({
            organization_id: 'org-default',
            ...appointmentData
        }).select().single();

        if (error) {
            console.error('[Supabase] Error (addAppointment insert):', error);
            return null;
        }
        console.log('[Supabase] Appointment inserted successfully:', data);
        return data;
    }

    async deleteAppointment(id: string): Promise<boolean> {
        const { error } = await supabase.from('agendamentos').delete().eq('id', id);
        return !error;
    }

    async updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
        const { error } = await supabase.from('agendamentos').update({
            ...(updates.date && { date: updates.date }),
            ...(updates.time && { time: updates.time }),
            ...(updates.title && { title: updates.title }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.notify_before_minutes !== undefined && { notify_before_minutes: updates.notify_before_minutes }),
            ...(updates.notify_enabled !== undefined && { notify_enabled: updates.notify_enabled })
        }).eq('id', id);

        if (error) {
            console.error('[Supabase] Error updating appointment:', error);
            return false;
        }
        return true;
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
            estimated_delivery: newService.estimated_delivery,
            archived: newService.archived,
            created_by: newService.created_by,
            created_by_name: newService.created_by_name,
            inspection: newService.inspection
        };
    }

    async updateService(id: string, updates: Partial<ServiceJob>): Promise<boolean> {
        const { status, priority, total_value, estimated_delivery, archived, inspection } = updates;

        const { error } = await supabase.from('serviços').update({
            ...(status && { status }),
            ...(priority && { priority }),
            ...(total_value !== undefined && { total_value }),
            ...(estimated_delivery && { estimated_delivery }),
            ...(archived !== undefined && { archived }),
            ...(inspection && { inspection })
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
            from_template_id: task.from_template_id || null,
            relato: task.relato || null,
            diagnostico: task.diagnostico || null,
            media: task.media || null
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

    /**
     * Busca lembretes com dados do serviço e veículo associados
     * @param includeCompleted - se true, inclui lembretes concluídos (padrão: false)
     */
    async getAllReminders(includeCompleted = false): Promise<ReminderWithService[]> {
        // Buscar lembretes
        let query = supabase
            .from('lembretes')
            .select('*')
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (!includeCompleted) {
            query = query.eq('status', 'active');
        }

        const { data: reminders, error } = await query;

        if (error || !reminders) {
            console.error('Supabase Error (getAllReminders):', error);
            return [];
        }

        // Buscar dados complementares dos serviços
        const serviceIds = [...new Set(reminders.map((r: any) => r.service_id).filter(Boolean))];

        if (serviceIds.length === 0) {
            return reminders.map((r: any) => ({
                id: r.id,
                title: r.title,
                message: r.message,
                date: r.date,
                time: r.time,
                status: r.status,
                service_id: r.service_id,
                vehicle_plate: '',
                vehicle_brand: '',
                vehicle_model: '',
                client_name: '',
                client_phone: ''
            }));
        }

        // Buscar serviços com veículos e clientes
        const { data: services } = await supabase
            .from('serviços')
            .select(`
                id,
                veículos (plate, brand, model),
                clientes (name, phone)
            `)
            .in('id', serviceIds);

        const serviceMap = new Map<string, any>();
        (services || []).forEach((s: any) => {
            serviceMap.set(s.id, s);
        });

        return reminders.map((r: any) => {
            const svc = serviceMap.get(r.service_id);
            return {
                id: r.id,
                title: r.title,
                message: r.message,
                date: r.date,
                time: r.time,
                status: r.status,
                service_id: r.service_id,
                vehicle_plate: svc?.veículos?.plate || '',
                vehicle_brand: svc?.veículos?.brand || '',
                vehicle_model: svc?.veículos?.model || '',
                client_name: svc?.clientes?.name || '',
                client_phone: svc?.clientes?.phone || ''
            };
        });
    }

    // ===================== SETTINGS & TEMPLATES = : =====================



    async updateWorkshopSettings(settings: Partial<WorkshopSettings>): Promise<boolean> {
        // Build payload with only the rate fields that we know exist
        const payload: any = {};

        if (settings.valor_hora_chapeacao !== undefined) {
            payload.valor_hora_chapeacao = settings.valor_hora_chapeacao;
        }
        if (settings.valor_hora_pintura !== undefined) {
            payload.valor_hora_pintura = settings.valor_hora_pintura;
        }
        if (settings.valor_hora_mecanica !== undefined) {
            payload.valor_hora_mecanica = settings.valor_hora_mecanica;
        }
        if (settings.name !== undefined) {
            payload.name = settings.name;
        }
        if (settings.address !== undefined) {
            payload.address = settings.address;
        }
        if (settings.phone !== undefined) {
            payload.phone = settings.phone;
        }
        if (settings.cnpj !== undefined) {
            payload.cnpj = settings.cnpj;
        }

        console.log('[updateWorkshopSettings] Settings ID:', settings.id);
        console.log('[updateWorkshopSettings] Payload:', payload);

        let query;
        let error;

        if (settings.id) {
            const result = await supabase
                .from('configuracoes_oficina')
                .update(payload)
                .eq('id', settings.id);
            error = result.error;
            console.log('[updateWorkshopSettings] Update result:', result);
        } else {
            // Fallback: update all rows (should be only one)
            const result = await supabase
                .from('configuracoes_oficina')
                .update(payload)
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all rows
            error = result.error;
            console.log('[updateWorkshopSettings] Update all result:', result);
        }

        if (error) {
            console.error('[updateWorkshopSettings] Error:', error);
            return false;
        }
        return true;
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
            media: t.media || [],
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

