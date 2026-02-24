
-- =============================================================
-- Migration: High Performance Optimizations (Fase 2 - Final)
-- Objective: 
-- 1. Partial Index for in_progress tasks
-- 2. Performance-optimized KPI Stats Table
-- 3. Unified RPC for Service Details
-- =============================================================

-- 1. Partial Index for Task Resourcing
CREATE INDEX IF NOT EXISTS idx_tarefas_in_progress_partial 
ON tarefas (service_id) 
WHERE status = 'in_progress';

-- 2. KPI Stats Counter System
-- This table will store the pre-calculated counts per organization
CREATE TABLE IF NOT EXISTS service_stats (
    organization_id TEXT PRIMARY KEY,
    atrasado INTEGER DEFAULT 0,
    pendente INTEGER DEFAULT 0,
    andamento INTEGER DEFAULT 0,
    lembrete INTEGER DEFAULT 0,
    pronto INTEGER DEFAULT 0,
    entregue INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize stats for current data
INSERT INTO service_stats (organization_id)
SELECT DISTINCT organization_id FROM "serviços"
ON CONFLICT DO NOTHING;

-- Function to Recalculate Stats for an Org (Full Sync)
-- Useful for initialization or if triggers drift
CREATE OR REPLACE FUNCTION refresh_service_stats(p_org_id TEXT) RETURNS VOID AS $$
BEGIN
    INSERT INTO service_stats (
        organization_id, atrasado, pendente, andamento, lembrete, pronto, entregue, total, updated_at
    )
    SELECT 
        p_org_id,
        COUNT(*) FILTER (WHERE priority_bucket = 0 AND status != 'Entregue'),
        COUNT(*) FILTER (WHERE status = 'Pendente'),
        COUNT(*) FILTER (WHERE status = 'Em Andamento'),
        COUNT(*) FILTER (WHERE status = 'Lembrete'),
        COUNT(*) FILTER (WHERE status = 'Pronto'),
        COUNT(*) FILTER (WHERE status = 'Entregue'),
        COUNT(*) FILTER (WHERE status != 'Entregue'),
        NOW()
    FROM "serviços"
    WHERE organization_id = p_org_id
    ON CONFLICT (organization_id) DO UPDATE SET
        atrasado = EXCLUDED.atrasado,
        pendente = EXCLUDED.pendente,
        andamento = EXCLUDED.andamento,
        lembrete = EXCLUDED.lembrete,
        pronto = EXCLUDED.pronto,
        entregue = EXCLUDED.entregue,
        total = EXCLUDED.total,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Sync initial stats
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT organization_id FROM "serviços" LOOP
        PERFORM refresh_service_stats(r.organization_id);
    END LOOP;
END $$;

-- Trigger to Maintain Stats Automatically (Optimized)
CREATE OR REPLACE FUNCTION trg_maintain_service_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id TEXT;
BEGIN
    -- Only run if critical fields for stats changed
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS NOT DISTINCT FROM NEW.status AND 
            OLD.estimated_delivery IS NOT DISTINCT FROM NEW.estimated_delivery AND
            OLD.priority_bucket IS NOT DISTINCT FROM NEW.priority_bucket) THEN
            RETURN NULL;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN v_org_id := OLD.organization_id;
    ELSE v_org_id := NEW.organization_id;
    END IF;

    PERFORM refresh_service_stats(v_org_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_servicos_stats_sync ON "serviços";
CREATE TRIGGER trg_servicos_stats_sync
AFTER INSERT OR UPDATE OR DELETE ON "serviços"
FOR EACH ROW EXECUTE FUNCTION trg_maintain_service_stats();

-- 3. Unified Service Detail RPC
CREATE OR REPLACE FUNCTION get_service_detail_unified(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_service JSONB;
    v_tasks JSONB;
    v_reminders JSONB;
    v_history JSONB;
BEGIN
    -- 1. Fetch Service main data
    SELECT to_jsonb(s.*) INTO v_service 
    FROM "serviços" s 
    WHERE s.id = p_id;

    IF v_service IS NULL THEN RETURN NULL; END IF;

    -- 2. Fetch Tasks
    SELECT COALESCE(jsonb_agg(t.*), '[]'::jsonb) INTO v_tasks
    FROM (SELECT * FROM tarefas WHERE service_id = p_id ORDER BY "order") t;

    -- 3. Fetch Reminders
    SELECT COALESCE(jsonb_agg(r.*), '[]'::jsonb) INTO v_reminders
    FROM (SELECT * FROM lembretes WHERE service_id = p_id) r;

    -- 4. Fetch History (Limited to 50)
    SELECT COALESCE(jsonb_agg(h.*), '[]'::jsonb) INTO v_history
    FROM (
        SELECT * FROM historico_status 
        WHERE service_id = p_id 
        ORDER BY timestamp DESC 
        LIMIT 50
    ) h;

    RETURN jsonb_build_object(
        'service', v_service,
        'tasks', v_tasks,
        'reminders', v_reminders,
        'history', v_history
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update Dashboard RPC to use Stats Table
CREATE OR REPLACE FUNCTION get_dashboard_services_v3(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_statuses TEXT[] DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_org_id TEXT DEFAULT 'org-default'
) 
RETURNS TABLE (
  service_data JSONB,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
  v_stats JSONB;
BEGIN
    -- 1. Get stats from optimized table instead of counting all rows
    SELECT 
        JSONB_BUILD_OBJECT(
            'atrasado', atrasado,
            'pendente', pendente,
            'andamento', andamento,
            'lembrete', lembrete,
            'pronto', pronto,
            'entregue', entregue,
            'total', total
        )
    INTO v_stats
    FROM service_stats
    WHERE organization_id = p_org_id;

    -- Fallback if no stats record exists yet
    IF v_stats IS NULL THEN
        v_stats := '{"atrasado":0,"pendente":0,"andamento":0,"lembrete":0,"pronto":0,"entregue":0,"total":0}'::jsonb;
    END IF;

    -- 2. Get total count for the filtered list
    SELECT count(*) INTO v_total_count 
    FROM "serviços" 
    WHERE (p_org_id IS NULL OR organization_id = p_org_id)
      AND ((p_statuses IS NULL AND status != 'Entregue') OR (status = ANY(p_statuses)))
      AND (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id);

    -- 3. Return query combining filtered services and global stats
    RETURN QUERY
    WITH filtered_services AS (
        SELECT 
            s.*,
            v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
            c.name as client_name, c.phone as client_phone
        FROM "serviços" s
        LEFT JOIN "veículos" v ON s.vehicle_id = v.id
        LEFT JOIN "clientes" c ON s.client_id = c.id
        WHERE (p_org_id IS NULL OR s.organization_id = p_org_id)
          AND ((p_statuses IS NULL AND s.status != 'Entregue') OR (s.status = ANY(p_statuses)))
          AND (p_client_id IS NULL OR s.client_id = p_client_id)
          AND (p_vehicle_id IS NULL OR s.vehicle_id = p_vehicle_id)
        ORDER BY s.priority_bucket ASC, s.estimated_delivery ASC NULLS LAST, s.entry_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        jsonb_build_object(
            'services', COALESCE(jsonb_agg(fs.*), '[]'::jsonb),
            'stats', v_stats,
            'timestamp', now()
        ),
        v_total_count
    FROM filtered_services fs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
