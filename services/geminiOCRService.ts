// Google Gemini 1.5 Flash OCR Service - Using Official SDK
// FREE TIER: 15 RPM (requests per minute) - Perfect for small garages!
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InvoiceItemReview } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface GeminiInvoiceItem {
    original_name: string;   // Raw from invoice
    clean_name: string;      // AI-cleaned (fix abbreviations)
    qty: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

/**
 * 🤖 SMART PARSE: Extract invoice items using Gemini 1.5 Flash
 * FREE TIER: Up to 15 requests/minute
 */
export async function scanInvoiceWithGemini(imageBase64: string): Promise<InvoiceItemReview[]> {
    try {
        console.log('🤖 [GEMINI SDK] Starting invoice scan...');

        // Remove data:image prefix if present
        const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Get the model
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `You are an expert data extractor specialized in Brazilian invoices (Notas Fiscais).
Analyze invoice images and extract product items with high precision.

RULES:
- Extract ONLY product items from the table/list
- Ignore tax lines, totals, headers, and footers
- Fix common abbreviations (OLEO → Óleo, SINTET → Sintético)
- Infer units if not explicit (un, lt, kg, cj, par, m)
- Convert comma decimals to dot (45,00 → 45.00)
- Return ONLY valid JSON, no markdown, no explanations`
        });

        const prompt = `Extract all product items from this invoice image.

Return a JSON array with this EXACT format:
[
  {
    "original_name": "exact text from invoice",
    "clean_name": "readable name with fixed abbreviations",
    "qty": number,
    "unit": "un|lt|kg|cj|par|m",
    "unit_price": number,
    "total_price": number
  }
]

CRITICAL: Return ONLY the JSON array, nothing else.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('📝 [GEMINI SDK] Raw response:', text.substring(0, 200));

        // Parse JSON from response (remove markdown if present)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found in Gemini response');
        }

        const geminiItems: GeminiInvoiceItem[] = JSON.parse(jsonMatch[0]);

        console.log(`✅ [GEMINI SDK] Extracted ${geminiItems.length} items`);

        // Convert to InvoiceItemReview format
        const items: InvoiceItemReview[] = geminiItems.map((item, idx) => ({
            id: `gemini_${Date.now()}_${idx}`,
            description: item.clean_name || item.original_name, // Use cleaned name
            qty: item.qty || 1,
            unit: item.unit || 'un',
            unit_price: item.unit_price || 0,
        }));

        return items;

    } catch (error: any) {
        // Handle rate limit (429 - Too Many Requests)
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
            console.error('⚠️ [GEMINI SDK] Rate limit hit (429)');
            throw new Error('RATE_LIMIT');
        }

        // Handle invalid API key
        if (error?.status === 401 || error?.message?.includes('API key')) {
            console.error('❌ [GEMINI SDK] Invalid API key');
            throw new Error('INVALID_API_KEY');
        }

        // Generic error
        console.error('❌ [GEMINI SDK] Extraction failed:', error);
        throw error;
    }
}

/**
 * 🚗 PLATE SCANNER: Extract license plate from vehicle photo
 * FREE TIER: Up to 15 requests/minute
 */
export async function scanLicensePlate(imageBase64: string): Promise<string> {
    try {
        console.log('🚗 [GEMINI SDK] Starting plate scan...');

        const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `Extract Brazilian vehicle license plate text with maximum accuracy.
Return ONLY the plate characters (no formatting, no extra text).
Handle old (ABC-1234) and Mercosul (ABC1D23) formats.
If no plate visible, return: NOT_FOUND`
        });

        const prompt = `Extract the license plate text from this image.
Return ONLY the plate characters:
- Uppercase letters only
- No spaces, no hyphens
- Example: "ABC1234" or "ABC1D23"
- If no plate: "NOT_FOUND"`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const response = await result.response;
        const plateText = response.text().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        console.log('📝 [GEMINI SDK] Extracted plate:', plateText);

        if (plateText === 'NOTFOUND' || plateText.length < 6 || plateText.length > 8) {
            throw new Error('PLATE_NOT_FOUND');
        }

        // Validate Brazilian plate format
        const isValidFormat = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(plateText);

        if (!isValidFormat) {
            console.warn('⚠️ [GEMINI SDK] Invalid plate format, returning anyway:', plateText);
        }

        return plateText;

    } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
            throw new Error('RATE_LIMIT');
        }

        if (error?.status === 401 || error?.message?.includes('API key')) {
            throw new Error('INVALID_API_KEY');
        }

        if (error?.message === 'PLATE_NOT_FOUND') {
            throw error;
        }

        console.error('❌ [GEMINI SDK] Plate scan failed:', error);
        throw error;
    }
}

export const geminiOCRService = {
    scanInvoiceWithGemini,
    scanLicensePlate
};

