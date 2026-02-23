import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { supabase } from '../services/supabaseService';
import { dataProvider } from '../services/dataProvider';

interface AuthContextType {
    isAuthenticated: boolean;
    user: UserAccount | null;
    login: (userData: any) => Promise<void>;
    logout: () => Promise<void>;
    isPasswordRecovery: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserAccount | null>(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isMounted = React.useRef(true);

    // Unified Auth Initialization (prevents race conditions)
    useEffect(() => {
        isMounted.current = true;
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

                    if (isMounted.current) {
                        console.log('[AuthProvider] Profile loaded:', loggedUser.email);
                        setUser(loggedUser);
                        setIsAuthenticated(true);
                        localStorage.setItem('g40_user_session', JSON.stringify(loggedUser));
                    }
                } catch (e) {
                    console.error('[AuthProvider] Unexpected error during profile fetch:', e);
                }
            }

            // SEC-FIX-1: Handle SIGNED_OUT from Supabase (token expired, remote logout, etc.)
            if (event === 'SIGNED_OUT') {
                console.log('[AuthProvider] SIGNED_OUT received — clearing local session');
                if (isMounted.current) {
                    setIsAuthenticated(false);
                    setUser(null);
                }
                localStorage.removeItem('g40_user_session');
            }
        });

        // Step 3: Mark initialization complete
        if (isMounted.current) {
            setIsLoading(false);
        }
        console.log('[AuthProvider] Initialization complete');

        return () => {
            isMounted.current = false;
            console.log('[AuthProvider] Cleanup: unsubscribing from auth listener');
            subscription.unsubscribe();
        };
    }, []);

    const login = React.useCallback(async (userData: any) => {
        try {
            // If already hydrated with ID and role (from Supabase/AuthService), use directly
            if (userData.id && userData.role) {
                if (isMounted.current) {
                    setUser(userData);
                    setIsAuthenticated(true);
                }
                localStorage.setItem('g40_user_session', JSON.stringify(userData));
                return;
            }

            // Legacy mock/fallback path — only for local dev with VITE_DATA_SOURCE=mock
            const users = await dataProvider.getUsers();
            const matchedUser = users.find(u => u.email === userData.email);

            // SEC-FIX-2: Removed auto-admin promotion for first user.
            // Silently fail if user not found — do not create accounts on-the-fly.
            if (!matchedUser) {
                console.warn('[AuthProvider] User not found in mock store for:', userData.email);
                return;
            }

            if (isMounted.current) {
                setUser(matchedUser);
                setIsAuthenticated(true);
            }
            localStorage.setItem('g40_user_session', JSON.stringify(matchedUser));
        } catch (e) {
            console.error('Login error:', e);
        }
    }, []);

    // SEC-FIX-3: logout() now revokes the server-side JWT via supabase.auth.signOut()
    // Without this call, the token would remain valid until its natural expiry (~1h)
    // even after clearing localStorage — a stolen JWT would still work.
    const logout = React.useCallback(async () => {
        // AUDIT-LOG: structured JSON for compliance/SIEM integration
        const auditEntry = {
            event: 'user.signout',
            user_id: user?.id ?? 'unknown',
            email: user?.email ?? 'unknown',
            timestamp: new Date().toISOString(),
            session_source: 'g40_user_session',
        };
        console.log('[AUDIT]', JSON.stringify(auditEntry));

        try {
            await supabase.auth.signOut(); // revokes JWT on Supabase server
        } catch (e) {
            console.error('[AuthProvider] signOut error:', e);
        } finally {
            // Always clear local state regardless of server response
            if (isMounted.current) {
                setIsAuthenticated(false);
                setUser(null);
            }
            localStorage.removeItem('g40_user_session');
        }
    }, [user]);

    const contextValue = React.useMemo(() => ({
        isAuthenticated, user, login, logout, isPasswordRecovery, isLoading
    }), [isAuthenticated, user, login, logout, isPasswordRecovery, isLoading]);

    return (
        <AuthContext.Provider value={contextValue}>
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
