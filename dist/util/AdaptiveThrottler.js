"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveThrottler = void 0;
class AdaptiveThrottler {
    constructor() {
        this.errorCount = 0;
        this.successCount = 0;
        this.window = [];
        this.maxWindow = 50;
    }
    record(ok) {
        this.window.push({ ok, at: Date.now() });
        if (ok)
            this.successCount++;
        else
            this.errorCount++;
        if (this.window.length > this.maxWindow) {
            const removed = this.window.shift();
            if (removed)
                removed.ok ? this.successCount-- : this.errorCount--;
        }
    }
    /** Return a multiplier to apply to waits (1 = normal). */
    getDelayMultiplier() {
        const total = Math.max(1, this.successCount + this.errorCount);
        const errRatio = this.errorCount / total;
        // 0% errors -> 1x; 50% errors -> ~1.8x; 80% -> ~2.5x (cap)
        const mult = 1 + Math.min(1.5, errRatio * 2);
        return Number(mult.toFixed(2));
    }
}
exports.AdaptiveThrottler = AdaptiveThrottler;
//# sourceMappingURL=AdaptiveThrottler.js.map