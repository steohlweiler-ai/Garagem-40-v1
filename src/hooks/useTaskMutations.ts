
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataProvider } from '../services/dataProvider';
import { ServiceTask, ServiceJob } from '../types';

export function useTaskMutations(serviceId: string) {
    const queryClient = useQueryClient();

    // Utility to update local cache
    const updateCache = (updater: (old: ServiceJob) => ServiceJob) => {
        // 1. Update Detail
        queryClient.setQueryData(['service', serviceId], (old: any) => {
            if (!old) return old;
            return updater(old);
        });

        // 2. Update Lists (Dashboard)
        queryClient.setQueriesData({ queryKey: ['services'] }, (old: any) => {
            if (!old || !old.data) return old;
            return {
                ...old,
                data: old.data.map((s: ServiceJob) =>
                    s.id === serviceId ? updater(s) : s
                )
            };
        });
    };

    // Generic Mutation Logic for Tasks
    const createTaskMutation = (mutationFn: (args: any) => Promise<any>, optimisticUpdate: (old: ServiceJob, args: any) => ServiceJob) => {
        return useMutation({
            mutationFn,
            retry: false,
            onMutate: async (args) => {
                // Cancel outgoing queries
                await queryClient.cancelQueries({ queryKey: ['service', serviceId] });
                await queryClient.cancelQueries({ queryKey: ['services'] });

                // Snapshot previous state
                const previousService = queryClient.getQueryData(['service', serviceId]);
                const previousLists = queryClient.getQueriesData({ queryKey: ['services'] });

                // Optimistic Update
                updateCache((old) => optimisticUpdate(old, args));

                return { previousService, previousLists };
            },
            onError: (err, args, context) => {
                console.error('[Task Mutation Error]:', err);
                if (context?.previousService) {
                    queryClient.setQueryData(['service', serviceId], context.previousService);
                }
                if (context?.previousLists) {
                    context.previousLists.forEach(([key, data]) => {
                        queryClient.setQueryData(key, data);
                    });
                }
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
                queryClient.invalidateQueries({ queryKey: ['services'] });
            },
        });
    };

    const addTask = createTaskMutation(
        ({ title, extras }: { title: string, extras?: Partial<ServiceTask> }) =>
            dataProvider.addTask(serviceId, title, extras),
        (old, { title, extras }) => ({
            ...old,
            tasks: [
                ...old.tasks,
                {
                    id: 'temp-' + Date.now(),
                    service_id: serviceId,
                    title,
                    status: 'todo',
                    charge_type: 'Fixo',
                    rate_per_hour: 120,
                    fixed_value: 0,
                    order: old.tasks.length,
                    ...extras
                } as ServiceTask
            ]
        })
    );

    const updateTask = createTaskMutation(
        ({ taskId, updates }: { taskId: string, updates: Partial<ServiceTask> }) =>
            dataProvider.updateTask(serviceId, taskId, updates),
        (old, { taskId, updates }) => ({
            ...old,
            tasks: old.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        })
    );

    const deleteTask = createTaskMutation(
        (taskId: string) => dataProvider.deleteTask(serviceId, taskId),
        (old, taskId) => ({
            ...old,
            tasks: old.tasks.filter(t => t.id !== taskId)
        })
    );

    const startTask = createTaskMutation(
        ({ taskId, user }: { taskId: string, user: { id: string, name: string } }) =>
            dataProvider.startTaskExecution(taskId, user),
        (old, { taskId, user }) => ({
            ...old,
            tasks: old.tasks.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        status: 'in_progress',
                        started_at: new Date().toISOString(),
                        last_executor_id: user.id,
                        last_executor_name: user.name
                    };
                }
                // Optimistically pause other running tasks to match backend behavior
                if (t.status === 'in_progress') {
                    return { ...t, status: 'todo', started_at: undefined };
                }
                return t;
            })
        })
    );

    const stopTask = createTaskMutation(
        ({ taskId, sessionDuration, totalDuration, user, startedAt }: { taskId: string, sessionDuration: number, totalDuration: number, user: { id: string, name: string }, startedAt: string }) =>
            dataProvider.stopTaskExecution(taskId, sessionDuration, totalDuration, user, startedAt),
        (old, { taskId, totalDuration }) => ({
            ...old,
            tasks: old.tasks.map(t => t.id === taskId ? {
                ...t,
                status: 'todo',
                started_at: undefined,
                time_spent_seconds: totalDuration
            } : t)
        })
    );

    return {
        addTask,
        updateTask,
        deleteTask,
        startTask,
        stopTask
    };
}
