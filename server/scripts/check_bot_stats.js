require('dotenv').config();
const db = require('../db.js');

async function checkBots() {
    console.log("Checking DB for bot stats...");
    try {
        const data = await db.searchUsers('Bot_');

        for (const bot of data) {
            const stats = await db.getUserStats(bot.id);
            console.log(`Bot: ${bot.username}, Stats:`, stats);
        }
    } catch (e) {
        console.error(e);
    }
    // process.exit(0);
}

checkBots().then(() => {
    setTimeout(() => process.exit(0), 500);
});
