-- =============================================================
-- Migration: Add priority_bucket and Composite Indexes
-- Objective: Structural protection for sorting and performance
-- =============================================================

-- 1. Add priority_bucket column if not exists
-- 0: Overdue (Atrasado)
-- 1: Due Today/Soon (No Prazo)
-- 2: No Delivery Date / Done (Sem Previsão / Entregue)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serviços' AND column_name = 'priority_bucket') THEN
        ALTER TABLE "serviços" ADD COLUMN priority_bucket INTEGER DEFAULT 2;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'serviços' AND column_name = 'version') THEN
        ALTER TABLE "serviços" ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- 2. Create function to calculate bucket
CREATE OR REPLACE FUNCTION calculate_priority_bucket(
    status TEXT,
    estimated_delivery TIMESTAMPTZ
) RETURNS INTEGER AS $$
BEGIN
    -- Delivered items always go to the bottom
    IF status = 'Entregue' THEN
        RETURN 3;
    END IF;

    -- No delivery date
    IF estimated_delivery IS NULL THEN
        RETURN 2;
    END IF;

    -- Overdue (past date)
    IF estimated_delivery < NOW() THEN
        RETURN 0;
    END IF;

    -- On time
    RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing records
UPDATE "serviços" SET priority_bucket = calculate_priority_bucket(status, estimated_delivery);

-- 4. Create trigger to keep bucket updated AND handle versioning
CREATE OR REPLACE FUNCTION trg_update_priority_bucket()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate bucket
    NEW.priority_bucket := calculate_priority_bucket(NEW.status, NEW.estimated_delivery);
    
    -- Increment version for Optimistic Locking
    NEW.version := OLD.version + 1;
    
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

-- 5. Create Composite Index (The PERFORMANCE Shield)
-- This allows Postgres to fetch services in the exact order we want (Bucket -> Delivery -> Entry)
-- without any dynamic sorting cost.
CREATE INDEX IF NOT EXISTS idx_servicos_performance_shield 
ON "serviços" (priority_bucket ASC, estimated_delivery ASC NULLS LAST, entry_at DESC);

-- 6. Add inspection_data type safety (JSONB)
-- Ensure 'inspection' is JSONB for better performance and indexing
-- (Assuming it might be text or json in some older versions)
-- ALTER TABLE "serviços" ALTER COLUMN inspection SET DATA TYPE JSONB USING inspection::JSONB;

-- =============================================================
-- EXPLAIN (Before implementation of index and bucket)
-- Seq Scan on "serviços"  (cost=0.00..X.XX rows=X width=XXX)
--   Filter: (status <> 'Entregue'::text)
--   Sort Key: (CASE ...), estimated_delivery, entry_at
--   Sort Method: quicksort  Memory: XXXkB
-- =============================================================

-- AFTER migration, the query should be:
-- SELECT * FROM "serviços" 
-- WHERE status <> 'Entregue' 
-- ORDER BY priority_bucket ASC, estimated_delivery ASC NULLS LAST, entry_at DESC 
-- LIMIT 50;
--
-- This should result in an "Index Scan using idx_servicos_performance_shield"
