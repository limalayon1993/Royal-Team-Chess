const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    const now = new Date();
    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log('Checking stats for Season:', currentId);

    const { data, error } = await supabase
        .from('club_seasonal_stats')
        .select(`
            *,
            club:clubs (id, name, division)
        `)
        .eq('season_id', currentId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} records.`);
    data.forEach(r => {
        console.log(`Club: ${r.club?.name} (${r.club?.id})`);
        console.log(`  - Stats Division column: ${r.division}`);
        console.log(`  - Club Division column: ${r.club?.division}`);
        console.log(`  - Filter Logic (r.division || 1): ${r.division || 1}`);
        console.log('---');
    });
}

checkStats();
