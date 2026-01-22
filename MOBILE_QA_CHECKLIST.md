# CHECKLIST DE VALIDAÇÃO MOBILE (QA - OFICINA REAL) 📱

**Dispositivo Alvo:** Chrome em Android (Prioritário)
**Cenário:** Uso em oficina (mão suja, movimento, luz ambiente variável).

## 1. Ergonomia e Toque (Touch Target)
- [ ] **Botão FAB (+):** Está fácil de clicar com o polegar? Não cobre informações vitais do último card?
- [ ] **Card de Serviço:** O card inteiro é clicável? A área de clique é responsiva?
- [ ] **Filtros:** O botão de "Filtros" e "X" (fechar modal) têm área de toque segura (min 44x44px)?
- [ ] **Menus Inferiores:** Os ícones da BottomNav estão espaçados o suficiente para evitar "misclick"?
- [ ] **Scroll:** O scroll da lista de serviços é suave (não engasga)?

## 2. Layout e Responsividade (Viewport)
- [ ] **Quebra de Linha:** Textos longos (Placa, Modelo, Nome Cliente) quebram linha ou usam `ellipsis` (...) corretamente? Nada vaza do card?
- [ ] **Teclado Virtual:** Ao abrir o Wizard ou Busca, o teclado "empurra" o layout corretamente sem esconder o campo de digitação?
- [ ] **Modal de Filtros:** Em telas pequenas, o botão "Aplicar" fica visível ou exige scroll?
- [ ] **Header:** O título e ícones do topo não se sobrepõem em telas muito estreitas (ex: Galaxy S5/SE)?

## 3. Legibilidade (Outdoor)
- [ ] **Contraste da Placa:** A placa (texto preto/negrito) é visível sob luz forte?
- [ ] **Badges de Status:** As cores (Verde/Vermelho/Amarelo) são distinguíveis sem esforço?
- [ ] **Fontes Pequenas:** Metadados (data, modelo) estão legíveis (não menores que 10-11px reais)?

## 4. Fluxo Crítico (Caminho Feliz)
- [ ] **Criar Serviço:** Fluxo completo (Botão + -> Preencher Placa -> Salvar) funciona sem travamento?
- [ ] **Filtrar:** Abrir Filtro -> Selecionar "Atrasados" -> Aplicar. O resultado atualiza instantaneamente?
- [ ] **Detalhes:** Clicar num card abre os detalhes corretos? O botão "Voltar" funciona?

## 5. Performance (Percepção)
- [ ] **Feedback de Toque:** Os botões dão feedback visual imediato (ripple/cor) ao serem tocados?
- [ ] **Carregamento:** A lista pisca ou "pula" ao rolar rapidamente?

---
**Instrução:** Execute este teste no dispositivo real. Se encontrar QUALQUER bloqueio (ex: teclado cobrindo input), reporte como BUG CRÍTICO.
