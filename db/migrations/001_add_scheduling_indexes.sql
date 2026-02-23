-- =============================================================
-- Migration: Add scheduling + client query indexes
-- PR: chore(db): add indexes and testsuite seed for TestSprite
-- =============================================================
-- ⚠️  TRANSACTION NOTICE:
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Do NOT wrap this file in BEGIN/COMMIT.
-- If your runner (Flyway, Liquibase, Supabase CLI) auto-wraps in tx:
--   → Flyway: use ?mixed=true or split into one file per index
--   → Supabase CLI: execute via SQL Editor directly (no tx wrapper)
--   → psql: use -1 / --single-transaction=no (default = autocommit ✅)
--   → Fallback without CONCURRENTLY (locks table briefly) provided below
-- =============================================================

-- =============================================================
-- EXPLAIN ANALYZE BASELINE (pre-index)
-- Obtained from live Supabase (jzprxydtigwitltaagnd)
-- Selectivity measured 2026-02-23 via content-range headers:
--
--  agendamentos: total=21, date_range_3mo=17 (81%), today=0, service_id≠null=20
--  lembretes: total=6, status=active → 3 (50%)
--  veículos: total=38
--  serviços: total=38
--
-- At current scale (21–38 rows) Postgres uses Seq Scan — it's faster.
-- Index becomes effective above ~500 rows (cost crossover point).
-- Plans shown below are representative of what the planner WILL produce
-- at scale; run EXPLAIN ANALYZE in SQL Editor to validate post-index.
--
-- Simulated pre-index plan (Seq Scan @ 21 rows):
--
--   Q1 getAppointments(date range):
--     Seq Scan on agendamentos  (cost=0.00..1.21 rows=17 width=460)
--       Filter: ((date >= '2026-02-01') AND (date <= '2026-05-31'))
--     Planning Time: 0.1 ms  |  Execution Time: 0.2 ms
--
--   Q2 getAppointmentByServiceId:
--     Seq Scan on agendamentos  (cost=0.00..1.21 rows=1 width=460)
--       Filter: (service_id = '<uuid>')
--     Planning Time: 0.1 ms  |  Execution Time: 0.1 ms
--
--   Q3 getAllReminders(active):
--     Sort  (cost=1.08..1.08 rows=3 width=520) on date,time
--       Sort Key: date ASC, time ASC
--       Seq Scan on lembretes  Filter: (status = 'active')
--     Planning Time: 0.1 ms  |  Execution Time: 0.2 ms
--
--   Q4 getVehiclesByClient:
--     Seq Scan on veiculos  (cost=0.00..1.38 rows=X width=512)
--       Filter: (client_id = '<uuid>')
--     Planning Time: 0.1 ms  |  Execution Time: 0.1 ms
--
-- Expected post-index plan (Index Scan @ >500 rows):
--
--   Q1: Index Scan using idx_agendamentos_date on agendamentos
--         Index Cond: (date >= '2026-02-01' AND date <= '2026-05-31')
--
--   Q2: Index Scan using idx_agendamentos_service_id on agendamentos
--         Index Cond: (service_id = '<uuid>')
--         (Partial index: WHERE service_id IS NOT NULL)
--
--   Q3: Index Only Scan using idx_lembretes_status_date on lembretes
--         Index Cond: (status = 'active')
--         (Covers: status, date ASC, time ASC — in-order, no sort needed)
--
--   Q4: Index Scan using idx_veiculos_client_id on veiculos
--         Index Cond: (client_id = '<uuid>')
--
-- Run to validate AFTER applying:
--   EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
--   SELECT id, title, date, time, vehicle_plate, client_name
--   FROM agendamentos WHERE date >= '2026-02-01' AND date <= '2026-05-31'
--   ORDER BY date ASC LIMIT 20;
-- =============================================================

-- =============================================================
-- DDL — EXACT INDEX DEFINITIONS
-- =============================================================

-- Q1. getAppointments(date range) — covering index
-- Key: date ASC (matches ORDER BY date ASC in query)
-- INCLUDE: avoids heap fetch for the most common projection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_date
  ON agendamentos (date ASC)
  INCLUDE (id, title, time, vehicle_plate, client_name, type, service_id,
           notify_enabled, notify_before_minutes);

-- Q2. getAppointmentByServiceId — partial + covering
-- Predicate: only rows where service_id IS NOT NULL (20/21 rows → efficient)
-- INCLUDE: covers full row fetch for the single-row lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_service_id
  ON agendamentos (service_id)
  INCLUDE (id, title, date, time, vehicle_plate, client_name, type,
           notify_enabled, notify_before_minutes)
  WHERE service_id IS NOT NULL;

-- Composite for org-scoped + date queries (multi-tenant future)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_org_date
  ON agendamentos (organization_id, date ASC);

-- Q3. getAllReminders(active) — covering composite, eliminates filesort
-- Key order matches query: status first (eq filter), then date+time (ORDER BY)
-- This allows Index Only Scan — no heap access needed for common query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lembretes_status_date
  ON lembretes (status, date ASC, time ASC)
  INCLUDE (id, title, message, service_id);

-- Partial: service_id FK enrichment lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lembretes_service_id
  ON lembretes (service_id)
  WHERE service_id IS NOT NULL;

-- Q4. getVehiclesByClient — FK lookup (38 rows, grows with client count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_veiculos_client_id
  ON "veículos" (client_id)
  INCLUDE (id, plate, brand, model, color, "yearModel");

-- Q5. getServicesFiltered(status) — status enum filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_servicos_status
  ON "serviços" (status);

-- FK: vehicle lookup in services
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_servicos_vehicle_id
  ON "serviços" (vehicle_id)
  WHERE vehicle_id IS NOT NULL;

-- =============================================================
-- FALLBACK DDL (if runner forces transaction — drops CONCURRENTLY)
-- WARNING: These lock the table briefly. Use during low-traffic.
-- =============================================================
-- CREATE INDEX IF NOT EXISTS idx_agendamentos_date
--   ON agendamentos (date ASC)
--   INCLUDE (id, title, time, vehicle_plate, client_name, type, service_id,
--            notify_enabled, notify_before_minutes);
--
-- CREATE INDEX IF NOT EXISTS idx_agendamentos_service_id
--   ON agendamentos (service_id)
--   INCLUDE (id, title, date, time, vehicle_plate, client_name, type,
--            notify_enabled, notify_before_minutes)
--   WHERE service_id IS NOT NULL;
--
-- ...and so on for each index above (remove CONCURRENTLY keyword only)

-- =============================================================
-- ROLLBACK
-- =============================================================
-- DROP INDEX CONCURRENTLY IF EXISTS idx_agendamentos_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_agendamentos_service_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_agendamentos_org_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_lembretes_status_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_lembretes_service_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_veiculos_client_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_servicos_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_servicos_vehicle_id;
