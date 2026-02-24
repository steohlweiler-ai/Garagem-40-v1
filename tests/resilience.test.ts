
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeCall, OfflineReason } from '../src/utils/safeCall';

// Mock window.navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
    writable: true,
});

describe('Resilience Layer (safeCall)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.__RPC_METRICS__ = [];
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should succeed on the first attempt', async () => {
        const operation = vi.fn().mockResolvedValue('success');
        const { data, error } = await safeCall('test-endpoint', operation);

        expect(data).toBe('success');
        expect(error).toBeNull();
        expect(operation).toHaveBeenCalledTimes(1);
        expect(window.__RPC_METRICS__).toHaveLength(1);
        expect(window.__RPC_METRICS__[0].success).toBe(true);
    });

    it('should retry on transient failures and eventually succeed', async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error('Transient Error'))
            .mockResolvedValueOnce('success');

        const promise = safeCall('retry-endpoint', operation, { retries: 1 });

        // Fast-forward for retry delay
        await vi.runAllTimersAsync();

        const { data, error } = await promise;

        expect(data).toBe('success');
        expect(error).toBeNull();
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should open circuit after failure threshold', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Fatal Error'));

        // Trigger 5 failures to open circuit
        for (let i = 0; i < 5; i++) {
            await safeCall('breaker-endpoint', operation, { retries: 0 });
        }

        // 6th call should fail immediately with CircuitOpenError
        const { data, error } = await safeCall('breaker-endpoint', operation);

        expect(data).toBeNull();
        expect(error.name).toBe('CircuitOpenError');
        expect(error.reason).toBe(OfflineReason.CIRCUIT_OPEN);
    });

    it('should enter HALF-OPEN state after cooldown and trial success', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Error'));

        // Open circuit
        for (let i = 0; i < 5; i++) {
            await safeCall('half-open-endpoint', operation, { retries: 0 });
        }

        // Fast-forward 30s
        vi.advanceTimersByTime(31000);

        // Mock success for trial
        operation.mockResolvedValue('trial-success');

        const { data, error } = await safeCall('half-open-endpoint', operation);

        expect(data).toBe('trial-success');
        expect(error).toBeNull();

        // Circuit should be CLOSED now, next call should work
        operation.mockResolvedValue('normal-success');
        const res = await safeCall('half-open-endpoint', operation);
        expect(res.data).toBe('normal-success');
    });

    it('should record timestamped telemetry', async () => {
        const operation = vi.fn().mockResolvedValue('telemetry-test');
        const now = Date.now();
        vi.setSystemTime(now);

        await safeCall('telemetry-endpoint', operation);

        expect(window.__RPC_METRICS__[0].timestamp).toBe(now);
        expect(window.__RPC_METRICS__[0].endpoint).toBe('telemetry-endpoint');
    });
});
