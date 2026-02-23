/**
 * SLA Benchmark Utility — run from browser DevTools console
 *
 * Usage:
 *   1. Open the app in browser
 *   2. Open DevTools → Console
 *   3. Paste this entire script
 *   4. Call: await runBenchmark()
 *
 * It will exercise the data layer N times and print avg + p95 for each operation.
 */

import { dataProvider } from '../services/dataProvider';

const ITERATIONS = 10;

interface BenchmarkResult {
    operation: string;
    runs: number;
    avg: string;
    p95: string;
    min: string;
    max: string;
    timings: number[];
}

function calcStats(timings: number[]): { avg: string; p95: string; min: string; max: string } {
    const sorted = [...timings].sort((a, b) => a - b);
    const avg = (sorted.reduce((s, v) => s + v, 0) / sorted.length).toFixed(1);
    const p95idx = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[Math.min(p95idx, sorted.length - 1)].toFixed(1);
    const min = sorted[0].toFixed(1);
    const max = sorted[sorted.length - 1].toFixed(1);
    return { avg, p95, min, max };
}

async function benchmarkOp(name: string, fn: () => Promise<unknown>): Promise<BenchmarkResult> {
    const timings: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        await fn();
        timings.push(performance.now() - t0);
    }

    const stats = calcStats(timings);
    return { operation: name, runs: ITERATIONS, ...stats, timings };
}

export async function runBenchmark(): Promise<BenchmarkResult[]> {
    const today = new Date().toISOString().split('T')[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const dateTo = threeMonths.toISOString().split('T')[0];

    console.log('='.repeat(60));
    console.log('🔬 SLA BENCHMARK — Starting');
    console.log('='.repeat(60));

    const results: BenchmarkResult[] = [];

    // 1. getAppointments (limit 20, scoped to today → +3 months)
    const r1 = await benchmarkOp('getAppointments(limit=20)', () =>
        dataProvider.getAppointments({ dateFrom: today, dateTo, limit: 20 })
    );
    results.push(r1);
    console.log(`✅ ${r1.operation}: avg=${r1.avg}ms, p95=${r1.p95}ms, range=[${r1.min}..${r1.max}]ms`);

    // 2. getAllReminders (default limit)
    const r2 = await benchmarkOp('getAllReminders(active)', () =>
        dataProvider.getAllReminders(false, { dateFrom: today, dateTo })
    );
    results.push(r2);
    console.log(`✅ ${r2.operation}: avg=${r2.avg}ms, p95=${r2.p95}ms, range=[${r2.min}..${r2.max}]ms`);

    // 3. getAppointments (no filters — max limit 100 clamped)
    const r3 = await benchmarkOp('getAppointments(no-filter, limit=100)', () =>
        dataProvider.getAppointments({ limit: 100 })
    );
    results.push(r3);
    console.log(`✅ ${r3.operation}: avg=${r3.avg}ms, p95=${r3.p95}ms, range=[${r3.min}..${r3.max}]ms`);

    // 4. getAppointments today-only (NotificationService pattern)
    const r4 = await benchmarkOp('getAppointments(today-only)', () =>
        dataProvider.getAppointments({ dateFrom: today, dateTo: today })
    );
    results.push(r4);
    console.log(`✅ ${r4.operation}: avg=${r4.avg}ms, p95=${r4.p95}ms, range=[${r4.min}..${r4.max}]ms`);

    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.table(results.map(r => ({
        Operation: r.operation,
        'Avg (ms)': r.avg,
        'P95 (ms)': r.p95,
        'Min (ms)': r.min,
        'Max (ms)': r.max,
        '≤2s SLA': Number(r.p95) <= 2000 ? '✅ PASS' : '❌ FAIL'
    })));
    console.log('='.repeat(60));

    return results;
}

// Auto-export for browser usage
(window as any).__runSLABenchmark = runBenchmark;
console.log('📋 SLA Benchmark loaded. Call: await __runSLABenchmark()');
