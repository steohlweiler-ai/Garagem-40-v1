
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // O safeCall já gerencia retries com jitter e backoff
            staleTime: 60_000, // 1 minuto - dados são considerados frescos por 1 min
            gcTime: 5 * 60_000, // Antigo cacheTime no v5
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: false,
        }
    }
});

// Listener para sincronização com o motor de resiliência (safeCall)
if (typeof window !== 'undefined') {
    window.addEventListener('app:network:online', () => {
        console.log('🌐 [TanStack] Rede restabelecida - invalidando queries...');
        queryClient.invalidateQueries();
    });

    window.addEventListener('app:circuit:open', (e: any) => {
        console.warn('🚨 [TanStack] Circuito aberto detectado para:', e.detail?.endpoint);
        // Opcional: cancelar queries ativas para este endpoint
    });
}
