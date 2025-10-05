"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rebrowser_playwright_1 = __importDefault(require("rebrowser-playwright"));
const fingerprint_injector_1 = require("fingerprint-injector");
const fingerprint_generator_1 = require("fingerprint-generator");
const Load_1 = require("../util/Load");
const UserAgent_1 = require("../util/UserAgent");
/* Test Stuff
https://abrahamjuliot.github.io/creepjs/
https://botcheck.luminati.io/
https://fv.pro/
https://pixelscan.net/
https://www.browserscan.net/
*/
class Browser {
    constructor(bot) {
        this.bot = bot;
    }
    async createBrowser(proxy, email) {
        // Optional automatic browser installation (set AUTO_INSTALL_BROWSERS=1)
        if (process.env.AUTO_INSTALL_BROWSERS === '1') {
            try {
                // Dynamically import child_process to avoid overhead otherwise
                const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                execSync('npx playwright install chromium', { stdio: 'ignore' });
            }
            catch { /* silent */ }
        }
        let browser;
        // Support both legacy and new config structures (wider scope for later usage)
        const cfgAny = this.bot.config;
        try {
            // FORCE_HEADLESS env takes precedence (used in Docker with headless shell only)
            const envForceHeadless = process.env.FORCE_HEADLESS === '1';
            const headlessValue = envForceHeadless ? true : (cfgAny['headless'] ?? (cfgAny['browser'] && cfgAny['browser']['headless']) ?? false);
            const headless = Boolean(headlessValue);
            const engineName = 'chromium'; // current hard-coded engine
            this.bot.log(this.bot.isMobile, 'BROWSER', `Launching ${engineName} (headless=${headless})`); // explicit engine log
            browser = await rebrowser_playwright_1.default.chromium.launch({
                //channel: 'msedge', // Uses Edge instead of chrome
                headless,
                ...(proxy.url && { proxy: { username: proxy.username, password: proxy.password, server: `${proxy.url}:${proxy.port}` } }),
                args: [
                    '--no-sandbox',
                    '--mute-audio',
                    '--disable-setuid-sandbox',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--ignore-ssl-errors'
                ]
            });
        }
        catch (e) {
            const msg = (e instanceof Error ? e.message : String(e));
            // Common missing browser executable guidance
            if (/Executable doesn't exist/i.test(msg)) {
                this.bot.log(this.bot.isMobile, 'BROWSER', 'Chromium not installed for Playwright. Run: "npx playwright install chromium" (or set AUTO_INSTALL_BROWSERS=1 to auto attempt).', 'error');
            }
            else {
                this.bot.log(this.bot.isMobile, 'BROWSER', 'Failed to launch browser: ' + msg, 'error');
            }
            throw e;
        }
        // Resolve saveFingerprint from legacy root or new fingerprinting.saveFingerprint
        const fpConfig = cfgAny['saveFingerprint'] || cfgAny['fingerprinting']?.['saveFingerprint'];
        const saveFingerprint = fpConfig || { mobile: false, desktop: false };
        const sessionData = await (0, Load_1.loadSessionData)(this.bot.config.sessionPath, email, this.bot.isMobile, saveFingerprint);
        const fingerprint = sessionData.fingerprint ? sessionData.fingerprint : await this.generateFingerprint();
        const context = await (0, fingerprint_injector_1.newInjectedContext)(browser, { fingerprint: fingerprint });
        // Set timeout to preferred amount (supports legacy globalTimeout or browser.globalTimeout)
        const globalTimeout = cfgAny['globalTimeout'] ?? cfgAny['browser']?.['globalTimeout'] ?? 30000;
        context.setDefaultTimeout(this.bot.utils.stringToMs(globalTimeout));
        // Normalize viewport and page rendering so content fits typical screens
        try {
            const desktopViewport = { width: 1280, height: 800 };
            const mobileViewport = { width: 390, height: 844 };
            context.on('page', async (page) => {
                try {
                    // Set a reasonable viewport size depending on device type
                    if (this.bot.isMobile) {
                        await page.setViewportSize(mobileViewport);
                    }
                    else {
                        await page.setViewportSize(desktopViewport);
                    }
                    // Inject a tiny CSS to avoid gigantic scaling on some environments
                    await page.addInitScript(() => {
                        try {
                            const style = document.createElement('style');
                            style.id = '__mrs_fit_style';
                            style.textContent = `
                              html, body { overscroll-behavior: contain; }
                              /* Mild downscale to keep content within window on very large DPI */
                              @media (min-width: 1000px) {
                                html { zoom: 0.9 !important; }
                              }
                            `;
                            document.documentElement.appendChild(style);
                        }
                        catch { /* ignore */ }
                    });
                }
                catch { /* ignore */ }
            });
        }
        catch { /* ignore */ }
        await context.addCookies(sessionData.cookies);
        // Persist fingerprint when feature is configured
        if (fpConfig) {
            await (0, Load_1.saveFingerprintData)(this.bot.config.sessionPath, email, this.bot.isMobile, fingerprint);
        }
        this.bot.log(this.bot.isMobile, 'BROWSER', `Created browser with User-Agent: "${fingerprint.fingerprint.navigator.userAgent}"`);
        return context;
    }
    async generateFingerprint() {
        const fingerPrintData = new fingerprint_generator_1.FingerprintGenerator().getFingerprint({
            devices: this.bot.isMobile ? ['mobile'] : ['desktop'],
            operatingSystems: this.bot.isMobile ? ['android'] : ['windows'],
            browsers: [{ name: 'edge' }]
        });
        const updatedFingerPrintData = await (0, UserAgent_1.updateFingerprintUserAgent)(fingerPrintData, this.bot.isMobile);
        return updatedFingerPrintData;
    }
}
exports.default = Browser;
//# sourceMappingURL=Browser.js.map