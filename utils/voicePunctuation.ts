// src/utils/voicePunctuation.ts
// Centraliza o processamento de pontuação falada (ex: "vírgula" -> ",")
// e regras de espaçamento/capitalização para a aplicação inteira.

const punctuationMap: Array<[RegExp, string]> = [
  [/\b(ponto e vírgula|ponto-e-vírgula)\b/gi, ';'],
  [/\b(dois pontos|dois-pontos|dois\s+pontos)\b/gi, ':'],
  [/\b(ponto final|ponto)\b/gi, '.'],
  [/\b(ponto de interrogação|ponto-interrogação|interrogação)\b/gi, '?'],
  [/\b(ponto de exclamação|ponto-exclamação|exclamação)\b/gi, '!'],
  [/\b(vírgula|virgula)\b/gi, ','],
  [/\b(hífen|hifen|traço|travessão)\b/gi, '—'],
  [/\b(abre parêntese|abre parênteses|abre paren)\b/gi, '('],
  [/\b(fecha parêntese|fecha parênteses|fecha paren)\b/gi, ')'],
  [/\b(aspas abertas|abre aspas|abre-aspas)\b/gi, '“'],
  [/\b(aspas fechadas|fecha aspas|fecha-aspas)\b/gi, '”'],
  [/\b(nova linha|nova-linha|pular linha|pular-linha)\b/gi, '\n'],
  [/\b(novo parágrafo|novo-paragrafo|novo-parágrafo)\b/gi, '\n\n'],
];

function collapseSpaces(s: string) {
  return s.replace(/[ \t]{2,}/g, ' ');
}

export function postProcessPunctuation(inputRaw: string): string {
  if (!inputRaw) return inputRaw;
  let s = inputRaw.trim();

  for (const [re, replacement] of punctuationMap) {
    s = s.replace(re, replacement);
  }

  // remove espaço antes de pontuação
  s = s.replace(/\s+([,;:!?.\)\]”\}—])/g, '$1');
  // garante espaço após pontuação se seguido de letra
  s = s.replace(/([,;:!?.—])([^\s\)\]\}])/g, '$1 $2');
  s = s.replace(/\s+\(/g, ' (');
  s = s.replace(/\)\s+/g, ') ');
  s = collapseSpaces(s);

  // Capitaliza início e após fim de sentença
  s = s.replace(/(^|[.!?]\s+)([a-zà-ú])/g, (match, prefix, ch) => prefix + ch.toUpperCase());

  return s.trim();
}

export function processSpokenForInsert(
  spokenRaw: string,
  currentValue: string,
  opts?: { dictation?: boolean; normalizeFn?: (s: string) => string }
): string {
  const processedSpoken = postProcessPunctuation(spokenRaw);
  const normalizedSpoken = opts?.normalizeFn ? opts.normalizeFn(processedSpoken) : processedSpoken;

  const needsSep = currentValue && currentValue.length > 0 && !/\s$/.test(currentValue);
  const sep = needsSep ? ' ' : '';

  let result = currentValue + sep + normalizedSpoken;

  if (opts?.dictation) {
    // se quiser usar applyDictation, importe e aplique aqui:
    // result = applyDictation(result);
  }

  return result;
}

export default postProcessPunctuation;
