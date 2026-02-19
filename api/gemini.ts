import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const INVOICE_SYSTEM = `You are an OCR engine specialized in Brazilian Invoices (DANFE).
OBJECTIVE: Extract only product items, ignoring logos, issuer data, or taxes.
CLEANING PROCEDURE:
1. Identify the products table.
2. Ignore rows such as 'TOTAL', 'BASE CÁLCULO' (Tax Base), or 'ISSQN'.
3. Correct names: 'OLEO' -> 'Óleo', 'SINTET' -> 'Sintético'.
4. Format numbers: Use a dot for decimals (e.g., 10.50).
OUTPUT: Return ONLY a pure JSON array. Do not use markdown (such as \`\`\`json).`

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
  if (!text) return "NÃO_ENCONTRADO";

  // 1. Limpeza inicial: Remove espaços, hífens e deixa em maiúsculo
  let clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 2. Se não tiver 7 caracteres, o OCR falhou na leitura completa
  if (clean.length !== 7) return "NÃO_ENCONTRADO";

  // 3. Regras de correção posicional (Evita confusão entre 0/O, 1/I, 8/B)
  const chars = clean.split('');

  // Primeiros 3 caracteres: SEMPRE Letras
  for (let i = 0; i < 3; i++) {
    chars[i] = chars[i].replace('0', 'O').replace('1', 'I').replace('8', 'B').replace('5', 'S');
  }

  // 4º caractere: SEMPRE Número
  chars[3] = chars[3].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5');

  // 5º caractere: Letra (Mercosul) ou Número (Antiga)
  // Deixamos como está, mas o Regex abaixo validará.

  // 6º e 7º caracteres: SEMPRE Números
  for (let i = 5; i < 7; i++) {
    chars[i] = chars[i].replace('O', '0').replace('I', '1').replace('B', '8').replace('S', '5');
  }

  const finalPlate = chars.join('');

  // 4. Validação por Regex
  const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (oldPattern.test(finalPlate) || mercosulPattern.test(finalPlate)) {
    return finalPlate;
  }

  return "NÃO_ENCONTRADO";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { action, imageBase64 } = req.body || {};

  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'MISSING_API_KEY' });
  if (!action || !imageBase64) return res.status(400).json({ error: 'MISSING_FIELDS' });

try {
    // 1. Inicializa com a chave de API
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const isInvoice = action === 'scan_invoice';
    
    // 2. Define as instruções (Strings em inglês para as propriedades)
    const systemInstruction = isInvoice ? INVOICE_SYSTEM : PLATE_SYSTEM;

    // 3. CONFIGURAÇÃO CORRETA DO MODELO
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Removido o "-latest" para maior estabilidade
      systemInstruction: systemInstruction, // O nome da chave DEVE ser systemInstruction
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // 4. Chamada da API
    const result = await model.generateContent([
      isInvoice ? INVOICE_PROMPT : PLATE_PROMPT,
      { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
    ]);

    const response = await result.response;
    const text = response.text()?.trim() || "";

    if (isInvoice) {
      return res.status(200).json({ text });
    }

    const normalizedPlate = normalizePlate(text);
    return res.status(200).json({ texto: normalizedPlate });

} catch (error: any) {
    console.error("❌ ERRO GEMINI:", error.message);
    return res.status(500).json({ error: error.message });
}
