-- =============================================================
-- Migration: Add missing performance indexes (TC012)
-- Objective: Fix timeout in dashboard queries by indexing foreign keys.
-- =============================================================

-- Index for service tasks lookup (Crucial for getServicesFiltered parallel sub-queries)
CREATE INDEX IF NOT EXISTS idx_tarefas_service_id 
ON "tarefas" (service_id);

-- Index for status history lookup
CREATE INDEX IF NOT EXISTS idx_historico_status_service_id 
ON "historico_status" (service_id);

-- Index for reminders lookup (ensure it exists for service_id)
CREATE INDEX IF NOT EXISTS idx_lembretes_service_id_fk 
ON "lembretes" (service_id);

-- GIN Index for JSONB permissions (optional but good for team management perfs)
CREATE INDEX IF NOT EXISTS idx_perfis_permissoes 
ON "perfis_de_usuário" USING GIN (permissoes);

-- Analyze to update statistics
ANALYZE "tarefas";
ANALYZE "historico_status";
ANALYZE "lembretes";
