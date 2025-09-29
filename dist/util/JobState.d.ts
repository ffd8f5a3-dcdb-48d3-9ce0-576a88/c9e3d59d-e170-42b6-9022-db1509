import type { Config } from '../interface/Config';
export declare class JobState {
    private baseDir;
    constructor(cfg: Config);
    private fileFor;
    private load;
    private save;
    isDone(email: string, day: string, offerId: string): boolean;
    markDone(email: string, day: string, offerId: string): void;
}
export default JobState;
//# sourceMappingURL=JobState.d.ts.map