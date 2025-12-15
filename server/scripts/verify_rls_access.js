const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// USE THE ANON KEY, NOT THE SERVICE ROLE KEY
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase ANON credentials');
    console.log('Keys found:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPublicVisibility() {
    const now = new Date();
    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log('Checking PUBLIC visibility for Season:', currentId);

    // Try to fetch as an anonymous user
    const { data, error } = await supabase
        .from('club_seasonal_stats')
        .select(`
            *,
            club:clubs (id, name, division)
        `)
        .eq('season_id', currentId);

    if (error) {
        console.error('Error fetching as ANON:', error);
        return;
    }

    console.log(`ANON User found ${data.length} records.`);

    if (data.length === 0) {
        console.log('!! RESULT: Data is hidden from anonymous users. RLS is likely blocking access. !!');
    } else {
        console.log('!! RESULT: Data is visible to anonymous users. RLS might NOT be the issue (or policies are open). !!');
        data.forEach(r => {
            console.log(`- ${r.club?.name || 'Unknown Club'} (Div ${r.division})`);
        });
    }
}

checkPublicVisibility();
