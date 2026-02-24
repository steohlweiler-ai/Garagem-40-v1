import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserAccount } from '../types';
import { supabase, supabaseDB, AuthError } from '../services/supabaseService';
import { dataProvider } from '../services/dataProvider';

const AUTH_CHANNEL = 'app-auth';
const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes
const localOriginId = crypto.randomUUID();

interface AuthEvent {
    type: 'login' | 'logout' | 'session-update';
    originId: string;
    payload?: any;
    ts: number;
}

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
    const isMounted = useRef(true);

    // Broadcast Channel Ref
    const bcRef = useRef<BroadcastChannel | null>(null);
    const isLoggingOutRef = useRef(false);

    // Broadcast helper
    const broadcast = useCallback((type: AuthEvent['type'], payload?: any) => {
        const event: AuthEvent = { type, originId: localOriginId, payload, ts: Date.now() };

        // 1. BroadcastChannel
        if (bcRef.current) {
            bcRef.current.postMessage(event);
        }

        // 2. LocalStorage Fallback (with __local guard to prevent echo)
        localStorage.setItem(AUTH_CHANNEL, JSON.stringify({ ...event, __local: true }));
    }, []);

    // Logout implementation
    const logout = useCallback(async (isFromSync = false) => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        console.log(`[AuthProvider] Logout triggered (fromSync: ${isFromSync})`);

        // Send broadcast first to inform other tabs
        if (!isFromSync) {
            broadcast('logout');
        }

        // AUDIT-LOG
        const auditEntry = {
            event: 'user.signout',
            user_id: user?.id ?? 'unknown',
            email: user?.email ?? 'unknown',
            timestamp: new Date().toISOString(),
            source: isFromSync ? 'sync_event' : 'user_action'
        };
        console.log('[AUDIT]', JSON.stringify(auditEntry));

        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('[AuthProvider] signOut error:', e);
        } finally {
            if (isMounted.current) {
                setIsAuthenticated(false);
                setUser(null);
            }
            localStorage.removeItem('g40_user_session');
            isLoggingOutRef.current = false;
        }
    }, [user, broadcast]);

    // Session validator helper
    const validateSession = useCallback(async (isHeartbeat = false) => {
        let retries = isHeartbeat ? 2 : 0;
        const startTime = Date.now();

        while (retries >= 0) {
            try {
                // Use the protected single-flight fetcher from supabaseService
                const { session } = await supabaseDB.getSafeSession();

                if (!session) {
                    throw new AuthError('Sessão expirada', 401);
                }

                if (isHeartbeat) {
                    (window as any).__RPC_METRICS__?.push({
                        endpoint: 'auth_heartbeat',
                        latency: Date.now() - startTime,
                        success: true,
                        timestamp: Date.now()
                    });
                }

                return session;
            } catch (err: any) {
                const isAuthErr = err instanceof AuthError || err.status === 401 || err.status === 403;

                if (isAuthErr) {
                    console.warn('[AuthProvider] Auth validation failed - triggering global logout');
                    (window as any).__RPC_METRICS__?.push({
                        endpoint: 'auth_heartbeat_expired',
                        latency: Date.now() - startTime,
                        success: false,
                        timestamp: Date.now(),
                        error: 'session_expired'
                    });
                    await logout(true);
                    throw err;
                }

                if (retries > 0 && navigator.onLine) {
                    console.warn(`[AuthProvider] Network error during session validation, retrying... (${retries} left)`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                if (!navigator.onLine) {
                    console.log('[AuthProvider] Offline - skipping session validation');
                    window.dispatchEvent(new CustomEvent('app:network-failure', { detail: { reason: 'network_failure' } }));
                    return null;
                }

                // Final failure
                if (isHeartbeat) {
                    (window as any).__RPC_METRICS__?.push({
                        endpoint: 'auth_heartbeat_fatal',
                        latency: Date.now() - startTime,
                        success: false,
                        timestamp: Date.now(),
                        error: err.message
                    });
                    window.dispatchEvent(new CustomEvent('app:network-failure', {
                        detail: { reason: err.name === 'AbortError' ? 'timeout' : 'network_failure' }
                    }));
                }
                throw err;
            }
        }
    }, [logout]);

    // Unified Auth Initialization
    useEffect(() => {
        isMounted.current = true;

        // Setup BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            bcRef.current = new BroadcastChannel(AUTH_CHANNEL);
            bcRef.current.onmessage = (ev) => {
                const event = ev.data as AuthEvent;
                if (event.originId === localOriginId) return;

                console.log(`[AuthProvider] Auth event received from ${event.originId}:`, event.type);
                if (event.type === 'logout') {
                    logout(true);
                } else if (event.type === 'login' || event.type === 'session-update') {
                    // Logic to re-sync if needed - usually initialization handles it
                    window.location.reload();
                }
            };
        }

        // Setup storage fallback listener
        const handleStorage = (e: StorageEvent) => {
            if (e.key === AUTH_CHANNEL && e.newValue) {
                try {
                    const event = JSON.parse(e.newValue);
                    if (event.originId === localOriginId || event.__local) return;

                    if (event.type === 'logout') {
                        logout(true);
                    } else {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('[AuthProvider] Storage event parse error:', err);
                }
            }
        };
        window.addEventListener('storage', handleStorage);

        // Initialization Logic
        const initializeAuth = async () => {
            try {
                // Use getSafeSession for race condition safety during bootstrap
                const sessionData = await supabaseDB.getSafeSession();
                const session = sessionData?.session;

                if (!session) {
                    if (isMounted.current) {
                        setIsAuthenticated(false);
                        setUser(null);
                        localStorage.removeItem('g40_user_session');
                    }
                    return;
                }

                // Re-hydrate profile
                const savedUser = localStorage.getItem('g40_user_session');
                if (savedUser) {
                    try {
                        const parsed = JSON.parse(savedUser);
                        if (parsed?.id === session.user.id) {
                            if (isMounted.current) {
                                setUser(parsed);
                                setIsAuthenticated(true);
                            }
                            return;
                        }
                    } catch (e) { /* silent */ }
                }

                // If no saved user or mismatch, fetch fresh profile
                const { data: profile } = await supabase
                    .from('perfis_de_usuário')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (profile && isMounted.current) {
                    const loggedUser = {
                        id: session.user.id,
                        name: profile.name,
                        email: session.user.email,
                        role: profile.papel,
                        active: true,
                        permissions: profile.permissoes || {},
                        organization_id: profile.organization_id || 'org_1',
                        phone: profile.phone || '',
                        created_at: profile.created_at || new Date().toISOString(),
                        user_id: session.user.id
                    } as UserAccount;

                    setUser(loggedUser);
                    setIsAuthenticated(true);
                    localStorage.setItem('g40_user_session', JSON.stringify(loggedUser));
                }
            } catch (e) {
                console.error('[AuthProvider] Auth initialization exception:', e);
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        // Setup Heartbeat with jitter
        const jitter = Math.random() * 30000; // 0-30s
        const heartbeatId = setInterval(() => {
            if (isAuthenticated && !isLoggingOutRef.current) {
                validateSession(true).catch(() => {
                    // Failures recorded handled inside validateSession
                });
            }
        }, HEARTBEAT_INTERVAL + jitter);

        // Supabase Auth Listener (Native sync)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            } else if (event === 'SIGNED_OUT') {
                logout(true);
            } else if (event === 'SIGNED_IN' && !isAuthenticated) {
                // Handle external sign in (e.g. from another app or OAuth return)
                initializeAuth();
                broadcast('login');
            }
        });

        return () => {
            isMounted.current = false;
            if (bcRef.current) bcRef.current.close();
            window.removeEventListener('storage', handleStorage);
            clearInterval(heartbeatId);
            subscription.unsubscribe();
        };
    }, [isAuthenticated, logout, validateSession, broadcast]);

    const login = useCallback(async (userData: any) => {
        if (userData.id && userData.role) {
            if (isMounted.current) {
                setUser(userData);
                setIsAuthenticated(true);
            }
            localStorage.setItem('g40_user_session', JSON.stringify(userData));
            broadcast('login', userData);
            return;
        }
        // ... (mock fallback remains same if needed)
    }, [broadcast]);

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
