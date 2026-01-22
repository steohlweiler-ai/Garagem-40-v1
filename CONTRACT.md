# CONTRATO DE DADOS (Frontend-Driven) 🤝

**Versão da Aplicação:** v4 (Frontend Freeze)
**Objetivo:** Especificar a estrutura exata de dados que o Frontend CONSOME e PRODUZ.
**Backend Alvo:** Supabase (PostgreSQL)

> ⚠️ **REGRA DE OURO:** O backend DEVE entregar os dados neste formato (ou via view/rpc) para evitar refatoração no frontend.

---

## 1. Entidades Core

### 1B. Cliente (`Client`)
**Papel:** Proprietário do veículo e pagador.
```typescript
interface Client {
  id: string;              // UUID
  organization_id: string; // Multi-tenant ID (obrigatório para RLS)
  name: string;           // Busca textual, exibição em cards
  phone: string;          // Formato: (11) 99999-9999
  notes?: string;         // Histórico informal / CRM leve
  cpfCnpj?: string;       // Opcional (apenas para Nota Fiscal)
  address?: string;       // Opcional
}
```

### 1C. Veículo (`Vehicle`)
**Papel:** Objeto central do serviço.
```typescript
interface Vehicle {
  id: string;
  organization_id: string;
  client_id: string;       // FK -> Client
  plate: string;          // Formato: AAA-0000 ou Mercosul (SEM hífen no banco, COM hífen na UI)
  brand: string;          // Ex: Chevrolet
  model: string;          // Ex: Onix 1.0 Turbo
  color?: string;         // Ex: Branco Summit
  yearModel?: string;     // Ex: 2023/2024
  chassis?: string;       // Opcional
  mileage?: string;       // Quilometragem atual (snapshot)
}
```

### 1A. Ordem de Serviço (`ServiceJob`)
**Papel:** O coração da aplicação. Agrega tudo.
```typescript
interface ServiceJob {
  id: string;
  organization_id: string;
  
  // Relações
  vehicle_id: string;      // FK -> Vehicle
  client_id: string;       // FK -> Client
  
  // Fluxo
  status: ServiceStatus;   // Enum: 'Pendente', 'Em Andamento', 'Lembrete', 'Pronto', 'Entregue'
  status_history: StatusLogEntry[]; // Histórico JSONB ou tabela separada (Preferência: Tabela)
  
  // Prazos
  entry_at: string;        // ISO 8601 UTC
  estimated_delivery?: string; // ISO 8601 UTC (Nullable)
  
  // Finanças
  total_value: number;     // Soma cacheada ou calculada on-fly
  
  // Detalhes
  priority: 'baixa' | 'media' | 'alta';
  service_type: 'novo' | 'retrabalho';
  
  // Auditoria
  created_by: string;      // UUID do user
  created_at: string;
}
```

## 2. Detalhes Operacionais

### 2A. Tarefas/Etapas (`ServiceTask`)
**Papel:** Itens individuais dentro de uma OS.
**Frontend exibe como:** Lista vertical com checkboxes.
```typescript
interface ServiceTask {
  id: string;
  service_id: string;      // FK -> ServiceJob
  title: string;          // Ex: "Troca de Óleo"
  status: 'todo' | 'in_progress' | 'done';
  order: number;          // Para ordenação visual na lista
  
  // Financeiro da Tarefa
  charge_type: 'Hora' | 'Fixo';
  fixed_value: number;
  rate_per_hour: number;
  duration_seconds?: number; // Tempo rastreado (Stopwatch)
  
  // Auditoria da Tarefa
  responsible_user_id?: string; 
}
```

### 2B. Lembrete (`Reminder`)
**Papel:** Alertas rápidos não-bloqueantes.
```typescript
interface Reminder {
  id: string;
  service_id: string;
  title: string;
  date: string;            // YYYY-MM-DD
  status: 'active' | 'done';
}
```

## 3. Campos Calculados (Frontend Logic)
Estes campos **NÃO** precisam estar no banco, pois o Frontend calcula hoje.
No futuro, podem virar *Computed Columns* no banco se performance exigir.

| Campo | Lógica no Front (`utils/helpers.ts`) | Dependências |
| :--- | :--- | :--- |
| `isDelayed` | Compara `estimated_delivery` vs `now()` | `delayCriteria` (Config) |
| `activeDuration` | `now() - task.started_at` | Task em andamento |
| `status_badge_color` | Mapeia Status -> Cor (Tailwind) | `statusConfigs` |

## 4. Estrátégia de Migração (Supabase)

### Mapeamento Sugerido:
1.  **Clients, Vehicles, Services:** Tabelas standard.
2.  **Tasks, Reminders:** Tabelas filhas com `ON DELETE CASCADE`.
3.  **Logs/Histórico:** Tabela `service_logs` (ao invés de JSONB gigante).
4.  **Auth:** `auth.users` do Supabase vinculado à tabela pública `profiles` (UserAccount).

### Pontos de Atenção:
*   **Search:** Hoje o front faz `filter()` em memória. No Supabase, precisaremos de `.ilike()` ou *Full Text Search* para manter a experiência da barra de busca global.
*   **Realtime:** O dashboard atual faz polling (`setInterval`). O Supabase Realtime deve substituir isso 1:1.

---
**Status do Contrato:** 🔒 FROZEN (Válido para v4)
