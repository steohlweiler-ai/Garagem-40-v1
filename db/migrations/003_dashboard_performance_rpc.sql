-- =============================================================
-- Migration: UNIFIED Dashboard Performance Optimization (TC010)
-- Objective: Create dependencies (priority_bucket) + RPC in one go.
-- =============================================================

-- 1. Ensure Dependencies (from 002)
DO $$ 
BEGIN 
    -- Add priority_bucket
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serviços' AND column_name = 'priority_bucket') THEN
        ALTER TABLE "serviços" ADD COLUMN priority_bucket INTEGER DEFAULT 2;
    END IF;
    -- Add version for Optimistic Locking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serviços' AND column_name = 'version') THEN
        ALTER TABLE "serviços" ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    -- Add updated_at for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serviços' AND column_name = 'updated_at') THEN
        ALTER TABLE "serviços" ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Create/Update Calculation Function
CREATE OR REPLACE FUNCTION calculate_priority_bucket(
    status TEXT,
    estimated_delivery TIMESTAMPTZ
) RETURNS INTEGER AS $$
BEGIN
    IF status = 'Entregue' THEN RETURN 3; END IF;
    IF estimated_delivery IS NULL THEN RETURN 2; END IF;
    IF estimated_delivery < NOW() THEN RETURN 0; END IF;
    RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Sync existing data
UPDATE "serviços" SET priority_bucket = calculate_priority_bucket(status, estimated_delivery);

-- 4. Set priority_bucket trigger
CREATE OR REPLACE FUNCTION trg_update_priority_bucket()
RETURNS TRIGGER AS $$
BEGIN
    NEW.priority_bucket := calculate_priority_bucket(NEW.status, NEW.estimated_delivery);
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_servicos_priority_bucket ON "serviços";
CREATE TRIGGER trg_servicos_priority_bucket
BEFORE INSERT OR UPDATE OF status, estimated_delivery
ON "serviços"
FOR EACH ROW
EXECUTE FUNCTION trg_update_priority_bucket();

-- 5. Create High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_servicos_dashboard_optimized 
ON "serviços" (priority_bucket, estimated_delivery, entry_at)
WHERE status != 'Entregue';

CREATE INDEX IF NOT EXISTS idx_servicos_fk_fast_join
ON "serviços" (vehicle_id, client_id)
WHERE status != 'Entregue';

-- 6. RPC: Consolidada para Dashboard
CREATE OR REPLACE FUNCTION get_dashboard_services(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_statuses TEXT[] DEFAULT NULL
) 
RETURNS TABLE (
  service_data JSONB,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
    IF p_statuses IS NOT NULL THEN
        SELECT count(*) INTO v_total_count FROM "serviços" WHERE status = ANY(p_statuses);
    ELSE
        SELECT count(*) INTO v_total_count FROM "serviços" WHERE status != 'Entregue';
    END IF;

    RETURN QUERY
    WITH filtered_services AS (
        SELECT 
            s.id, s.status, s.priority, s.total_value, s.estimated_delivery, 
            s.entry_at, s.priority_bucket, s.version, s.vehicle_id, s.client_id,
            v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
            c.name as client_name, c.phone as client_phone
        FROM "serviços" s
        LEFT JOIN "veículos" v ON s.vehicle_id = v.id
        LEFT JOIN "clientes" c ON s.client_id = c.id
        WHERE (p_statuses IS NULL AND s.status != 'Entregue') OR (s.status = ANY(p_statuses))
        ORDER BY s.priority_bucket ASC, s.estimated_delivery ASC NULLS LAST, s.entry_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        jsonb_build_object(
            'services', COALESCE(jsonb_agg(fs.*), '[]'::jsonb),
            'timestamp', now()
        ),
        v_total_count
    FROM filtered_services fs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
