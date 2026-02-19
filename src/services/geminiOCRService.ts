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
        if (res.status === 402 || errorCode === 'QUOTA_EXCEEDED') {
            // Quota/billing issue — not a true rate-limit
            throw new Error('QUOTA_EXCEEDED');
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
 * 🧾 TABSCANNER OCR: Extract invoice items via backend proxy
 * Workflow: Upload Image -> Get Token -> Poll Result -> Parse JSON
 */
export async function scanInvoice(imageBase64: string): Promise<InvoiceItemReview[]> {
    try {
        console.log('🧾 [TABSCANNER] Starting invoice scan...');

        // 1. Upload Image
        const uploadRes = await fetch('/api/tabscanner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload', imageBase64 }),
        });

        if (!uploadRes.ok) {
            const error = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || `HTTP ${uploadRes.status}`);
        }

        const { token } = await uploadRes.json();
        console.log('🧾 [TABSCANNER] Upload successful, token:', token);

        // 2. Poll for Results (Max 10 attempts, 2s interval)
        const maxAttempts = 15;
        let attempts = 0;
        let finalResult = null;

        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(res => setTimeout(res, 2000)); // Wait 2s

            const pollRes = await fetch('/api/tabscanner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'poll', token }),
            });

            if (pollRes.ok) {
                const data = await pollRes.json();
                if (data.status === 'DONE') {
                    finalResult = data.data;
                    break;
                } else if (data.status === 'FAILED') {
                    throw new Error('OCR_FAILED');
                }
                console.log(`⏳ [TABSCANNER] Polling attempt ${attempts}/${maxAttempts}...`);
            } else {
                const errorBody = await pollRes.json().catch(() => ({}));
                if (errorBody.error === 'QUOTA_EXCEEDED') throw new Error('QUOTA_EXCEEDED');
                // If pending or other non-fatal error, continue polling? 
                // Actually 202 is usually used for pending, but our proxy returns 200 with status PENDING.
                // Real errors like 402 should throw.
            }
        }

        if (!finalResult) {
            throw new Error('TIMEOUT');
        }

        console.log('✅ [TABSCANNER] Result received:', finalResult);

        // 3. Parse Items
        // Tabscanner structure: result.result.lineItems (array of objects)
        const resultData = finalResult.result || {};

        // Handle Fallback (OCR.space)
        if (resultData.fallback) {
            console.warn('⚠️ [OCR] Using Fallback (OCR.space) results');
            const rawText = resultData.rawText || '';

            // Simple logic to try to extract lines that look like items
            // "Item Name 100.00"
            const lines = rawText.split('\n');
            const items: InvoiceItemReview[] = lines
                .map((line: string, idx: number) => {
                    // Very basic regex to find price at end of line
                    const priceMatch = line.match(/(\d+[.,]\d{2})$/);
                    if (priceMatch) {
                        const unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
                        const description = line.replace(priceMatch[0], '').trim();
                        return {
                            id: `fallback_${Date.now()}_${idx}`,
                            description: description,
                            qty: 1,
                            unit: 'un',
                            unit_price: unitPrice,
                        };
                    }
                    return null;
                })
                .filter((i: any) => i !== null) as InvoiceItemReview[];

            return items.length > 0 ? items : [{
                id: 'fallback_error',
                description: 'OCR Falhou (Tentativa Fallback). Digite os itens manualmente.',
                qty: 1,
                unit: 'un',
                unit_price: 0
            }];
        }

        const lineItems = resultData.lineItems || [];

        const items: InvoiceItemReview[] = lineItems.map((item: any, idx: number) => ({
            id: `tab_${Date.now()}_${idx}`,
            description: item.descClean || item.desc || "Item Desconhecido",
            qty: parseFloat(item.qty) || 1,
            unit: item.unit || 'un',
            unit_price: parseFloat(item.unitPrice) || 0,
            // total_price: parseFloat(item.lineTotal) || 0, // Optional in our interface
        }));

        // Filter out empty items if necessary
        return items.filter(i => i.description !== "Item Desconhecido");

    } catch (error: any) {
        if (error?.message === 'QUOTA_EXCEEDED' || error?.message === 'INVALID_API_KEY') {
            throw error;
        }
        console.error('❌ [TABSCANNER] Invoice extraction failed:', error);
        throw error;
    }
}

// Deprecated alias for backward compatibility (temporarily) or refactor
export const scanInvoiceWithGemini = scanInvoice;


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
