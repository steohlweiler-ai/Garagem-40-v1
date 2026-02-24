import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ServiceJob, ServiceStatus, FilterConfig, Vehicle, Client } from '../types';
import { dataProvider } from '../services/dataProvider';
import { calculateDelayStatus } from '../utils/helpers';
import { useAuth } from './AuthProvider';

interface ServicesContextType {
    services: ServiceJob[];
    stats: {
        atrasado: number;
        pendente: number;
        andamento: number;
        lembrete: number;
        pronto: number;
        entregue: number;
        total: number;
    };
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    isOffline: boolean;
    offlineReason: 'network_failure' | 'circuit_open' | 'timeout' | null;
    error: { type: 'network' | 'timeout' | 'unknown' | 'circuit', message: string } | null;

    // Filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    dashboardFilter: string;
    setDashboardFilter: (filter: string) => void;
    advancedFilters: FilterConfig;
    setAdvancedFilters: (filters: FilterConfig) => void;

    // Actions
    loadMore: () => void;
    refresh: () => Promise<void>;
    /** Force-refresh bypassing re-entrancy guards. Use after mutations. */
    forceRefresh: () => Promise<void>;
    /** Inject a newly created service immediately into UI state (optimistic update). */
    injectServiceOptimistically: (service: ServiceJob) => void;
    /** Refreshes vehicles + clients reference data after wizard creates new entities. */
    refreshRefData: () => Promise<void>;
    handleSmartRetry: () => void;

    // Reference Data
    allVehicles: Vehicle[];
    allClients: Client[];
    delayCriteria: any;

    /** Record a service failure for resilience tracking (circuit breaker/offline logic) */
    recordFailure: (reason: 'network_failure' | 'timeout' | 'circuit_open') => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();

    const [services, setServices] = useState<ServiceJob[]>([]);
    const [statsCounts, setStatsCounts] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Filters
    const [dashboardFilter, setDashboardFilter] = useState<string>('total');
    const defaultFilters: FilterConfig = {
        statuses: [],
        sortBy: 'entrada_recente',
        startDate: undefined,
        endDate: undefined,
        startDeliveryDate: undefined,
        endDeliveryDate: undefined
    };
    const [advancedFilters, setAdvancedFilters] = useState<FilterConfig>(() => {
        const saved = localStorage.getItem('g40_dashboard_filters');
        return saved ? JSON.parse(saved) : defaultFilters;
    });

    // State for reference data
    const [delayCriteria, setDelayCriteria] = useState<any>(null);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);

    // Loading States
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreServices, setHasMoreServices] = useState(true);
    const pageRef = useRef(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isOffline, setIsOffline] = useState(!window.navigator.onLine);
    const [offlineReason, setOfflineReason] = useState<'network_failure' | 'circuit_open' | 'timeout' | null>(null);
    const [error, setError] = useState<{ type: 'network' | 'timeout' | 'unknown' | 'circuit', message: string } | null>(null);

    const recordFailure = useCallback((reason: 'network_failure' | 'timeout' | 'circuit_open') => {
        console.warn(`⚠️ [Resilience] Recording failure: ${reason}`);
        setIsOffline(true);
        setOfflineReason(reason);
    }, []);

    const PAGE_SIZE = 50;

    // Refs for race condition protection
    const loadStatsRequestIdRef = useRef(0);
    const loadServicesRequestIdRef = useRef(0);
    const loadingStatsRef = useRef(false);
    const loadingServicesRef = useRef(false);
    const loadingStatsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadingServicesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const delayCriteriaRef = useRef(delayCriteria);
    const hasInitializedRef = useRef(false);
    // Tracks IDs of optimistically-injected services still awaiting DB confirmation.
    // Used as reconciliation arbiter to prevent double-insertion and counter regression.
    const inFlightOptimisticIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        delayCriteriaRef.current = delayCriteria;
    }, [delayCriteria]);

    useEffect(() => {
        localStorage.setItem('g40_dashboard_filters', JSON.stringify(advancedFilters));
    }, [advancedFilters]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);


    // Load Stats
    const loadStats = useCallback(async () => {
        if (loadingStatsRef.current) return;
        loadingStatsRef.current = true;

        if (loadingStatsTimeoutRef.current) clearTimeout(loadingStatsTimeoutRef.current);
        loadingStatsTimeoutRef.current = setTimeout(() => {
            loadingStatsRef.current = false;
        }, 15000);

        const requestId = ++loadStatsRequestIdRef.current;
        const criteria = delayCriteriaRef.current;

        try {
            const counts = await dataProvider.getServiceCounts(criteria || null);
            if (requestId !== loadStatsRequestIdRef.current) return;
            if (!counts) return; // Don't clear state if data is missing

            const safeCount = counts;
            // PATCH-C: Protect against visual counter regression while optimistic IDs are in-flight.
            setStatsCounts(prev => {
                const inFlight = inFlightOptimisticIdsRef.current;
                if (inFlight.size === 0) return safeCount;
                return {
                    ...safeCount,
                    total: Math.max(safeCount['total'] || 0, prev['total'] || 0),
                };
            });
        } catch (err) {
            console.error('Failed to load stats:', err);
            // Resilience: do NOT clear statsCounts here, keep previous values
        } finally {
            if (loadingStatsTimeoutRef.current) clearTimeout(loadingStatsTimeoutRef.current);
            loadingStatsRef.current = false;
        }
    }, []);

    // Load Services
    const loadServices = useCallback(async (reset: boolean = false) => {
        if (loadingServicesRef.current) return;
        loadingServicesRef.current = true;

        if (loadingServicesTimeoutRef.current) clearTimeout(loadingServicesTimeoutRef.current);
        loadingServicesTimeoutRef.current = setTimeout(() => {
            if (loadingServicesRef.current) {
                console.warn('⚠️ [TIMEOUT] loadServices exceeded limit. Forcing loading=false.');
                loadingServicesRef.current = false;
                setIsInitialLoad(false);
                setIsLoadingMore(false);
                setError({ type: 'timeout', message: 'A conexão parece instável. Tente novamente.' });
            }
        }, 20000); // 20s safety timeout

        const requestId = ++loadServicesRequestIdRef.current;

        try {
            if (reset) {
                setError(null);
                setIsInitialLoad(true);
                setCurrentPage(0);
            } else {
                setIsLoadingMore(true);
            }

            const offset = reset ? 0 : pageRef.current * PAGE_SIZE;
            let excludeStatuses: string[] = [];
            let filterStatuses: string[] = [];

            const isDefaultView = dashboardFilter === 'total' &&
                advancedFilters.statuses.length === 0 &&
                !advancedFilters.startDate &&
                !advancedFilters.endDate;

            if (isDefaultView) {
                // SSoT: Em 'Total' mostramos tudo que está na oficina (inclusive Prontos)
                // para bater 100% com o contador do KPI.
                excludeStatuses = ['Entregue'];
            } else if (dashboardFilter !== 'total' && dashboardFilter !== 'Atrasado') {
                filterStatuses = [dashboardFilter];
            }

            const result = await dataProvider.getServicesFiltered({
                excludeStatuses,
                statuses: filterStatuses,
                limit: PAGE_SIZE,
                offset,
                sortBy: 'priority'
            });

            if (requestId !== loadServicesRequestIdRef.current) return;

            if (reset) {
                // SSoT: Sync stats if returned by RPC (Unified Data Source)
                if (result.stats) {
                    setStatsCounts(prev => {
                        const inFlight = inFlightOptimisticIdsRef.current;
                        if (inFlight.size === 0) return result.stats!;
                        return {
                            ...result.stats!,
                            total: Math.max(result.stats!['total'] || 0, prev['total'] || 0),
                        };
                    });
                }

                // PATCH-B: Safe reconciliation — preserve any optimistic services the DB hasn't
                // confirmed yet, avoiding a flash where the new OS disappears briefly.
                setServices(prev => {
                    const inFlight = inFlightOptimisticIdsRef.current;
                    if (inFlight.size === 0) return result.data;
                    const dbIds = new Set((result.data as ServiceJob[]).map(s => s.id));
                    // Keep optimistic entries not yet returned by DB
                    const orphaned = prev.filter(s => inFlight.has(s.id) && !dbIds.has(s.id));
                    // Clear confirmed IDs from the in-flight set
                    (result.data as ServiceJob[]).forEach(s => inFlight.delete(s.id));
                    return orphaned.length > 0 ? [...orphaned, ...result.data] : result.data;
                });
            } else {
                // PATCH-B (loadMore): dedup append to prevent duplicates after optimistic inject
                setServices(prev => {
                    const existingIds = new Set(prev.map(s => s.id));
                    const newItems = (result.data as ServiceJob[]).filter(s => !existingIds.has(s.id));
                    return [...prev, ...newItems];
                });
            }

            setHasMoreServices(result.hasMore);
            pageRef.current = reset ? 1 : pageRef.current + 1;
            setCurrentPage(pageRef.current);
        } catch (err: any) {
            console.error('Failed to load services:', err);
            let errorType: 'network' | 'timeout' | 'unknown' | 'circuit' = 'unknown';
            let errorMessage = 'Falha desconhecida. Tente novamente.';
            let reason: 'network_failure' | 'circuit_open' | 'timeout' | null = null;

            if (err.name === 'AbortError') {
                errorType = 'timeout';
                errorMessage = 'O servidor demorou muito para responder.';
                reason = 'timeout';
            } else if (err.name === 'CircuitOpenError') {
                errorType = 'circuit';
                errorMessage = 'Muitas falhas detectadas. Aguardando 30s.';
                reason = 'circuit_open';
            } else if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
                errorType = 'network';
                errorMessage = 'Falha na conexão com a internet.';
                reason = 'network_failure';
            }

            if (reset) {
                setServices([]);
                setHasMoreServices(false);
                setIsOffline(true);
                setOfflineReason(reason);
                setError({ type: errorType, message: errorMessage });
            }
        } finally {
            if (loadingServicesTimeoutRef.current) clearTimeout(loadingServicesTimeoutRef.current);
            setIsLoadingMore(false);
            setIsInitialLoad(false);
            loadingServicesRef.current = false;
        }
    }, [dashboardFilter, advancedFilters]);

    // Initial Data Load
    useEffect(() => {
        if (!isAuthenticated) return;

        const isFirstLoad = !hasInitializedRef.current;
        if (isFirstLoad) {
            hasInitializedRef.current = true;
            loadStats();
            loadServices(true);
        } else {
            loadStats();
            loadServices(true);
        }

        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, [isAuthenticated, dashboardFilter, advancedFilters, loadStats]);

    // stats calculation remains for now as it's less overhead than processedServices

    const stats = useMemo(() => ({
        atrasado: statsCounts['Atrasado'] || 0,
        pendente: statsCounts['Pendente'] || 0,
        andamento: statsCounts['Em Andamento'] || 0,
        lembrete: statsCounts['Lembrete'] || 0,
        pronto: statsCounts['Pronto'] || 0,
        entregue: statsCounts['Entregue'] || 0,
        total: statsCounts['total'] || 0
    }), [statsCounts]);

    const handleSmartRetry = async () => {
        setError(null);
        setIsInitialLoad(true);
        await loadServices(true);
    };

    const refresh = async () => {
        await Promise.all([loadStats(), loadServices(true)]);
    };

    /**
     * Resets re-entrancy guards before reloading.
     * Use after mutations (create/update) to guarantee the reload is never silently dropped.
     */
    const forceRefresh = useCallback(async () => {
        loadingStatsRef.current = false;
        loadingServicesRef.current = false;
        if (loadingStatsTimeoutRef.current) clearTimeout(loadingStatsTimeoutRef.current);
        if (loadingServicesTimeoutRef.current) clearTimeout(loadingServicesTimeoutRef.current);
        await Promise.all([loadStats(), loadServices(true)]);
    }, [loadStats, loadServices]);

    /**
     * Optimistic update: inserts a newly created service into local state immediately
     * without waiting for the next DB round-trip.
     * Registers the service ID in inFlightOptimisticIdsRef so the reconciliation
     * logic in loadServices/loadStats can safely merge DB results without regression.
     */
    const injectServiceOptimistically = useCallback((service: ServiceJob) => {
        // PATCH-A: Register ID as in-flight before any state mutation
        inFlightOptimisticIdsRef.current.add(service.id);
        setServices(prev => {
            if (prev.some(s => s.id === service.id)) return prev; // dedup: StrictMode safety
            return [service, ...prev];
        });
        setStatsCounts(prev => ({
            ...prev,
            [service.status]: (prev[service.status] || 0) + 1,
            total: (prev['total'] || 0) + 1,
        }));
    }, []);

    /**
     * Refreshes reference data (vehicles + clients) after wizard creates new entities.
     * Ensures the optimistically injected service card shows correct plate/name.
     */
    const refreshRefData = useCallback(async () => {
        try {
            console.log('[ServicesProvider] Loading reference data...');
            const [vehicles, clients] = await Promise.all([
                dataProvider.getVehicles(),
                dataProvider.getClients(),
            ]);
            setAllVehicles(vehicles);
            setAllClients(clients);
        } catch (err) {
            console.error('❌ [ServicesProvider] Failed to load reference data:', err);
        }
    }, []);

    // Initialize and Connectivity Listeners
    useEffect(() => {
        if (!isAuthenticated) return;

        refreshRefData();
        loadServices(true);
        loadStats();

        const handleOnline = () => {
            console.log('🌐 [Network] Back online - auto-refreshing...');
            setIsOffline(false);
            loadServices(true);
            loadStats();
        };

        const handleOffline = () => {
            console.warn('📡 [Network] Connection lost');
            setIsOffline(true);
            setOfflineReason('network_failure');
        };

        const handleAppFailure = (e: any) => {
            recordFailure(e.detail?.reason || 'network_failure');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('app:network-failure', handleAppFailure as any);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('app:network-failure', handleAppFailure as any);
        };
    }, [isAuthenticated, refreshRefData, loadServices, loadStats]);

    return (
        <ServicesContext.Provider value={{
            services,
            stats,
            isLoading: isInitialLoad,
            isLoadingMore,
            hasMore: hasMoreServices,
            isOffline,
            offlineReason,
            error,
            searchQuery,
            setSearchQuery,
            dashboardFilter,
            setDashboardFilter,
            advancedFilters,
            setAdvancedFilters,
            loadMore: () => loadServices(false),
            refresh,
            forceRefresh,
            injectServiceOptimistically,
            refreshRefData,
            handleSmartRetry,
            allVehicles,
            allClients,
            delayCriteria,
            recordFailure
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export const useServices = () => {
    const context = useContext(ServicesContext);
    if (context === undefined) {
        throw new Error('useServices must be used within a ServicesProvider');
    }
    return context;
};
