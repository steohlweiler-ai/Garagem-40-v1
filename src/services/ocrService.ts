// Generic OCR Service — Calls backend proxies without exposing API Keys
import { InvoiceItemReview } from '../types';

export interface ScanInvoiceResult {
    items: InvoiceItemReview[];
    warning?: string;
    cached?: boolean;
}

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

        const { token, warning, cached } = await uploadRes.json();
        console.log('🧾 [TABSCANNER] Upload successful, token:', token);
        if (warning) console.warn(warning);

        // 2. Poll for Results (Exponential Backoff)
        const maxAttempts = 12;
        let attempts = 0;
        let finalResult = null;
        let delay = 2000;

        const startTime = Date.now();

        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(res => setTimeout(res, delay));

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
                console.log(`⏳ [TABSCANNER] Polling attempt ${attempts}/${maxAttempts} (waited ${delay}ms)...`);
                delay = Math.min(delay * 1.5, 8000);
            } else {
                const errorBody = await pollRes.json().catch(() => ({}));
                if (errorBody.error === 'QUOTA_EXCEEDED') throw new Error('QUOTA_EXCEEDED');
            }
        }

        const totalTime = Date.now() - startTime;
        console.log(`⏱️ [TABSCANNER] Total Scan Time: ${totalTime}ms`);

        if (!finalResult) {
            throw new Error('TIMEOUT');
        }

        console.log('✅ [TABSCANNER] Result received:', finalResult);

        // 3. Parse Items
        const resultData = finalResult.result || {};

        // Handle Fallback (OCR.space)
        if (resultData.fallback) {
            console.warn('⚠️ [OCR] Using Fallback (OCR.space) results');
            const rawText = resultData.rawText || '';

            const lines = rawText.split('\n');
            const items: InvoiceItemReview[] = lines
                .map((line: string, idx: number) => {
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
        }));

        return items.filter(i => i.description !== "Item Desconhecido");

    } catch (error: any) {
        if (error?.message === 'QUOTA_EXCEEDED' || error?.message === 'INVALID_API_KEY') {
            throw error;
        }
        console.error('❌ [TABSCANNER] Invoice extraction failed:', error);
        throw error;
    }
}

/**
 * 🚗 PLATE SCANNER: Extract license plate via OCR.space Engine 1
 */
export async function scanLicensePlate(imageBase64: string): Promise<string> {
    try {
        console.log('🚗 [OCR.SPACE] Starting plate scan...');

        const res = await fetch('/api/ocr-plate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const plateText = data.text;

        console.log('📝 [OCR.SPACE] Extracted plate:', plateText);

        if (plateText === 'NÃO_ENCONTRADO' || plateText.length < 6 || plateText.length > 8) {
            throw new Error('PLATE_NOT_FOUND');
        }

        const isValidFormat = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(plateText);
        if (!isValidFormat) {
            console.warn('⚠️ [OCR.SPACE] Invalid plate format, returning anyway:', plateText);
        }

        return plateText;
    } catch (error: any) {
        if (error?.message === 'RATE_LIMIT' || error?.message === 'INVALID_API_KEY' || error?.message === 'PLATE_NOT_FOUND') {
            throw error;
        }
        console.error('❌ [OCR_PLATE] Plate scan failed:', error);
        throw error;
    }
}

export const ocrService = {
    scanInvoice,
    scanLicensePlate,
};
