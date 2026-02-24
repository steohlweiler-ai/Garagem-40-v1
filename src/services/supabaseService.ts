
import { createClient } from '@supabase/supabase-js';
import {
    ServiceJob, Client, Vehicle, ServiceTask, Reminder, ReminderWithService,
    StatusLogEntry, ServiceStatus, WorkshopSettings,
    DelayCriteria, EvaluationTemplate, StatusConfig, VehicleColor,
    Appointment, CatalogItem, IntegrationState, UserAccount,
    Product, Invoice, StockMovement, Supplier, StockAllocation, ChargeType
} from '../types';
import { calculateDelayStatus } from '../utils/helpers';

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

        console.log('📤 [UPLOAD] Starting upload:', {
            bucket,
            fileName,
            fileSize: file.size,
            fileType: file.type
        });

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            console.error('❌ [UPLOAD] Supabase Storage Error:', {
                message: uploadError.message,
                bucket,
                filePath,
                fileSize: file.size,
                fileType: file.type,
                error: uploadError
            });
            return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        console.log('✅ [UPLOAD] Success:', data.publicUrl);
        return data.publicUrl;
    }

    // ===================== READ OPERATIONS =====================

    async getClients(signal?: AbortSignal): Promise<Client[]> {
        let query = supabase.from('clientes').select('*');
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
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

    async getVehicles(signal?: AbortSignal): Promise<Vehicle[]> {
        let query = supabase.from('veículos').select('*');
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) return [];
        return data.map(v => this.mapVehicle(v));
    }

    async getVehiclesByClient(clientId: string): Promise<Vehicle[]> {
        const { data, error } = await supabase.from('veículos').select('*').eq('client_id', clientId);
        if (error) return [];
        return data.map(v => this.mapVehicle(v));
    }

    async getServices(): Promise<ServiceJob[]> {
        // 1. Fetch all services
        const { data: services, error } = await supabase.from('serviços').select('*');
        if (error) {
            console.error('Supabase Error (Services):', error);
            throw error;
        }

        if (!services || services.length === 0) return [];

        const serviceIds = services.map(s => s.id);

        // 2. Batch fetch all related data for these services (ONE query per table)
        const [tasksRes, remindersRes, historyRes] = await Promise.all([
            supabase.from('tarefas').select('*').in('service_id', serviceIds).order('order'),
            supabase.from('lembretes').select('*').in('service_id', serviceIds),
            supabase.from('historico_status').select('*').in('service_id', serviceIds).order('timestamp'),
        ]);

        // 3. Group data by service_id for O(1) lookup
        const tasksMap = new Map<string, any[]>();
        (tasksRes.data || []).forEach(t => {
            const list = tasksMap.get(t.service_id) || [];
            list.push(this.mapTask(t));
            tasksMap.set(t.service_id, list);
        });

        const remindersMap = new Map<string, any[]>();
        (remindersRes.data || []).forEach(r => {
            const list = remindersMap.get(r.service_id) || [];
            list.push(this.mapReminder(r));
            remindersMap.set(r.service_id, list);
        });

        const historyMap = new Map<string, any[]>();
        (historyRes.data || []).forEach(h => {
            const list = historyMap.get(h.service_id) || [];
            list.push(this.mapStatusLog(h));
            historyMap.set(h.service_id, list);
        });

        // 4. Merge data
        return services.map(s => ({
            ...s,
            tasks: tasksMap.get(s.id) || [],
            reminders: remindersMap.get(s.id) || [],
            status_history: historyMap.get(s.id) || [],
            entry_at: s.entry_at || new Date().toISOString(),
            archived: s.archived,
            created_by: s.created_by,
            created_by_name: s.created_by_name,
            inspection: s.inspection
        }));
    }

    async getServicesByVehicle(vehicleId: string): Promise<ServiceJob[]> {
        const { data: servicesData, error } = await supabase.from('serviços').select('*').eq('vehicle_id', vehicleId);
        if (error || !servicesData || servicesData.length === 0) return [];

        const serviceIds = servicesData.map(s => s.id);

        const [tasksRes, remindersRes, historyRes] = await Promise.all([
            supabase.from('tarefas').select('*').in('service_id', serviceIds).order('order'),
            supabase.from('lembretes').select('*').in('service_id', serviceIds),
            supabase.from('historico_status').select('*').in('service_id', serviceIds).order('timestamp'),
        ]);

        const tasksMap = new Map<string, any[]>();
        (tasksRes.data || []).forEach(t => {
            const list = tasksMap.get(t.service_id) || [];
            list.push(this.mapTask(t));
            tasksMap.set(t.service_id, list);
        });

        const remindersMap = new Map<string, any[]>();
        (remindersRes.data || []).forEach(r => {
            const list = remindersMap.get(r.service_id) || [];
            list.push(this.mapReminder(r));
            remindersMap.set(r.service_id, list);
        });

        const historyMap = new Map<string, any[]>();
        (historyRes.data || []).forEach(h => {
            const list = historyMap.get(h.service_id) || [];
            list.push(this.mapStatusLog(h));
            historyMap.set(h.service_id, list);
        });

        return servicesData.map(s => ({
            ...s,
            tasks: tasksMap.get(s.id) || [],
            reminders: remindersMap.get(s.id) || [],
            status_history: historyMap.get(s.id) || [],
            entry_at: s.entry_at || new Date().toISOString()
        }));
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
            .select('id, name, address, phone, cnpj, valor_hora_chapeacao, valor_hora_pintura, valor_hora_mecanica, media_retention_days')
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
                valor_hora_mecanica: data.valor_hora_mecanica,
                media_retention_days: data.media_retention_days
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
            valor_hora_mecanica: newData.valor_hora_mecanica,
            media_retention_days: newData.media_retention_days
        };
    }

    async getDelayCriteria(): Promise<DelayCriteria | null> {
        // Use maybeSingle() to gracefully handle zero rows (returns null instead of 406 error)
        const { data, error } = await supabase.from('critérios_de_atraso').select('*').eq('active', true).limit(1).maybeSingle();
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

    async deleteTemplateItem(id: string): Promise<boolean> {
        const { error } = await supabase.from('template_items').delete().eq('id', id);
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
            user_id: u.user_id,
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

    async createUser(u: Partial<UserAccount>): Promise<{ data: UserAccount | null; error?: string }> {
        // Use a separate Supabase client that doesn't persist session
        // This prevents logging out the current admin user
        const isolatedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        try {
            // Step 1: Create auth user with signUp (won't affect main session)
            // Generate a temporary password if not provided
            // Allow admin to set initial password
            const initialPassword = (u as any).password || crypto.randomUUID();

            const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
                email: u.email!,
                password: initialPassword,
                options: {
                    data: { name: u.name, role: u.role }
                }
            });

            if (signUpError) {
                console.error('Supabase SignUp Error:', signUpError);
                return { data: null, error: `Erro na autenticação: ${signUpError.message}` };
            }
            if (!signUpData.user) {
                return { data: null, error: 'Usuário de autenticação não foi criado (resposta vazia).' };
            }

            const userId = signUpData.user.id;

            // Step 2: Call RPC to create profile (using main client with admin's session)
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_profile', {
                p_user_id: userId,
                p_nome: u.name || '',
                p_email: u.email || '',
                p_papel: u.role || 'operador',
                p_permissoes: u.permissions || {}
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                return { data: null, error: `Erro no banco de dados (RPC): ${rpcError.message}` };
            }
            if (rpcData && !rpcData.success) {
                return { data: null, error: `Erro ao criar perfil: ${rpcData.error}` };
            }

            return {
                data: {
                    id: crypto.randomUUID(), // Profile ID will be generated by DB
                    organization_id: 'org-default',
                    name: u.name || 'Usuário',
                    email: u.email || '',
                    phone: u.phone || '',
                    role: (u.role || 'operador') as any,
                    active: true,
                    permissions: u.permissions || {
                        manage_team: false,
                        manage_clients: false,
                        manage_inventory: false,
                        config_rates: false,
                        config_vehicles: false,
                        config_system: false,
                        view_financials: false
                    },
                    created_at: new Date().toISOString()
                },
                error: undefined
            };
        } catch (err: any) {
            console.error('CreateUser unexpected error:', err);
            return { data: null, error: `Erro inesperado: ${err.message || 'Desconhecido'}` };
        }
    }

    async updateUser(id: string, u: Partial<UserAccount>): Promise<boolean> {
        // Map frontend field names to database column names (Portuguese)
        const payload: Record<string, any> = {};
        if (u.name !== undefined) payload.nome = u.name;
        if (u.email !== undefined) payload.email = u.email;
        if (u.role !== undefined) payload.papel = u.role;
        if (u.role !== undefined) payload.papel = u.role;
        if (u.active !== undefined) payload.ativo = u.active;
        if (u.phone !== undefined) payload.phone = u.phone;

        const { data, error } = await supabase.from('perfis_de_usuário').update(payload).eq('id', id).select();

        if (error) {
            console.error('Supabase Error (updateUser):', error);
            return false;
        }

        // If RLS blocked the update, data will be empty
        const success = data && data.length > 0;
        if (!success) {
            console.warn('UpdateUser failed: No rows updated. Check permissions/RLS or ID.');
        }
        return success;
    }

    async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
        // 1. Get the Profile to find the Auth User ID
        const { data: profile } = await supabase.from('perfis_de_usuário').select('user_id').eq('id', id).single();

        if (profile && profile.user_id) {
            // 2. Try to delete via RPC (Deletes Auth + Profile Cascade)
            const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account', { target_user_id: profile.user_id });

            if (!rpcError && rpcData && rpcData.success) {
                return { success: true };
            }

            // Capture RPC specific error
            const errorMessage = rpcError?.message || rpcData?.error || 'Erro desconhecido ao excluir conta Auth';
            console.warn('RPC delete failed:', errorMessage);

            // If it's a permission/constraint error, we might want to stop here rather than falling back
            // But for now, let's return this error so the UI can show it
            return { success: false, error: errorMessage };
        }

        // 3. Fallback: Local profile delete (Only if user has no Auth ID - "Zombie Profile")
        const { data, error } = await supabase.from('perfis_de_usuário').delete().eq('id', id).select();

        if (error) {
            console.error('Supabase Error (deleteUser):', error);
            return { success: false, error: error.message };
        }

        // If RLS blocked the delete, data will be empty
        const success = data && data.length > 0;
        if (!success) {
            return { success: false, error: 'Permissão negada ou usuário não encontrado (RLS).' };
        }
        return { success: true };
    }

    async getProducts(): Promise<Product[]> {
        // Fetch including new columns
        const { data, error } = await supabase.from('produtos').select('*, min_stock, cost, sku, supplier');
        if (error) return [];
        return data.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            unit: 'un',
            cost: Number(p.cost) || 0, // Buying Cost
            price: Number(p.price) || 0, // Selling Price
            current_stock: p.stock_quantity,
            min_stock: p.min_stock,
            supplier: p.supplier
        }));
    }

    /**
     * ATOMIC INVOICE ENTRY
     * Calls the RPC 'update_stock_atomic' to ensure stock and movements are saved together.
     */
    async processInvoiceAtomic(invoice: Invoice, items: any[]): Promise<{ success: boolean; error?: string }> {
        const payload_invoice = {
            number: invoice.number,
            date: invoice.date,
            total: invoice.total,
            supplier_id: invoice.supplier_id,
            imageBase64: invoice.imageBase64
        };

        const payload_items = items.map(i => ({
            product_id: i.product_id,
            qty: i.qty,
            unit_price: i.unit_price
        }));

        const { data, error } = await supabase.rpc('update_stock_atomic', {
            p_invoice_data: payload_invoice,
            p_items_data: payload_items
        });

        if (error) {
            console.error("RPC update_stock_atomic error:", error);
            return { success: false, error: error.message };
        }

        // @ts-ignore
        if (data && data.success === false) {
            // @ts-ignore
            return { success: false, error: data.error };
        }

        return { success: true };
    }

    /**
     * ATOMIC STOCK RESERVATION
     * Calls 'reserve_stock_atomic' to safely allocate items avoiding race conditions.
     */
    async reserveStockAtomic(productId: string, vehicleId: string, qty: number): Promise<{ success: boolean; message?: string }> {
        const { data, error } = await supabase.rpc('reserve_stock_atomic', {
            p_product_id: productId,
            p_vehicle_id: vehicleId,
            p_qty: qty
        });

        if (error) {
            console.error("RPC reserve_stock_atomic error:", error);
            return { success: false, message: error.message };
        }

        // @ts-ignore
        if (data && !data.success) {
            // @ts-ignore
            return { success: false, message: data.message };
        }

        return { success: true };
    }
    async updateProduct(id: string, u: Partial<Product>): Promise<boolean> {
        const { error } = await supabase.from('produtos').update({
            name: u.name,
            sku: u.sku,
            price: u.price, // Selling Price
            cost: u.cost,   // Buying Cost
            stock_quantity: u.current_stock,
            min_stock: u.min_stock
        }).eq('id', id);
        return !error;
    }

    async createProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
        const { data, error } = await supabase
            .from('produtos')
            .insert([{
                name: product.name,
                sku: product.sku,
                unit: product.unit,
                cost: product.cost,
                price: product.price,
                stock_quantity: product.current_stock,
                min_stock: product.min_stock,
                supplier: product.supplier,
                organization_id: 'org-default'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return null;
        }

        // Map back to Product type
        return {
            id: data.id,
            name: data.name,
            sku: data.sku,
            unit: data.unit,
            cost: data.cost,
            price: data.price,
            current_stock: data.stock_quantity || 0,
            min_stock: data.min_stock,
            supplier: data.supplier
        } as Product;
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
        try {
            const { data, error } = await supabase.from('alocações_de_estoque').insert({
                product_id: p.product_id,
                vehicle_id: p.vehicle_id,
                reserved_qty: p.qty,
                consumed_qty: 0,
                status: 'reserved',
                organization_id: 'org-default'
            }).select().single();
            if (error) {
                console.error('Supabase Error (allocateProduct):', error);
                return null;
            }
            return {
                id: data.id,
                product_id: data.product_id,
                vehicle_id: data.vehicle_id,
                reserved_qty: data.reserved_qty,
                consumed_qty: data.consumed_qty,
                status: data.status,
                date_allocated: data.created_at
            };
        } catch (err) {
            console.error('⚠️ [Supabase] allocateProduct failed:', err);
            return null;
        }
    }

    async consumeAllocation(allocId: string, userId: string): Promise<boolean> {
        try {
            // Logic should update status and record stock movement
            const { error } = await supabase.from('alocações_de_estoque').update({
                status: 'consumed',
                consumed_qty: supabase.rpc('increment', { row_id: allocId, column_name: 'reserved_qty' }) // Simplified for now
            }).eq('id', allocId);

            return !error;
        } catch (err) {
            console.error('⚠️ [Supabase] consumeAllocation failed:', err);
            return false;
        }
    }

    async releaseAllocation(allocId: string): Promise<boolean> {
        try {
            const { error } = await supabase.from('alocações_de_estoque').delete().eq('id', allocId);
            return !error;
        } catch (err) {
            console.error('⚠️ [Supabase] releaseAllocation failed:', err);
            return false;
        }
    }

    async getStockAllocations(): Promise<StockAllocation[]> {
        try {
            const { data, error } = await supabase.from('alocações_de_estoque').select('*');
            if (error) {
                // Check if error is because table doesn't exist
                if (error.code === '42P01') {
                    console.warn('⚠️ [Supabase] Table "alocações_de_estoque" does not exist. Returning empty list.');
                    return [];
                }
                console.error('Supabase Error (getStockAllocations):', error);
                return [];
            }
            return data.map(a => ({
                id: a.id,
                product_id: a.product_id,
                vehicle_id: a.vehicle_id,
                reserved_qty: a.reserved_qty,
                consumed_qty: a.consumed_qty,
                status: a.status,
                date_allocated: a.created_at
            }));
        } catch (err) {
            console.warn('⚠️ [Supabase] Failed to fetch stock allocations. It likely does not exist yet.');
            return [];
        }
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
    /**
     * Get counts for dashboard chips (Optimized)
     * Calculates 'Delayed' status server-side (data layer) to be independent of view filters.
     * Can optionally receive criteria to ensure consistency with client-side.
     */
    async getServiceCounts(injectedCriteria?: DelayCriteria | null): Promise<Record<string, number>> {
        // Usar critérios injetados (do frontend) ou buscar do banco
        let criteria = injectedCriteria;

        if (!criteria) {
            criteria = await this.getDelayCriteria();
        }

        // Rescue Plan: Hard Fallback to prevent crash
        if (!criteria) {
            console.warn('Dashboard: Delay criteria not found in DB. Using defaults.');
            criteria = {
                active: true,
                scope: 'global',
                thresholdDays: 1,
                thresholdHours: 0,
                considerWorkdays: true,
                considerBusinessHours: false,
                businessStart: '08:00',
                businessEnd: '18:00',
                priorityOverrides: [],
                autoMarkDelayed: false,
                autoNotify: false
            };
        }

        // Buscar serviços ativos com colunas mínimas para cálculo
        // "Lightweight Query" conforme solicitado
        const { data: activeServices, error } = await supabase
            .from('serviços')
            .select('id, status, estimated_delivery, entry_at, priority')
            .neq('status', 'Entregue');

        if (error || !activeServices) {
            console.error('Error fetching service counts', error);
            return {};
        }

        // Debug Log para verificar dados reais que chegam do banco
        if (activeServices.length > 0) {
            console.log('Dashboard Debug - First Service:', activeServices[0]);
        }
        console.log('Dashboard Debug - Criteria:', criteria);

        const counts: Record<string, number> = {
            'Atrasado': 0,
            'total': activeServices.length
        };

        // Inicializar contadores padrão
        const standardStatuses = ['Pendente', 'Em Andamento', 'Lembrete', 'Pronto'];
        standardStatuses.forEach(s => counts[s] = 0);

        // Loop único para agregar contagens e calcular atrasos
        for (const s of activeServices) {
            // Conta Status Padrão
            counts[s.status] = (counts[s.status] || 0) + 1;

            // Lógica de Atraso Global (Independent Counters)
            if (s.estimated_delivery && criteria) {
                // Mapeia prioridade se existir, ou undefined
                const priority = s.priority as 'baixa' | 'media' | 'alta' || undefined;
                const { isDelayed } = calculateDelayStatus(s.estimated_delivery, criteria, priority);
                if (isDelayed) {
                    counts['Atrasado']++;
                }
            }
        }

        // Buscar contagem de Entregues separadamente (já que excluímos da query principal para performance)
        const { count: entregueCount } = await supabase
            .from('serviços')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Entregue');

        counts['Entregue'] = entregueCount || 0;

        return counts;
    }



    /**
     * Filtered and paginated service query
     * Implements Action-First View: excludes finalized statuses by default
     */
    async getServicesFiltered(options: {
        excludeStatuses?: string[];
        statuses?: string[];
        clientId?: string;
        vehicleId?: string;
        limit?: number;
        offset?: number;
        sortBy?: 'priority' | 'entry_recent' | 'entry_oldest' | 'delivery';
        signal?: AbortSignal;
    }): Promise<{
        data: ServiceJob[];
        total: number;
        hasMore: boolean;
    }> {
        const {
            excludeStatuses = [],
            statuses = [],
            clientId,
            vehicleId,
            limit = 20,
            offset = 0,
            sortBy = 'priority',
            signal
        } = options;

        console.log('[DEBUG] getServicesFiltered START', { excludeStatuses, statuses, clientId, vehicleId, limit, offset });

        // Build base query
        // AUDIT SHIELD: Using simple joins to let Supabase resolve relationships automatically
        let queryArray = supabase.from('serviços')
            .select('*, vehicle:veículos(*), client:clientes(*)', { count: 'exact' });

        // Apply AbortSignal if provided
        if (signal) {
            queryArray = queryArray.abortSignal(signal);
        }

        let query: any = queryArray;
        let result: any;

        // --- EXTREME PERFORMANCE SHIELD (TC010/TC011) ---
        // Attempt specialized RPC call for ultra-fast dashboard loading
        console.log('[DEBUG] Attempting RPC get_dashboard_services (TC011)...');
        try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_services', {
                p_limit: limit,
                p_offset: offset,
                p_statuses: statuses.length > 0 ? statuses : null,
                p_client_id: clientId || null,
                p_vehicle_id: vehicleId || null
            });

            if (!rpcError && rpcData && rpcData.length > 0) {
                console.log('⚡ [PERFORMANCE] RPC get_dashboard_services SUCCESS');
                const { service_data, total_count } = rpcData[0];

                // RPC returns batched results in service_data.services
                const rawServices = service_data.services || [];

                result = {
                    data: rawServices.map((s: any) => ({
                        ...s,
                        // Reconstruct vehicle/client objects for frontend mapping
                        vehicle: s.vehicle_plate ? {
                            plate: s.vehicle_plate,
                            brand: s.vehicle_brand,
                            model: s.vehicle_model
                        } : undefined,
                        client: s.client_name ? {
                            name: s.client_name,
                            phone: s.client_phone
                        } : undefined
                    })),
                    error: null,
                    count: total_count
                };
            } else if (rpcError) {
                console.warn(`[DEBUG] RPC Failed (Expected if migration pending): ${rpcError.message}`);
                // Proceed to normal query
            }
        } catch (e) {
            console.warn('[DEBUG] RPC Exception:', e);
        }

        // --- FALLBACK LOGIC ---
        if (!result) {
            // Apply status filters to classic query
            if (statuses.length > 0) {
                query = query.in('status', statuses);
            } else if (excludeStatuses.length > 0) {
                query = query.not('status', 'in', `(${excludeStatuses.join(',')})`);
            } else {
                query = query.neq('status', 'Entregue');
            }

            // Apply ID filters if provided
            if (clientId) query = query.eq('client_id', clientId);
            if (vehicleId) query = query.eq('vehicle_id', vehicleId);

            // Apply base sorting
            query = query
                .order('priority_bucket', { ascending: true })
                .order('estimated_delivery', { ascending: true, nullsFirst: false })
                .order('entry_at', { ascending: false });

            // Apply pagination
            query = query.range(offset, offset + limit - 1);

            console.log('[DEBUG] Executing Classic / Fallback Query...');
            result = await query;

            // SECONDARY FALLBACK: Se falhar a ordenação por buckets, tenta a mais básica
            if (result.error && result.error.message.includes('priority_bucket')) {
                console.warn('[DEBUG] Bucket sort failed. Using simple entry_at fallback.');
                let baseQuery = supabase.from('serviços')
                    .select('*, vehicle:veículos(*), client:clientes(*)', { count: 'exact' });

                if (statuses.length > 0) baseQuery = baseQuery.in('status', statuses);
                else baseQuery = baseQuery.neq('status', 'Entregue');

                if (clientId) baseQuery = baseQuery.eq('client_id', clientId);
                if (vehicleId) baseQuery = baseQuery.eq('vehicle_id', vehicleId);

                baseQuery = baseQuery.order('entry_at', { ascending: false }).range(offset, offset + limit - 1);
                result = await baseQuery;
            }
        }

        const { data: services, error, count } = result;

        if (services && services.length > 0) {
            console.log('🔍 [AUDIT] getServicesFiltered RAW SUCCESS', {
                count,
                firstItem: services[0],
                hasVehicle: !!services[0].vehicle,
                hasClient: !!services[0].client
            });
        }

        if (error) {
            console.error('❌ Supabase Error (getServicesFiltered):', error.message, error.details, error.hint);
            throw error;
        }

        if (!services || services.length === 0) {
            console.warn('⚠️ [AUDIT] Query returned ZERO services despite count being:', count);
            return { data: [], total: count || 0, hasMore: false };
        }

        // Fetch relations for the paginated services (batched)
        const serviceIds = services.map((s: any) => s.id);

        let tasksData: any[] = [];
        let remindersData: any[] = [];
        let historyData: any[] = [];

        // PERFORMANCE: Fetch sub-queries in PARALLEL using Promise.all
        // OPTIMIZED: Run sub-queries in parallel for significant performance boost
        const performanceStart = performance.now();

        try {
            const [tasksResult, remindersResult, historyResult] = await Promise.all([
                supabase
                    .from('tarefas')
                    .select('*')
                    .in('service_id', serviceIds),
                supabase
                    .from('lembretes')
                    .select('*')
                    .in('service_id', serviceIds),
                supabase
                    .from('historico_status')
                    .select('id, service_id, status, timestamp, user_name, action_source')
                    .in('service_id', serviceIds)
                    .order('timestamp', { ascending: false })
                    .limit(1000)
            ]);

            // Properly assign results to outer-scoped variables
            tasksData = tasksResult.data || [];
            remindersData = remindersResult.data || [];
            historyData = historyResult.data || [];

            const performanceEnd = performance.now();
            console.log(`⚡ [PERFORMANCE] Parallel sub-queries completed in ${(performanceEnd - performanceStart).toFixed(2)}ms`);

            if (tasksResult.error) console.error('❌ [ERROR] Tasks query failed:', tasksResult.error);
            if (remindersResult.error) console.error('❌ [ERROR] Reminders query failed:', remindersResult.error);
            if (historyResult.error) console.error('❌ [ERROR] History query failed:', historyResult.error);
        } catch (err) {
            console.error('❌ [ERROR] Parallel queries failed:', err);
            // Continue with empty arrays if parallel queries fail
        }
        // Map relations to services
        const servicesWithRelations = services.map((s: any) => ({
            ...s,
            tasks: tasksData.filter(t => t.service_id === s.id).map(this.mapTask),
            reminders: remindersData.filter(r => r.service_id === s.id).map(this.mapReminder),
            status_history: historyData.filter(h => h.service_id === s.id).map(this.mapStatusLog),
            entry_at: s.entry_at || new Date().toISOString(),
            archived: s.archived,
            created_by: s.created_by,
            created_by_name: s.created_by_name,
            inspection: s.inspection,
            // Optimized mapping for joined data
            vehicle: s.vehicle ? this.mapVehicle(s.vehicle) : undefined,
            client: s.client ? this.mapClient(s.client) : undefined
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

    /** Sanitize & clamp pagination/date-range params */
    private sanitizeScheduleParams(options?: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        signal?: AbortSignal;
    }) {
        const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        const raw = options || {};
        return {
            dateFrom: (raw.dateFrom && DATE_RE.test(raw.dateFrom)) ? raw.dateFrom : undefined,
            dateTo: (raw.dateTo && DATE_RE.test(raw.dateTo)) ? raw.dateTo : undefined,
            limit: Math.min(Math.max(Number(raw.limit) || 50, 1), 100),
            offset: Math.max(Number(raw.offset) || 0, 0),
            signal: raw.signal,
        };
    }

    async getAppointments(options?: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        signal?: AbortSignal;
    }): Promise<Appointment[]> {
        const { dateFrom, dateTo, limit, offset, signal } = this.sanitizeScheduleParams(options);
        const t0 = performance.now();

        let query = supabase.from('agendamentos').select('*').order('date', { ascending: true });

        if (dateFrom) query = query.gte('date', dateFrom);
        if (dateTo) query = query.lte('date', dateTo);
        query = query.range(offset, offset + limit - 1);

        if (signal) query = query.abortSignal(signal);

        const { data, error } = await query;
        const elapsed = (performance.now() - t0).toFixed(1);
        console.log(`[TIMING] getAppointments: ${elapsed}ms (params: ${JSON.stringify({ dateFrom, dateTo, limit, offset })})`);

        if (error) {
            console.error('[Supabase] Error fetching appointments:', error);
            return [];
        }
        return (data || []).map(a => ({
            id: a.id,
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

    async getAppointmentByServiceId(serviceId: string): Promise<Appointment | null> {
        const t0 = performance.now();
        const { data, error } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('service_id', serviceId)
            .maybeSingle();

        const elapsed = (performance.now() - t0).toFixed(1);
        console.log(`[TIMING] getAppointmentByServiceId: ${elapsed}ms (serviceId: ${serviceId})`);

        if (error || !data) return null;
        return {
            id: data.id,
            title: data.title,
            date: data.date,
            time: data.time,
            vehicle_plate: data.vehicle_plate,
            vehicle_brand: data.vehicle_brand,
            vehicle_model: data.vehicle_model,
            client_name: data.client_name,
            client_phone: data.client_phone,
            description: data.description,
            notify_enabled: data.notify_enabled ?? true,
            notify_before_minutes: data.notify_before_minutes ?? 15,
            type: data.type as 'manual' | 'service_delivery',
            service_id: data.service_id
        };
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
            priority_bucket: (service as any).priority_bucket || 2,
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
            version: newService.version,
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
        const { status, priority, total_value, estimated_delivery, archived, inspection, priority_bucket, version, tasks } = updates;

        const updatePayload: any = {
            ...(status && { status }),
            ...(priority && { priority }),
            ...(total_value !== undefined && { total_value }),
            ...(estimated_delivery && { estimated_delivery }),
            ...(archived !== undefined && { archived }),
            ...(inspection && { inspection }),
            ...(priority_bucket !== undefined && { priority_bucket })
        };

        let query = supabase.from('serviços').update(updatePayload).eq('id', id);

        // OPTIMISTIC LOCKING: Only update if version matches
        if (version !== undefined) {
            query = query.eq('version', version);
        }

        const { data, error } = await query.select('id');

        if (error) {
            console.error('Supabase Error (updateService):', error);
            return false;
        }

        // If version was provided but no rows were updated, it's a conflict
        if (version !== undefined && (!data || data.length === 0)) {
            console.warn(`[Optimistic Lock] Conflict detected for service ${id}. Version ${version} is outdated.`);
            return false;
        }

        // --- TASK SYNC SHIELD (TC012) ---
        // If tasks are provided, sync them atomically (Upsert + Purge)
        if (tasks && Array.isArray(tasks)) {
            console.log(`[SYNC] Syncing ${tasks.length} tasks for service ${id}`);

            // 1. Identify tasks to delete (Leftovers)
            const { data: dbTasks } = await supabase
                .from('tarefas')
                .select('id')
                .eq('service_id', id);

            if (dbTasks) {
                const incomingIds = new Set(tasks.map(t => t.id));
                const toDelete = dbTasks.filter(t => !incomingIds.has(t.id)).map(t => t.id);

                if (toDelete.length > 0) {
                    console.log(`[SYNC] Purging ${toDelete.length} obsolete tasks`);
                    await supabase.from('tarefas').delete().in('id', toDelete);
                }
            }

            // 2. Upsert incoming tasks
            // Ensure service_id is explicitly set and clean payload
            const tasksToUpsert = tasks.map(t => ({
                id: t.id,
                service_id: id,
                title: t.title,
                status: t.status,
                type: t.type,
                value: t.value,
                responsible_user_id: t.responsible_user_id,
                started_at: t.started_at,
                ended_at: t.ended_at,
                duration_seconds: t.duration_seconds,
                time_spent_seconds: t.time_spent_seconds,
                observation: t.observation,
                relato: t.relato,
                diagnostico: t.diagnostico,
                media: t.media,
                charge_type: t.charge_type,
                rate_per_hour: t.rate_per_hour,
                fixed_value: t.fixed_value,
                manual_override_value: t.manual_override_value,
                from_template_id: t.from_template_id,
                order: t.order,
                last_executor_id: t.last_executor_id,
                last_executor_name: t.last_executor_name
            }));

            const { error: upsertError } = await supabase.from('tarefas').upsert(tasksToUpsert);
            if (upsertError) {
                console.error('[SYNC] Task upsert failed:', upsertError);
                // We return true because service was updated, but log the failure
            }
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

    async startTaskExecution(taskId: string, user: { id: string, name: string }): Promise<boolean> {
        const now = new Date().toISOString();
        const { error } = await supabase.from('tarefas').update({
            status: 'in_progress',
            started_at: now,
            last_executor_id: user.id,
            last_executor_name: user.name,
            updated_at: now
        }).eq('id', taskId);

        return !error;
    }

    async stopTaskExecution(taskId: string, currentSessionDuration: number, totalTimeSpent: number, user: { id: string, name: string }, startedAt: string): Promise<boolean> {
        const now = new Date().toISOString();

        // 1. Update Task (Snapshot)
        const { error: taskError } = await supabase.from('tarefas').update({
            status: 'todo',
            started_at: null, // Clear active session
            time_spent_seconds: totalTimeSpent,
            updated_at: now
        }).eq('id', taskId);

        if (taskError) return false;

        // 2. Insert into History (Audit Trail)
        const { error: historyError } = await supabase.from('historico_tarefas').insert({
            task_id: taskId,
            user_id: user.id,
            user_name: user.name,
            started_at: startedAt, // When this session started
            ended_at: now,
            duration_seconds: currentSessionDuration,
            organization_id: 'org-default'
        });

        if (historyError) {
            console.error('Error logging task history:', historyError);
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


    async deleteTask(taskId: string): Promise<boolean> {
        const { error } = await supabase.from('tarefas').delete().eq('id', taskId);
        if (error) {
            console.error('Supabase Error (deleteTask):', error);
            return false;
        }
        return true;
    }

    async getTaskHistory(serviceId: string): Promise<any[]> {
        // Fetch task history joined with task details if needed, or just raw history filtered by service's tasks
        // Since historico_tarefas has task_id, we need to know which tasks belong to this service.
        // Or better: filter history where task_id is in (select id from tarefas where service_id = serviceId)

        // Simpler approach: Fetch all history for tasks of this service
        const { data, error } = await supabase
            .from('historico_tarefas')
            .select('*, tarefas!inner(service_id, title)')
            .eq('tarefas.service_id', serviceId)
            .order('started_at', { ascending: false });

        if (error) {
            console.error('Supabase Error (getTaskHistory):', error);
            return [];
        }
        return data || [];
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
    async getAllReminders(includeCompleted = false, options?: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
        signal?: AbortSignal;
    }): Promise<ReminderWithService[]> {
        const { dateFrom, dateTo, limit, offset, signal } = this.sanitizeScheduleParams(options);
        const t0 = performance.now();

        let query = supabase
            .from('lembretes')
            .select('*')
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (dateFrom) query = query.gte('date', dateFrom);
        if (dateTo) query = query.lte('date', dateTo);
        query = query.range(offset, offset + limit - 1);

        if (!includeCompleted) {
            query = query.eq('status', 'active');
        }

        if (signal) {
            query = query.abortSignal(signal);
        }

        const { data: reminders, error } = await query;
        const elapsed = (performance.now() - t0).toFixed(1);
        console.log(`[TIMING] getAllReminders: ${elapsed}ms (params: ${JSON.stringify({ dateFrom, dateTo, limit, offset, includeCompleted })})`);

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
        if (settings.media_retention_days !== undefined) {
            payload.media_retention_days = settings.media_retention_days;
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

    // ===================== MEDIA RETENTION =====================

    async analyzeOldMedia(): Promise<number> {
        const settings = await this.getWorkshopSettings();
        if (!settings || !settings.media_retention_days) {
            return 0; // "Nunca excluir" ou não configurado
        }

        const days = settings.media_retention_days;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();

        // 1. Buscar serviços antigos
        const { data: oldServices } = await supabase
            .from('serviços')
            .select('id')
            .lt('entry_at', cutoffStr);

        if (!oldServices || oldServices.length === 0) return 0;

        const serviceIds = oldServices.map(s => s.id);

        // 2. Buscar tarefas desses serviços com media
        // Como 'media' é jsonb, filtramos onde não é null ou vazio se possível via postgrest, 
        // mas verificação local é mais garantida para arrays vazios "[]" vs null.
        const { data: tasks } = await supabase
            .from('tarefas')
            .select('media')
            .in('service_id', serviceIds)
            .not('media', 'is', null);

        if (!tasks) return 0;

        let count = 0;
        tasks.forEach((t: any) => {
            if (Array.isArray(t.media)) {
                count += t.media.length;
            }
        });

        return count;
    }

    async cleanupOldMedia(): Promise<{ success: boolean; count: number }> {
        const settings = await this.getWorkshopSettings();
        if (!settings || !settings.media_retention_days) {
            return { success: false, count: 0 };
        }

        const days = settings.media_retention_days;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();

        // 1. Buscar serviços antigos
        const { data: oldServices } = await supabase
            .from('serviços')
            .select('id')
            .lt('entry_at', cutoffStr);

        if (!oldServices || oldServices.length === 0) return { success: true, count: 0 };

        const serviceIds = oldServices.map(s => s.id);

        // 2. Buscar tarefas com media
        // Precisamos do ID da tarefa para atualizar depois
        const { data: tasks } = await supabase
            .from('tarefas')
            .select('id, media')
            .in('service_id', serviceIds)
            .not('media', 'is', null);

        if (!tasks || tasks.length === 0) return { success: true, count: 0 };

        let totalDeleted = 0;
        const taskIdsToClear: string[] = [];

        for (const t of tasks) {
            if (Array.isArray(t.media) && t.media.length > 0) {
                // Deletar arquivos do storage
                const pathsToDelete: string[] = [];

                t.media.forEach((m: any) => {
                    if (m.url) {
                        try {
                            // Extrair path da URL. Ex: .../storage/v1/object/public/evidencias/folder/file.jpg
                            // O bucket é 'evidencias'.
                            // Se a URL for completa, pegamos o que vem depois de /evidencias/
                            const urlObj = new URL(m.url);
                            const pathParts = urlObj.pathname.split('/evidencias/');
                            if (pathParts.length > 1) {
                                pathsToDelete.push(pathParts[1]); // O caminho relativo dentro do bucket
                            }
                        } catch (e) {
                            console.warn("Invalid URL in media cleanup:", m.url);
                        }
                    }
                });

                if (pathsToDelete.length > 0) {
                    await supabase.storage.from('evidencias').remove(pathsToDelete);
                    totalDeleted += pathsToDelete.length;
                }

                taskIdsToClear.push(t.id);
            }
        }

        // 3. Limpar registros do banco
        if (taskIdsToClear.length > 0) {
            await supabase
                .from('tarefas')
                .update({ media: [] })
                .in('id', taskIdsToClear);
        }

        return { success: true, count: totalDeleted };
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
            responsible_user_id: t.responsible_user_id,
            last_executor_id: t.last_executor_id,
            last_executor_name: t.last_executor_name
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

