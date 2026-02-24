
-- =============================================================
-- Rollback Migration: 012_high_performance_optimizations
-- Objective: Completely revert performance optimizations and table partitioning.
-- =============================================================

-- 1. Remove Dashboard v3 RPC
DROP FUNCTION IF EXISTS get_dashboard_services_v3(INTEGER, INTEGER, TEXT[], UUID, UUID, TEXT);

-- 2. Remove Unified Service Detail RPC
DROP FUNCTION IF EXISTS get_service_detail_unified(UUID);

-- 3. Remove Stats Maintenance Triggers and Functions
DROP TRIGGER IF EXISTS trg_servicos_stats_sync ON "serviços";
DROP FUNCTION IF EXISTS trg_maintain_service_stats();
DROP FUNCTION IF EXISTS refresh_service_stats(TEXT);

-- 4. Remove Partitions and Main Stats Table
-- Warning: This will delete all cached stats data.
DROP TABLE IF EXISTS service_stats_org_default;
DROP TABLE IF EXISTS service_stats_org_test;
DROP TABLE IF EXISTS service_stats_default;
DROP TABLE IF EXISTS service_stats;

-- 5. Remove Indexes
DROP INDEX IF EXISTS idx_servicos_organization_id;
DROP INDEX IF EXISTS idx_tarefas_organization_id;
DROP INDEX IF EXISTS idx_lembretes_organization_id;
DROP INDEX IF EXISTS idx_historico_status_organization_id;
DROP INDEX IF EXISTS idx_tarefas_in_progress_partial;

-- =============================================================
-- ✅ Rollback Complete
-- =============================================================
