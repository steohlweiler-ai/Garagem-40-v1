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

            console.log(`[NotificationService] Verificando ${appointments.length} agendamentos. Hoje: ${today}, Hora: ${now.toLocaleTimeString('pt-BR')}`);

            // Filtrar agendamentos de hoje que ainda não foram notificados
            const todayAppointments = appointments.filter(app =>
                app.date === today &&
                app.notify_enabled &&
                !this.notifiedIds.has(app.id)
            );

            console.log(`[NotificationService] ${todayAppointments.length} agendamentos elegíveis hoje`);

            for (const app of todayAppointments) {
                const shouldNotifyResult = this.shouldNotify(app, now);
                console.log(`[NotificationService] App "${app.title}" (${app.time}, aviso ${app.notify_before_minutes}min antes) -> notificar: ${shouldNotifyResult}`);

                if (shouldNotifyResult) {
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
        // Parsear a hora do agendamento (formato HH:MM)
        const timeParts = app.time.split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        // Criar data do agendamento no fuso horário local
        const dateParts = app.date.split('-');
        const appointmentTime = new Date(
            parseInt(dateParts[0], 10),  // ano
            parseInt(dateParts[1], 10) - 1,  // mês (0-indexed)
            parseInt(dateParts[2], 10),  // dia
            hours,
            minutes,
            0
        );

        // Calcular momento do aviso
        const notifyTime = new Date(appointmentTime.getTime() - (app.notify_before_minutes * 60 * 1000));

        // Janela de notificação: desde o notifyTime até o horário do evento
        // Isso garante que a notificação dispare mesmo se o usuário abriu o app após o notifyTime
        const windowEnd = appointmentTime;

        console.log(`[NotificationService] DEBUG: agendamento=${appointmentTime.toLocaleString('pt-BR')}, notifyTime=${notifyTime.toLocaleString('pt-BR')}, now=${now.toLocaleString('pt-BR')}`);

        return now >= notifyTime && now <= windowEnd;
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
