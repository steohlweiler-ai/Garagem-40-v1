-- Migration 010: Idempotency Keys for Invoices and Stock
-- Objective: Avoid duplicate transactions during RPC retries

-- 1. Add idempotency_key to 'faturas'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faturas' AND column_name='idempotency_key') THEN
        ALTER TABLE "faturas" ADD COLUMN "idempotency_key" UUID UNIQUE;
    END IF;
END $$;

-- 2. Add idempotency_key to 'movimentos_de_ações' (Stock Movements)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentos_de_ações' AND column_name='idempotency_key') THEN
        ALTER TABLE "movimentos_de_ações" ADD COLUMN "idempotency_key" UUID UNIQUE;
    END IF;
END $$;

-- 3. Add idempotency_key to 'alocações_de_estoque' (Stock Allocations)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alocações_de_estoque' AND column_name='idempotency_key') THEN
        ALTER TABLE "alocações_de_estoque" ADD COLUMN "idempotency_key" UUID UNIQUE;
    END IF;
END $$;

-- Note: RPCs 'update_stock_atomic' and 'reserve_stock_atomic' should be updated
-- to check for these keys before inserting.
