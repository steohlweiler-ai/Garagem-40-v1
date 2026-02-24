
console.log('[Module] useReminderMutations loading...');

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';
import { Reminder, ReminderWithService, ServiceJob } from '../types';

export function useReminderMutations(serviceId?: string) {
    const queryClient = useQueryClient();

    // Utility to update local cache
    const updateCache = (updater: (old: any) => any) => {
        // 1. Update Specific OS Detail (if serviceId provided)
        if (serviceId) {
            queryClient.setQueryData(['service', serviceId], (old: any) => {
                if (!old) return old;
                // If the detail has a reminders array, we would update it here
                // Note: ServiceJob type might need adjustment if we add reminders to it, 
                // but usually they are fetched separately in this app.
                return old;
            });
        }

        // 2. Update Global Reminders List (Agendamentos)
        queryClient.setQueriesData({ queryKey: ['reminders'] }, (old: any) => {
            if (!old) return old;
            if (Array.isArray(old)) {
                return updater(old);
            }
            return old;
        });

        // 3. Update Dashboard List (if any reminder data is visible there)
        queryClient.invalidateQueries({ queryKey: ['services'] });
    };

    // Generic Mutation Logic for Reminders
    const createReminderMutation = (mutationFn: (args: any) => Promise<any>, optimisticUpdate: (old: any[], args: any) => any[]) => {
        return useMutation({
            mutationFn,
            retry: false,
            onMutate: async (args) => {
                // Cancel outgoing queries
                await queryClient.cancelQueries({ queryKey: ['reminders'] });
                if (serviceId) await queryClient.cancelQueries({ queryKey: ['service', serviceId] });

                // Snapshot previous state
                const previousReminders = queryClient.getQueryData(['reminders']);
                const previousService = serviceId ? queryClient.getQueryData(['service', serviceId]) : null;

                // Optimistic Update
                updateCache((old) => optimisticUpdate(old, args));

                return { previousReminders, previousService };
            },
            onError: (err, args, context) => {
                console.error('[Reminder Mutation Error]:', err);
                if (context?.previousReminders) {
                    queryClient.setQueryData(['reminders'], context.previousReminders);
                }
                if (context?.previousService && serviceId) {
                    queryClient.setQueryData(['service', serviceId], context.previousService);
                }
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: ['reminders'] });
                if (serviceId) queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
            },
        });
    };

    const addReminder = createReminderMutation(
        (reminder: Partial<Reminder>) => {
            if (!serviceId) throw new Error("serviceId is required to add a reminder");
            return dataProvider.addReminder(serviceId, reminder);
        },
        (old, reminder) => [
            ...old,
            {
                id: 'temp-' + Date.now(),
                service_id: serviceId,
                status: 'active',
                ...reminder
            } as ReminderWithService
        ]
    );

    const updateReminder = createReminderMutation(
        ({ id, updates }: { id: string, updates: Partial<Reminder> }) =>
            dataProvider.updateReminder(id, updates),
        (old, { id, updates }) => old.map(r => r.id === id ? { ...r, ...updates } : r)
    );

    const toggleStatus = createReminderMutation(
        ({ id, status }: { id: string, status: string }) =>
            dataProvider.setReminderStatus(id, status),
        (old, { id, status }) => old.map(r => r.id === id ? { ...r, status } : r)
    );

    const deleteReminder = createReminderMutation(
        (id: string) => dataProvider.deleteReminder(id),
        (old, id) => old.filter(r => r.id !== id)
    );

    return {
        addReminder,
        updateReminder,
        toggleStatus,
        deleteReminder
    };
}

export default useReminderMutations;

