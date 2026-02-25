import { supabase } from './supabaseService';
import { UserAccount } from '../types';
import { User } from '@supabase/supabase-js';

export const profileService = {
    /**
     * Get user profile from 'perfis_de_usuário' table by Auth User ID
     */
    async getProfileByUserId(userId: string): Promise<UserAccount | null> {
        // Note: The schema says 'user_id' is the link, but the query should check the exact column name.
        // Based on prompts, the table is `perfis_de_usuário`.
        // We need to confirm if the column linking to auth.users is `user_id` or `id` (if they are 1:1).
        // Usually it's `user_id` FK. Let's assume `user_id`.

        // First try to find by ID assuming ID matches Auth ID (common pattern) OR by user_id column
        // The provided context says: "A coluna de vinculo no perfil é `user_id` (uuid)."

        const { data, error } = await supabase
            .from('perfis_de_usuário')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            // If the error is 406 or similar, we might want to return null to force creation or handle it upstream.
            // But we must NOT throw or return undefined if expected to be null.
            return null;
        }

        return {
            id: data.id,
            organization_id: data.organization_id || 'org_1',
            name: data.nome || data.name || 'Usuário',
            email: data.email,
            phone: data.phone || '',
            // Map 'papel' from DB to 'role' in App
            role: (data.papel || 'admin') as any,
            active: data.ativo ?? true,
            permissions: {
                manage_team: false,
                manage_clients: false,
                manage_inventory: false,
                config_rates: false,
                config_vehicles: false,
                config_system: false,
                view_financials: false,
                // DB uses 'permissoes' (Portuguese), fall back to 'permissions' for compatibility
                ...(data.permissoes || data.permissions || {})
            },
            created_at: data.created_at,
            user_id: userId // Ensure Auth ID is passed
        };
    },

    /**
     * Ensure a profile exists for the given user.
     * If not, create a basic 'OPERATOR' profile.
     */
    async ensureUserProfile(user: User, metadata?: { name?: string }): Promise<UserAccount | null> {
        const existingProfile = await this.getProfileByUserId(user.id);
        if (existingProfile) return existingProfile;

        // 1. Create Organization (Business Logic: Auto-create for new Admin)
        const orgName = metadata?.name || `Oficina de ${user.email?.split('@')[0]}`;
        let organizationId = 'org-default';

        try {
            const { data: orgData, error: orgError } = await supabase
                .from('organizações')
                .insert({
                    name: orgName,
                    active: true
                })
                .select('id')
                .single();

            if (orgData) {
                organizationId = orgData.id;
            } else if (orgError) {
                console.warn('Failed to create organization, falling back to default:', orgError);
                // Optional: check if org-default exists or handle error better
            }
        } catch (e) {
            console.error('Unexpected error creating organization:', e);
        }

        // 2. Create User Profile linked to new Organization
        const newProfile = {
            user_id: user.id, // The link column
            email: user.email!,
            name: metadata?.name || user.user_metadata?.name || 'Novo Usuário',
            role: 'admin', // Force ADMIN for the creator of the org
            active: true,
            organization_id: organizationId,
            permissions: {
                manage_team: true,
                manage_clients: true,
                manage_inventory: true,
                config_rates: true,
                config_vehicles: true,
                config_system: true,
                view_financials: true
            }
        };

        const { data, error } = await supabase
            .from('perfis_de_usuário')
            .insert(newProfile)
            .select()
            .single();

        if (error) {
            console.error('Error creating user profile:', error);
            return null;
        }

        return {
            id: data.id,
            organization_id: data.organization_id,
            name: data.nome || data.name || 'Usuário',
            email: data.email,
            phone: data.phone || '',
            role: (data.papel || 'admin') as any,
            active: data.ativo ?? true,
            permissions: data.permissions || {
                manage_team: false,
                manage_clients: false,
                manage_inventory: false,
                config_rates: false,
                config_vehicles: false,
                config_system: false,
                view_financials: false
            },
            created_at: data.created_at
        };
    }
};
