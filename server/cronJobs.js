const cron = require('node-cron');

/**
 * Initialize Cron Jobs
 */
function initCronJobs() {
    console.log('[Cron] Initializing Scheduled Tasks...');

    // Rule: "Season Reset needs to be at 00:00 Spain (CET/CEST) on the 1st of every month"
    // Cron pattern for 1st of month at 00:00: "0 0 1 * *"
    // We need to handle Timezone. node-cron supports timezone.

    cron.schedule('0 0 1 * *', async () => {
        const now = new Date();
        const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));

        // 1. Calculate New Current Season (for logs/reference)
        const currentSeasonId = `${spainTime.getFullYear()}-${String(spainTime.getMonth() + 1).padStart(2, '0')}`;
        console.log(`[Cron] 🌟 NEW SEASON STARTED: ${currentSeasonId} 🌟`);

        // 2. Process PREVIOUS Season (Ranking Leagues End)
        // Previous month calculation
        const prevDate = new Date(spainTime);
        prevDate.setMonth(prevDate.getMonth() - 1); // Go back 1 month
        const prevSeasonId = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        console.log(`[Cron] Processing Season End for ${prevSeasonId}...`);

        try {
            const leagueManager = require('./leagueManager');
            await leagueManager.processSeasonEnd(prevSeasonId);
        } catch (err) {
            console.error('[Cron] Season End Processing Failed:', err);
        }

        // 3. Data Retention Policy
        // ... (existing logic) ...
        try {
            const db = require('./db');
            if (db.isConnected()) {
                const d = new Date(spainTime);
                d.setMonth(d.getMonth() - 6);
                const cutoffSeasonId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                console.log(`[Cron] Retention Cleanup. Deleting stats older than ${cutoffSeasonId}...`);
                await db.deleteOldClubStats(cutoffSeasonId);
                await db.deleteOldUserStats(cutoffSeasonId);
            }
        } catch (e) {
            console.error('[Cron] Cleanup failed:', e);
        }

    }, {
        scheduled: true,
        timezone: "Europe/Madrid"
    });

    console.log('[Cron] Season Reset Task scheduled for 1st of month 00:00 Europe/Madrid.');
}

module.exports = { initCronJobs };
