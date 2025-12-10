require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

let supabase = null;
let isConnected = false;

if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    isConnected = true;
    console.log('[DB] Supabase initialized with Service Role Key');
} else {
    console.warn('[DB] MISSING SUPABASE CREDENTIALS in .env (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    console.warn('[DB] Falling back to InMemory ELO (Session only)');
}

/**
 * Get user ELO by username
 * @param {string} username 
 * @returns {Promise<number>} elo
 */
async function getUserElo(username) {
    if (!isConnected || !username) return 300;

    try {
        // Attempt to find user
        const { data, error } = await supabase
            .from('profiles')
            .select('elo')
            .eq('username', username)
            .single();

        if (error) {
            // Check if error is "PGRST116" (User not found)
            if (error.code === 'PGRST116') {
                return 300; // Default for new found users
            }
            console.error(`[DB] Error fetching ELO for ${username}:`, error.message);
            return 300;
        }

        return data?.elo || 300;
    } catch (err) {
        console.error(`[DB] Unexpected error getUserElo for ${username}:`, err);
        return 300;
    }
}

/**
 * Update user ELO
 * @param {string} username 
 * @param {number} newElo 
 * @returns {Promise<void>}
 */
async function updateUserElo(username, newElo) {
    if (!isConnected || !username) {
        // console.log(`[DB] InMemory Update: ${username} -> ${newElo}`);
        return;
    }

    try {
        // We use 'upsert' or 'update'. Since profile should exist if they logged in:
        const { error } = await supabase
            .from('profiles')
            .update({ elo: Math.round(newElo) })
            .eq('username', username);

        if (error) {
            console.error(`[DB] Failed to update ELO for ${username}:`, error.message);
        } else {
            // console.log(`[DB] Persisted ELO for ${username}: ${newElo}`);
        }
    } catch (err) {
        console.error(`[DB] Unexpected error updateUserElo for ${username}:`, err);
    }
}

module.exports = {
    getUserElo,
    updateUserElo,
    isConnected: () => isConnected
};
