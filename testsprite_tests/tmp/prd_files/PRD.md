# PRD - Garagem 40
## Product Requirements Document

**Versão**: 1.0.0  
**Data**: Fevereiro 2026  
**Projeto**: Garagem-40-v1  
**Tipo**: Sistema de Gestão para Oficinas Mecânicas

---

## 1. Visão Geral do Produto

### 1.1 Resumo Executivo

O **Garagem 40** é um sistema completo de gestão para oficinas mecânicas que oferece controle total sobre ordens de serviço, clientes, veículos, estoque, agendamentos e equipe. A plataforma foi desenvolvida com foco em usabilidade móvel, automação inteligente e design premium, proporcionando uma experiência moderna e profissional para gestores e operadores de oficinas.

### 1.2 Problema que o Produto Resolve

Oficinas mecânicas enfrentam desafios significativos na gestão de:
- Controle de múltiplas ordens de serviço simultâneas
- Rastreamento de status e prazos de entrega
- Gestão de estoque de peças e consumíveis
- Comunicação com clientes
- Cálculo de mão de obra e custos
- Controle de equipe e permissões de acesso
- Recuperação de informações de notas fiscais

### 1.3 Objetivos do Produto

1. **Digitalizar completamente** o fluxo de trabalho da oficina
2. **Automatizar** processos repetitivos (OCR de notas, cálculos, lembretes)
3. **Centralizar** informações de clientes, veículos e serviços
4. **Otimizar** a gestão de estoque com rastreamento por veículo
5. **Facilitar** a comunicação e acompanhamento de prazos
6. **Controlar** acessos e permissões por função (RBAC)

---

## 2. Público-Alvo e Personas

### 2.1 Usuários Primários

#### **Administrador (Dono da Oficina)**
- Acesso total ao sistema
- Gerencia equipe, configurações e finanças
- Toma decisões estratégicas baseadas em dados
- Controla custos e precificação

#### **Gerente de Estoque**
- Controla entrada de notas fiscais
- Gerencia produtos e fornecedores
- Monitora níveis de estoque
- Aloca peças a veículos/serviços

#### **Operador (Mecânico/Pintor/Funileiro)**
- Visualiza e executa tarefas atribuídas
- Registra progresso e tempo de trabalho
- Acessa informações técnicas do serviço
- **Sem acesso** a valores financeiros

#### **Financeiro**
- Visualiza valores e totais
- Acessa relatórios financeiros
- **Sem acesso** a configurações técnicas

### 2.2 Casos de Uso por Persona

**Administrador**: "Preciso criar um novo serviço para um cliente recorrente, alocar tarefas para a equipe, acompanhar o progresso em tempo real e ver o valor total antes da entrega."

**Operador**: "Preciso ver quais tarefas foram atribuídas para mim, registrar o que fiz, adicionar fotos/vídeos e marcar como concluído."

**Gerente de Estoque**: "Recebi uma nota fiscal com 15 itens. Preciso extrair os dados automaticamente, vincular aos produtos existentes e reservar as peças para o veículo correto."

---

## 3. Funcionalidades Principais

### 3.1 Gestão de Ordens de Serviço (OS)

#### **3.1.1 Criação de OS**
- Wizard guiado em 4 etapas:
  1. **Cliente e Veículo**: Cadastro ou seleção
  2. **Ficha de Avaliação**: Templates customizáveis por seção (Motor, Suspensão, etc.)
  3. **Tarefas e Mão de Obra**: Adição de serviços com precificação (hora/fixo)
  4. **Revisão e Confirmação**: Visualização completa antes de salvar

#### **3.1.2 Status de Serviço**
- **Pendente**: Aguardando início
- **Em Andamento**: Equipe trabalhando
- **Lembrete**: Requer atenção especial
- **Pronto**: Finalizado, aguarda entrega
- **Entregue**: Concluído
- **Atrasado**: Ultrapassou prazo estimado (calculado automaticamente)

#### **3.1.3 Gestão de Tarefas**
- Cada tarefa possui:
  - Tipo (Troca, Chaparia, Pintura, Mecânica, Outro)
  - Cobrança por hora ou valor fixo
  - Responsável atribuído
  - Status (A fazer, Em progresso, Concluído)
  - Tempo gasto (tracking automático)
  - Mídia (fotos/vídeos)
  - Observações técnicas

#### **3.1.4 Histórico e Rastreamento**
- Log completo de mudanças de status
- Registro de quem executou cada tarefa
- Tempo total de mão de obra
- Cálculo automático de valores

### 3.2 Gestão de Clientes e Veículos

#### **3.2.1 Cadastro de Clientes**
- Nome, telefone, CPF/CNPJ
- Endereço, observações
- Histórico completo de serviços
- Veículos associados

#### **3.2.2 Cadastro de Veículos**
- Placa (com scanner de OCR via câmera)
- Marca, modelo (com catálogo pré-cadastrado)
- Cor (seletor visual com hex)
- Ano, chassis, quilometragem
- Estoque de peças alocadas

### 3.3 Gestão de Estoque

#### **3.3.1 Recebimento de Notas Fiscais**
- **Upload de imagem** da nota fiscal
- **OCR via Google Gemini 1.5 Flash**:
  - Extração automática de fornecedor, número, data, total
  - Identificação de itens (descrição, quantidade, preço unitário)
- **Validação inteligente**:
  - Sugestão de match com produtos existentes
  - Indicador de confiança (0-100%)
  - Criação rápida de novos produtos

#### **3.3.2 Controle de Produtos**
- SKU, nome, unidade (un, lt, kg, par, cj)
- Custo e preço de venda
- Estoque atual e mínimo
- Fornecedor padrão
- Alertas de estoque baixo

#### **3.3.3 Alocação de Estoque**
- **Reserva por veículo**: Peças destinadas a um serviço específico
- **Consumo**: Marcação de uso efetivo
- **Movimentações**: Histórico completo (entrada/saída)
- **Painel por veículo**: Visualização de todas as peças alocadas

### 3.4 Agendamentos e Lembretes

#### **3.4.1 Tipos de Agendamento**
- **Manual**: Criado pelo usuário (visita, orçamento, retorno)
- **Automático**: Vinculado à data de entrega do serviço

#### **3.4.2 Notificações**
- Configuração de antecedência (minutos)
- Integração com calendário (futuro)
- Lembretes ativos exibidos no dashboard

### 3.5 Configurações e Administração

#### **3.5.1 Dados da Oficina**
- Nome, CNPJ, endereço, telefone
- Upload de logo (exibida em impressões)
- Retenção de mídia (dias antes de limpeza automática)

#### **3.5.2 Taxas de Mão de Obra**
- Valor/hora de Chaparia
- Valor/hora de Pintura
- Valor/hora de Mecânica
- Valores fixos por tipo de serviço

#### **3.5.3 Gestão de Equipe e Acessos (RBAC)**
- **Roles**:
  - `admin`: Acesso total
  - `stock_manager`: Gestão de estoque
  - `operador`: Execução de tarefas (sem valores)
  - `financeiro`: Visualização de valores
  - `visualizador`: Somente leitura

- **Permissões granulares**:
  - `manage_team`: Equipe e Acessos
  - `manage_clients`: Cadastro de Clientes
  - `manage_inventory`: Estoque
  - `config_rates`: Mão de Obra
  - `config_vehicles`: Veículos/Cores
  - `config_system`: Integrações/Oficina/Atrasos
  - `view_financials`: Ver Valores Financeiros

#### **3.5.4 Templates de Avaliação**
- Criação de fichas customizadas por tipo de serviço
- Seções organizadas (Motor, Suspensão, Lataria, etc.)
- Itens com sub-opções, mídias, observações
- Configuração de cobrança padrão por item

#### **3.5.5 Gestão de Status**
- Ativação/desativação de status
- Customização de cores e prioridades
- Ordem de exibição

#### **3.5.6 Catálogo de Veículos**
- Marcas e modelos pré-cadastrados
- Paleta de cores com código hex
- Tipos de acabamento (metalizado, pérola, sólido)

#### **3.5.7 Critérios de Atraso**
- Cálculo baseado em dias úteis ou corridos
- Horário comercial (início/fim)
- Overrides por prioridade (baixa, média, alta)
- Notificação automática
- Auditoria de alterações

### 3.6 Recursos Avançados

#### **3.6.1 OCR de Placas**
- Captura de foto via câmera
- **Google Gemini 1.5 Flash** para reconhecimento
- Preenchimento automático do campo

#### **3.6.2 Entrada por Voz**
- **Web Speech API** para navegadores compatíveis
- Fallback para Firefox (mensagem de não suporte)
- Transcrição para campos de texto

#### **3.6.3 Captura de Mídia**
- Fotos e vídeos direto da câmera
- Armazenamento otimizado com limpeza automática
- Galeria com visualização modal

#### **3.6.4 Impressão e Relatórios**
- Ordem de serviço formatada
- Relatório de cliente com histórico completo
- Ficha de avaliação detalhada

---

## 4. Arquitetura Técnica

### 4.1 Stack Tecnológico

#### **Frontend**
- **React 19.2.3** com TypeScript
- **Vite 6.2.0** para build e dev server
- **TailwindCSS 4.1.18** para estilização
- **Lucide React 0.562.0** para ícones
- **React Hot Toast** para notificações

#### **Backend & Database**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
  - Autenticação de usuários
  - RLS (Row Level Security)
  - Stored Procedures (RPCs)
  - Realtime subscriptions

#### **AI & Integrações**
- **Google Gemini 1.5 Flash**:
  - OCR de notas fiscais
  - OCR de placas de veículos
- **Web Speech API** para entrada de voz

### 4.2 Estrutura de Diretórios

```
src/
├── components/         # Componentes reutilizáveis
│   ├── wizards/       # Wizards de criação (NewServiceWizard)
│   └── [40+ componentes]
├── layouts/           # Layouts principais (Header, Sidebar, MobileNav)
├── pages/             # Páginas (Dashboard, Stock, Settings)
├── providers/         # Context Providers (Auth, Services)
├── routes/            # Configuração de rotas
├── services/          # Lógica de negócio e API
├── hooks/             # Custom hooks (useBackButton)
├── types/             # TypeScript interfaces e types
├── utils/             # Funções utilitárias
└── styles/            # Estilos globais
```

### 4.3 Principais Serviços

#### **supabaseService.ts**
- Abstração de todas as operações do Supabase
- Métodos para CRUD de clientes, veículos, serviços, estoque
- RPCs para operações atômicas (alocação de estoque)

#### **dataProvider.ts**
- Cache local (LocalStorage)
- Otimizações de carregamento
- Sincronização com backend

#### **geminiService.ts**
- Integração com Google Gemini API
- OCR de notas fiscais
- OCR de placas

### 4.4 Banco de Dados (Schema Principais)

**Tabelas Principais**:
- `user_accounts`: Usuários e permissões
- `clients`: Clientes da oficina
- `vehicles`: Veículos cadastrados
- `service_jobs`: Ordens de serviço
- `service_tasks`: Tarefas de cada OS
- `products`: Catálogo de produtos
- `stock_movements`: Movimentações de estoque
- `stock_allocations`: Alocações por veículo
- `invoices`: Notas fiscais recebidas
- `appointments`: Agendamentos
- `vehicle_colors`: Paleta de cores
- `evaluation_templates`: Templates de avaliação

**Relacionamentos**:
- Cliente → Veículos (1:N)
- Veículo → Serviços (1:N)
- Serviço → Tarefas (1:N)
- Veículo → Alocações de Estoque (1:N)
- Produto → Movimentações (1:N)

### 4.5 Autenticação e Segurança

#### **Row Level Security (RLS)**
- Todas as tabelas isoladas por `organization_id`
- Usuários só acessam dados da própria organização
- Policies customizadas por tabela

#### **Controle de Acesso (RBAC)**
- Validação no frontend e backend
- Componente `PriceDisplay` para mascarar valores
- Proteção de rotas por permissão

---

## 5. Design e Experiência do Usuário

### 5.1 Princípios de Design

Conforme documentado em `DESIGN_PATTERN.md`:

1. **Profundidade Visual**: Sombras e elevação generosas
2. **Consistência**: Headers e footers no tema escuro `#1e293b`
3. **Hierarquia**: Tipografia guia o olhar do usuário
4. **Feedback**: Elementos interativos respondem a hover/ativo
5. **Suavidade**: Bordas arredondadas (min 1rem, ideal 2.5rem)
6. **Sofisticação**: Gradientes sutis e glass-morphism

### 5.2 Paleta de Cores

- **Background**: `bg-[#1e293b]` (slate-900)
- **Accent**: Verde (`green-500/600`)
- **Status**:
  - Atrasado: Vermelho (`rose-200`, `red-500`)
  - Pendente: Azul (`blue-50`, `blue-500`)
  - Em Andamento: Roxo (`purple-50`, `purple-600`)
  - Lembrete: Âmbar (`amber-50`, `amber-500`)
  - Pronto: Verde (`green-50`, `green-500`)

### 5.3 Mobile-First

- Design responsivo com breakpoints (`sm:`, `md:`, `lg:`)
- Navegação inferior para dispositivos móveis
- Sidebar retrátil para desktop
- Touch-friendly: botões grandes, gestos nativos

### 5.4 Componentes de UI

- **Cards**: `rounded-[2.5rem]` com sombras profundas
- **Botões**: Gradientes, bordas transparentes, feedback tátil
- **Badges**: Status visualmente distintos
- **Modais**: Wizards em várias etapas
- **Ícones**: `strokeWidth={2.5}` para nitidez

---

## 6. Fluxos de Trabalho

### 6.1 Fluxo: Criar Nova OS

1. Usuário clica em "Nova OS" no Dashboard
2. **Passo 1**: Seleciona/cria cliente e veículo
   - Pode usar scanner de placa (OCR)
3. **Passo 2**: Preenche ficha de avaliação
   - Marca itens que precisam de atenção
   - Adiciona fotos/vídeos
   - Insere observações
4. **Passo 3**: Adiciona tarefas
   - Define tipo (Troca, Chaparia, etc.)
   - Configura cobrança (hora/fixo)
   - Atribui responsável
5. **Passo 4**: Revisa e confirma
   - Vê total calculado
   - Define data de entrega
   - Salva OS

### 6.2 Fluxo: Receber Nota Fiscal

1. Usuário acessa "Estoque" > "Receber Nota"
2. Faz upload da imagem da nota
3. **OCR Gemini** processa a imagem
4. Sistema exibe itens extraídos
5. Para cada item:
   - Mostra sugestões de match (% confiança)
   - Usuário confirma ou cria novo produto
6. Estoque atualizado automaticamente
7. Movimentações registradas

### 6.3 Fluxo: Executar Tarefa (Operador)

1. Operador abre ServiceDetail da OS
2. Seleciona tarefa atribuída a ele
3. Clica em "Iniciar"
   - Timer inicia automaticamente
4. Realiza o trabalho
5. Adiciona fotos/vídeos, observações
6. Clica em "Concluir"
   - Tempo total registrado
   - Valor calculado (se por hora)
7. Status da tarefa atualiza para "Concluído"

### 6.4 Fluxo: Alocar Peças ao Veículo

1. Usuário acessa "Estoque por Veículo"
2. Seleciona veículo/serviço
3. Clica em "Alocar Peças"
4. Busca produto, define quantidade
5. Sistema:
   - Verifica estoque disponível
   - Cria `stock_allocation` (status: reserved)
   - Registra `stock_movement` (OUT)
6. Peças ficam reservadas para aquele veículo
7. Ao concluir tarefa, status muda para "consumed"

---

## 7. Métricas de Sucesso (KPIs)

### 7.1 Operacionais
- **Tempo médio de criação de OS**: < 3 minutos
- **Taxa de atraso**: < 10% dos serviços
- **Precisão do OCR**: > 95% de itens reconhecidos corretamente
- **Uptime do sistema**: > 99%

### 7.2 Negócio
- **Adoção do sistema**: 100% das OS digitalizadas
- **Redução de erros manuais**: > 70%
- **Satisfação do usuário**: NPS > 50

### 7.3 Performance
- **First Load**: < 2s
- **Interação**: < 100ms (navegação)
- **OCR Processing**: < 5s por nota fiscal

---

## 8. Requisitos Não-Funcionais

### 8.1 Performance
- Carregamento inicial < 2s
- Navegação instantânea (cache local)
- Lazy loading de imagens
- Limpeza automática de mídia antiga

### 8.2 Segurança
- Autenticação via Supabase Auth
- RLS em todas as tabelas
- Validação de permissões no backend
- HTTPS obrigatório
- Variáveis de ambiente (.env)

### 8.3 Escalabilidade
- Arquitetura multi-tenant (organization_id)
- Supabase gerencia escalonamento
- Cache local para reduzir requisições

### 8.4 Compatibilidade
- **Navegadores**:
  - Chrome/Edge (pleno suporte)
  - Firefox (sem voz, mas funcional)
  - Safari (testes necessários)
- **Dispositivos**:
  - Mobile (Android/iOS via PWA)
  - Tablet
  - Desktop

### 8.5 Manutenibilidade
- TypeScript para type-safety
- Componentização (40+ componentes reutilizáveis)
- Documentação (CONTRACT.md, DESIGN_PATTERN.md)
- Testes (futuro: TestSprite)

---

## 9. Roadmap e Próximas Funcionalidades

### 9.1 Fase Atual (MVP)
- ✅ Gestão completa de OS
- ✅ Clientes e veículos
- ✅ Estoque com OCR
- ✅ RBAC
- ✅ Agendamentos
- ✅ Templates de avaliação

### 9.2 Próximas Fases

#### **Fase 2: Integrações**
- Integração com Google Calendar (agendamentos)
- Webhooks via N8N (eventos personalizados)
- API pública para integrações externas

#### **Fase 3: Relatórios e Analytics**
- Dashboard com gráficos
- Relatórios de faturamento
- Análise de produtividade por operador
- Previsão de demanda de peças

#### **Fase 4: Financeiro**
- Controle de pagamentos e recebimentos
- Integração com gateways de pagamento
- Fluxo de caixa
- Fechamento mensal

#### **Fase 5: CRM**
- Histórico de comunicação com cliente
- WhatsApp Business API
- Envio de orçamentos
- Pesquisas de satisfação

---

## 10. Dependências e Restrições

### 10.1 Dependências Externas
- **Supabase**: Core do backend (crítico)
- **Google Gemini API**: OCR (crítico para notas fiscais)
- **Vercel/Netlify**: Hospedagem (sugerido)

### 10.2 Restrições Técnicas
- **Web Speech API**: Limitado a navegadores compatíveis
- **Camera API**: Requer HTTPS
- **LocalStorage**: Limite de ~5MB por origem

### 10.3 Restrições de Negócio
- Modelo multi-tenant: Cada oficina é isolada
- Compliance: LGPD (dados de clientes)

---

## 11. Glossário

- **OS**: Ordem de Serviço
- **RLS**: Row Level Security (Supabase)
- **RBAC**: Role-Based Access Control
- **OCR**: Optical Character Recognition
- **SKU**: Stock Keeping Unit
- **RPC**: Remote Procedure Call (Supabase functions)
- **PWA**: Progressive Web App

---

## 12. Aprovações e Versionamento

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | Fev 2026 | Gemini AI | Versão inicial completa |

---

## 13. Anexos

### Documentos Relacionados
- `DESIGN_PATTERN.md`: Guia visual e de estilização
- `CONTRACT.md`: Contrato de desenvolvimento
- `DEPLOY.md`: Instruções de deploy
- `ENV_VARS.md`: Variáveis de ambiente
- `FREEZE_STATUS.md`: Status de feature freeze

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Settings │  │  Stock   │  │ Services │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │              │              │              │      │
│         └──────────────┴──────────────┴──────────────┘      │
│                         │                                   │
│                  ┌──────▼───────┐                           │
│                  │  Providers   │                           │
│                  │ (Auth, Data) │                           │
│                  └──────┬───────┘                           │
│                         │                                   │
│                  ┌──────▼───────┐                           │
│                  │   Services   │                           │
│                  │  (API Layer) │                           │
│                  └──────┬───────┘                           │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ HTTPS/WebSocket
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    SUPABASE (Backend)                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │ Realtime │   │
│  │   RLS    │  │   JWT    │  │  Media   │  │   WS     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ API Calls
                            │
┌───────────────────────────▼──────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │  Google Gemini 1.5   │    │   Web Speech API     │       │
│  │  (OCR: Notas, Placas)│    │   (Voice Input)      │       │
│  └──────────────────────┘    └──────────────────────┘       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

**FIM DO DOCUMENTO**
