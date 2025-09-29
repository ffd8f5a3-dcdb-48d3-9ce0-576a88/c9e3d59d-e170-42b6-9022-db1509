"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ntfy = Ntfy;
const Load_1 = require("./Load");
const axios_1 = __importDefault(require("axios"));
const NOTIFICATION_TYPES = {
    error: { priority: 'max', tags: 'rotating_light' }, // Customize the ERROR icon here, see: https://docs.ntfy.sh/emojis/
    warn: { priority: 'high', tags: 'warning' }, // Customize the WARN icon here, see: https://docs.ntfy.sh/emojis/
    log: { priority: 'default', tags: 'medal_sports' } // Customize the LOG icon here, see: https://docs.ntfy.sh/emojis/
};
async function Ntfy(message, type = 'log') {
    const config = (0, Load_1.loadConfig)().ntfy;
    if (!config?.enabled || !config.url || !config.topic)
        return;
    try {
        const { priority, tags } = NOTIFICATION_TYPES[type];
        const headers = {
            Title: 'Microsoft Rewards Script',
            Priority: priority,
            Tags: tags,
            ...(config.authToken && { Authorization: `Bearer ${config.authToken}` })
        };
        const response = await axios_1.default.post(`${config.url}/${config.topic}`, message, { headers });
        if (response.status === 200) {
            console.log('NTFY notification successfully sent.');
        }
        else {
            console.error(`NTFY notification failed with status ${response.status}`);
        }
    }
    catch (error) {
        console.error('Failed to send NTFY notification:', error);
    }
}
//# sourceMappingURL=Ntfy.js.map