import type { Page } from 'playwright';
import BrowserFunc from './browser/BrowserFunc';
import BrowserUtil from './browser/BrowserUtil';
import { log } from './util/Logger';
import Util from './util/Utils';
import Activities from './functions/Activities';
import { Account } from './interface/Account';
import Axios from './util/Axios';
import Humanizer from './util/Humanizer';
export declare class MicrosoftRewardsBot {
    log: typeof log;
    config: import("./interface/Config").Config;
    utils: Util;
    activities: Activities;
    browser: {
        func: BrowserFunc;
        utils: BrowserUtil;
    };
    humanizer: Humanizer;
    isMobile: boolean;
    homePage: Page;
    currentAccountEmail?: string;
    currentAccountRecoveryEmail?: string;
    compromisedModeActive: boolean;
    compromisedReason?: string;
    compromisedEmail?: string;
    private pointsCanCollect;
    private pointsInitial;
    private activeWorkers;
    private mobileRetryAttempts;
    private browserFactory;
    private accounts;
    private workers;
    private login;
    private accessToken;
    private buyMode;
    private accountSummaries;
    private runId;
    private diagCount;
    private bannedTriggered;
    private globalStandby;
    private heartbeatFile?;
    private heartbeatTimer?;
    axios: Axios;
    constructor(isMobile: boolean);
    initialize(): Promise<void>;
    run(): Promise<void>;
    /** Manual spending session: login, then leave control to user while we passively monitor points. */
    private runBuyMode;
    private printBanner;
    getSummaries(): AccountSummary[];
    private runMaster;
    private runWorker;
    private runTasks;
    /** Send immediate ban alert if configured. */
    private handleImmediateBanAlert;
    /** Compute milliseconds to wait until within one of the allowed windows (HH:mm-HH:mm). Returns 0 if already inside. */
    private computeWaitForAllowedWindow;
    Desktop(account: Account): Promise<{
        initialPoints: number;
        collectedPoints: number;
    } | undefined>;
    Mobile(account: Account): Promise<{
        initialPoints: number;
        collectedPoints: number;
    } | undefined>;
    private sendConclusion;
    /** Reserve one diagnostics slot for this run (caps captures). */
    tryReserveDiagSlot(maxPerRun: number): boolean;
    /** Delete diagnostics folders older than N days under ./reports */
    private cleanupOldDiagnostics;
    private runAutoUpdate;
    /** Public entry-point to engage global security standby from other modules (idempotent). */
    engageGlobalStandby(reason: string, email?: string): Promise<void>;
    /** Send a strong alert to all channels and mention @everyone when entering global security standby. */
    private sendGlobalSecurityStandbyAlert;
}
interface AccountSummary {
    email: string;
    durationMs: number;
    desktopCollected: number;
    mobileCollected: number;
    totalCollected: number;
    initialTotal: number;
    endTotal: number;
    errors: string[];
    banned?: {
        status: boolean;
        reason: string;
    };
}
export {};
//# sourceMappingURL=index.d.ts.map