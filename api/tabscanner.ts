import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import FormData from 'form-data';
import { kv } from '@vercel/kv';

// Tabscanner API Configuration
const API_URL = 'https://api.tabscanner.com/api/2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

    const TABSCANNER_API_KEY = process.env.TABSCANNER_API_KEY;
    console.log("TABSCANNER_API_KEY loaded:", process.env.TABSCANNER_API_KEY ? "YES" : "NO");

    if (!TABSCANNER_API_KEY) {
        return res.status(500).json({ error: 'MISSING_API_KEY', details: 'Tabscanner API key is not configured.' });
    }

    const { action, imageBase64, token } = req.body || {};

    try {
        if (action === 'upload') {
            if (!imageBase64) return res.status(400).json({ error: 'MISSING_IMAGE' });

            // Remove header provided by FileReader (e.g., "data:image/jpeg;base64,")
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            const formData = new FormData();
            formData.append('file', buffer, { filename: 'receipt.jpg', contentType: 'image/jpeg' });

            const date = new Date();
            const monthKey = `tabscanner:usage:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            // Check limit before processing
            const currentUsage = (await kv.get<number>(monthKey)) || 0;
            if (currentUsage >= 200) {
                console.warn(`[TABSCANNER] Monthly Usage Limit Reached (${currentUsage}/200). Blocking and forcing fallback.`);
                const error = new Error('Limit Exceeded - KV_FORCED');
                (error as any).response = { status: 402, data: { message: 'Quota Exceeded by internal tracker' } };
                throw error;
            }

            // Tabscanner options: 
            // - documentType: 'receipt' (default)
            // - testMode: true/false (start with actual processing to check quota)

            const response = await axios.post(`${API_URL}/process`, formData, {
                headers: {
                    'apikey': TABSCANNER_API_KEY,
                    ...formData.getHeaders(),
                },
            });

            // success: boolean, message: string, token: string, code: number
            if (response.data.success) {
                const isDuplicate = response.data.duplicate === true || response.data.code === 301;
                let warning = undefined;

                if (!isDuplicate) {
                    const newUsage = await kv.incr(monthKey);
                    // Set expiry for ~32 days to clean up old keys automatically
                    if (newUsage === 1) {
                        await kv.expire(monthKey, 60 * 60 * 24 * 32);
                    }
                    if (newUsage >= 180) {
                        warning = 'Approaching monthly tabscanner limit';
                        console.warn(`[TABSCANNER] Usage warning: ${newUsage}/200`);
                    }
                }

                return res.status(200).json({
                    token: response.data.token,
                    message: response.data.message,
                    cached: isDuplicate,
                    warning
                });
            } else {
                // Handle specific Tabscanner errors (e.g., 300 = Limit Exceeded)
                if (response.data.code === 300) {
                    return res.status(402).json({ error: 'QUOTA_EXCEEDED', details: response.data.message });
                }
                return res.status(400).json({ error: 'UPLOAD_FAILED', details: response.data.message });
            }

        } else if (action === 'poll') {
            if (!token) return res.status(400).json({ error: 'MISSING_TOKEN' });

            const response = await axios.get(`${API_URL}/result/${token}`, {
                headers: { 'apikey': TABSCANNER_API_KEY },
            });

            // Tabscanner result codes:
            // 200: Success (but check result.status)
            // result.status: 1 (pending), 2 (processing), 3 (done), 4 (failed)

            const result = response.data;

            if (result.status === 3) {
                return res.status(200).json({ status: 'DONE', data: result });
            } else if (result.status === 4) {
                return res.status(400).json({ status: 'FAILED', details: 'OCR processing failed.' });
            } else {
                return res.status(200).json({ status: 'PENDING' });
            }

        } else {
            return res.status(400).json({ error: 'INVALID_ACTION' });
        }
    } catch (error: any) {
        console.error('❌ [TABSCANNER] Error:', error.response?.data || error.message);

        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;

        // Fallback Logic for Quota Exceeded (429 or specific Tabscanner code)
        if (status === 402 || message?.includes('Limit Exceeded') || message?.includes('quota')) {
            console.warn('⚠️ [TABSCANNER] Quota Exceeded. Attempting Fallback to OCR.space...');

            const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || 'helloworld';

            try {
                const formData = new FormData();
                formData.append('base64Image', imageBase64); // OCR.space expects strict base64 or url
                formData.append('isOverlayRequired', 'false');
                formData.append('filetype', 'JPG');
                formData.append('detectOrientation', 'true');
                formData.append('scale', 'true');
                formData.append('OCREngine', '2'); // Use Engine 2 for better table extraction

                const fallbackRes = await axios.post('https://api.ocr.space/parse/image', formData, {
                    headers: {
                        'apikey': OCR_SPACE_API_KEY,
                        ...formData.getHeaders()
                    }
                });

                if (fallbackRes.data.IsErroredOnProcessing) {
                    throw new Error(fallbackRes.data.ErrorMessage?.[0] || 'OCR.space failed');
                }

                // Parse OCR.space result to mimic minimal Tabscanner structure
                // Note: OCR.space returns raw text, not structured receipts. 
                // We'll wrap it in a structure that frontend can try to parse or just display raw.
                const rawText = fallbackRes.data.ParsedResults?.[0]?.ParsedText || '';

                // Return a special "Done" status with fallback flag
                // The frontend needs to handle this structure.
                return res.status(200).json({
                    status: 'DONE',
                    data: {
                        result: {
                            lineItems: [], // OCR.space doesn't extract line items by default
                            rawText: rawText,
                            fallback: true
                        }
                    }
                });

            } catch (fallbackError: any) {
                console.error('❌ [FALLBACK] Failed:', fallbackError.message);
                return res.status(402).json({ error: 'QUOTA_EXCEEDED_AND_FALLBACK_FAILED', details: message });
            }
        }

        if (status === 401 || message?.includes('API key')) {
            return res.status(401).json({ error: 'INVALID_API_KEY' });
        }

        return res.status(status).json({ error: 'INTERNAL_ERROR', details: message });
    }
}
