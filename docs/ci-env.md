# CI Environment Variables — Padrão de Uso e Referência

> **Última revisão:** 2026-02-23 — Auditoria de segurança CI/CD (ci-env-hardening-final)

---

## Regras de Uso de Variáveis no GitHub Actions

### ✅ Padrão Obrigatório

| Tipo | Sintaxe correta | Quando usar |
|------|----------------|-------------|
| **Secret** | `${{ secrets.NOME }}` | Qualquer valor sensível (chaves, senhas, tokens, URLs de banco) |
| **Variable** | `${{ vars.NOME }}` | Valores não sensíveis reutilizáveis (ex: NODE_ENV, BASE_URL) |
| **GitHub context** | `${{ github.run_id }}` | Metadados do runner (ID de run, branch, SHA etc.) |
| **Env do job** | `${{ env.NOME }}` | Referenciar env declarado no job dentro de expressões |
| **Output de step** | `${{ steps.ID.outputs.CHAVE }}` | Resultado de steps anteriores |
| **Output de job** | `${{ needs.JOB.outputs.CHAVE }}` | Resultado de jobs anteriores (cross-job) |

### ❌ Proibido — Gera Warning e É Inseguro

```yaml
# ❌ NUNCA — contexto inválido (sem prefixo)
env:
  FOO: ${{ SUPABASE_URL }}

# ❌ NUNCA — secret diretamente em `if:`
if: ${{ secrets.FEATURE_FLAG == 'true' }}

# ❌ NUNCA — echo de secret em log
run: echo "Key is ${{ secrets.API_KEY }}"

# ❌ NUNCA — secret em matrix:
strategy:
  matrix:
    key: ${{ secrets.API_KEY }}
```

### ✅ Padrão Correto — Job-level env

```yaml
jobs:
  meu-job:
    env:
      # Declare UMA VEZ no nível do job.
      # Todos os steps herdam automaticamente via variável de ambiente.
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      API_KEY:      ${{ secrets.API_KEY }}

    steps:
      - name: Usar variável
        run: |
          # Acesse via $VARIAVEL (shell), NÃO via ${{ secrets.X }} novamente
          curl -H "apikey: $SUPABASE_URL" ...
```

---

## Tabela de Variáveis — Todos os Workflows

| Variável | Tipo | Obrigatória | Sensível | Onde configurar | Usado em |
|----------|------|-------------|----------|-----------------|----------|
| `SUPABASE_URL` | Secret | ✅ Sim | ⚠️ Parcial | Settings → Secrets → Actions | db-seed-and-smoke, testsprite |
| `SUPABASE_ANON_KEY` | Secret | ✅ Sim | ⚠️ Parcial | Settings → Secrets → Actions | db-seed-and-smoke, testsprite |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | db-seed-and-smoke (criação de users) |
| `DATABASE_URL` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | db-seed-and-smoke, cleanup |
| `TEST_USER_PASSWORD` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | db-seed-and-smoke, testsprite |
| `TESTSPRITE_API_KEY` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | testsprite |
| `TABSCANNER_API_KEY` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | ocr-tests |
| `OCR_SPACE_API_KEY` | Secret | ✅ Sim | 🔴 CRÍTICO | Settings → Secrets → Actions | ocr-tests |

---

## Como Cadastrar no GitHub

1. Acesse: **`github.com/{org}/{repo}` → Settings → Secrets and variables → Actions**
2. Clique em **"New repository secret"**
3. Preencha:
   - **Name:** exatamente como na tabela acima (ex: `SUPABASE_SERVICE_ROLE_KEY`)
   - **Secret:** cole o valor correspondente
4. Clique em **"Add secret"**

> [!CAUTION]
> **`SUPABASE_SERVICE_ROLE_KEY`** tem acesso total ao banco, ignorando Row Level Security (RLS).
> Nunca exponha este valor em logs, outputs ou variáveis não-secret.

> [!WARNING]
> **`DATABASE_URL`** contém usuário e senha do banco. Jamais commitar no código.
> Formato: `postgresql://postgres.xxxx:SENHA@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

---

## Arquitetura do CI — Diagrama de Jobs

```
push/PR → db-seed-and-smoke
               ├── Validate secrets (fail-fast)
               ├── Apply SQL migration (CONCURRENTLY)
               ├── Create test auth users (Admin API)
               ├── Run testsuite_seed.sql
               └── EXPLAIN ANALYZE smoke
                        ↓ (needs: db-seed-and-smoke)
                   testsprite
                        ├── Validate secrets (fail-fast)
                        ├── Install Playwright + Python
                        ├── Start dev server
                        ├── TC003, TC004, TC005, TC007
                        ├── SEC-1, SEC-2, SEC-3
                        └── Upload artifacts
                                ↓ (needs: both, always())
                           cleanup
                                └── DELETE org-test data
```

---

## Princípios de Segurança CI

1. **Job-level env, nunca step-level** — declare secrets UMA vez, no nível do job
2. **Sem echo de secrets** — nunca use `echo $SECRET` ou `echo ${{ secrets.X }}`
3. **Sem secrets em matrix** — GitHub Actions não suporta isso
4. **Sem secrets em `if:`** — use variáveis de ambiente intermediárias
5. **Fail-fast obrigatório** — todo job deve ter step "Validate required secrets"
6. **Permissions mínimas** — todo job deve declarar `permissions: contents: read` (mínimo)
7. **Cleanup sempre roda** — usar `if: always()` no job de cleanup para não deixar dados de teste
