import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { supabase } from '../services/supabaseService';
import { dataProvider } from '../services/dataProvider';

interface AuthContextType {
    isAuthenticated: boolean;
    user: UserAccount | null;
    login: (userData: any) => Promise<void>;
    logout: () => void;
    isPasswordRecovery: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserAccount | null>(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Unified Auth Initialization (prevents race conditions)
    useEffect(() => {
        console.log('[AuthProvider] Initializing auth...');

        // Step 1: Restore session from localStorage
        const savedUser = localStorage.getItem('g40_user_session');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);

                // Defensive: Validate parsed data
                if (parsed?.id && parsed?.email) {
                    console.log('[AuthProvider] Session restored from localStorage:', parsed.email);
                    setUser(parsed);
                    setIsAuthenticated(true);
                } else {
                    console.warn('[AuthProvider] Invalid session data, clearing localStorage');
                    localStorage.removeItem('g40_user_session');
                }
            } catch (e) {
                console.error('[AuthProvider] Failed to parse saved session:', e);
                localStorage.removeItem('g40_user_session');
            }
        }

        // Step 2: Setup Supabase Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AuthProvider] Auth state changed:', event);

            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
                return;
            }

            if (event === 'SIGNED_IN' && session?.user?.id) {
                console.log('[AuthProvider] User signed in, fetching profile...');

                try {
                    // Defensive: Check session validity before profile fetch
                    const { data: profile, error } = await supabase
                        .from('perfis_de_usuário')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .single();

                    if (error) {
                        console.error('[AuthProvider] Profile fetch error:', error);
                        return;
                    }

                    if (!profile) {
                        console.warn('[AuthProvider] Profile not found for user:', session.user.id);
                        return;
                    }

                    // Defensive: Validate required profile fields
                    if (!profile.name || !session.user.email) {
                        console.error('[AuthProvider] Invalid profile data:', profile);
                        return;
                    }

                    const loggedUser: UserAccount = {
                        id: session.user.id,
                        name: profile.name,
                        email: session.user.email,
                        role: profile.papel,
                        active: true,
                        permissions: profile.permissoes || profile.permissions || {
                            manage_team: false,
                            manage_clients: false,
                            manage_inventory: false,
                            config_rates: false,
                            config_vehicles: false,
                            config_system: false,
                            view_financials: false
                        },
                        organization_id: profile.organization_id || 'org_1',
                        phone: profile.phone || '',
                        created_at: profile.created_at || new Date().toISOString(),
                        user_id: session.user.id
                    };

                    console.log('[AuthProvider] Profile loaded successfully:', loggedUser.email);
                    setUser(loggedUser);
                    setIsAuthenticated(true);
                    localStorage.setItem('g40_user_session', JSON.stringify(loggedUser));
                } catch (e) {
                    console.error('[AuthProvider] Unexpected error during profile fetch:', e);
                }
            }
        });

        // Step 3: Mark initialization complete
        setIsLoading(false);
        console.log('[AuthProvider] Initialization complete');

        return () => {
            console.log('[AuthProvider] Cleanup: unsubscribing from auth listener');
            subscription.unsubscribe();
        };
    }, []);

    const login = async (userData: any) => {
        try {
            // Se já vier com ID e Role (do Supabase/AuthService), usamos direto
            if (userData.id && userData.role) {
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('g40_user_session', JSON.stringify(userData));
                return;
            }

            // Lógica legada para Mock / Fallback
            const users = await dataProvider.getUsers();
            let matchedUser = users.find(u => u.email === userData.email);

            // Se não houver nenhum usuário (primeiro acesso Supabase) ou usuário não encontrado
            if (!matchedUser) {
                // Se a lista estiver vazia, cria o primeiro admin
                if (users.length === 0) {
                    const newUser = await dataProvider.createUser({
                        name: userData.name || 'Admin',
                        email: userData.email,
                        role: 'admin',
                        active: true,
                        permissions: {
                            manage_team: true,
                            manage_clients: true,
                            manage_inventory: true,
                            config_rates: true,
                            config_vehicles: true,
                            config_system: true,
                            view_financials: true
                        }
                    });
                    if (newUser.data) matchedUser = newUser.data;
                } else {
                    // Fallback para usuário existente se existir
                    if (users.length > 0) matchedUser = users[0];
                }
            }

            if (matchedUser) {
                setUser(matchedUser);
                setIsAuthenticated(true);
                localStorage.setItem('g40_user_session', JSON.stringify(matchedUser));
            } else {
                alert("Usuário não encontrado e falha ao criar. Verifique o banco de dados.");
            }
        } catch (e) {
            console.error("Login error:", e);
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('g40_user_session');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isPasswordRecovery, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
