const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jzprxydtigwitltaagnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHJ4eWR0aWd3aXRsdGFhZ25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY1MTUsImV4cCI6MjA4NDUwMjUxNX0.aN77TvWcAnukFx17jsIqaQpcblR1Cb87qfGKtESo5mU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log('Logging in as garagem40.nene@gmail.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'garagem40.nene@gmail.com',
        password: 'G@r@gem40!'
    });
    
    if (authError) return console.error('Login failed:', authError.message);
    const userId = authData.user.id;
    console.log('Logged in. Updating profile for', userId);

    const { data, error } = await supabase
        .from('perfis_de_usuário')
        .update({ organization_id: 'org_1' })
        .eq('user_id', userId)
        .select();

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('Update success!', data);
    }
}
main();
