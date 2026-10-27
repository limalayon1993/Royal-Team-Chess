const path = require('path');
// 1. Cargar el .env propio de la carpeta server
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
// 2. Cargar el .env de la raíz como fallback / variables globales
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
// 3. Fallback predeterminado por si se pasa por variable de entorno externa
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
                console.log(`[DB] User ${username} not found, returning default 300`);
                return 300; // Default for new found users
            }
            console.error(`[DB] Error fetching ELO for ${username}:`, error.message);
            return 300;
        }

        console.log(`[DB] getUserElo(${username}) returned:`, data?.elo);
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


/**
 * Delete user and cleanup dependencies to avoid FK constraints
 * @param {string} username
 * @returns {Promise<boolean>} success
 */
async function deleteUser(username) {
    if (!isConnected || !username) return false;

    try {
        // 1. Get User ID first
        console.log(`[DB] deleteUser looking for username: "${username}"`);
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', username)
            .single();

        if (profileError || !userProfile) {
            console.error(`[DB] Failed to find user profile for "${username}":`, profileError?.message || 'Not found');
            console.log('[DB] Query result:', userProfile);
            return false;
        }

        const userId = userProfile.id;
        console.log(`[DB] Found UUID for ${username}: ${userId}`);
        console.log(`[DB] Deleting user ${username} (${userId})...`);

        // 2. Delete Friendships (where user is A or B)
        const { error: fError1 } = await supabase.from('friends').delete().eq('user_id', userId);
        const { error: fError2 } = await supabase.from('friends').delete().eq('friend_id', userId);
        if (fError1) console.error('[DB] Error cleaning friends (A):', fError1);
        if (fError2) console.error('[DB] Error cleaning friends (B):', fError2);

        // 3. Delete Messages (Sent or Received)
        const { error: mError1 } = await supabase.from('messages').delete().eq('sender_id', userId);
        const { error: mError2 } = await supabase.from('messages').delete().eq('receiver_id', userId);
        if (mError1) console.error('[DB] Error cleaning messages (Sent):', mError1);
        if (mError2) console.error('[DB] Error cleaning messages (Received):', mError2);

        // 4. Finally, delete the Profile
        // Note: Deleting the profile might not be enough if we want to remove the LOGIN.
        // We really should delete from auth.users.
        // Using Service Key allows access to auth.admin

        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error(`[DB] Failed to delete auth user for ${username}:`, authDeleteError);
            // Verify if at least profile is gone?
            // If auth delete fails, we might still want to delete profile manually if cascading didn't happen.
            // But usually auth delete CASCADES to profile if configured. 
            // Let's try explicit profile delete just in case auth delete failed or wasn't cascading.
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
            if (profileError) console.error('[DB] Profile delete also failed:', profileError);

            return false;
        }

        console.log(`[DB] User ${username} (Auth & Profile) deleted successfully.`);
        return true;

    } catch (err) {
        console.error(`[DB] Unexpected error deleteUser ${username}:`, err);
        return false;
    }
}

/**
 * Force delete Auth user by ID (Clean up zombies)
 */
async function deleteAuthUserOnly(userId) {
    if (!isConnected || !userId) return false;
    try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) {
            console.error('[DB] Failed to force delete auth user:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[DB] Error in deleteAuthUserOnly:', e);
        return false;
    }
}

/**
 * Force delete Auth user by Email (Clean up zombies by email)
 */
async function deleteUserByEmail(email) {
    if (!isConnected || !email) return false;
    try {
        // 1. Find User ID by Email
        const { data, error: searchError } = await supabase.auth.admin.listUsers();
        if (searchError) {
            console.error('[DB] Failed to list users:', searchError);
            return false;
        }

        const user = data.users.find(u => u.email === email);
        if (!user) {
            console.warn('[DB] User not found by email:', email);
            return true; // Treat as success (already gone)
        }

        // 2. Delete
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            console.error('[DB] Failed to delete user by email:', error);
            return false;
        }

        console.log(`[DB] Successfully force-deleted user ${email} (${user.id})`);
        return true;
    } catch (e) {
        console.error('[DB] Error in deleteUserByEmail:', e);
        return false;
    }
}

/**
 * Force Verify Auth user by Email (Bypass email delivery issues)
 */
async function verifyUserByEmail(email) {
    if (!isConnected || !email) return false;
    try {
        // 1. Find User ID by Email (Fetch up to 1000 users)
        const { data, error: searchError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (searchError) {
            console.error('[DB] Failed to list users for verification:', searchError);
            return false;
        }

        console.log(`[DB] Found ${data?.users?.length || 0} users. Searching for ${email}...`);

        // Case-insensitive search
        const user = data.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());

        if (!user) {
            console.warn('[DB] User not found for verification:', email);
            return false;
        }

        // 2. Update email_confirmed_at
        const { data: updateData, error } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirmed_at: new Date().toISOString() }
        );

        if (error) {
            console.error('[DB] Failed to verify user:', error);
            return false;
        }

        // 3. CRITICAL: Ensure Profile Exists (Fix "Account Deletion Finalized" Loop)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            console.log(`[DB] Profile missing for verified user ${email}. creating now...`);
            // Parse metadata or default
            const username = user.user_metadata?.username || email.split('@')[0];

            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    username: username,
                    elo: 300 // USER REQUEST: Set to 300 for new accounts
                    // email: email // REMOVED: Column does not exist in 'profiles' table!
                }]);

            if (profileError) {
                console.error('[DB] Failed to force-create profile:', profileError);
                // Don't fail the verification though
            } else {
                console.log('[DB] Force-created profile for:', username);
            }
        }

        console.log(`[DB] Successfully manually verified user ${email} (${user.id})`);
        return true;
    } catch (e) {
        console.error('[DB] Error in verifyUserByEmail:', e);
        return false;
    }
}

/**
 * Update User Stats for a specific Season
 * @param {string} userId 
 * @param {string} seasonId (Format: YYYY-MM)
 * @param {Object} statsIncrement (Fields to increment: wins, losses, etc.)
 */
async function updateUserStats(userId, seasonId, statsIncrement) {
    if (!isConnected || !userId) return;

    try {
        // We use an RPC or just raw SQL? 
        // Supabase/Postgres doesn't have a simple "increment" upsert in JS client without stored procedures usually,
        // BUT we can check if row exists, or use a conflict handler?
        // Actually, the cleanest way for atomic increments is an RPC or raw query.
        // But let's try a read-modify-write for MVP since traffic is low, 
        // OR better: Create a stored procedure `increment_user_stats`.
        // SINCE I CANNOT CREATE SQL RPCs RIGHT NOW (User has to), I will do Read-Modify-Write.
        // It has a race condition but acceptable for this scale.

        const { data: currentStats, error: fetchError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', seasonId)
            .maybeSingle();

        if (fetchError) {
            console.error('[DB] Error fetching stats for update:', fetchError);
            return;
        }

        const newStats = {
            user_id: userId,
            season_id: seasonId,
            ...(currentStats || {}), // Spread existing
        };

        // Initialize defaults if creating new
        const fields = [
            'confrontations_played', 'wins', 'losses', 'draws',
            'wins_checkmate', 'wins_time', 'wins_resignation',
            'losses_checkmate', 'losses_time', 'losses_resignation',
            'pieces_eaten', 'season_points'
        ];

        fields.forEach(f => {
            if (newStats[f] === undefined) newStats[f] = 0;
            if (statsIncrement[f]) newStats[f] += statsIncrement[f];
        });

        // Upsert
        const { error: upsertError } = await supabase
            .from('user_stats')
            .upsert(newStats, { onConflict: 'user_id, season_id' });

        if (upsertError) {
            console.error('[DB] Error upserting stats:', upsertError);
        } else {
            console.log(`[DB] Updated stats for ${userId} (${seasonId})`);
        }

    } catch (e) {
        console.error('[DB] Error in updateUserStats:', e);
    }
}

/**
 * Get Stats for a specific season (or current if null)
 */
async function getUserStats(userId, seasonId) {
    if (!isConnected || !userId) return null;
    try {
        let query = supabase.from('user_stats').select('*').eq('user_id', userId);

        if (seasonId) {
            query = query.eq('season_id', seasonId);
        } else {
            // Get Current Season
            const date = new Date();
            const currentSeason = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            query = query.eq('season_id', currentSeason);
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] Error getUserStats:', e);
        return null;
    }
}

/**
 * Get list of available seasons for a user
 */
async function getUserStatHistory(userId) {
    if (!isConnected || !userId) return [];
    try {
        const { data, error } = await supabase
            .from('user_stats')
            .select('season_id')
            .eq('user_id', userId)
            .order('season_id', { ascending: false })
            .limit(6); // Last 6 seasons as requested

        if (error) throw error;
        return data.map(r => r.season_id);
    } catch (e) {
        console.error('[DB] Error getUserStatHistory:', e);
        return [];
    }
}

/**
 * Helper: Update Stats by Username (resolves ID first)
 */
async function updateUserStatsByUsername(username, seasonId, stats) {
    if (!isConnected || !username) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (error || !data) {
            console.error(`[DB] Failed to find user ${username} for stats update`);
            return;
        }

        await updateUserStats(data.id, seasonId, stats);
    } catch (e) {
        console.error('[DB] Error updateUserStatsByUsername:', e);
    }
}

// --- CLUB MANAGEMENT ---

/**
 * Create a new Club
 * @param {string} name 
 * @param {string} description 
 * @param {string} logoUrl 
 * @param {string} ownerId 
 */
async function createClub(name, description, logoUrl, ownerId) {
    if (!isConnected || !supabase) return { error: 'DB Disconnected' };
    try {
        // 1. Create Club
        const { data: club, error } = await supabase
            .from('clubs')
            .insert([{
                name,
                description,
                logo_url: logoUrl,
                owner_id: ownerId
            }])
            .select()
            .single();

        if (error) return { error: error.message };

        // 2. Add Owner as Member (Admin)
        const { error: memberError } = await supabase
            .from('club_members')
            .insert([{
                club_id: club.id,
                user_id: ownerId,
                role: 'owner'
            }]);

        if (memberError) {
            console.error('[DB] Failed to add owner to club members:', memberError);
            // Should we rollback? For MVP, we'll just log. User exists as Owner in clubs table.
        }

        // 3. Initialize League Stats (Fix for Missing Entry)
        // Calculate Current Season (Spain Time)
        const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
        const seasonId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const { error: statsError } = await supabase
            .from('club_seasonal_stats')
            .insert([{
                club_id: club.id,
                season_id: seasonId,
                season_points: 0,
                season_points: 0,
                matches_played: 0,
                matches_won: 0,
                matches_lost: 0,
                matches_drawn: 0,
                division: 0 // Default to Division 0 (Pool)
            }]);

        if (statsError) {
            console.error('[DB] Failed to initialize club stats:', statsError);
        }

        return { data: club };
    } catch (e) {
        console.error('[DB] createClub error:', e);
        return { error: e.message };
    }
}

/**
 * Delete a Club (Owner only check should be done by caller)
 */
async function deleteClub(clubId) {
    if (!isConnected || !supabase) return { error: 'DB Disconnected' };
    try {
        // Delete Club (Cascades should handle members, invites, requests, stats ideally)
        // If not, we might need manual cleanup. Assuming standard FK cascades for now.
        // Explicitly deleting allows us to check for errors.

        const { error } = await supabase
            .from('clubs')
            .delete()
            .eq('id', clubId);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('[DB] deleteClub error:', e);
        return { error: e.message };
    }
}

/**
 * Get Club Details by ID
 */
async function getClub(clubId) {
    if (!isConnected || !supabase) return null;
    try {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', clubId)
            .single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] getClub error:', e);
        return null;
    }
}

/**
 * Get Club by Owner (Helper)
 */
async function getClubByOwner(ownerId) {
    if (!isConnected || !supabase) return null;
    try {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .eq('owner_id', ownerId)
            .single();
        if (error) return null;
        return data;
    } catch (e) {
        return null;
    }
}

/**
 * Get the Club a User belongs to (User can only be in one club?)
 * Assuming 1 club per user for now based on typical "Team" implementations.
 * If multiple allowed, this needs to return a list. Requirement implies "My Club", singular.
 */
async function getUserClub(userId) {
    if (!isConnected || !supabase) return null;
    try {
        const { data, error } = await supabase
            .from('club_members')
            .select('club_id, clubs(*)')
            .eq('user_id', userId)
            .single(); // Assuming unique membership

        if (error || !data) return null;
        return data.clubs;
    } catch (e) {
        console.error('[DB] getUserClub error:', e);
        return null;
    }
}

/**
 * Get Club by Username (Helper for matchmaking)
 */
async function getClubByUsername(username) {
    if (!isConnected || !supabase) return null;
    try {
        // 1. Get User ID
        const { data: user, error: uError } = await supabase.from('profiles').select('id').eq('username', username).single();
        if (uError || !user) return null;

        return await getUserClub(user.id);
    } catch (e) {
        return null;
    }
}

/**
 * Get Club Members
 */
async function getClubMembers(clubId) {
    if (!isConnected || !supabase) return [];
    try {
        // Build query to get profile data
        const { data, error } = await supabase
            .from('club_members')
            .select('role, season_points_contribution, profiles(id, username, elo)') // Join profiles
            .eq('club_id', clubId)
            .order('season_points_contribution', { ascending: false }); // Ordered by contribution as requested

        if (error) throw error;

        // Flatten structure
        return data.map(m => ({
            id: m.profiles?.id,
            username: m.profiles?.username,
            elo: m.profiles?.elo,
            role: m.role,
            season_points: m.season_points_contribution
        }));
    } catch (e) {
        console.error('[DB] getClubMembers error:', e);
        return [];
    }
}

/**
 * Search Clubs
 */
async function searchClubs(query) {
    if (!isConnected || !supabase) return [];
    try {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] searchClubs error:', e);
        return [];
    }
}

/**
 * Search Users by Username
 */
async function searchUsers(query) {
    if (!isConnected || !supabase) return [];
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, elo')
            .ilike('username', `%${query}%`)
            .limit(10);

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] searchUsers error:', e);
        return [];
    }
}

/**
 * Check if Club Name exists
 */
async function checkClubName(name) {
    if (!isConnected || !supabase) return false;
    try {
        const { data, error } = await supabase
            .from('clubs')
            .select('id')
            .eq('name', name)
            .maybeSingle();
        return !!data;
    } catch (e) {
        return false;
    }
}

// --- CLUB STATS ---

/**
 * Update Club Stats (Increment)
 */
async function updateClubStats(clubId, seasonId, statsIncrement) {
    if (!isConnected || !supabase) return;
    try {
        // Get current or create
        const { data: current, error: fetchError } = await supabase
            .from('club_seasonal_stats')
            .select('*')
            .eq('club_id', clubId)
            .eq('season_id', seasonId)
            .maybeSingle();

        const newStats = {
            club_id: clubId,
            season_id: seasonId,
            ...(current || {})
        };

        // Remove generated columns or read-only fields that shouldn't be upserted
        delete newStats.win_loss_diff;
        delete newStats.id;
        delete newStats.created_at;

        ['matches_played', 'matches_won', 'matches_lost', 'matches_drawn', 'season_points'].forEach(f => {
            if (newStats[f] === undefined) newStats[f] = 0;
            if (statsIncrement[f]) newStats[f] += statsIncrement[f];
        });

        // Resolve Division for Snapshot (If not set, fetch current from Club)
        if (newStats.division === undefined) {
            const { data: club } = await supabase.from('clubs').select('division').eq('id', clubId).single();
            newStats.division = club?.division || 1;
        }

        const { error } = await supabase
            .from('club_seasonal_stats')
            .upsert(newStats, { onConflict: 'club_id, season_id' });

        if (error) console.error('[DB] updateClubStats upsert error:', error);

    } catch (e) {
        console.error('[DB] updateClubStats error:', e);
    }
}

/**
 * Initialize Club Stats for a new season (Safe Create)
 */
async function initializeClubStats(clubId, seasonId, division) {
    if (!isConnected || !supabase) return;
    try {
        // Check if exists
        const current = await getClubStats(clubId, seasonId);
        // getClubStats returns a default object if not found with 0 IDs usually? 
        // No, look at getClubStats implementation:
        // if error or not found -> returns default obj.
        // We need to check if it's a REAL DB row or a default obj.
        // The default obj has no 'id' prop usually if we didn't mock it?
        // Actually getClubStats returns: { club_id: clubId, season_id: seasonId ... } but NO 'id' (UUID).

        // Let's rely on upsert with onConflict to be safe and simple.

        const { error } = await supabase
            .from('club_seasonal_stats')
            .upsert({
                club_id: clubId,
                season_id: seasonId,
                division: division,
                season_points: 0,
                matches_played: 0,
                matches_won: 0,
                matches_lost: 0,
                matches_drawn: 0
            }, { onConflict: 'club_id, season_id' });

        if (error) console.error('[DB] initializeClubStats error:', error);
        else console.log(`[DB] Initialized stats for Club ${clubId}, Season ${seasonId}, Div ${division}`);

    } catch (e) {
        console.error('[DB] initializeClubStats ex:', e);
    }
}

/**
 * Increment Member Contribution (e.g. Season Points for internal ranking)
 */
async function incrementMemberContribution(username, clubId, points) {
    if (!isConnected || !username || !clubId) return;
    try {
        // 1. Get User ID
        const { data: user } = await supabase.from('profiles').select('id').eq('username', username).single();
        if (!user) return;

        // 2. Increment
        // We need to fetch current, add, update. Or use RPC.
        const { data: member, error: fetchError } = await supabase
            .from('club_members')
            .select('season_points_contribution')
            .eq('club_id', clubId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !member) return;

        const newScore = (member.season_points_contribution || 0) + points;

        await supabase
            .from('club_members')
            .update({ season_points_contribution: newScore })
            .eq('club_id', clubId)
            .eq('user_id', user.id);

        console.log(`[DB] Updated Member Contribution for ${username}: +${points}`);

    } catch (e) {
        console.error('[DB] incrementMemberContribution error:', e);
    }
}

/**
 * Get Club Seasonal Stats (Current or History)
 * If seasonId is null, gets CURRENT season.
 */
async function getClubStats(clubId, seasonId = null) {
    if (!isConnected || !supabase) return null;
    try {
        if (!seasonId) {
            // Calculate Current Season (Spain Time)
            const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
            seasonId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        const { data, error } = await supabase
            .from('club_seasonal_stats')
            .select('*')
            .eq('club_id', clubId)
            .eq('season_id', seasonId)
            .maybeSingle();

        if (error) throw error;
        return data || {
            club_id: clubId,
            season_id: seasonId,
            season_points: 0,
            season_points: 0,
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
            matches_drawn: 0
        }; // Return default if not found (new season)
    } catch (e) {
        console.error('[DB] getClubStats error:', e);
        return null;
    }
}

/**
 * Get Club Stat History (List of available seasons)
 */
async function getClubStatHistoryList(clubId) {
    if (!isConnected || !supabase) return [];
    try {
        const { data, error } = await supabase
            .from('club_seasonal_stats')
            .select('season_id')
            .eq('club_id', clubId)
            .order('season_id', { ascending: false })
            .limit(6); // Max 6 seasons logic

        if (error) throw error;
        return data.map(r => r.season_id);
    } catch (e) {
        console.error('[DB] getClubStatHistoryList error:', e);
        return [];
    }
}

/**
 * Create Join Request
 */
async function createJoinRequest(clubId, userId, message) {
    if (!isConnected || !supabase) return { error: 'DB Disconnected' };
    try {
        // Check if already member
        const { data: member } = await supabase.from('club_members').select('club_id').eq('club_id', clubId).eq('user_id', userId).maybeSingle();
        if (member) return { error: 'Already a member' };

        // Check if pending request exists
        const { data: existing } = await supabase.from('club_join_requests').select('id').eq('club_id', clubId).eq('user_id', userId).eq('status', 'pending').maybeSingle();
        if (existing) return { error: 'Request already pending' };

        // Create Request
        const { data: request, error } = await supabase
            .from('club_join_requests')
            .insert([{ club_id: clubId, user_id: userId, message }])
            .select()
            .single();

        if (error) throw error;

        // --- NOTIFY OWNER VIA CHAT ---
        // 1. Get Club Owner
        const { data: club } = await supabase.from('clubs').select('owner_id, name').eq('id', clubId).single();
        if (club && club.owner_id) {
            // 2. Insert Message
            const { error: msgError } = await supabase.from('messages').insert([{
                sender_id: userId,
                receiver_id: club.owner_id,
                type: 'club_join_request',
                content: message || `User requested to join ${club.name}`,
                metadata: {
                    clubId: clubId,
                    clubName: club.name,
                    requestId: request.id,
                    status: 'pending'
                }
            }]);
            if (msgError) console.error('[DB] Failed to send join request chat msg:', msgError);
        }

        return { success: true };
    } catch (e) {
        console.error('[DB] createJoinRequest error:', e);
        return { error: e.message };
    }
}

// --- MEMBERSHIP MANAGEMENT (Add, Remove, etc) ---

/**
 * Add Member to Club (Direct - Admin/System usage)
 */
async function addClubMember(clubId, userId, role = 'member') {
    if (!isConnected || !supabase) return { error: 'DB Disconnected' };
    try {
        const { error } = await supabase
            .from('club_members')
            .insert([{ club_id: clubId, user_id: userId, role }]);

        if (error) return { error: error.message };
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}


// --- RETENTION POLICY ---

async function deleteOldClubStats(cutoffSeasonId) {
    if (!isConnected || !supabase) return;
    try {
        // Delete from club_seasonal_stats where season_id < cutoffSeasonId
        // Note: String comparison works for YYYY-MM format (e.g. '2025-06' < '2025-12')
        const { error } = await supabase
            .from('club_seasonal_stats')
            .delete()
            .lt('season_id', cutoffSeasonId);

        if (error) console.error('[DB] Error deleting old stats:', error);
        else console.log(`[DB] Deleted stats older than ${cutoffSeasonId}`);

    } catch (e) {
        console.error('[DB] deleteOldClubStats error:', e);
    }
}

async function removeClubMember(clubId, userId) {
    if (!isConnected) return { error: 'DB Disconnected' };

    // Check if user is owner? This logic is better handled in the API layer or by a separate check, 
    // but the DB function just executes the removal.

    // Prevent removing the owner?
    const { data: club } = await supabase.from('clubs').select('owner_id').eq('id', clubId).single();
    if (club && club.owner_id === userId) {
        return { error: 'Cannot kick the owner' };
    }

    const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);

    if (error) return { error: error.message };
    return { success: true };
}

async function deleteOldUserStats(cutoffSeasonId) {
    if (!isConnected || !supabase) return;
    try {
        const { error } = await supabase
            .from('user_stats')
            .delete()
            .lt('season_id', cutoffSeasonId);

        if (error) console.error('[DB] Error deleting old user stats:', error);
        else console.log(`[DB] Deleted user stats older than ${cutoffSeasonId}`);

    } catch (e) {
        console.error('[DB] deleteOldUserStats error:', e);
    }
}

// --- CLUB INVITES & REQUEST MANAGEMENT ---

async function getClubJoinRequests(clubId) {
    if (!isConnected || !clubId) return [];
    const { data, error } = await supabase
        .from('club_join_requests')
        .select(`
            id,
            user:profiles!user_id (id, username, avatar_url, elo),
            message,
            created_at
        `)
        .eq('club_id', clubId)
        .eq('status', 'pending');

    if (error) {
        console.error('[DB] Error fetching requests:', error);
        return [];
    }
    return data;
}

async function respondToJoinRequest(requestId, status, clubId, userId) {
    if (!isConnected) return { error: 'DB Disconnected' };

    // 1. Update Request status
    const { error } = await supabase
        .from('club_join_requests')
        .update({ status })
        .eq('id', requestId);

    if (error) return { error: error.message };

    // 2. If Accepted, Add to Members
    if (status === 'accepted') {
        // Enforce 30 Member Limit
        const { count, error: countError } = await supabase
            .from('club_members')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId);

        if (countError) {
            console.error('[DB] Error checking member count:', countError);
            return { error: 'Failed to verify club capacity' };
        }

        if (count >= 30) {
            return { error: 'Club is full (Max 30 members)' };
        }

        const { error: addError } = await supabase
            .from('club_members')
            .insert({ club_id: clubId, user_id: userId, role: 'member' });

        if (addError) return { error: 'Failed to add member: ' + addError.message };
    }
    return { success: true };
}


/**
 * Update Club Division
 */
async function updateClubDivision(clubId, newDivision) {
    if (!isConnected) return;
    try {
        const { error } = await supabase
            .from('clubs')
            .update({ division: newDivision })
            .eq('id', clubId);
        if (error) console.error('[DB] updateClubDivision error:', error);
    } catch (e) {
        console.error('[DB] updateClubDivision ex:', e);
    }
}

/**
 * Award Trophy to Club
 * trophies field is JSONB: { seasonId: "2025-01", type: "gold", division: 1 } 
 * OR easier: Append to a `trophies` array column.
 * Let's assume `trophies` is jsonb array.
 */
/**
 * Get Trophy Definition by Name
 */
async function getTrophyByName(name) {
    if (!isConnected || !supabase) return null;
    try {
        const { data, error } = await supabase
            .from('trophies')
            .select('*')
            .eq('name', name)
            .maybeSingle();
        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] getTrophyByName error:', e);
        return null;
    }
}

/**
 * Check if a specific trophy has already been awarded to a club for a season
 */
async function checkClubTrophy(clubId, trophyId, seasonId) {
    if (!isConnected || !supabase) return false;
    try {
        const { data, error } = await supabase
            .from('club_trophies')
            .select('id')
            .eq('club_id', clubId)
            .eq('trophy_id', trophyId)
            .eq('season_id', seasonId)
            .maybeSingle();

        return !!data;
    } catch (e) {
        return false;
    }
}

/**
 * Award Trophy to Club (Relational) - Idempotent
 */
async function awardClubTrophy(clubId, trophyId, seasonId) {
    if (!isConnected || !supabase) return;
    try {
        // Idempotency check
        if (await checkClubTrophy(clubId, trophyId, seasonId)) {
            console.log(`[DB] Trophy ${trophyId} already awarded to club ${clubId} for season ${seasonId}`);
            return;
        }

        const { error } = await supabase
            .from('club_trophies')
            .insert([{
                club_id: clubId,
                trophy_id: trophyId,
                season_id: seasonId,
                awarded_at: new Date().toISOString()
            }]);

        if (error) console.error('[DB] awardClubTrophy error:', error);
        else console.log(`[DB] Awarded trophy ${trophyId} to club ${clubId}`);
    } catch (e) {
        console.error('[DB] awardClubTrophy ex:', e);
    }
}

/**
 * Award Trophy to Player (Relational)
 */
async function awardPlayerTrophy(userId, trophyId, seasonId) {
    if (!isConnected || !supabase) return;
    try {
        const { error } = await supabase
            .from('player_trophies')
            .insert([{
                user_id: userId,
                trophy_id: trophyId,
                season_id: seasonId,
                awarded_at: new Date().toISOString()
            }]);

        if (error) console.error('[DB] awardPlayerTrophy error:', error);
        else console.log(`[DB] Awarded trophy ${trophyId} to player ${userId}`);
    } catch (e) {
        console.error('[DB] awardPlayerTrophy ex:', e);
    }
}

/**
 * Get Trophies for a Club
 * Returns list with count and details.
 * Grouped logic: The user wants "x2, x3...".
 * We can fetch all and group in frontend, or group here.
 * Fetching all allows showing individual dates in popup.
 */
async function getClubTrophies(clubId) {
    if (!isConnected || !supabase) return [];
    try {
        const { data, error } = await supabase
            .from('club_trophies')
            .select(`
                id,
                awarded_at,
                season_id,
                trophy:trophies (id, name, description, image_url, type)
            `)
            .eq('club_id', clubId)
            .order('awarded_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] getClubTrophies error:', e);
        return [];
    }
}

/**
 * Get Trophies for a Player
 */
async function getPlayerTrophies(userId) {
    if (!isConnected || !supabase) return [];
    try {
        const { data, error } = await supabase
            .from('player_trophies')
            .select(`
                id,
                awarded_at,
                season_id,
                trophy:trophies (id, name, description, image_url, type)
            `)
            .eq('user_id', userId)
            .order('awarded_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[DB] getPlayerTrophies error:', e);
        return [];
    }
}

/**
 * Get League Standings for a Season & Division
 */
async function getLeagueStandings(seasonId, division) {
    if (!isConnected) return [];
    try {
        const { data, error } = await supabase
            .from('club_seasonal_stats')
            .select(`
                club_id,
                season_points,
                matches_played,
                matches_won,
                matches_lost,
                matches_drawn,
                division,
                club:clubs (id, name, logo_url)
            `)
            .eq('season_id', seasonId)
            // .eq('division', division) // Temporarily disabled if division column null logic strictly needed, but logic implies we filter by division
            .order('season_points', { ascending: false })
            .order('matches_won', { ascending: false })
            .order('club_id', { ascending: true }); // Deterministic Sort

        if (error) throw error;

        // Post-filter in memory if division logic is complex or nulls, but ideally DB filter.
        // Assuming division is stored in seasonal stats.
        return data.filter(r => r.division === division || (!r.division && division === 1));
    } catch (e) {
        console.error('[DB] getLeagueStandings error:', e);
        return [];
    }
}

async function createClubInvite(clubId, targetIdentifier, senderId) {
    if (!isConnected) return { error: 'DB Disconnected' };

    let userId = targetIdentifier;

    // If targetIdentifier is NOT a UUID (simple check), assume username
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetIdentifier)) {
        const { data: user } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', targetIdentifier)
            .maybeSingle();

        if (!user) return { error: 'User not found' };
        userId = user.id;
    }

    // Check if already member
    const { data: member } = await supabase.from('club_members').select('id').eq('club_id', clubId).eq('user_id', userId).maybeSingle();
    if (member) return { error: 'User is already a member' };

    // Check existing invite
    const { data: existing } = await supabase
        .from('club_invites')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

    if (existing) return { error: 'Invite already pending' };

    const { data: invite, error } = await supabase
        .from('club_invites')
        .insert({
            club_id: clubId,
            user_id: userId,
            inviter_id: senderId,
            status: 'pending'
        })
        .select()
        .single();

    if (error) return { error: error.message };

    // --- NOTIFY USER VIA CHAT ---
    // 1. Get Club Name
    const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single();

    // 2. Insert Message
    const { error: msgError } = await supabase.from('messages').insert([{
        sender_id: senderId,
        receiver_id: userId,
        type: 'club_invite',
        content: `You have been invited to join ${club?.name || 'a club'}`,
        metadata: {
            inviteId: invite.id,
            clubId: clubId,
            clubName: club?.name,
            status: 'pending'
        }
    }]);

    if (msgError) console.error('[DB] Failed to send invite chat msg:', msgError);

    return { success: true };
}

async function getUserClubInvites(userId) {
    if (!isConnected || !userId) return [];

    const { data, error } = await supabase
        .from('club_invites')
        .select(`
            id,
            club:clubs(id, name, logo_url),
            inviter:profiles!inviter_id(username),
            created_at
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

    if (error) {
        console.error('[DB] Error fetching invites:', error);
        return [];
    }
    return data;
}

async function respondToClubInvite(inviteId, status, clubId, userId) {
    if (!isConnected) return { error: 'DB Disconnected' };

    const { error } = await supabase
        .from('club_invites')
        .update({ status })
        .eq('id', inviteId);

    if (error) return { error: error.message };

    if (status === 'accepted') {
        // Enforce 30 Member Limit
        const { count, error: countError } = await supabase
            .from('club_members')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId);

        if (countError) {
            console.error('[DB] Error checking member count:', countError);
            return { error: 'Failed to verify club capacity' };
        }

        if (count >= 30) {
            return { error: 'Club is full (Max 30 members)' };
        }

        const { error: addError } = await supabase
            .from('club_members')
            .insert({ club_id: clubId, user_id: userId, role: 'member' });
        if (addError) return { error: addError.message };
    }
    return { success: true };
}


// --- BILLING & SUBSCRIPTIONS (Pilar 6 - Stripe Billing) ---

/**
 * Get user profile by ID or username
 * @param {string} identifier - User UUID or username
 * @returns {Promise<object|null>} profile
 */
async function getUserProfile(identifier) {
    if (!isConnected || !identifier) return null;

    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        let query = supabase.from('profiles').select('*');
        if (isUUID) {
            query = query.eq('id', identifier);
        } else {
            query = query.eq('username', identifier);
        }

        const { data, error } = await query.single();
        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('[DB] Error fetching profile for ' + identifier + ':', error.message);
            }
            return null;
        }
        if (data && !data.tier) {
            data.tier = 'free';
        }
        return data;
    } catch (err) {
        console.error('[DB] Unexpected error in getUserProfile(' + identifier + '):', err);
        return null;
    }
}

/**
 * Update user subscription tier in profiles table
 * @param {string} identifier - User UUID or username
 * @param {'free'|'basic'|'pro'} tier - New tier
 * @returns {Promise<boolean>} success
 */
async function updateUserTier(identifier, tier) {
    if (!['free', 'basic', 'pro'].includes(tier)) {
        console.warn('[DB] Invalid tier value: ' + tier + '. Must be free, basic, or pro.');
        return false;
    }

    if (!isConnected || !identifier) {
        console.log('[DB] (InMemory) updateUserTier(' + identifier + ') -> ' + tier);
        return true;
    }

    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        let query = supabase.from('profiles').update({ tier });
        if (isUUID) {
            query = query.eq('id', identifier);
        } else {
            query = query.eq('username', identifier);
        }

        const { error } = await query;
        if (error) {
            if (error.message.includes('tier') || error.code === '42703' || error.message.includes('schema cache')) {
                console.warn('[DB] Note: tier column not found in profiles schema. Run billing_schema.sql to persist in DB.');
                return true;
            }
            console.error('[DB] Error updating tier for ' + identifier + ':', error.message);
            return false;
        }
        console.log('[DB] Successfully updated tier for ' + identifier + ' to ' + tier);
        return true;
    } catch (err) {
        console.error('[DB] Unexpected error in updateUserTier(' + identifier + '):', err);
        return false;
    }
}

/**
 * Persist or update subscription metadata in subscriptions table
 * @param {object} subData
 * @returns {Promise<boolean>}
 */
async function saveSubscription(subData) {
    if (!isConnected || !subData || !subData.userId) return false;

    try {
        const record = {
            user_id: subData.userId,
            plan: subData.plan || 'basic',
            status: subData.status || 'active',
            stripe_customer_id: subData.customerId || null,
            stripe_subscription_id: subData.subscriptionId || null,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('subscriptions')
            .upsert(record, { onConflict: 'user_id' });

        if (error) {
            console.warn('[DB] Note saving subscription record:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[DB] Unexpected error saving subscription:', err.message);
        return false;
    }
}

/**
 * Get user subscription record
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getSubscriptionByUserId(userId) {
    if (!isConnected || !userId) return null;

    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[DB] Note fetching subscription for ' + userId + ':', error.message);
            return null;
        }
        return data;
    } catch (err) {
        return null;
    }
}

/**
 * Lookup userId from stripe customer ID
 * @param {string} customerId
 * @returns {Promise<string|null>}
 */
async function getUserIdByStripeCustomer(customerId) {
    if (!isConnected || !customerId) return null;

    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;
        return data.user_id;
    } catch (err) {
        return null;
    }
}

module.exports = {
    isConnected: () => isConnected, // Added back
    getUserElo,
    updateUserElo,
    deleteUser,
    deleteAuthUserOnly,
    deleteUserByEmail,
    verifyUserByEmail,
    updateUserStats,
    getUserStats,
    getUserStatHistory,
    createClub,
    deleteClub,
    getClub,
    getUserClub,
    getClubMembers,
    searchClubs,
    checkClubName,
    getClubStats,
    getClubStatHistoryList,
    createJoinRequest,
    getClubJoinRequests,
    respondToJoinRequest,

    // KICK
    removeClubMember,

    // INVITATION
    createClubInvite,
    getUserClubInvites,
    respondToClubInvite,
    updateClubStats,
    getClubByUsername,
    deleteOldClubStats,
    deleteOldUserStats,
    updateClubDivision,
    awardClubTrophy,
    awardPlayerTrophy,
    getClubTrophies,
    getPlayerTrophies,
    getTrophyByName,
    getLeagueStandings,
    searchUsers,
    updateUserStatsByUsername,
    incrementMemberContribution,
    initializeClubStats,
    checkClubTrophy,
    addClubMember,

    // BILLING & MONETIZATION (Stripe Billing)
    get supabase() { return supabase; },
    getUserProfile,
    updateUserTier,
    saveSubscription,
    getSubscriptionByUserId,
    getUserIdByStripeCustomer
};

