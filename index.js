import { status } from "minecraft-server-util";
import fetch from "node-fetch";
// ===== CONFIG =====
const SERVER_HOST = "83.168.106.219"; // Your IPv6 or hostname
const SERVER_PORT = 25807;               // Change if needed
const WEBHOOK_URL = "https://discord.com/api/webhooks/1407666486905929808/RKsMMZKif7WFV5H2ziqGmS4HsKZ54xhVWzEcnv8uqsAOY48j18mrjrV31UdeEJFMAibr"; // Your webhook
const CHECK_INTERVAL = 30 * 1000;        // 30s (adjust as you like)
// ==================

let lastPlayers = new Set();
let statusMessageId = null; // store ID of the status message

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

async function editStatusMessage(message) {
    if (!statusMessageId) {
        // Send initial message if we don’t have an ID yet
        try {
            const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: message })
            });

            // Only parse JSON if content exists
            let data;
            try {
                data = await res.json();
                statusMessageId = data.id;
            } catch {
                console.warn("Webhook did not return JSON; status message ID not saved.");
            }
        } catch (err) {
            console.error("Failed to send initial status message:", err);
        }
    } else {
        // Edit existing message
        try {
            await fetch(`${WEBHOOK_URL}/messages/${statusMessageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: message })
            });
        } catch (err) {
            console.error("Failed to edit status message:", err);
        }
    }
}

async function checkServer() {
    try {
        const result = await status(SERVER_HOST, SERVER_PORT, { enableSRV: true });

        const onlinePlayers = new Set(result.players.sample?.map(p => p.name) || []);
        const joined = [...onlinePlayers].filter(p => !lastPlayers.has(p));
        const left = [...lastPlayers].filter(p => !onlinePlayers.has(p));

        // Send join messages
        for (const p of joined) {
            await sendToDiscord(`➡️ **${p}** joined. Online: ${onlinePlayers.size}`);
        }

        // Send leave messages
        for (const p of left) {
            await sendToDiscord(`⬅️ **${p}** left. Online: ${onlinePlayers.size}`);
        }

        // Update the status message
        // Inside checkServer(), where statusText is created:
        const playerList = [...onlinePlayers].join(", ") || "None";

        // Format timestamp (HH:MM:SS)
        const now = new Date();
        const timeString = now.toLocaleTimeString();

        const statusText =
          `🌍 **Server Status**: 🟢 Online\n` +
          `👥 **Players Online**: ${onlinePlayers.size}\n` +
          `📋 **Player List**: ${playerList}\n` +
          `⏱️ **Last Checked**: ${timeString}`;        await editStatusMessage(statusText);

        lastPlayers = onlinePlayers;

    } catch (err) {
        console.error("Error querying server:", err);
        const statusText = "❌ Server appears offline/unreachable.";
        await editStatusMessage(statusText);
        lastPlayers = new Set();
    }
}

setInterval(checkServer, CHECK_INTERVAL);
checkServer();





