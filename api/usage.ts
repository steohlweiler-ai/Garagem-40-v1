import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

    try {
        const date = new Date();
        const monthKey = `tabscanner:usage:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const usage = (await kv.get<number>(monthKey)) || 0;
        const limit = 200;
        const warningThreshold = 180;

        return res.status(200).json({
            usage,
            limit,
            warningThreshold,
            isBlocked: usage >= limit,
            isWarning: usage >= warningThreshold,
            monthKey
        });
    } catch (error: any) {
        console.error('❌ [USAGE API] Error fetching usage from KV:', error.message);
        return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
    }
}
