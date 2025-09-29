"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAccounts = loadAccounts;
exports.getConfigPath = getConfigPath;
exports.loadConfig = loadConfig;
exports.loadSessionData = loadSessionData;
exports.saveSessionData = saveSessionData;
exports.saveFingerprintData = saveFingerprintData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let configCache;
let configSourcePath = '';
// Basic JSON comment stripper (supports // line and /* block */ comments while preserving strings)
function stripJsonComments(input) {
    let out = '';
    let inString = false;
    let stringChar = '';
    let inLine = false;
    let inBlock = false;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next = input[i + 1];
        if (inLine) {
            if (ch === '\n' || ch === '\r') {
                inLine = false;
                out += ch;
            }
            continue;
        }
        if (inBlock) {
            if (ch === '*' && next === '/') {
                inBlock = false;
                i++;
            }
            continue;
        }
        if (inString) {
            out += ch;
            if (ch === '\\') { // escape next char
                i++;
                if (i < input.length)
                    out += input[i];
                continue;
            }
            if (ch === stringChar) {
                inString = false;
            }
            continue;
        }
        if (ch === '"' || ch === '\'') {
            inString = true;
            stringChar = ch;
            out += ch;
            continue;
        }
        if (ch === '/' && next === '/') {
            inLine = true;
            i++;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlock = true;
            i++;
            continue;
        }
        out += ch;
    }
    return out;
}
// Normalize both legacy (flat) and new (nested) config schemas into the flat Config interface
function normalizeConfig(raw) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = raw || {};
    // Browser / execution
    const headless = n.browser?.headless ?? n.headless ?? false;
    const globalTimeout = n.browser?.globalTimeout ?? n.globalTimeout ?? '30s';
    const parallel = n.execution?.parallel ?? n.parallel ?? false;
    const runOnZeroPoints = n.execution?.runOnZeroPoints ?? n.runOnZeroPoints ?? false;
    const clusters = n.execution?.clusters ?? n.clusters ?? 1;
    const passesPerRun = n.execution?.passesPerRun ?? n.passesPerRun;
    // Search
    const useLocalQueries = n.search?.useLocalQueries ?? n.searchOnBingLocalQueries ?? false;
    const searchSettingsSrc = n.search?.settings ?? n.searchSettings ?? {};
    const delaySrc = searchSettingsSrc.delay ?? searchSettingsSrc.searchDelay ?? { min: '3min', max: '5min' };
    const searchSettings = {
        useGeoLocaleQueries: !!(searchSettingsSrc.useGeoLocaleQueries ?? false),
        scrollRandomResults: !!(searchSettingsSrc.scrollRandomResults ?? false),
        clickRandomResults: !!(searchSettingsSrc.clickRandomResults ?? false),
        retryMobileSearchAmount: Number(searchSettingsSrc.retryMobileSearchAmount ?? 2),
        searchDelay: {
            min: delaySrc.min ?? '3min',
            max: delaySrc.max ?? '5min'
        },
        localFallbackCount: Number(searchSettingsSrc.localFallbackCount ?? 25),
        extraFallbackRetries: Number(searchSettingsSrc.extraFallbackRetries ?? 1)
    };
    // Workers
    const workers = n.workers ?? {
        doDailySet: true,
        doMorePromotions: true,
        doPunchCards: true,
        doDesktopSearch: true,
        doMobileSearch: true,
        doDailyCheckIn: true,
        doReadToEarn: true,
        bundleDailySetWithSearch: false
    };
    // Ensure missing flag gets a default
    if (typeof workers.bundleDailySetWithSearch !== 'boolean')
        workers.bundleDailySetWithSearch = false;
    // Logging
    const logging = n.logging ?? {};
    const logExcludeFunc = Array.isArray(logging.excludeFunc) ? logging.excludeFunc : (n.logExcludeFunc ?? []);
    const webhookLogExcludeFunc = Array.isArray(logging.webhookExcludeFunc) ? logging.webhookExcludeFunc : (n.webhookLogExcludeFunc ?? []);
    // Notifications
    const notifications = n.notifications ?? {};
    const webhook = notifications.webhook ?? n.webhook ?? { enabled: false, url: '' };
    const conclusionWebhook = notifications.conclusionWebhook ?? n.conclusionWebhook ?? { enabled: false, url: '' };
    const ntfy = notifications.ntfy ?? n.ntfy ?? { enabled: false, url: '', topic: '', authToken: '' };
    // Buy Mode
    const buyMode = n.buyMode ?? {};
    const buyModeEnabled = typeof buyMode.enabled === 'boolean' ? buyMode.enabled : false;
    const buyModeMax = typeof buyMode.maxMinutes === 'number' ? buyMode.maxMinutes : 45;
    // Fingerprinting
    const saveFingerprint = (n.fingerprinting?.saveFingerprint ?? n.saveFingerprint) ?? { mobile: false, desktop: false };
    // Humanization defaults (single on/off)
    if (!n.humanization)
        n.humanization = {};
    if (typeof n.humanization.enabled !== 'boolean')
        n.humanization.enabled = true;
    if (typeof n.humanization.stopOnBan !== 'boolean')
        n.humanization.stopOnBan = false;
    if (typeof n.humanization.immediateBanAlert !== 'boolean')
        n.humanization.immediateBanAlert = true;
    if (typeof n.humanization.randomOffDaysPerWeek !== 'number') {
        n.humanization.randomOffDaysPerWeek = 1;
    }
    // Strong default gestures when enabled (explicit values still win)
    if (typeof n.humanization.gestureMoveProb !== 'number') {
        n.humanization.gestureMoveProb = n.humanization.enabled === false ? 0 : 0.5;
    }
    if (typeof n.humanization.gestureScrollProb !== 'number') {
        n.humanization.gestureScrollProb = n.humanization.enabled === false ? 0 : 0.25;
    }
    // Vacation mode (monthly contiguous off-days)
    if (!n.vacation)
        n.vacation = {};
    if (typeof n.vacation.enabled !== 'boolean')
        n.vacation.enabled = false;
    const vMin = Number(n.vacation.minDays);
    const vMax = Number(n.vacation.maxDays);
    n.vacation.minDays = isFinite(vMin) && vMin > 0 ? Math.floor(vMin) : 3;
    n.vacation.maxDays = isFinite(vMax) && vMax > 0 ? Math.floor(vMax) : 5;
    if (n.vacation.maxDays < n.vacation.minDays) {
        const t = n.vacation.minDays;
        n.vacation.minDays = n.vacation.maxDays;
        n.vacation.maxDays = t;
    }
    const cfg = {
        baseURL: n.baseURL ?? 'https://rewards.bing.com',
        sessionPath: n.sessionPath ?? 'sessions',
        headless,
        parallel,
        runOnZeroPoints,
        clusters,
        saveFingerprint,
        workers,
        searchOnBingLocalQueries: !!useLocalQueries,
        globalTimeout,
        searchSettings,
        humanization: n.humanization,
        retryPolicy: n.retryPolicy,
        jobState: n.jobState,
        logExcludeFunc,
        webhookLogExcludeFunc,
        logging, // retain full logging object for live webhook usage
        proxy: n.proxy ?? { proxyGoogleTrends: true, proxyBingTerms: true },
        webhook,
        conclusionWebhook,
        ntfy,
        diagnostics: n.diagnostics,
        update: n.update,
        schedule: n.schedule,
        passesPerRun: passesPerRun,
        vacation: n.vacation,
        buyMode: { enabled: buyModeEnabled, maxMinutes: buyModeMax },
        crashRecovery: n.crashRecovery || {}
    };
    return cfg;
}
function loadAccounts() {
    try {
        // 1) CLI dev override
        let file = 'accounts.json';
        if (process.argv.includes('-dev')) {
            file = 'accounts.dev.json';
        }
        // 2) Docker-friendly env overrides
        const envJson = process.env.ACCOUNTS_JSON;
        const envFile = process.env.ACCOUNTS_FILE;
        let raw;
        if (envJson && envJson.trim().startsWith('[')) {
            raw = envJson;
        }
        else if (envFile && envFile.trim()) {
            const full = path_1.default.isAbsolute(envFile) ? envFile : path_1.default.join(process.cwd(), envFile);
            if (!fs_1.default.existsSync(full)) {
                throw new Error(`ACCOUNTS_FILE not found: ${full}`);
            }
            raw = fs_1.default.readFileSync(full, 'utf-8');
        }
        else {
            // Try multiple locations to support both root mounts and dist mounts
            const candidates = [
                path_1.default.join(__dirname, '../', file), // root/accounts.json (preferred)
                path_1.default.join(__dirname, '../src', file), // fallback: file kept inside src/
                path_1.default.join(process.cwd(), file), // cwd override
                path_1.default.join(process.cwd(), 'src', file), // cwd/src/accounts.json
                path_1.default.join(__dirname, file) // dist/accounts.json (legacy)
            ];
            let chosen = null;
            for (const p of candidates) {
                try {
                    if (fs_1.default.existsSync(p)) {
                        chosen = p;
                        break;
                    }
                }
                catch { /* ignore */ }
            }
            if (!chosen)
                throw new Error(`accounts file not found in: ${candidates.join(' | ')}`);
            raw = fs_1.default.readFileSync(chosen, 'utf-8');
        }
        // Support comments in accounts file (same as config)
        const cleaned = stripJsonComments(raw);
        const parsedUnknown = JSON.parse(cleaned);
        // Accept either a root array or an object with an `accounts` array, ignore `_note`
        const parsed = Array.isArray(parsedUnknown) ? parsedUnknown : (parsedUnknown && typeof parsedUnknown === 'object' && Array.isArray(parsedUnknown.accounts) ? parsedUnknown.accounts : null);
        if (!Array.isArray(parsed))
            throw new Error('accounts must be an array');
        // minimal shape validation
        for (const a of parsed) {
            if (!a || typeof a.email !== 'string' || typeof a.password !== 'string') {
                throw new Error('each account must have email and password strings');
            }
        }
        return parsed;
    }
    catch (error) {
        throw new Error(error);
    }
}
function getConfigPath() { return configSourcePath; }
function loadConfig() {
    try {
        if (configCache) {
            return configCache;
        }
        // Resolve config.json from common locations
        const candidates = [
            path_1.default.join(__dirname, '../', 'config.json'), // root/config.json when compiled (expected primary)
            path_1.default.join(__dirname, '../src', 'config.json'), // fallback: running compiled dist but file still in src/
            path_1.default.join(process.cwd(), 'config.json'), // cwd root
            path_1.default.join(process.cwd(), 'src', 'config.json'), // running from repo root but config left in src/
            path_1.default.join(__dirname, 'config.json') // last resort: dist/util/config.json
        ];
        let cfgPath = null;
        for (const p of candidates) {
            try {
                if (fs_1.default.existsSync(p)) {
                    cfgPath = p;
                    break;
                }
            }
            catch { /* ignore */ }
        }
        if (!cfgPath)
            throw new Error(`config.json not found in: ${candidates.join(' | ')}`);
        const config = fs_1.default.readFileSync(cfgPath, 'utf-8');
        const text = config.replace(/^\uFEFF/, '');
        const raw = JSON.parse(stripJsonComments(text));
        const normalized = normalizeConfig(raw);
        configCache = normalized; // Set as cache
        configSourcePath = cfgPath;
        return normalized;
    }
    catch (error) {
        throw new Error(error);
    }
}
async function loadSessionData(sessionPath, email, isMobile, saveFingerprint) {
    try {
        // Fetch cookie file
        const cookieFile = path_1.default.join(__dirname, '../browser/', sessionPath, email, `${isMobile ? 'mobile_cookies' : 'desktop_cookies'}.json`);
        let cookies = [];
        if (fs_1.default.existsSync(cookieFile)) {
            const cookiesData = await fs_1.default.promises.readFile(cookieFile, 'utf-8');
            cookies = JSON.parse(cookiesData);
        }
        // Fetch fingerprint file (support both legacy typo "fingerpint" and corrected "fingerprint")
        const baseDir = path_1.default.join(__dirname, '../browser/', sessionPath, email);
        const legacyFile = path_1.default.join(baseDir, `${isMobile ? 'mobile_fingerpint' : 'desktop_fingerpint'}.json`);
        const correctFile = path_1.default.join(baseDir, `${isMobile ? 'mobile_fingerprint' : 'desktop_fingerprint'}.json`);
        let fingerprint;
        const shouldLoad = (saveFingerprint.desktop && !isMobile) || (saveFingerprint.mobile && isMobile);
        if (shouldLoad) {
            const chosen = fs_1.default.existsSync(correctFile) ? correctFile : (fs_1.default.existsSync(legacyFile) ? legacyFile : '');
            if (chosen) {
                const fingerprintData = await fs_1.default.promises.readFile(chosen, 'utf-8');
                fingerprint = JSON.parse(fingerprintData);
            }
        }
        return {
            cookies: cookies,
            fingerprint: fingerprint
        };
    }
    catch (error) {
        throw new Error(error);
    }
}
async function saveSessionData(sessionPath, browser, email, isMobile) {
    try {
        const cookies = await browser.cookies();
        // Fetch path
        const sessionDir = path_1.default.join(__dirname, '../browser/', sessionPath, email);
        // Create session dir
        if (!fs_1.default.existsSync(sessionDir)) {
            await fs_1.default.promises.mkdir(sessionDir, { recursive: true });
        }
        // Save cookies to a file
        await fs_1.default.promises.writeFile(path_1.default.join(sessionDir, `${isMobile ? 'mobile_cookies' : 'desktop_cookies'}.json`), JSON.stringify(cookies));
        return sessionDir;
    }
    catch (error) {
        throw new Error(error);
    }
}
async function saveFingerprintData(sessionPath, email, isMobile, fingerprint) {
    try {
        // Fetch path
        const sessionDir = path_1.default.join(__dirname, '../browser/', sessionPath, email);
        // Create session dir
        if (!fs_1.default.existsSync(sessionDir)) {
            await fs_1.default.promises.mkdir(sessionDir, { recursive: true });
        }
        // Save fingerprint to files (write both legacy and corrected names for compatibility)
        const legacy = path_1.default.join(sessionDir, `${isMobile ? 'mobile_fingerpint' : 'desktop_fingerpint'}.json`);
        const correct = path_1.default.join(sessionDir, `${isMobile ? 'mobile_fingerprint' : 'desktop_fingerprint'}.json`);
        const payload = JSON.stringify(fingerprint);
        await fs_1.default.promises.writeFile(correct, payload);
        try {
            await fs_1.default.promises.writeFile(legacy, payload);
        }
        catch { /* ignore */ }
        return sessionDir;
    }
    catch (error) {
        throw new Error(error);
    }
}
//# sourceMappingURL=Load.js.map