
import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';
import { CircuitOpenError } from '../utils/errors';

export function useServicesQuery(options: {
    statuses?: string[];
    excludeStatuses?: string[];
    limit?: number;
    offset?: number;
    organizationId?: string;
}) {
    return useQuery({
        queryKey: ['services', options],
        queryFn: async ({ signal }) => {
            // O dataProvider já decide se usa Mock ou Supabase.
            // E o supabaseService já usa safeCall para as operações críticas.
            const result = await dataProvider.getServicesFiltered({
                ...options,
                signal
            });
            return result;
        },
        // CRITICAL: Do NOT fire until we have a valid organizationId from the auth session.
        // Without this, the query runs with undefined org → falls back to 'org-default' → wrong data.
        enabled: !!options.organizationId,
        // Configurações do TanStack Query
        retry: false, // Delegado ao safeCall
        staleTime: 60000, // 60 segundos
    });
}
