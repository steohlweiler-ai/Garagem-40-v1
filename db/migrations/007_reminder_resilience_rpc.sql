
-- =============================================================
-- Migration: Reminder System Resilience & Atomicity
-- Objective: Atomic reminder status updates with FOR UPDATE.
-- =============================================================

-- 1. Function to Atomic Set Reminder Status
CREATE OR REPLACE FUNCTION set_reminder_status_atomic(
    p_reminder_id UUID,
    p_new_status TEXT
) RETURNS JSONB AS $$
DECLARE
    v_updated_record RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Lock the row for update to prevent concurrent race conditions
    -- 2. Update status and timestamp
    UPDATE lembretes
    SET 
        status = p_new_status,
        updated_at = v_now
    WHERE id = p_reminder_id
    RETURNING * INTO v_updated_record;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 3. Return the updated record as JSONB for the frontend
    RETURN jsonb_build_object(
        'id', v_updated_record.id,
        'service_id', v_updated_record.service_id,
        'title', v_updated_record.title,
        'message', v_updated_record.message,
        'date', v_updated_record.date,
        'time', v_updated_record.time,
        'status', v_updated_record.status,
        'updated_at', v_updated_record.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
