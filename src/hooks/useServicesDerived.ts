
import { useMemo } from 'react';
import { ServiceJob, ServiceStatus, Vehicle, Client, DelayCriteria } from '../types';
import { calculateDelayStatus } from '../utils/helpers';

export interface DashboardStats {
    atrasado: number;
    pendente: number;
    andamento: number;
    lembrete: number;
    pronto: number;
    entregue: number;
    total: number;
}

export function useServicesDerived(
    services: ServiceJob[],
    searchQuery: string,
    dashboardFilter: string,
    delayCriteria: DelayCriteria | null,
    allVehicles: Vehicle[],
    allClients: Client[]
) {
    // 1. Processed Services (Otimizado com Map - ETAPA 3)
    const processedServices = useMemo(() => {
        const vehicleMap = new Map(allVehicles.map(v => [v.id, v]));
        const clientMap = new Map(allClients.map(c => [c.id, c]));

        const normalize = (str: string) => str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
        const search = normalize(searchQuery);

        console.time('[PERF] useServicesDerived:processedServices');
        const filtered = services.filter(s => {
            const v = vehicleMap.get(s.vehicle_id);
            const c = clientMap.get(s.client_id);

            const matchesSearch = !search ||
                normalize(v?.plate || '').includes(search) ||
                normalize(c?.name || '').includes(search) ||
                normalize(v?.brand || '').includes(search) ||
                normalize(v?.model || '').includes(search);

            if (!matchesSearch) return false;

            // KPI Filter (Otimizado com priority_bucket + Fallback contra drift)
            if (dashboardFilter !== 'total') {
                const works = delayCriteria ? calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority) : { isDelayed: false };
                const isLate = s.priority_bucket === 0 || (s.estimated_delivery && works.isDelayed);

                if (dashboardFilter === 'Atrasado') {
                    if (!(isLate && s.status !== ServiceStatus.ENTREGUE)) return false;
                } else {
                    if (s.status !== dashboardFilter) return false;
                }
            }

            return true;
        });
        console.timeEnd('[PERF] useServicesDerived:processedServices');

        return filtered;
    }, [services, searchQuery, dashboardFilter, delayCriteria, allVehicles, allClients]);

    // 2. Computed Stats (If not provided by server)
    // Note: The server already returns stats in getServicesFiltered, but we might want client-side totals 
    // if searching or if the server stats only cover the current view.
    const stats: DashboardStats = useMemo(() => {
        const counts = {
            atrasado: 0,
            pendente: 0,
            andamento: 0,
            lembrete: 0,
            pronto: 0,
            entregue: 0,
            total: 0
        };

        services.forEach(s => {
            const works = delayCriteria ? calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority) : { isDelayed: false };
            const isLate = s.priority_bucket === 0 || (s.estimated_delivery && works.isDelayed);

            if (isLate && s.status !== ServiceStatus.ENTREGUE) counts.atrasado++;

            if (s.status === ServiceStatus.PENDENTE) counts.pendente++;
            else if (s.status === ServiceStatus.EM_ANDAMENTO) counts.andamento++;
            else if (s.status === ServiceStatus.LEMBRETE) counts.lembrete++;
            else if (s.status === ServiceStatus.PRONTO) counts.pronto++;
            else if (s.status === ServiceStatus.ENTREGUE) counts.entregue++;

            if (s.status !== ServiceStatus.ENTREGUE) counts.total++;
        });

        return counts;
    }, [services, delayCriteria]);

    return { processedServices, stats };
}
