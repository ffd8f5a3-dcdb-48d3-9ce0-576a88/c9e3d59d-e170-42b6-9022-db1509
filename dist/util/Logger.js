"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const chalk_1 = __importDefault(require("chalk"));
const Ntfy_1 = require("./Ntfy");
const Load_1 = require("./Load");
// Synchronous logger that returns an Error when type === 'error' so callers can `throw log(...)` safely.
function log(isMobile, title, message, type = 'log', color) {
    const configData = (0, Load_1.loadConfig)();
    // Access logging config with fallback for backward compatibility
    const configAny = configData;
    const loggingConfig = configAny.logging || configData;
    const loggingConfigAny = loggingConfig;
    const logExcludeFunc = Array.isArray(loggingConfigAny.excludeFunc) ? loggingConfigAny.excludeFunc :
        Array.isArray(loggingConfigAny.logExcludeFunc) ? loggingConfigAny.logExcludeFunc : [];
    if (Array.isArray(logExcludeFunc) && logExcludeFunc.some((x) => x.toLowerCase() === title.toLowerCase())) {
        return;
    }
    const currentTime = new Date().toLocaleString();
    const platformText = isMobile === 'main' ? 'MAIN' : isMobile ? 'MOBILE' : 'DESKTOP';
    const loggingCfg = (configAny.logging || {});
    const shouldRedact = !!loggingCfg.redactEmails;
    const redact = (s) => shouldRedact ? s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, (m) => {
        const [u, d] = m.split('@');
        return `${(u || '').slice(0, 2)}***@${d || ''}`;
    }) : s;
    const cleanStr = redact(`[${currentTime}] [PID: ${process.pid}] [${type.toUpperCase()}] ${platformText} [${title}] ${message}`);
    // Define conditions for sending to NTFY 
    const ntfyConditions = {
        log: [
            message.toLowerCase().includes('started tasks for account'),
            message.toLowerCase().includes('press the number'),
            message.toLowerCase().includes('no points to earn')
        ],
        error: [],
        warn: [
            message.toLowerCase().includes('aborting'),
            message.toLowerCase().includes('didn\'t gain')
        ]
    };
    // Check if the current log type and message meet the NTFY conditions
    try {
        if (type in ntfyConditions && ntfyConditions[type].some(condition => condition)) {
            // Fire-and-forget
            Promise.resolve((0, Ntfy_1.Ntfy)(cleanStr, type)).catch(() => { });
        }
    }
    catch { /* ignore */ }
    // Console output with better formatting
    const typeIndicator = type === 'error' ? '✗' : type === 'warn' ? '⚠' : '●';
    const platformColor = isMobile === 'main' ? chalk_1.default.cyan : isMobile ? chalk_1.default.blue : chalk_1.default.magenta;
    const typeColor = type === 'error' ? chalk_1.default.red : type === 'warn' ? chalk_1.default.yellow : chalk_1.default.green;
    const formattedStr = [
        chalk_1.default.gray(`[${currentTime}]`),
        chalk_1.default.gray(`[${process.pid}]`),
        typeColor(`${typeIndicator} ${type.toUpperCase()}`),
        platformColor(`[${platformText}]`),
        chalk_1.default.bold(`[${title}]`),
        redact(message)
    ].join(' ');
    const applyChalk = color && typeof chalk_1.default[color] === 'function' ? chalk_1.default[color] : null;
    // Log based on the type
    switch (type) {
        case 'warn':
            applyChalk ? console.warn(applyChalk(formattedStr)) : console.warn(formattedStr);
            break;
        case 'error':
            applyChalk ? console.error(applyChalk(formattedStr)) : console.error(formattedStr);
            break;
        default:
            applyChalk ? console.log(applyChalk(formattedStr)) : console.log(formattedStr);
            break;
    }
    // Return an Error when logging an error so callers can `throw log(...)`
    if (type === 'error') {
        // CommunityReporter disabled per project policy
        return new Error(cleanStr);
    }
}
//# sourceMappingURL=Logger.js.map