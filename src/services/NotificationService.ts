/**
 * NotificationService - Sistema de notificações para agendamentos
 *
 * Funcionalidades:
 * - Solicita permissão de notificação do navegador
 * - Verifica agendamentos a cada minuto
 * - Dispara notificações quando chega a hora (considerando notify_before_minutes)
 * - Evita duplicatas usando localStorage
 * - Circuit-breaker: pausa após 3 falhas consecutivas, retenta após 5 min
 * - Timeout de 5s por ciclo para não bloquear
 */

import { dataProvider } from './dataProvider';
import { Appointment } from '../types';

const MAX_CONSECUTIVE_FAILURES = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_TIMEOUT_MS = 5000; // 5s per cycle

class NotificationService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private isChecking = false; // Mutex: prevents concurrent checkAppointments
    private notifiedIds: Set<string>;
    private consecutiveFailures = 0;
    private circuitOpenUntil: number | null = null;

    constructor() {
        const stored = localStorage.getItem('notified_appointments');
        this.notifiedIds = new Set(stored ? JSON.parse(stored) : []);
    }

    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('[NotificationService] Notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') return true;

        if (Notification.permission === 'denied') {
            console.warn('[NotificationService] Notifications denied by user');
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    async start(): Promise<void> {
        if (this.isRunning) return;

        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            console.log('[NotificationService] Sem permissão para notificações');
            return;
        }

        console.log('[NotificationService] Iniciando serviço de notificações');
        this.isRunning = true;

        this.checkAppointments();
        this.intervalId = setInterval(() => this.checkAppointments(), 60000);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[NotificationService] Serviço parado');
    }

    private async checkAppointments(): Promise<void> {
        // Concurrency guard: skip if previous cycle still running
        if (this.isChecking) {
            console.warn('[NotificationService] Previous check still running — skipping tick');
            return;
        }

        // Circuit-breaker: skip if open
        if (this.circuitOpenUntil) {
            if (Date.now() < this.circuitOpenUntil) {
                console.warn(`[NotificationService] Circuit-breaker OPEN — skipping check (retry in ${Math.round((this.circuitOpenUntil - Date.now()) / 1000)}s)`);
                return;
            }
            console.log('[NotificationService] Circuit-breaker HALF-OPEN — retrying');
            this.circuitOpenUntil = null;
        }

        this.isChecking = true;
        const t0 = performance.now();
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), CHECK_TIMEOUT_MS);

        try {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();

            const appointments = await dataProvider.getAppointments({
                dateFrom: today,
                dateTo: today,
                signal: abortController.signal,
            });

            const elapsed = (performance.now() - t0).toFixed(1);
            console.log(`[NotificationService] checkAppointments took ${elapsed}ms — ${appointments.length} appointments today`);

            this.consecutiveFailures = 0;

            const todayAppointments = appointments.filter(app =>
                app.notify_enabled && !this.notifiedIds.has(app.id)
            );

            for (const app of todayAppointments) {
                if (this.shouldNotify(app, now)) {
                    this.sendNotification(app);
                    this.markAsNotified(app.id);
                }
            }

            this.cleanupOldNotifications();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn(`[NotificationService] checkAppointments TIMEOUT (>${CHECK_TIMEOUT_MS}ms) — skipped`);
            } else {
                console.error('[NotificationService] Erro ao verificar agendamentos:', error);
            }

            this.consecutiveFailures++;
            if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
                console.error(`[NotificationService] Circuit-breaker OPENED after ${this.consecutiveFailures} failures — pausing for ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`);
            }
        } finally {
            this.isChecking = false;
            clearTimeout(timeoutId);
        }
    }

    private shouldNotify(app: Appointment, now: Date): boolean {
        const timeParts = app.time.split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        const dateParts = app.date.split('-');
        const appointmentTime = new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            hours,
            minutes,
            0
        );

        const notifyTime = new Date(appointmentTime.getTime() - (app.notify_before_minutes * 60 * 1000));
        const windowEnd = appointmentTime;

        return now >= notifyTime && now <= windowEnd;
    }

    private sendNotification(app: Appointment): void {
        const title = app.type === 'service_delivery' ? '🚗 Entrega Agendada' : '📅 Lembrete';
        const body = `${app.title}\nHorário: ${app.time}${app.client_name ? `\nCliente: ${app.client_name}` : ''}`;

        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: app.id,
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        console.log('[NotificationService] Notificação disparada:', app.title);
    }

    private markAsNotified(id: string): void {
        this.notifiedIds.add(id);
        localStorage.setItem('notified_appointments', JSON.stringify([...this.notifiedIds]));
    }

    private cleanupOldNotifications(): void {
        if (this.notifiedIds.size > 100) {
            const arr = [...this.notifiedIds];
            this.notifiedIds = new Set(arr.slice(-50));
            localStorage.setItem('notified_appointments', JSON.stringify([...this.notifiedIds]));
        }
    }
}

// Singleton
export const notificationService = new NotificationService();
