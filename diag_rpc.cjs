
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSingle(name, rpcName, params) {
    console.log(`\nTesting ${name}:`);
    const { data, error } = await supabase.rpc(rpcName, params);
    if (error) {
        console.error('  FAIL:', error.message);
        console.error('  Code:', error.code);
        console.error('  Details:', error.details);
    } else {
        console.log('  SUCCESS:', JSON.stringify(data).substring(0, 100));
    }
}

async function run() {
    const taskId = '158dd313-5d0d-4cb8-a3c2-83971b666ec7';
    const reminderId = 'bc076ba3-ef19-41e3-892b-a89c145573d0';

    await testSingle('Start Task Atomic', 'start_task_atomic', {
        p_task_id: taskId,
        p_user_id: 'perf-test',
        p_user_name: 'Perf Tester'
    });

    await testSingle('Set Reminder Status', 'set_reminder_status_atomic', {
        p_reminder_id: reminderId,
        p_new_status: 'done'
    });
}

run();
