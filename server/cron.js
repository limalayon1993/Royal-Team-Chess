const cron = require('node-cron');
const leagueManager = require('./leagueManager');

// Run at 00:00 on the 1st day of every month
// Minute: 0, Hour: 0, DayOfMonth: 1, Month: *, DayOfWeek: *
cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] Triggering Monthly Season End Processing...');

    const date = new Date();
    // We want to process the PREVIOUS month's season.
    // If today is Feb 1st, we process Jan.

    let year = date.getFullYear();
    let month = date.getMonth(); // 0-11. (Jan is 0).
    // If today is Jan 1st (month 0), we want Dec of prev year.

    if (month === 0) {
        month = 12;
        year--;
    }

    // Format YYYY-MM
    const seasonId = `${year}-${String(month).padStart(2, '0')}`;

    console.log(`[Cron] Processing Season ID: ${seasonId}`);

    try {
        await leagueManager.processSeasonEnd(seasonId);
        console.log('[Cron] Success.');
    } catch (err) {
        console.error('[Cron] Failed:', err);
    }
});

console.log('[Cron] League Automation Scheduled (1st of Month).');
