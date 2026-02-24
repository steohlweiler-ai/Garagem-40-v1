
-- =============================================================
-- Migration: Task System Resilience & Atomicity (V2)
-- Objective: Atomic task start/stop and "pause others" rule WITH history logging.
-- =============================================================

-- 1. Function to Atomic Start Task (pausing others and logging history)
CREATE OR REPLACE FUNCTION start_task_atomic(
    p_task_id UUID,
    p_user_id TEXT,
    p_user_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_service_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_paused_task RECORD;
    v_dur INTEGER;
BEGIN
    -- Get parent OS
    SELECT service_id INTO v_service_id FROM tarefas WHERE id = p_task_id;
    
    IF v_service_id IS NULL THEN RETURN FALSE; END IF;

    -- A. Properly STOP and LOG other tasks for this OS
    FOR v_paused_task IN 
        SELECT id, started_at, COALESCE(time_spent_seconds, 0) as spent 
        FROM tarefas 
        WHERE service_id = v_service_id AND status = 'in_progress' AND id != p_task_id
    LOOP
        v_dur := EXTRACT(EPOCH FROM (v_now - v_paused_task.started_at))::INTEGER;
        
        -- Log history for the paused task
        INSERT INTO historico_tarefas (
            task_id, user_id, user_name, started_at, ended_at, duration_seconds, organization_id
        ) VALUES (
            v_paused_task.id, p_user_id, p_user_name, v_paused_task.started_at, v_now, v_dur, 'org-default'
        );

        -- Update the paused task
        UPDATE tarefas SET 
            status = 'todo',
            started_at = NULL,
            time_spent_seconds = v_paused_task.spent + v_dur,
            updated_at = v_now
        WHERE id = v_paused_task.id;
    END LOOP;

    -- B. START this task
    UPDATE tarefas SET
        status = 'in_progress',
        started_at = v_now,
        last_executor_id = p_user_id,
        last_executor_name = p_user_name,
        updated_at = v_now
    WHERE id = p_task_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to Atomic Stop Task (reliable duration)
CREATE OR REPLACE FUNCTION stop_task_atomic(
    p_task_id UUID,
    p_user_id TEXT,
    p_user_name TEXT,
    p_org_id TEXT DEFAULT 'org-default'
) RETURNS BOOLEAN AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
    v_duration_seconds INTEGER;
    v_total_spent INTEGER;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get current state
    SELECT started_at, COALESCE(time_spent_seconds, 0) 
    INTO v_started_at, v_total_spent 
    FROM tarefas WHERE id = p_task_id;

    -- Safety check: can't stop what wasn't started
    IF v_started_at IS NULL THEN 
        UPDATE tarefas SET status = 'todo', started_at = NULL, updated_at = v_now WHERE id = p_task_id;
        RETURN TRUE; 
    END IF;

    -- Calculate duration reliably on server
    v_duration_seconds := EXTRACT(EPOCH FROM (v_now - v_started_at))::INTEGER;
    v_total_spent := v_total_spent + v_duration_seconds;

    -- A. Update task
    UPDATE tarefas SET
        status = 'todo',
        started_at = NULL,
        time_spent_seconds = v_total_spent,
        updated_at = v_now
    WHERE id = p_task_id;

    -- B. Log audit history
    INSERT INTO historico_tarefas (
        task_id, user_id, user_name, started_at, ended_at, duration_seconds, organization_id
    ) VALUES (
        p_task_id, p_user_id, p_user_name, v_started_at, v_now, v_duration_seconds, p_org_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
