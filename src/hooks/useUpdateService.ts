import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';
import { ServiceJob } from '../types';

export function useUpdateService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceJob> }) => {
            // safeCall dentro do dataProvider/supabaseService já lida com resiliência
            return await dataProvider.updateService(id, updates);
        },
        retry: false, // Escritas não devem ser repetidas automaticamente se não forem garantidamente idempotentes

        onMutate: async ({ id, updates }) => {
            // 1. Cancela queries de saída (para não sobrescrever o update otimista)
            await queryClient.cancelQueries({ queryKey: ['services'] });
            await queryClient.cancelQueries({ queryKey: ['service', id] });

            // 2. Snapshot de todos os estados anteriores (Lista e Detalhe)
            const previousQueries = queryClient.getQueriesData({ queryKey: ['services'] });
            const previousService = queryClient.getQueryData(['service', id]);

            // 3. Atualização otimista no detalhe
            if (previousService) {
                queryClient.setQueryData(['service', id], (old: any) => ({
                    ...old,
                    ...updates
                }));
            }

            // 4. Atualização otimista em TODAS as listas de serviços (Dashboard, etc)
            queryClient.setQueriesData({ queryKey: ['services'] }, (old: any) => {
                if (!old || !old.data) return old;
                return {
                    ...old,
                    data: old.data.map((s: ServiceJob) =>
                        s.id === id ? { ...s, ...updates } : s
                    )
                };
            });

            // Retorna o contexto com os snapshots para o rollback
            return { previousQueries, previousService };
        },

        onError: (err, { id }, context) => {
            console.error(`[Mutation Error] Falha ao atualizar serviço ${id}:`, err);
            // 5. Rollback total em caso de erro
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousService) {
                queryClient.setQueryData(['service', id], context.previousService);
            }
        },

        onSettled: (data, error, { id }) => {
            // 6. Invalida para garantir sincronia com o servidor
            queryClient.invalidateQueries({ queryKey: ['services'] });
            queryClient.invalidateQueries({ queryKey: ['service', id] });
        },
    });
}
