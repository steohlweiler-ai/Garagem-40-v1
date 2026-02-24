
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
    console.log('--- Performance Audit Start ---');

    // 1. Audit Dashboard Services
    console.log('\n[1/4] Auditing get_dashboard_services...');
    const { data: dashPlan, error: dashErr } = await supabase.rpc('audit_get_dashboard_services');
    if (dashErr) console.error('Error:', dashErr.message);
    else console.log('Plan:', JSON.stringify(dashPlan, null, 2));

    // 2. Audit Get Service By Id
    console.log('\n[2/4] Auditing get_service_by_id...');
    const { data: servicePlan, error: serviceErr } = await supabase.rpc('audit_get_service_by_id', {
        p_id: '00ba38e1-3f6c-4a5e-b480-44fc9a8825cf'
    });
    if (serviceErr) console.error('Error:', serviceErr.message);
    else console.log('Plan:', JSON.stringify(servicePlan, null, 2));

    // 3. Audit Start Task
    console.log('\n[3/4] Auditing start_task_atomic...');
    const { data: taskPlan, error: taskErr } = await supabase.rpc('audit_start_task_atomic', {
        p_task_id: '158dd313-5d0d-4cb8-a3c2-83971b666ec7',
        p_user_id: 'test-user',
        p_user_name: 'Test Auditor'
    });
    if (taskErr) console.error('Error:', taskErr.message);
    else console.log('Plan:', JSON.stringify(taskPlan, null, 2));

    // 4. Audit Set Reminder Status
    console.log('\n[4/4] Auditing set_reminder_status_atomic...');
    const { data: reminderPlan, error: reminderErr } = await supabase.rpc('audit_set_reminder_status_atomic', {
        p_reminder_id: 'bc076ba3-ef19-41e3-892b-a89c145573d0',
        p_new_status: 'done'
    });
    if (reminderErr) console.error('Error:', reminderErr.message);
    else console.log('Plan:', JSON.stringify(reminderPlan, null, 2));
}

runAudit();
