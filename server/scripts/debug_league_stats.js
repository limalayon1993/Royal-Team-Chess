const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load from current dir (server/.env)

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    // Try to debug what we have
    console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    const now = new Date();
    // Use simple logic first, same as frontend
    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log('Checking stats for Season:', currentId);

    const { data, error } = await supabase
        .from('club_seasonal_stats')
        .select(`
            *,
            club:clubs (id, name, division)
        `)
        .eq('season_id', currentId)
        .eq('club.name', 'The First Chess Club'); // This might not work with join filter syntax in simplified generic client

    // Better: fetch all and filter in JS, or use inner join filter syntax if known.
    // Supabase JS allows: .eq('club.name', ...) ONLY if !inner is used or similar.
    // Let's just fetch all and filter in JS to be safe and quick.

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} records for season ${currentId}.`);

    if (data.length === 0) {
        console.log('No records found. Checking if any stats exist for any season...');
        const { data: allStats } = await supabase.from('club_seasonal_stats').select('season_id').limit(5);
        console.log('Sample seasons in DB:', allStats);
    }

    data.forEach(r => {
        console.log(`Club: ${r.club?.name} (${r.club?.id})`);
        console.log(`  - Stats Division column: ${r.division}`);
        console.log(`  - Club Division column: ${r.club?.division}`);
        const effectiveDiv = (r.division || 1);
        console.log(`  - Current Frontend Logic (r.division || 1): ${effectiveDiv}`);
        console.log(`  - Proposed Logic (r.division || r.club?.division || 1): ${r.division || r.club?.division || 1}`);
        console.log('---');
    });
}

checkStats();
