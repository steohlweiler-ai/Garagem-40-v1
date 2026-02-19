import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const INVOICE_SYSTEM = `You are an expert data extractor specialized in Brazilian invoices (Notas Fiscais).
Analyze invoice images and extract product items with high precision.

RULES:
- Extract ONLY product items from the table/list
- Ignore tax lines, totals, headers, and footers
- Fix common abbreviations (OLEO → Óleo, SINTET → Sintético)
- Infer units if not explicit (un, lt, kg, cj, par, m)
- Convert comma decimals to dot (45,00 → 45.00)
- Return ONLY valid JSON, no markdown, no explanations`;

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

const PLATE_SYSTEM = `Extract Brazilian vehicle license plate text with maximum accuracy.
Return ONLY the plate characters (no formatting, no extra text).
Handle old (ABC1234) and Mercosul (ABC1D23) formats.
If no plate visible, return: NOT_FOUND`;

const PLATE_PROMPT = `Extract the license plate text from this image.
Return ONLY the plate characters:
- Uppercase letters only
- No spaces, no hyphens
- Example: ABC1234 or ABC1D23
- If no plate: NOT_FOUND`;

function normalizePlate(text: string): string {
  if (!text) return "NOT_FOUND";

  let cleaned = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  // Correções comuns OCR
  cleaned = cleaned
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1')
    .replace(/B/g, '8');

  // Validação básica placa BR
  const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (oldPattern.test(cleaned) || mercosulPattern.test(cleaned)) {
    return cleaned;
  }

  return "NOT_FOUND";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'MISSING_API_KEY' });
  }

  const { action, imageBase64 } = req.body || {};

  if (!action || !imageBase64) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  if (!['scan_invoice', 'scan_plate'].includes(action)) {
    return res.status(400).json({ error: 'INVALID_ACTION' });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const isInvoice = action === 'scan_invoice';
    const systemInstruction = isInvoice ? INVOICE_SYSTEM : PLATE_SYSTEM;
    const prompt = isInvoice ? INVOICE_PROMPT : PLATE_PROMPT;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 15000)
    );

    const geminiPromise = model.generateContent([
      prompt,
      { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
    ]);

    const result: any = await Promise.race([geminiPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text()?.trim() || "";

    if (isInvoice) {
      return res.status(200).json({ text });
    }

    const normalizedPlate = normalizePlate(text);

    return res.status(200).json({
      text: normalizedPlate
    });

  } catch (error: any) {
    const message = error?.message || "UNKNOWN_ERROR";

    console.error("❌ GEMINI ERROR:", message);

    if (message.includes('429') || message.includes('quota')) {
      return res.status(429).json({ error: 'RATE_LIMIT' });
    }

    if (message.includes('API key') || message.includes('401')) {
      return res.status(401).json({ error: 'INVALID_API_KEY' });
    }

    if (message.includes('TIMEOUT')) {
      return res.status(504).json({ error: 'TIMEOUT' });
    }

    return res.status(500).json({ error: message });
  }
}

