-- =============================================================
-- Migration: Dashboard RPC v2 (Stats Unification)
-- Objective: Return both service list and KPI stats in a single call.
-- =============================================================

CREATE OR REPLACE FUNCTION get_dashboard_services(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_statuses TEXT[] DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL
) 
RETURNS TABLE (
  service_data JSONB,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
  v_stats JSONB;
BEGIN
    -- 1. Get global workshop stats (Efficient aggregation)
    -- This ignores filters to keep KPI cards consistent as workshop-wide overview
    SELECT 
        JSONB_BUILD_OBJECT(
            'atrasado', COUNT(*) FILTER (WHERE priority_bucket = 0 AND status != 'Entregue'),
            'pendente', COUNT(*) FILTER (WHERE status = 'Pendente'),
            'andamento', COUNT(*) FILTER (WHERE status = 'Em Andamento'),
            'lembrete', COUNT(*) FILTER (WHERE status = 'Lembrete'),
            'pronto', COUNT(*) FILTER (WHERE status = 'Pronto'),
            'entregue', COUNT(*) FILTER (WHERE status = 'Entregue'),
            'total', COUNT(*) FILTER (WHERE status != 'Entregue')
        )
    INTO v_stats
    FROM "serviços";

    -- 2. Get total count for the filtered list
    SELECT count(*) INTO v_total_count 
    FROM "serviços" 
    WHERE ((p_statuses IS NULL AND status != 'Entregue') OR (status = ANY(p_statuses)))
      AND (p_client_id IS NULL OR client_id = p_client_id)
      AND (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id);

    -- 3. Return query combining filtered services and global stats
    RETURN QUERY
    WITH filtered_services AS (
        SELECT 
            s.id, s.status, s.priority, s.total_value, s.estimated_delivery, 
            s.entry_at, s.priority_bucket, s.version, s.vehicle_id, s.client_id,
            s.inspection, s.archived, s.created_by, s.created_by_name,
            v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
            c.name as client_name, c.phone as client_phone
        FROM "serviços" s
        LEFT JOIN "veículos" v ON s.vehicle_id = v.id
        LEFT JOIN "clientes" c ON s.client_id = c.id
        WHERE ((p_statuses IS NULL AND s.status != 'Entregue') OR (s.status = ANY(p_statuses)))
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
