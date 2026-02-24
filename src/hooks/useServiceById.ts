
import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';

export function useServiceById(id: string | null) {
    return useQuery({
        queryKey: ['service', id],
        queryFn: async ({ signal }) => {
            if (!id) return null;
            // O dataProvider.getServiceById deve ser revisado para usar safeCall internamente 
            // ou podemos envolver aqui se preferir, mas o padrão é no service.
            return await dataProvider.getServiceById(id, signal);
        },
        enabled: !!id,
        staleTime: 30000,
        retry: false,
    });
}
