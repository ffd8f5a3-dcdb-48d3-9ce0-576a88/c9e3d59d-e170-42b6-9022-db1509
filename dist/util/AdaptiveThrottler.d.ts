export declare class AdaptiveThrottler {
    private errorCount;
    private successCount;
    private window;
    private readonly maxWindow;
    record(ok: boolean): void;
    /** Return a multiplier to apply to waits (1 = normal). */
    getDelayMultiplier(): number;
}
//# sourceMappingURL=AdaptiveThrottler.d.ts.map