-- =============================================================
-- Testsuite Seed — garagem40
-- PR: chore(db): add indexes and testsuite seed for TestSprite
-- =============================================================
-- Run: psql $DATABASE_URL -f db/seeds/testsuite_seed.sql
--
-- Required env vars:
--   DATABASE_URL          - PostgreSQL connection string
--   TEST_USER_PASSWORD    - Password for all test users (e.g. secrets.TEST_USER_PASSWORD)
--
-- CI populates via: env: TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
-- Local dev: export TEST_USER_PASSWORD="Test@12345" before running
--
-- Auth users must be pre-created via Supabase Auth Admin API or Dashboard.
-- This seed only inserts profile records — it does NOT set auth passwords.
-- See CI job db-seed-and-smoke.yml step "Create test users via Auth API" for
-- automated user creation using SUPABASE_SERVICE_ROLE_KEY.
-- =============================================================

-- Safety check: prevent silent production runs
DO $$
BEGIN
  RAISE NOTICE '⚠️  Seed running. All data tagged organization_id=org-test. Rollback at bottom.';
END $$;

-- =============================================================
-- 0. FIXED UUIDs (deterministic — idempotent with ON CONFLICT)
-- =============================================================
-- Users
-- admin_id:      00000000-0000-0000-0000-000000000001
-- operador_id:   00000000-0000-0000-0000-000000000002
-- financeiro_id: 00000000-0000-0000-0000-000000000003
-- Client:        10000000-0000-0000-0000-000000000001
-- Vehicle:       20000000-0000-0000-0000-000000000001
-- Service:       30000000-0000-0000-0000-000000000001
-- Appointments:  40000000-0000-0000-0000-00000000000[1-5]
-- Reminders:     50000000-0000-0000-0000-00000000000[1-3]

-- =============================================================
-- 1. USER PROFILES
-- NOTE: Auth users created separately via Supabase Auth Admin API.
-- This inserts profile records only. UUIDs must match auth.users.id.
-- =============================================================
INSERT INTO perfis_usuarios (id, organization_id, name, email, phone, role, active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'org-test',
   'Admin Teste', 'admin@garagem40.test', '(51) 90000-0001', 'admin', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'org-test',
   'Operador Teste', 'operador@garagem40.test', '(51) 90000-0002', 'operador', TRUE),
  ('00000000-0000-0000-0000-000000000003', 'org-test',
   'Financeiro Teste', 'financeiro@garagem40.test', '(51) 90000-0003', 'financeiro', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  active = EXCLUDED.active;

-- =============================================================
-- 2. CLIENT
-- =============================================================
INSERT INTO clientes (id, organization_id, name, phone, notes, cpf_cnpj, address)
VALUES (
  '10000000-0000-0000-0000-000000000001', 'org-test',
  'Cliente Teste TestSprite', '(51) 99999-0001',
  '[seed] Cliente automático de testes — não remover manualmente',
  '000.000.000-01',
  'Rua Semente, 42, Porto Alegre - RS'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 3. VEHICLE
-- =============================================================
INSERT INTO "veículos" (id, organization_id, client_id, plate, brand, model, color, "yearModel")
VALUES (
  '20000000-0000-0000-0000-000000000001', 'org-test',
  '10000000-0000-0000-0000-000000000001',
  'TEST001', 'Toyota', 'Corolla', 'Prata', '2023/2024'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 4. ORDEM DE SERVIÇO
-- =============================================================
INSERT INTO "serviços" (
  id, organization_id, vehicle_id, client_id,
  status, priority, total_value, estimated_delivery,
  tasks, reminders, status_history
)
VALUES (
  '30000000-0000-0000-0000-000000000001', 'org-test',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Em Andamento', 'alta', 1500.00,
  (NOW() + INTERVAL '7 days'),
  '[]'::jsonb, '[]'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(), 'status', 'Em Andamento',
      'timestamp', NOW()::text, 'action_source', 'seed'
    )
  )
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 5. AGENDAMENTOS (5)
-- =============================================================
DO $$
DECLARE svc UUID := '30000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO agendamentos
    (id, organization_id, service_id, title, date, time,
     vehicle_plate, vehicle_brand, vehicle_model, client_name, client_phone,
     type, notify_enabled, notify_before_minutes, description)
  VALUES
    ('40000000-0000-0000-0000-000000000001', 'org-test', svc,
     'Revisão inicial — TEST001', CURRENT_DATE::text, '09:00',
     'TEST001', 'Toyota', 'Corolla', 'Cliente Teste TestSprite', '(51) 99999-0001',
     'manual', TRUE, 15, '[seed] Hoje'),

    ('40000000-0000-0000-0000-000000000002', 'org-test', svc,
     'Entrega parcial — TEST001', (CURRENT_DATE + 1)::text, '14:00',
     'TEST001', 'Toyota', 'Corolla', 'Cliente Teste TestSprite', '(51) 99999-0001',
     'service_delivery', TRUE, 30, '[seed] Amanhã'),

    ('40000000-0000-0000-0000-000000000003', 'org-test', svc,
     'Entrega final — TEST001', (CURRENT_DATE + 7)::text, '10:00',
     'TEST001', 'Toyota', 'Corolla', 'Cliente Teste TestSprite', '(51) 99999-0001',
     'service_delivery', TRUE, 60, '[seed] +7 dias'),

    ('40000000-0000-0000-0000-000000000004', 'org-test', svc,
     'Retorno garantia — TEST001', (CURRENT_DATE + 14)::text, '11:00',
     'TEST001', 'Toyota', 'Corolla', 'Cliente Teste TestSprite', '(51) 99999-0001',
     'manual', TRUE, 15, '[seed] +14 dias'),

    ('40000000-0000-0000-0000-000000000005', 'org-test', svc,
     'Check-in inicial — TEST001', (CURRENT_DATE - 1)::text, '08:00',
     'TEST001', 'Toyota', 'Corolla', 'Cliente Teste TestSprite', '(51) 99999-0001',
     'manual', FALSE, 15, '[seed] Ontem (histórico)')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =============================================================
-- 6. LEMBRETES (3)
-- =============================================================
DO $$
DECLARE svc UUID := '30000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO lembretes (id, service_id, title, message, date, time, status)
  VALUES
    ('50000000-0000-0000-0000-000000000001', svc,
     '[seed] Solicitar peças', 'Ligar para fornecedor',
     (CURRENT_DATE + 1)::text, '08:30', 'active'),
    ('50000000-0000-0000-0000-000000000002', svc,
     '[seed] Notificar cliente', 'Enviar orçamento por WhatsApp',
     (CURRENT_DATE + 2)::text, '10:00', 'active'),
    ('50000000-0000-0000-0000-000000000003', svc,
     '[seed] Revisar pintura', 'Checar cor definitiva',
     (CURRENT_DATE + 3)::text, '09:00', 'active')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =============================================================
-- 7. SMOKE VERIFY
-- =============================================================
DO $$
DECLARE
  ca INT; cv INT; cs INT; cag INT; cr INT;
BEGIN
  SELECT COUNT(*) INTO ca FROM clientes       WHERE organization_id = 'org-test';
  SELECT COUNT(*) INTO cv FROM "veículos"     WHERE organization_id = 'org-test';
  SELECT COUNT(*) INTO cs FROM "serviços"     WHERE organization_id = 'org-test';
  SELECT COUNT(*) INTO cag FROM agendamentos  WHERE organization_id = 'org-test';
  SELECT COUNT(*) INTO cr FROM lembretes
    WHERE service_id = '30000000-0000-0000-0000-000000000001';

  RAISE NOTICE 'SEED VERIFY: clients=% vehicles=% services=% appointments=% reminders=%',
    ca, cv, cs, cag, cr;

  IF cag < 5 THEN RAISE EXCEPTION 'Seed incomplete: expected 5 appointments, got %', cag; END IF;
END $$;

-- =============================================================
-- ROLLBACK (uncomment to clean up)
-- =============================================================
/*
  DELETE FROM agendamentos    WHERE organization_id = 'org-test';
  DELETE FROM lembretes WHERE service_id IN
    (SELECT id FROM "serviços" WHERE organization_id = 'org-test');
  DELETE FROM "serviços"      WHERE organization_id = 'org-test';
  DELETE FROM "veículos"      WHERE organization_id = 'org-test';
  DELETE FROM clientes        WHERE organization_id = 'org-test';
  DELETE FROM perfis_usuarios WHERE organization_id = 'org-test';
  RAISE NOTICE '✅ Cleanup complete';
*/
