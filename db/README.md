# DB — Migrations & Seeds

## Structure

```
db/
├── migrations/
│   └── 001_add_scheduling_indexes.sql   # Zero-downtime index migration
└── seeds/
    └── testsuite_seed.sql               # TestSprite QA seed data
```

---

## Running the Migration

Paste into **Supabase Dashboard → SQL Editor** and execute:

```sql
-- Apply all 8 indexes (zero-downtime with CONCURRENTLY)
\i db/migrations/001_add_scheduling_indexes.sql
```

Or run via psql:
```bash
psql $DATABASE_URL -f db/migrations/001_add_scheduling_indexes.sql
```

### Rollback

All `DROP INDEX CONCURRENTLY` statements are in the rollback section at the bottom of the migration file.

---

## Running the Seed

### Step 1 — Create Auth users

In **Supabase Dashboard → Authentication → Users**, create:

| Email | Password | Role |
|-------|----------|------|
| `admin@garagem40.test` | `Test@12345` | admin |
| `operador@garagem40.test` | `Test@12345` | operador |
| `financeiro@garagem40.test` | `Test@12345` | financeiro |

### Step 2 — Update UUIDs in seed file

Copy the generated UUIDs from step 1 and update the `\set` variables at the top of `testsuite_seed.sql`.

### Step 3 — Execute

```bash
psql $DATABASE_URL -f db/seeds/testsuite_seed.sql
```

Or paste the file contents into Supabase SQL Editor.

### What gets created

| Entity | Count |
|--------|-------|
| User profiles | 3 (admin, operador, financeiro) |
| Clients | 1 |
| Vehicles | 1 (plate: TEST001) |
| Service Orders | 1 (OS in progress) |
| Appointments | 5 (yesterday, today, tomorrow, +1w, +2w) |
| Reminders | 3 (active, next 3 days) |

All records scoped to `organization_id = 'org-test'` for safe isolation.

---

## Cleanup / TTL

Test data is tagged with `organization_id = 'org-test'`.

**Recommended TTL:** Run cleanup after each CI pipeline or weekly.

```sql
-- Quick cleanup (uncomment from seed file rollback section):
DELETE FROM agendamentos    WHERE organization_id = 'org-test';
DELETE FROM lembretes       WHERE service_id IN (SELECT id FROM "serviços" WHERE organization_id = 'org-test');
DELETE FROM "serviços"      WHERE organization_id = 'org-test';
DELETE FROM "veículos"      WHERE organization_id = 'org-test';
DELETE FROM clientes        WHERE organization_id = 'org-test';
DELETE FROM perfis_usuarios WHERE organization_id = 'org-test';
```
