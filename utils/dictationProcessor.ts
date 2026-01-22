
/**
 * Aplica regras de pontuação de ditado a uma string de texto.
 * Converte palavras-chave de pontuação em símbolos, trata decimais e ajusta a capitalização.
 */
export function applyDictation(text: string): string {
  if (!text) return '';

  let t = text;

  // 1. Trata de pontos decimais primeiro (ex: "dez ponto cinco" -> "10.5")
  t = t.replace(/(\d+)\s+ponto\s+(\d+)/gi, '$1.$2');

  /**
   * Helper para criar uma Regex de limite de palavra que suporta acentos.
   * Verifica se a palavra está isolada ou se é um comando de pontuação falado.
   */
  const createDictationRegex = (word: string) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Captura a palavra isolada por espaços ou pontuação, lidando com caracteres latinos
    return new RegExp(`(?:^|\\s)(${escaped})(?=\\s|$|[,.;:!?])`, 'gi');
  };

  // 2. Mapeamento de palavras de pontuação (Ordem decrescente de tamanho)
  const punctuationRules = [
    { word: 'ponto e vírgula', value: ';' },
    { word: 'ponto de interrogação', value: '?' },
    { word: 'ponto de exclamação', value: '!' },
    { word: 'dois pontos', value: ':' },
    { word: 'ponto final', value: '.' },
    { word: 'abre parênteses', value: '(' },
    { word: 'fecha parênteses', value: ')' },
    { word: 'abre aspas', value: '"' },
    { word: 'fecha aspas', value: '"' },
    { word: 'e comercial', value: '&' },
    { word: 'por cento', value: '%' },
    { word: 'vírgula', value: ',' },
    { word: 'ponto', value: '.' },
    { word: 'interrogação', value: '?' },
    { word: 'exclamação', value: '!' },
    { word: 'hífen', value: '-' },
    { word: 'traço', value: '-' },
    { word: 'barra', value: '/' },
  ];

  for (const { word, value } of punctuationRules) {
    const regex = createDictationRegex(word);
    // Substitui mantendo um espaço se necessário para não colar palavras
    t = t.replace(regex, (match) => {
        // Se começar com espaço, mantém o espaço antes do símbolo para posterior limpeza
        return match.startsWith(' ') ? ` ${value}` : value;
    });
  }

  // 3. Limpeza de espaçamento inteligente
  // Remove espaços antes de pontuação: "teste , " -> "teste, "
  t = t.replace(/\s+([,.;:!?%)\]}”])/g, '$1');
  
  // Garante um espaço após pontuação (se seguido por qualquer caractere)
  t = t.replace(/([,.;:!?%)\]}”])(?=[^\s])/gi, '$1 ');
  
  // Remove espaço após abertura: "( texto" -> "(texto"
  t = t.replace(/([("“{])\s+/g, '$1');
  
  // Remove espaços duplos
  t = t.replace(/\s{2,}/g, ' ');

  t = t.trim();

  // 4. Capitalização Automática
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
    // Capitaliza após sinais de pontuação final (. ? !)
    t = t.replace(/([.?!]\s+)([a-zàâãéêíóôõúç])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  }

  return t;
}
