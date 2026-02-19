import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import FormData from 'form-data';

function normalizePlate(text: string): string {
    if (!text) return 'NÃO_ENCONTRADO';

    let clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Allow partial strings to pass if they matches expected car shape roughly 
    // Usually OCR will miss or add chars. We look for a 7-char sequence.
    // Basic formatting to catch exact Brasil formats.
    if (clean.length < 6) return 'NÃO_ENCONTRADO';
    if (clean.length > 7) {
        clean = clean.substring(0, 7);
    }

    if (clean.length === 7) {
        const chars = clean.split('');

        // Positions 0-2: always letters (replace common digit misreads)
        for (let i = 0; i < 3; i++) {
            chars[i] = chars[i].replace('0', 'O').replace('1', 'I').replace('8', 'B').replace('5', 'S').replace('4', 'A');
        }

        // Position 3: always digit
        chars[3] = chars[3].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5').replace('A', '4');

        // Position 4: Letter (Mercosul) or Digit (Old)
        // Keep as is

        // Positions 5-6: always digits
        for (let i = 5; i < 7; i++) {
            chars[i] = chars[i].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5').replace('A', '4');
        }

        clean = chars.join('');
    }

    return clean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

    const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || 'helloworld';
    const { imageBase64 } = req.body || {};

    if (!imageBase64) return res.status(400).json({ error: 'MISSING_IMAGE' });

    try {
        console.log('🚗 [OCR.SPACE] Starting Plate Recognition via Engine 1...');

        const formData = new FormData();
        formData.append('base64Image', imageBase64);
        formData.append('filetype', 'JPG');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '1'); // Engine 1 is often better for simple text/plates than 2

        const fallbackRes = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                'apikey': OCR_SPACE_API_KEY,
                ...formData.getHeaders()
            }
        });

        if (fallbackRes.data.IsErroredOnProcessing) {
            throw new Error(fallbackRes.data.ErrorMessage?.[0] || 'OCR.space failed');
        }

        const rawText = fallbackRes.data.ParsedResults?.[0]?.ParsedText || '';
        console.log(`✅ [OCR.SPACE] Raw Plate Result:`, rawText.replace(/\n/g, ' '));

        const normalizedPlate = normalizePlate(rawText);

        return res.status(200).json({ text: normalizedPlate });
    } catch (error: any) {
        console.error('❌ [OCR_PLATE] Error:', error?.response?.data || error.message);

        if (error.response?.status === 403 || error.message.includes('API')) {
            return res.status(401).json({ error: 'INVALID_API_KEY', detail: error.message });
        }

        return res.status(500).json({ error: 'OCR_FAILED', detail: error.message });
    }
}
