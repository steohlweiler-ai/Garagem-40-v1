# Database Index Recommendations

> **For:** Database Architect  
> **From:** Backend Specialist (PR: `fix(api): add pagination & timeout handling for scheduling endpoints`)  
> **Date:** 2026-02-23  
> **Status:** ⏳ PENDING APPLICATION — indexes NOT yet applied

---

## 1. Recommended Indexes — SQL

Copy and run these in Supabase SQL Editor:

```sql
-- =============================================
-- AGENDAMENTOS (Appointments)
-- =============================================

-- Date-range queries (getAppointments with dateFrom/dateTo)
CREATE INDEX IF NOT EXISTS idx_agendamentos_date
  ON agendamentos (date);

-- Targeted lookup by service_id (getAppointmentByServiceId)
-- Critical: eliminates full-table scan in syncDeliveryAppointment
CREATE INDEX IF NOT EXISTS idx_agendamentos_service_id
  ON agendamentos (service_id)
  WHERE service_id IS NOT NULL;

-- Composite for organization-scoped date queries (future multi-tenant)
CREATE INDEX IF NOT EXISTS idx_agendamentos_org_date
  ON agendamentos (organization_id, date);


-- =============================================
-- LEMBRETES (Reminders)
-- =============================================

-- Date-range + status filter (getAllReminders active only)
CREATE INDEX IF NOT EXISTS idx_lembretes_date_status
  ON lembretes (date, status);

-- Service join enrichment
CREATE INDEX IF NOT EXISTS idx_lembretes_service_id
  ON lembretes (service_id)
  WHERE service_id IS NOT NULL;
```

---

## 2. EXPLAIN ANALYZE — Validation Queries

After applying indexes, run these queries in Supabase SQL Editor to verify index usage:

```sql
-- 2a. Appointments date-range (should show Index Scan on idx_agendamentos_date)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM agendamentos
WHERE date >= '2026-02-01'
  AND date <= '2026-05-31'
ORDER BY date ASC
LIMIT 50;

-- 2b. Appointment by service_id (should show Index Scan on idx_agendamentos_service_id)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM agendamentos
WHERE service_id = '<any_existing_service_id>'
LIMIT 1;

-- 2c. Reminders date + status (should show Index Scan on idx_lembretes_date_status)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM lembretes
WHERE status = 'active'
  AND date >= '2026-02-23'
  AND date <= '2026-05-31'
ORDER BY date ASC, time ASC
LIMIT 50;

-- 2d. Reminders by service_id (should show Index Scan on idx_lembretes_service_id)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM lembretes
WHERE service_id IN ('<service_id_1>', '<service_id_2>')
LIMIT 50;
```

### Expected Results

| Query | Without Index | With Index |
|-------|--------------|-----------|
| 2a. Date range | Seq Scan | Index Scan on `idx_agendamentos_date` |
| 2b. Service ID | Seq Scan | Index Scan on `idx_agendamentos_service_id` |
| 2c. Reminders | Seq Scan | Index Scan on `idx_lembretes_date_status` |
| 2d. Reminder join | Seq Scan | Index Scan on `idx_lembretes_service_id` |

---

## 3. Priority

| Priority | Index | Impact |
|----------|-------|--------|
| 🔴 HIGH | `idx_agendamentos_service_id` | Eliminates full-table scan in `syncDeliveryAppointment` |
| 🔴 HIGH | `idx_lembretes_date_status` | Most frequent query pattern (every Agenda tab load) |
| 🟡 MEDIUM | `idx_agendamentos_date` | Improves date-range scans for scheduling views |
| 🟢 LOW | `idx_agendamentos_org_date` | Future multi-tenant optimization |
