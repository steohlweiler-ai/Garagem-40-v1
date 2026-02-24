
/**
 * Production-Grade Resilience Utility: safeCall
 * Features:
 * - Exponential Backoff Retries with Jitter
 * - Granular Circuit Breaker (per method:endpoint)
 * - HALF-OPEN State (Trial attempt)
 * - Structured Telemetry (__RPC_METRICS__)
 * - Error Classification (Retryable vs Fatal)
 * - Timeout Management
 */


// Removed direct supabase import to allow pure logic testing

import { AuthError, CircuitOpenError, NetworkError, TimeoutError } from './errors';

export enum OfflineReason {
    NETWORK_FAILURE = 'network_failure',
    CIRCUIT_OPEN = 'circuit_open',
    TIMEOUT = 'timeout'
}

interface CircuitState {
    status: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
    failures: number;
    lastFailureTime: number;
    nextTrialTime: number;
    lastUsed: number;
}

interface MetricEntry {
    endpoint: string;
    latency: number;
    success: boolean;
    timestamp: number;
    error?: string;
}

declare global {
    interface Window {
        __RPC_METRICS__: MetricEntry[];
    }
}

// Global metrics and circuit registry
if (typeof window !== 'undefined' && !window.__RPC_METRICS__) {
    window.__RPC_METRICS__ = [];
}

const CIRCUIT_REGISTRY = new Map<string, CircuitState>();
const MAX_CIRCUITS = 100;
const CIRCUIT_TTL_MS = 5 * 60 * 1000; // 5 minutes inactivity
const CIRCUIT_OPEN_DURATION_MS = 30 * 1000; // 30 seconds
const FAILURE_THRESHOLD = 5;

/**
 * Event Dispatcher for resilience sync
 */
function emitResilienceEvent(type: 'network:offline' | 'network:online' | 'circuit:open', detail?: any) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(`app:${type}`, { detail }));
}

/**
 * Cleanup registry to prevent memory leaks
 */
function cleanupRegistry() {
    if (CIRCUIT_REGISTRY.size <= MAX_CIRCUITS) return;
    const now = Date.now();
    for (const [key, state] of CIRCUIT_REGISTRY.entries()) {
        if (now - state.lastUsed > CIRCUIT_TTL_MS) {
            CIRCUIT_REGISTRY.delete(key);
        }
    }
}

function getCircuitState(key: string): CircuitState {
    cleanupRegistry();
    let state = CIRCUIT_REGISTRY.get(key);
    if (!state) {
        state = {
            status: 'CLOSED',
            failures: 0,
            lastFailureTime: 0,
            nextTrialTime: 0,
            lastUsed: Date.now()
        };
        CIRCUIT_REGISTRY.set(key, state);
    }
    state.lastUsed = Date.now();
    return state;
}

export interface SafeCallOptions {
    timeoutMs?: number;
    retries?: number;
    method?: string;
    idempotencyKey?: string;
    onAuthFatal?: () => Promise<void>;
    signal?: AbortSignal;
}

/**
 * High-order wrapper for async operations
 * Now throws standardized errors to be consumed by TanStack Query or UI.
 */
export async function safeCall<T>(
    endpoint: string,
    operation: (signal: AbortSignal) => Promise<T>,
    options: SafeCallOptions = {}
): Promise<T> {
    const {
        timeoutMs = 20000,
        retries = 2,
        method = 'rpc',
        idempotencyKey,
        onAuthFatal,
        signal: externalSignal
    } = options;

    const circuitKey = `${method}:${endpoint}`;
    const state = getCircuitState(circuitKey);
    const now = Date.now();

    // 1. Check Circuit Breaker
    if (state.status === 'OPEN') {
        if (now > state.nextTrialTime) {
            state.status = 'HALF-OPEN';
            console.warn(`[CIRCUIT] ${circuitKey} entering HALF-OPEN trial.`);
        } else {
            const err = new CircuitOpenError(`Circuito aberto para ${endpoint}`);
            emitResilienceEvent('circuit:open', { endpoint, reason: OfflineReason.CIRCUIT_OPEN });
            throw err;
        }
    } else if (state.status === 'HALF-OPEN') {
        throw new CircuitOpenError(`Tentativa em curso para ${endpoint}`);
    }

    let attempt = 0;
    while (attempt <= retries) {
        if (externalSignal?.aborted) throw new Error('Abortado pelo chamador');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const attemptStartTime = Date.now();

        // Sincronizar aborto externo
        const onExternalAbort = () => controller.abort();
        if (externalSignal) externalSignal.addEventListener('abort', onExternalAbort);

        try {
            const data = await operation(controller.signal);

            // Cleanup SUCCESS
            if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
            clearTimeout(timeoutId);

            // SUCCESS PATH
            if (state.status === 'HALF-OPEN') {
                console.log(`[CIRCUIT] ${circuitKey} SUCCESS. Closing circuit.`);
                emitResilienceEvent('network:online');
            }
            state.status = 'CLOSED';
            state.failures = 0;

            // Telemetry
            if (typeof window !== 'undefined') {
                window.__RPC_METRICS__.push({
                    endpoint,
                    latency: Date.now() - attemptStartTime,
                    success: true,
                    timestamp: Date.now()
                });
            }

            return data;

        } catch (err: any) {
            // Cleanup ERROR
            if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
            clearTimeout(timeoutId);

            const isAbort = err.name === 'AbortError' || err.name === 'TimeoutError';

            // Se foi um aborto externo, encerra imediatamente sem retry
            if (externalSignal?.aborted && isAbort) {
                throw err;
            }

            const status = err?.status || err?.status_code;

            // Error Classification
            const isAuthError = status === 401 || status === 403 || err.message?.includes('JWT') || err instanceof AuthError;
            const isNotFoundError = status === 404;
            const isConflictError = status === 409;
            const isValidationError = err.message?.toLowerCase().includes('validation') || err.message?.toLowerCase().includes('invalid');

            const isFatal = isAuthError || isNotFoundError || isConflictError || isValidationError;
            const isRetryable = !isFatal && (isAbort || !window.navigator.onLine || (status >= 500 && status < 600) || status === undefined);

            // Auth specific action
            if (isAuthError) {
                console.error(`🔴 [AUTH FATAL] ${endpoint} failed.`);
                if (onAuthFatal) await onAuthFatal();
                throw err instanceof AuthError ? err : new AuthError(err.message, status);
            }

            // Retry logic
            if (attempt < retries && isRetryable) {
                attempt++;
                const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 1000);
                console.warn(`⚠️ [RETRY] ${circuitKey} attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            // FATAL / EXHAUSTED PATH
            state.failures++;
            state.lastFailureTime = Date.now();

            if (state.failures >= FAILURE_THRESHOLD || state.status === 'HALF-OPEN') {
                state.status = 'OPEN';
                state.nextTrialTime = Date.now() + CIRCUIT_OPEN_DURATION_MS;
                console.error(`🚨 [CIRCUIT OPEN] ${circuitKey} opened for 30s after ${state.failures} failures.`);
                emitResilienceEvent('circuit:open', { endpoint });
            }

            // Telemetry
            if (typeof window !== 'undefined') {
                window.__RPC_METRICS__.push({
                    endpoint,
                    latency: Date.now() - attemptStartTime,
                    success: false,
                    timestamp: Date.now(),
                    error: err.message || 'Unknown error'
                });
            }

            // Throw standardized errors
            if (isAbort) throw new TimeoutError(`Tempo esgotado ao chamar ${endpoint}`);
            if (!window.navigator.onLine) {
                emitResilienceEvent('network:offline');
                throw new NetworkError(`Sem conexão de rede para ${endpoint}`);
            }

            throw err;
        }
    }

    throw new Error('Falha após múltiplas tentativas');
}


