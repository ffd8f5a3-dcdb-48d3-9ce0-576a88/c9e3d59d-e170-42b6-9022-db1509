import type { ConfigRetryPolicy } from '../interface/Config';
export type Retryable<T> = () => Promise<T>;
export declare class Retry {
    private policy;
    constructor(policy?: ConfigRetryPolicy);
    run<T>(fn: Retryable<T>, isRetryable?: (e: unknown) => boolean): Promise<T>;
}
export default Retry;
//# sourceMappingURL=Retry.d.ts.map