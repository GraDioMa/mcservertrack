import { status } from "minecraft-server-util";
import fetch from "node-fetch";

// ===== CONFIG =====
const SERVER_HOST = "2a02:a302:0:1::10"; // Your IPv6 or hostname
const SERVER_PORT = 25565;               // Change if needed
const WEBHOOK_URL = "https://discord.com/api/webhooks/..."; // Your webhook
const CHECK_INTERVAL = 30 * 1000;        // 30s (adjust as you like)
// ==================

let lastPlayers = new Set();

async function sendToDiscord(message) {
    try {
        await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message })
        });
    } catch (err) {
        console.error("Discord send failed:", err);
    }
}

async function checkServer() {
    try {
        const result = await status(SERVER_HOST, SERVER_PORT, { enableSRV: true });

        const onlinePlayers = new Set(result.players.sample?.map(p => p.name) || []);
        const joined = [...onlinePlayers].filter(p => !lastPlayers.has(p));
        const left = [...lastPlayers].filter(p => !onlinePlayers.has(p));

        for (const p of joined) {
            await sendToDiscord(`➡️ **${p}** joined. Online: ${onlinePlayers.size}`);
        }

        for (const p of left) {
            await sendToDiscord(`⬅️ **${p}** left. Online: ${onlinePlayers.size}`);
        }

        const playerList = [...onlinePlayers].join(", ") || "None";
        await sendToDiscord(
            `🌍 **Server Status**: 🟢 Online\n👥 **Players Online**: ${onlinePlayers.size}\n📋 **Player List**: ${playerList}`
        );

        lastPlayers = onlinePlayers;

    } catch (err) {
        console.error("Error querying server:", err);
        await sendToDiscord("❌ Server appears offline/unreachable.");
        lastPlayers = new Set();
    }
}

setInterval(checkServer, CHECK_INTERVAL);
checkServer();
