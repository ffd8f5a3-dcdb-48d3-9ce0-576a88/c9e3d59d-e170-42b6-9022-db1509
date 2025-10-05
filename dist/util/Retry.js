"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Retry = void 0;
const Utils_1 = __importDefault(require("./Utils"));
class Retry {
    constructor(policy) {
        const def = {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            multiplier: 2,
            jitter: 0.2
        };
        const merged = { ...(policy || {}) };
        // normalize string durations
        const util = new Utils_1.default();
        const parse = (v) => {
            if (typeof v === 'number')
                return v;
            try {
                return util.stringToMs(String(v));
            }
            catch {
                return def.baseDelay;
            }
        };
        this.policy = {
            maxAttempts: merged.maxAttempts ?? def.maxAttempts,
            baseDelay: parse(merged.baseDelay ?? def.baseDelay),
            maxDelay: parse(merged.maxDelay ?? def.maxDelay),
            multiplier: merged.multiplier ?? def.multiplier,
            jitter: merged.jitter ?? def.jitter
        };
    }
    async run(fn, isRetryable) {
        let attempt = 0;
        let delay = this.policy.baseDelay;
        let lastErr;
        while (attempt < this.policy.maxAttempts) {
            try {
                return await fn();
            }
            catch (e) {
                lastErr = e;
                attempt += 1;
                const retry = isRetryable ? isRetryable(e) : true;
                if (!retry || attempt >= this.policy.maxAttempts)
                    break;
                const jitter = 1 + (Math.random() * 2 - 1) * this.policy.jitter;
                const sleep = Math.min(this.policy.maxDelay, Math.max(0, Math.floor(delay * jitter)));
                await new Promise((r) => setTimeout(r, sleep));
                delay = Math.min(this.policy.maxDelay, Math.floor(delay * (this.policy.multiplier || 2)));
            }
        }
        throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    }
}
exports.Retry = Retry;
exports.default = Retry;
//# sourceMappingURL=Retry.js.map