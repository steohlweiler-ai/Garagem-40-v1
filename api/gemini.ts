import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const INVOICE_SYSTEM = `You are an OCR engine specialized in Brazilian Invoices (DANFE).
OBJECTIVE: Extract only product items, ignoring logos, issuer data, or taxes.
CLEANING PROCEDURE:
1. Identify the products table.
2. Ignore rows such as 'TOTAL', 'BASE CÁLCULO' (Tax Base), or 'ISSQN'.
3. Correct names: 'OLEO' -> 'Óleo', 'SINTET' -> 'Sintético'.
4. Format numbers: Use a dot for decimals (e.g., 10.50).
OUTPUT: Return ONLY a pure JSON array. Do not use markdown (such as \`\`\`json).`;

const INVOICE_PROMPT = `Extract all product items from this invoice image.

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

const PLATE_SYSTEM = `You are an expert in computer vision for Brazilian traffic.
OBJECTIVE: Locate and read the vehicle's primary license plate in the image.
RULES:
1. Ignore any text that does not follow the ABC1234 (Old) or ABC1D23 (Mercosul) format.
2. Ignore stickers, dealership names, or 'For Sale' signs.
3. If there is a reflection, try to infer the character based on the official font shape.
OUTPUT: Return ONLY the 7 characters of the plate, with no spaces or symbols. If not found, return: NOT_FOUND.`;

const PLATE_PROMPT = `Extract the license plate text from this image.
Return ONLY the plate characters:
- Uppercase letters only
- No spaces, no hyphens
- Example: ABC1234 or ABC1D23
- If no plate: NOT_FOUND`;

function normalizePlate(text: string): string {
  if (!text) return 'NÃO_ENCONTRADO';

  let clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.length !== 7) return 'NÃO_ENCONTRADO';

  const chars = clean.split('');

  // Positions 0-2: always letters
  for (let i = 0; i < 3; i++) {
    chars[i] = chars[i].replace('0', 'O').replace('1', 'I').replace('8', 'B').replace('5', 'S');
  }

  // Position 3: always digit
  chars[3] = chars[3].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5');

  // Positions 5-6: always digits
  for (let i = 5; i < 7; i++) {
    chars[i] = chars[i].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5');
  }

  const finalPlate = chars.join('');

  const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (oldPattern.test(finalPlate) || mercosulPattern.test(finalPlate)) {
    return finalPlate;
  }

  return 'NÃO_ENCONTRADO';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { action, imageBase64 } = req.body || {};

  console.log('🔑 GEMINI_API_KEY loaded:', GEMINI_API_KEY ? 'YES' : 'NO');

  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'MISSING_API_KEY' });
  if (!action || !imageBase64) return res.status(400).json({ error: 'MISSING_FIELDS' });

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const isInvoice = action === 'scan_invoice';
    const systemInstruction = isInvoice ? INVOICE_SYSTEM : PLATE_SYSTEM;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent([
      isInvoice ? INVOICE_PROMPT : PLATE_PROMPT,
      { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
    ]);

    const response = await result.response;
    const text = response.text()?.trim() || '';

    console.log(`✅ [GEMINI] ${action} — response (200 chars):`, text.substring(0, 200));

    if (isInvoice) {
      return res.status(200).json({ text });
    }

    // Plate: normalize and return as `text` (consistent with frontend)
    const normalizedPlate = normalizePlate(text);
    return res.status(200).json({ text: normalizedPlate });

  } catch (error: any) {
    const status = error?.status || error?.httpCode;
    const message = error?.message || 'Unknown error';

    // Log completo para diagnóstico nos logs da Vercel
    console.error('❌ [GEMINI] Full error:', JSON.stringify({
      status,
      message,
      code: error?.code,
      details: error?.errorDetails,
    }));

    // 429 real: somente se o HTTP status for explicitamente 429
    if (status === 429) {
      return res.status(429).json({ error: 'RATE_LIMIT', detail: message });
    }

    // 401 / chave inválida / projeto sem billing
    if (status === 401 || message.includes('API key') || message.includes('API_KEY_INVALID')) {
      return res.status(401).json({ error: 'INVALID_API_KEY', detail: message });
    }

    // Quota/billing: retorna 402 com mensagem específica (não confunde com rate-limit)
    if (message.includes('quota') || message.includes('billing') || message.includes('RESOURCE_EXHAUSTED')) {
      return res.status(402).json({ error: 'QUOTA_EXCEEDED', detail: message });
    }

    return res.status(500).json({ error: message });
  }
}

