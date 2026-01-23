import { ServiceJob, ServiceStatus } from '../types';

/**
 * Calculates the strict status of a Service Job based on its current state.
 * 
 * Rules of Priority:
 * 1. ENTREGUE: Manual override (check if already set to ENTREGUE).
 * 2. EM ANDAMENTO: If any task has status 'in_progress'.
 * 3. LEMBRETE: If no task running AND exists active reminder.
 * 4. PRONTO: If all tasks are 'done' AND no active reminders.
 * 5. PENDENTE: Fallback.
 */
export function calculateServiceStatus(service: ServiceJob): ServiceStatus {
    // 1. ENTREGUE is a final state, usually restricted by manual action.
    // However, if the logic is "strict update", we need to know if we 'can' revert from Entregue.
    // Usually, if it enters 'Entregue', it stays there unless manually reopened.
    // Assuming for now if it IS Entregue, we respect it, unless this function is called specifically to re-evaluate active states.
    if (service.status === ServiceStatus.ENTREGUE) {
        return ServiceStatus.ENTREGUE;
    }

    // 2. EM ANDAMENTO
    const hasRunningTasks = service.tasks.some(t => t.status === 'in_progress');
    if (hasRunningTasks) {
        return ServiceStatus.EM_ANDAMENTO;
    }

    // 3. LEMBRETE
    const hasActiveReminders = service.reminders.some(r => r.status === 'active');
    if (hasActiveReminders) {
        return ServiceStatus.LEMBRETE;
    }

    // 4. PRONTO
    const allTasksDone = service.tasks.length > 0 && service.tasks.every(t => t.status === 'done');
    if (allTasksDone) {
        return ServiceStatus.PRONTO;
    }

    // 5. PENDENTE
    return ServiceStatus.PENDENTE;
}
