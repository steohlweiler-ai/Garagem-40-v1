import { supabase } from './supabaseService';
import { AuthError, User } from '@supabase/supabase-js';

export interface AuthResponse {
    user: User | null;
    error: AuthError | null;
}

export const authService = {
    /**
     * Sign in with email and password
     */
    async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { user: data.user, error };
    },

    /**
     * Sign up with email and password
     */
    async signUp(email: string, password: string, metadata?: { name?: string }): Promise<AuthResponse> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        return { user: data.user, error };
    },

    /**
     * Sign out
     */
    async signOut(): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Update Password
     */
    async updatePassword(password: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
    },

    /**
     * Get current session user
     */
    async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
};
