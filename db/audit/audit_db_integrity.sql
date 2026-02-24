
-- =============================================================
-- Audit Script V2: Comprehensive Database Integrity & Security
-- Objective: Detect drift, orphan objects, and security vulnerabilities.
-- =============================================================

CREATE OR REPLACE FUNCTION audit_db_full_diagnostics()
RETURNS JSONB AS $$
DECLARE
    v_functions JSONB;
    v_indexes JSONB;
    v_permissions JSONB;
    v_orphan_check JSONB;
    v_migration_drift JSONB;
    v_missing_critical_indexes JSONB;
BEGIN

    -- 1. SECURITY AUDIT: Functions (SECURITY DEFINER & search_path)
    SELECT jsonb_agg(f) INTO v_functions
    FROM (
        SELECT 
            proname as name,
            prosecdef as has_security_definer,
            (proconfig IS NOT NULL AND array_to_string(proconfig, ',') ILIKE '%search_path%') as has_search_path,
            CASE 
                WHEN NOT prosecdef THEN 'CRITICAL: Missing SECURITY DEFINER'
                WHEN proconfig IS NULL OR NOT array_to_string(proconfig, ',') ILIKE '%search_path%' THEN 'CRITICAL: Missing search_path'
                ELSE 'OK'
            END as security_status,
            pg_get_function_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          -- Exclude Supabase internal functions if any
          AND proname NOT LIKE 'pg_%'
    ) f;

    -- 2. ACCESS AUDIT: High privileges to public roles
    SELECT jsonb_agg(p) INTO v_permissions
    FROM (
        SELECT 
            grantee, 
            table_name, 
            privilege_type,
            CASE 
                WHEN grantee = 'anon' AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE') THEN 'CRITICAL: Write access for anon'
                WHEN grantee = 'authenticated' AND privilege_type = 'DELETE' AND table_name NOT IN ('logs', 'tmp') THEN 'WARNING: Delete access for authenticated'
                ELSE 'INFO'
            END as risk_level
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' 
          AND grantee IN ('anon', 'authenticated', 'public')
    ) p;

    -- 3. INTEGRITY AUDIT: Missing Critical Indexes
    -- Checking tables that usually require O(1) or O(log N) access
    SELECT jsonb_agg(idx) INTO v_missing_critical_indexes
    FROM (
        SELECT 'serviços' as table_name, 'organization_id' as missing_column
        WHERE NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'serviços' AND indexdef ILIKE '%organization_id%')
        UNION ALL
        SELECT 'tarefas' as table_name, 'service_id' as missing_column
        WHERE NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'tarefas' AND indexdef ILIKE '%service_id%')
        UNION ALL
        SELECT 'historico_status' as table_name, 'service_id' as missing_column
        WHERE NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'historico_status' AND indexdef ILIKE '%service_id%')
    ) idx;

    -- 4. ORPHAN CHECK: Functions not matching current migration naming patterns
    -- (This is heuristic)
    SELECT jsonb_agg(o) INTO v_orphan_check
    FROM (
        SELECT proname as name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND proname NOT IN (
            'get_dashboard_services_v3', 
            'get_service_detail_unified', 
            'start_task_atomic', 
            'stop_task_atomic',
            'refresh_service_stats',
            'trg_maintain_service_stats',
            'set_reminder_status_atomic',
            'audit_db_full_diagnostics' -- self
          )
          AND proname NOT LIKE 'trg_%' -- ignore other triggers for now
    ) o;

    -- 5. MIGRATION DRIFT
    BEGIN
        SELECT jsonb_agg(m) INTO v_migration_drift
        FROM (SELECT name, applied_at FROM schema_migrations ORDER BY applied_at DESC) m;
    EXCEPTION WHEN OTHERS THEN
        v_migration_drift := '"INFO: schema_migrations table not found (using manual tracking)"'::jsonb;
    END;

    RETURN jsonb_build_object(
        'security_functions', v_functions,
        'security_permissions', v_permissions,
        'missing_indexes', COALESCE(v_missing_critical_indexes, '[]'::jsonb),
        'potential_orphans', COALESCE(v_orphan_check, '[]'::jsonb),
        'migration_history', v_migration_drift,
        'audit_timestamp', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
