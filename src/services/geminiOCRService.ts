// Gemini OCR Service — Calls backend proxy at /api/gemini
// API key is NEVER exposed to the client.
import { InvoiceItemReview } from '../types';

export interface GeminiInvoiceItem {
    original_name: string;
    clean_name: string;
    qty: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

async function callGeminiProxy(action: 'scan_invoice' | 'scan_plate', imageBase64: string): Promise<string> {
    const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, imageBase64 }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorCode = body?.error || `HTTP ${res.status}`;

        if (res.status === 429 || errorCode === 'RATE_LIMIT') {
            throw new Error('RATE_LIMIT');
        }
        if (res.status === 401 || errorCode === 'INVALID_API_KEY') {
            throw new Error('INVALID_API_KEY');
        }
        if (errorCode === 'MISSING_API_KEY') {
            throw new Error('INVALID_API_KEY');
        }

        throw new Error(errorCode);
    }

    const data = await res.json();
    return data.text;
}

/**
 * 🤖 SMART PARSE: Extract invoice items via backend proxy
 */
export async function scanInvoiceWithGemini(imageBase64: string): Promise<InvoiceItemReview[]> {
    try {
        console.log('🤖 [GEMINI PROXY] Starting invoice scan...');

        const text = await callGeminiProxy('scan_invoice', imageBase64);

        console.log('📝 [GEMINI PROXY] Raw response:', text.substring(0, 200));

        const jsonMatch = text.match(/[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found in Gemini response');
        }

        const geminiItems: GeminiInvoiceItem[] = JSON.parse(jsonMatch[0]);

        console.log(`✅ [GEMINI PROXY] Extracted ${geminiItems.length} items`);

        const items: InvoiceItemReview[] = geminiItems.map((item, idx) => ({
            id: `gemini_${Date.now()}_${idx}`,
            description: item.clean_name || item.original_name,
            qty: item.qty || 1,
            unit: item.unit || 'un',
            unit_price: item.unit_price || 0,
        }));

        return items;
    } catch (error: any) {
        if (error?.message === 'RATE_LIMIT' || error?.message === 'INVALID_API_KEY') {
            throw error;
        }
        console.error('❌ [GEMINI PROXY] Invoice extraction failed:', error);
        throw error;
    }
}

/**
 * 🚗 PLATE SCANNER: Extract license plate via backend proxy
 */
export async function scanLicensePlate(imageBase64: string): Promise<string> {
    try {
        console.log('🚗 [GEMINI PROXY] Starting plate scan...');

        const text = await callGeminiProxy('scan_plate', imageBase64);
        const plateText = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        console.log('📝 [GEMINI PROXY] Extracted plate:', plateText);

        if (plateText === 'NOTFOUND' || plateText.length < 6 || plateText.length > 8) {
            throw new Error('PLATE_NOT_FOUND');
        }

        const isValidFormat = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(plateText);
        if (!isValidFormat) {
            console.warn('⚠️ [GEMINI PROXY] Invalid plate format, returning anyway:', plateText);
        }

        return plateText;
    } catch (error: any) {
        if (error?.message === 'RATE_LIMIT' || error?.message === 'INVALID_API_KEY' || error?.message === 'PLATE_NOT_FOUND') {
            throw error;
        }
        console.error('❌ [GEMINI PROXY] Plate scan failed:', error);
        throw error;
    }
}

export const geminiOCRService = {
    scanInvoiceWithGemini,
    scanLicensePlate,
};
