import { useState, useMemo, useEffect } from 'react';
import { ServiceJob, Vehicle, Client, ServiceStatus, DelayCriteria } from '../types';
import { dataProvider } from '../services/dataProvider';
import { calculateDelayStatus } from '../utils/helpers';

export type StatType = 'all' | 'delayed' | 'in_shop' | 'done' | 'pending' | 'in_progress' | 'reminder' | 'delivered';
export type SortOption = 'date_desc' | 'date_asc' | 'delivery_asc';

export interface ClientStats {
    all: number;
    delayed: number;
    in_shop: number;
    done: number;
    pending: number;
    in_progress: number;
    reminder: number;
    delivered: number;
}

export interface ServiceWithVehicle extends ServiceJob {
    vehicle_plate: string;
    vehicle_model: string;
    vehicle_brand: string;
}

export function useClientStats(client: Client | null, vehicles: Vehicle[], delayCriteria: DelayCriteria | null = null) {
    const [services, setServices] = useState<ServiceWithVehicle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<StatType>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');

    // Load Services for all Client Vehicles
    useEffect(() => {
        if (!client) {
            setServices([]);
            return;
        }

        const loadServices = async () => {
            setIsLoading(true);
            try {
                const clientVehicles = vehicles.filter(v => v.client_id === client.id);
                let all: ServiceWithVehicle[] = [];

                for (const v of clientVehicles) {
                    const vehicleServices = await dataProvider.getServicesByVehicle(v.id);
                    const mapped = vehicleServices.map(s => ({
                        ...s,
                        vehicle_plate: v.plate,
                        vehicle_model: v.model,
                        vehicle_brand: v.brand
                    }));
                    all = [...all, ...mapped];
                }
                setServices(all);
            } catch (e) {
                console.error("Error loading client services:", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadServices();
    }, [client, vehicles]);

    // Compute Stats
    const stats = useMemo(() => {
        return services.reduce(
            (acc, s) => {
                acc.all++;
                if (s.status === ServiceStatus.ENTREGUE) acc.delivered++;
                else acc.in_shop++;

                if (s.status === ServiceStatus.PRONTO) acc.done++;
                if (s.status === ServiceStatus.PENDENTE) acc.pending++;
                if (s.status === ServiceStatus.EM_ANDAMENTO) acc.in_progress++;
                if (s.status === ServiceStatus.LEMBRETE) acc.reminder++;

                // Check if delayed
                if (s.estimated_delivery && delayCriteria && s.status !== ServiceStatus.ENTREGUE) {
                    const delayStatus = calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority);
                    if (delayStatus.isDelayed) acc.delayed++;
                }

                return acc;
            },
            { all: 0, delayed: 0, in_shop: 0, done: 0, pending: 0, in_progress: 0, reminder: 0, delivered: 0 } as ClientStats
        );
    }, [services, delayCriteria]);

    // Filter Services
    const filteredServices = useMemo(() => {
        let result = services;

        // 1. Status Filter (Tabs)
        if (activeTab !== 'all') {
            if (activeTab === 'delayed') {
                result = result.filter(s => {
                    if (!s.estimated_delivery || !delayCriteria || s.status === ServiceStatus.ENTREGUE) return false;
                    return calculateDelayStatus(s.estimated_delivery, delayCriteria, s.priority).isDelayed;
                });
            } else if (activeTab === 'in_shop') {
                result = result.filter(s => s.status !== ServiceStatus.ENTREGUE);
            } else if (activeTab === 'done') {
                result = result.filter(s => s.status === ServiceStatus.PRONTO);
            } else if (activeTab === 'pending') {
                result = result.filter(s => s.status === ServiceStatus.PENDENTE);
            } else if (activeTab === 'in_progress') {
                result = result.filter(s => s.status === ServiceStatus.EM_ANDAMENTO);
            } else if (activeTab === 'reminder') {
                result = result.filter(s => s.status === ServiceStatus.LEMBRETE);
            } else if (activeTab === 'delivered') {
                result = result.filter(s => s.status === ServiceStatus.ENTREGUE);
            }
        }

        // 2. Date Range Filter
        if (dateRange.start || dateRange.end) {
            const start = dateRange.start ? new Date(dateRange.start).setHours(0, 0, 0, 0) : 0;
            const end = dateRange.end ? new Date(dateRange.end).setHours(23, 59, 59, 999) : Infinity;

            result = result.filter(s => {
                const d = new Date(s.entry_at).getTime();
                return d >= start && d <= end;
            });
        }

        // 3. Sorting
        result = [...result].sort((a, b) => { // Create copy to avoid mutating state
            const dateA = new Date(a.entry_at).getTime();
            const dateB = new Date(b.entry_at).getTime();

            if (sortBy === 'date_desc') return dateB - dateA;
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'delivery_asc') {
                // Handle missing delivery dates by pushing them to end
                const delA = a.estimated_delivery ? new Date(a.estimated_delivery).getTime() : Infinity;
                const delB = b.estimated_delivery ? new Date(b.estimated_delivery).getTime() : Infinity;
                return delA - delB;
            }
            return 0;
        });

        return result;
    }, [services, activeTab, dateRange, sortBy]);

    return {
        rawServices: services,
        filteredServices,
        stats,
        isLoading,
        filters: {
            activeTab,
            setActiveTab,
            dateRange,
            setDateRange,
            sortBy,
            setSortBy
        }
    };
}
