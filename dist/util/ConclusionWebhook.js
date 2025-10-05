"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConclusionWebhook = ConclusionWebhook;
const axios_1 = __importDefault(require("axios"));
const Ntfy_1 = require("./Ntfy");
// Light obfuscation of the avatar URL (base64). Prevents casual editing in config.
const AVATAR_B64 = 'aHR0cHM6Ly9tZWRpYS5kaXNjb3JkYXBwLm5ldC9hdHRhY2htZW50cy8xNDIxMTYzOTUyOTcyMzY5OTMxLzE0MjExNjQxNDU5OTQyNDAxMTAvbXNuLnBuZz93aWR0aD01MTImZWlnaHQ9NTEy';
function getAvatarUrl() {
    try {
        return Buffer.from(AVATAR_B64, 'base64').toString('utf-8');
    }
    catch {
        return '';
    }
}
function pickUsername(ctx, fallbackColor) {
    switch (ctx) {
        case 'summary': return 'Summary';
        case 'ban': return 'Ban';
        case 'security': return 'Security';
        case 'compromised': return 'Pirate';
        case 'spend': return 'Spend';
        case 'error': return 'Error';
        default: return fallbackColor === 0xFF0000 ? 'Error' : 'Rewards';
    }
}
/**
 * Send a final structured summary to the configured webhook,
 * and optionally mirror a plain-text summary to NTFY.
 *
 * This preserves existing webhook behavior while adding NTFY
 * as a separate, optional channel.
 */
async function ConclusionWebhook(config, content, payload) {
    // Send to both webhooks when available
    const hasConclusion = !!(config.conclusionWebhook?.enabled && config.conclusionWebhook.url);
    const hasWebhook = !!(config.webhook?.enabled && config.webhook.url);
    const sameTarget = hasConclusion && hasWebhook && config.conclusionWebhook.url === config.webhook.url;
    const body = {};
    if (payload?.embeds)
        body.embeds = payload.embeds;
    if (content && content.trim())
        body.content = content;
    const firstColor = payload?.embeds && payload.embeds[0]?.color;
    const ctx = payload?.context || (firstColor === 0xFF0000 ? 'error' : 'default');
    body.username = pickUsername(ctx, firstColor);
    body.avatar_url = getAvatarUrl();
    // Post to conclusion webhook if configured
    const postWithRetry = async (url, label) => {
        const max = 2;
        let lastErr = null;
        for (let attempt = 1; attempt <= max; attempt++) {
            try {
                await axios_1.default.post(url, body, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
                console.log(`[Webhook:${label}] summary sent (attempt ${attempt}).`);
                return;
            }
            catch (e) {
                lastErr = e;
                if (attempt === max)
                    break;
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        console.error(`[Webhook:${label}] failed after ${max} attempts:`, lastErr);
    };
    if (hasConclusion) {
        await postWithRetry(config.conclusionWebhook.url, sameTarget ? 'conclusion+primary' : 'conclusion');
    }
    if (hasWebhook && !sameTarget) {
        await postWithRetry(config.webhook.url, 'primary');
    }
    // NTFY: mirror a plain text summary (optional)
    if (config.ntfy?.enabled && config.ntfy.url && config.ntfy.topic) {
        let message = content || '';
        if (!message && payload?.embeds && payload.embeds.length > 0) {
            const e = payload.embeds[0];
            const title = e.title ? `${e.title}\n` : '';
            const desc = e.description ? `${e.description}\n` : '';
            const totals = e.fields && e.fields[0]?.value ? `\n${e.fields[0].value}\n` : '';
            message = `${title}${desc}${totals}`.trim();
        }
        if (!message)
            message = 'Microsoft Rewards run complete.';
        // Choose NTFY level based on embed color (yellow = warn)
        let embedColor;
        if (payload?.embeds && payload.embeds.length > 0) {
            embedColor = payload.embeds[0].color;
        }
        const ntfyType = embedColor === 0xFFAA00 ? 'warn' : 'log';
        try {
            await (0, Ntfy_1.Ntfy)(message, ntfyType);
            console.log('Conclusion summary sent to NTFY.');
        }
        catch (err) {
            console.error('Failed to send conclusion summary to NTFY:', err);
        }
    }
}
//# sourceMappingURL=ConclusionWebhook.js.map