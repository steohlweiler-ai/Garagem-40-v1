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
            organization_id: data.organization_id || 'org-default',
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            role: data.role as any,
            active: data.active ?? true,
            permissions: data.permissions || {},
            created_at: data.created_at
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
                access_clients: true,
                view_values_execution: true,
                view_values_reports: true,
                create_templates: true,
                manage_reminders: true
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
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            role: data.role,
            active: data.active,
            permissions: data.permissions || {},
            created_at: data.created_at
        };
    }
};
