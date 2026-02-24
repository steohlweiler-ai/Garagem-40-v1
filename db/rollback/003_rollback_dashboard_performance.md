# Plano de Rollout e Backup — TC010

Este documento detalha os procedimentos de segurança obrigatórios para a aplicação da migração de performance no Supabase.

## 1. Procedimento de Backup (Dump)
Antes de qualquer alteração estrutural, deve-se realizar o backup via Supabase CLI.

**Comando:**
```bash
# Snapshot local do schema e dados
supabase db dump --file db/backups/before_tc010_$(date +%Y%m%d).sql
```

## 2. Plano de Rollback (Reversão)
Caso ocorram erros inesperados ou degradação de performance detectada pelos smoke tests.

**Comandos SQL de Reversão:**
```sql
-- Remover RPC
DROP FUNCTION IF EXISTS get_dashboard_services(INTEGER, INTEGER, TEXT[]);

-- Remover Índices Parciais
DROP INDEX IF EXISTS idx_servicos_active_dashboard;
DROP INDEX IF EXISTS idx_servicos_fk_lookup;

-- Nota: os índices da migração 002 devem ser mantidos, pois são a base da resiliência.
```

## 3. Checklist de Verificação (Staging)
Métricas obrigatórias a serem validadas em Staging antes do rollout global:

| Métrica | Ferramenta | Alvo |
| :--- | :--- | :--- |
| **Plano de Execução** | `EXPLAIN ANALYZE` | `Index Only Scan` |
| **Tamanho do Payload** | Chrome DevTools | `< 25 KB` |
| **TTFB (Latência)** | Chrome DevTools | `< 120 ms` |
| **Integridade KPIs** | Dashboard UI | Paridade com Contadores |
| **Auth/RLS** | Manual | `organization_id` isolado |

---

## 4. Janela de Deploy
- **Ambiente**: Staging (Rollout Canário)
- **Responsável**: Antigravity (AI) / Usuario (Manual Approval)
- **Impacto Esperado**: Zero Downtime (DML/DDL não bloqueante)
