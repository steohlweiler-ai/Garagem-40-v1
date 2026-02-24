
import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';
import { CircuitOpenError } from '../utils/errors';

export function useServicesQuery(options: {
    statuses?: string[];
    excludeStatuses?: string[];
    limit?: number;
    offset?: number;
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
        // Configurações do TanStack Query
        retry: false, // Delegado ao safeCall
        staleTime: 30000, // 30 segundos
    });
}
