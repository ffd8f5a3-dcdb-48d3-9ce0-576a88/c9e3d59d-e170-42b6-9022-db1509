export interface Config {
    baseURL: string;
    sessionPath: string;
    headless: boolean;
    parallel: boolean;
    runOnZeroPoints: boolean;
    clusters: number;
    saveFingerprint: ConfigSaveFingerprint;
    workers: ConfigWorkers;
    searchOnBingLocalQueries: boolean;
    globalTimeout: number | string;
    searchSettings: ConfigSearchSettings;
    humanization?: ConfigHumanization;
    retryPolicy?: ConfigRetryPolicy;
    jobState?: ConfigJobState;
    logExcludeFunc: string[];
    webhookLogExcludeFunc: string[];
    logging?: ConfigLogging;
    proxy: ConfigProxy;
    webhook: ConfigWebhook;
    conclusionWebhook?: ConfigWebhook;
    ntfy: ConfigNtfy;
    diagnostics?: ConfigDiagnostics;
    update?: ConfigUpdate;
    schedule?: ConfigSchedule;
    passesPerRun?: number;
    buyMode?: ConfigBuyMode;
    vacation?: ConfigVacation;
    crashRecovery?: ConfigCrashRecovery;
}
export interface ConfigSaveFingerprint {
    mobile: boolean;
    desktop: boolean;
}
export interface ConfigSearchSettings {
    useGeoLocaleQueries: boolean;
    scrollRandomResults: boolean;
    clickRandomResults: boolean;
    searchDelay: ConfigSearchDelay;
    retryMobileSearchAmount: number;
    localFallbackCount?: number;
    extraFallbackRetries?: number;
}
export interface ConfigSearchDelay {
    min: number | string;
    max: number | string;
}
export interface ConfigWebhook {
    enabled: boolean;
    url: string;
    username?: string;
    avatarUrl?: string;
}
export interface ConfigNtfy {
    enabled: boolean;
    url: string;
    topic: string;
    authToken?: string;
}
export interface ConfigProxy {
    proxyGoogleTrends: boolean;
    proxyBingTerms: boolean;
}
export interface ConfigDiagnostics {
    enabled?: boolean;
    saveScreenshot?: boolean;
    saveHtml?: boolean;
    maxPerRun?: number;
    retentionDays?: number;
}
export interface ConfigUpdate {
    git?: boolean;
    docker?: boolean;
    scriptPath?: string;
}
export interface ConfigBuyMode {
    enabled?: boolean;
    maxMinutes?: number;
}
export interface ConfigSchedule {
    enabled?: boolean;
    time?: string;
    time12?: string;
    time24?: string;
    timeZone?: string;
    useAmPm?: boolean;
    runImmediatelyOnStart?: boolean;
}
export interface ConfigVacation {
    enabled?: boolean;
    minDays?: number;
    maxDays?: number;
}
export interface ConfigCrashRecovery {
    autoRestart?: boolean;
    maxRestarts?: number;
    backoffBaseMs?: number;
    restartFailedWorker?: boolean;
    restartFailedWorkerAttempts?: number;
}
export interface ConfigWorkers {
    doDailySet: boolean;
    doMorePromotions: boolean;
    doPunchCards: boolean;
    doDesktopSearch: boolean;
    doMobileSearch: boolean;
    doDailyCheckIn: boolean;
    doReadToEarn: boolean;
    bundleDailySetWithSearch?: boolean;
}
export interface ConfigHumanization {
    enabled?: boolean;
    stopOnBan?: boolean;
    immediateBanAlert?: boolean;
    actionDelay?: {
        min: number | string;
        max: number | string;
    };
    gestureMoveProb?: number;
    gestureScrollProb?: number;
    allowedWindows?: string[];
    randomOffDaysPerWeek?: number;
}
export interface ConfigRetryPolicy {
    maxAttempts?: number;
    baseDelay?: number | string;
    maxDelay?: number | string;
    multiplier?: number;
    jitter?: number;
}
export interface ConfigJobState {
    enabled?: boolean;
    dir?: string;
}
export interface ConfigLoggingLive {
    enabled?: boolean;
    redactEmails?: boolean;
}
export interface ConfigLogging {
    excludeFunc?: string[];
    webhookExcludeFunc?: string[];
    live?: ConfigLoggingLive;
    liveWebhookUrl?: string;
    redactEmails?: boolean;
    [key: string]: unknown;
}
//# sourceMappingURL=Config.d.ts.map