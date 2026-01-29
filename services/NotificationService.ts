/**
 * NotificationService - Sistema de notificações para agendamentos
 * 
 * Funcionalidades:
 * - Solicita permissão de notificação do navegador
 * - Verifica agendamentos a cada minuto
 * - Dispara notificações quando chega a hora (considerando notify_before_minutes)
 * - Evita duplicatas usando localStorage
 */

import { dataProvider } from './dataProvider';
import { Appointment } from '../types';

class NotificationService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private notifiedIds: Set<string>;

    constructor() {
        // Carregar IDs já notificados do localStorage
        const stored = localStorage.getItem('notified_appointments');
        this.notifiedIds = new Set(stored ? JSON.parse(stored) : []);
    }

    /**
     * Solicita permissão de notificação do navegador
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('[NotificationService] Notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('[NotificationService] Notifications denied by user');
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Inicia o serviço de verificação de notificações
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            console.log('[NotificationService] Sem permissão para notificações');
            return;
        }

        console.log('[NotificationService] Iniciando serviço de notificações');
        this.isRunning = true;

        // Verificar imediatamente e depois a cada 60 segundos
        this.checkAppointments();
        this.intervalId = setInterval(() => this.checkAppointments(), 60000);
    }

    /**
     * Para o serviço de verificação
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[NotificationService] Serviço parado');
    }

    /**
     * Verifica agendamentos e dispara notificações se necessário
     */
    private async checkAppointments(): Promise<void> {
        try {
            const appointments = await dataProvider.getAppointments();
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            // Filtrar agendamentos de hoje que ainda não foram notificados
            const todayAppointments = appointments.filter(app =>
                app.date === today &&
                app.notify_enabled &&
                !this.notifiedIds.has(app.id)
            );

            for (const app of todayAppointments) {
                if (this.shouldNotify(app, now)) {
                    this.sendNotification(app);
                    this.markAsNotified(app.id);
                }
            }

            // Limpar notificações antigas (mais de 24h)
            this.cleanupOldNotifications();

        } catch (error) {
            console.error('[NotificationService] Erro ao verificar agendamentos:', error);
        }
    }

    /**
     * Verifica se deve disparar notificação para o agendamento
     */
    private shouldNotify(app: Appointment, now: Date): boolean {
        const [hours, minutes] = app.time.split(':').map(Number);
        const appointmentTime = new Date(app.date);
        appointmentTime.setHours(hours, minutes, 0, 0);

        // Calcular momento do aviso
        const notifyTime = new Date(appointmentTime.getTime() - (app.notify_before_minutes * 60 * 1000));

        // Verificar se já passou o horário do aviso mas não passou muito
        // (5 minutos de tolerância para não perder notificações)
        const fiveMinutesAfter = new Date(notifyTime.getTime() + 5 * 60 * 1000);

        return now >= notifyTime && now <= fiveMinutesAfter;
    }

    /**
     * Envia a notificação do navegador
     */
    private sendNotification(app: Appointment): void {
        const title = app.type === 'service_delivery' ? '🚗 Entrega Agendada' : '📅 Lembrete';
        const body = `${app.title}\nHorário: ${app.time}${app.client_name ? `\nCliente: ${app.client_name}` : ''}`;

        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: app.id, // Evita duplicatas
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        console.log('[NotificationService] Notificação disparada:', app.title);
    }

    /**
     * Marca agendamento como notificado
     */
    private markAsNotified(id: string): void {
        this.notifiedIds.add(id);
        localStorage.setItem('notified_appointments', JSON.stringify([...this.notifiedIds]));
    }

    /**
     * Limpa notificações antigas do localStorage
     */
    private cleanupOldNotifications(): void {
        // Manter apenas os últimos 100 IDs
        if (this.notifiedIds.size > 100) {
            const arr = [...this.notifiedIds];
            this.notifiedIds = new Set(arr.slice(-50));
            localStorage.setItem('notified_appointments', JSON.stringify([...this.notifiedIds]));
        }
    }
}

// Singleton
export const notificationService = new NotificationService();
