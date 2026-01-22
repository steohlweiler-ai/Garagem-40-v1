

export type NormalizationType = 'plate' | 'phone' | 'name' | 'currency' | 'cpf' | 'cnpj' | 'default';

/**
 * Converte palavras faladas em símbolos de pontuação (pós-processamento).
 */
export function postProcessPunctuation(spoken: string): string {
  if (!spoken) return '';

  let t = spoken;

  const rules = [
    { word: / vírgula/gi, symbol: ',' },
    { word: / ponto e vírgula/gi, symbol: ';' },
    { word: / ponto final/gi, symbol: '.' },
    { word: / dois pontos/gi, symbol: ':' },
    { word: / ponto/gi, symbol: '.' },
    { word: / traço/gi, symbol: '-' },
    { word: / abre parênteses/gi, symbol: '(' },
    { word: / fecha parênteses/gi, symbol: ')' },
    { word: / interrogação/gi, symbol: '?' },
    { word: / exclamação/gi, symbol: '!' },
  ];

  rules.forEach(rule => {
    t = t.replace(rule.word, rule.symbol);
  });

  return t;
}

/**
 * Converte texto com números por extenso em valor numérico.
 * Exemplos:
 * - "dez" → 10
 * - "cem reais" → 100
 * - "cento e vinte reais e trinta centavos" → 120.30
 * - "mil e quinhentos" → 1500
 */
function textToNumber(text: string): number {
  if (!text) return 0;

  const t = text.toLowerCase().trim();

  // Mapa de palavras para números
  const units: Record<string, number> = {
    'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
    'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
    'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14,
    'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19
  };

  const tens: Record<string, number> = {
    'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
    'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90
  };

  const hundreds: Record<string, number> = {
    'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300, 'quatrocentos': 400,
    'quinhentos': 500, 'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800, 'novecentos': 900
  };

  const multipliers: Record<string, number> = {
    'mil': 1000, 'milhão': 1000000, 'milhões': 1000000, 'milhao': 1000000, 'milhoes': 1000000,
    'bilhão': 1000000000, 'bilhões': 1000000000, 'bilhao': 1000000000, 'bilhoes': 1000000000
  };

  // Separa reais e centavos
  const parts = t.split(/\s+e\s+/).filter(p => p.includes('centavo'));
  let centavos = 0;
  let mainText = t;

  if (parts.length > 0) {
    const centavoPart = parts[parts.length - 1];
    mainText = t.replace(/\s+e\s+.*centavos?.*$/i, '');

    // Extrai número de centavos
    const centavoWords = centavoPart.replace(/centavos?/gi, '').trim();
    centavos = parseSimpleNumber(centavoWords, units, tens, hundreds);
  }

  // Remove palavras como "reais", "real"
  mainText = mainText.replace(/\s*(reais?|r\$)\s*/gi, ' ').trim();

  const reais = parseComplexNumber(mainText, units, tens, hundreds, multipliers);

  return reais + (centavos / 100);
}

function parseSimpleNumber(text: string, units: Record<string, number>, tens: Record<string, number>, hundreds: Record<string, number>): number {
  if (!text) return 0;

  const words = text.split(/\s+/);
  let result = 0;

  for (const word of words) {
    if (units[word] !== undefined) result += units[word];
    else if (tens[word] !== undefined) result += tens[word];
    else if (hundreds[word] !== undefined) result += hundreds[word];
  }

  return result;
}

function parseComplexNumber(text: string, units: Record<string, number>, tens: Record<string, number>, hundreds: Record<string, number>, multipliers: Record<string, number>): number {
  // Pre-processamento: junta números quebrados por espaço (ex: "52. 500" -> "52.500")
  // Também junta vírgulas soltas (ex: "50, 00" -> "50,00")
  const preProcessed = text
    .replace(/(\d+)\.\s+(\d+)/g, '$1.$2')
    .replace(/(\d+),\s+(\d+)/g, '$1,$2');

  // Remove conectores
  const cleaned = preProcessed.replace(/\s+e\s+/g, ' ').replace(/\s+de\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/);

  let total = 0;
  let current = 0;

  for (const word of words) {
    if (units[word] !== undefined) {
      current += units[word];
    } else if (tens[word] !== undefined) {
      current += tens[word];
    } else if (hundreds[word] !== undefined) {
      current += hundreds[word];
    } else if (multipliers[word] !== undefined) {
      if (current === 0) current = 1;
      current *= multipliers[word];
      total += current;
      current = 0;
    } else {
      // Remove pontos de milhar e substitui vírgula por ponto (PT-BR)
      // Ex: "50.000,00" -> "50000.00"
      // Ex: "52.500" -> "52500" (milhar implícito)
      const cleanWord = word.replace(/\./g, '').replace(',', '.');
      const val = parseFloat(cleanWord);

      if (!isNaN(val)) {
        current += val;
      }
    }
  }

  return total + current;
}

export function normalizeVoiceText(text: string, type: NormalizationType = 'default'): string {
  const clean = text.trim();
  if (!clean) return '';

  switch (type) {
    case 'plate':
      // Converte "A B C 1 2 3 4" ou "ABC 1D 23" para "ABC1D23"
      return clean
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 7);

    case 'phone':
      // Garante apenas dígitos e formata se possível
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 10) {
        return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
      }
      return digits;

    case 'cpf':
      // Formata CPF: XXX.XXX.XXX-XX
      const cpfDigits = clean.replace(/\D/g, '').substring(0, 11);
      if (cpfDigits.length === 11) {
        return cpfDigits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
      }
      return cpfDigits;

    case 'cnpj':
      // Formata CNPJ: XX.XXX.XXX/XXXX-XX
      const cnpjDigits = clean.replace(/\D/g, '').substring(0, 14);
      if (cnpjDigits.length === 14) {
        return cnpjDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      }
      return cnpjDigits;

    case 'name':
      // Title Case: "joão silva" -> "João Silva"
      return clean
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    case 'currency':
      // Converte texto em número e retorna como string com ponto decimal
      // "dez reais" -> "10.00", "cento e vinte reais e trinta centavos" -> "120.30"
      const numValue = textToNumber(clean);
      return numValue.toFixed(2); // Retorna com ponto, sem formatação

    default:
      // Apenas capitaliza a primeira letra da frase
      return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
}
