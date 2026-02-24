
-- =============================================================
-- Migration: Performance Audit RPCs
-- Objective: Expose EXPLAIN ANALYZE data for core functions.
-- =============================================================

-- 1. Audit Dashboard Services
CREATE OR REPLACE FUNCTION audit_get_dashboard_services() RETURNS JSONB AS $$
DECLARE
    v_plan JSONB;
BEGIN
    -- We use a CTE to ensure the optimizer treats it as a single unit if possible
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT * FROM get_dashboard_services(50, 0, NULL, NULL, NULL)
    INTO v_plan;
    RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Audit Get Service By Id (Composite)
-- Since get_service_by_id is a composite of queries in JS, we audit the main one here.
-- Or we create a consolidated RPC if needed. 
-- For now, let's audit the main 'serviços' fetch.
CREATE OR REPLACE FUNCTION audit_get_service_by_id(p_id UUID) RETURNS JSONB AS $$
DECLARE
    v_plan JSONB;
BEGIN
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT * FROM "serviços" WHERE id = p_id;
    INTO v_plan;
    RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Audit Start Task Atomic
CREATE OR REPLACE FUNCTION audit_start_task_atomic(p_task_id UUID, p_user_id TEXT, p_user_name TEXT) RETURNS JSONB AS $$
DECLARE
    v_plan JSONB;
BEGIN
    -- We can't easily EXPLAIN ANALYZE a function that modifies state without side effects
    -- but we can EXPLAIN the core update inside it.
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT start_task_atomic(p_task_id, p_user_id, p_user_name)
    INTO v_plan;
    RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Audit Set Reminder Status Atomic
CREATE OR REPLACE FUNCTION audit_set_reminder_status_atomic(p_reminder_id UUID, p_new_status TEXT) RETURNS JSONB AS $$
DECLARE
    v_plan JSONB;
BEGIN
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT set_reminder_status_atomic(p_reminder_id, p_new_status)
    INTO v_plan;
    RETURN v_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
