"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const luxon_1 = require("luxon");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
const Load_1 = require("./util/Load");
const Logger_1 = require("./util/Logger");
function resolveTimeParts(schedule) {
    const tz = (schedule?.timeZone && luxon_1.IANAZone.isValidZone(schedule.timeZone)) ? schedule.timeZone : 'UTC';
    // Determine source string
    let src = '';
    if (typeof schedule?.useAmPm === 'boolean') {
        if (schedule.useAmPm)
            src = (schedule.time12 || schedule.time || '').trim();
        else
            src = (schedule.time24 || schedule.time || '').trim();
    }
    else {
        // Back-compat: prefer time if present; else time24 or time12
        src = (schedule?.time || schedule?.time24 || schedule?.time12 || '').trim();
    }
    // Try to parse 24h first: HH:mm
    const m24 = src.match(/^\s*(\d{1,2}):(\d{2})\s*$/i);
    if (m24) {
        const hh = Math.max(0, Math.min(23, parseInt(m24[1], 10)));
        const mm = Math.max(0, Math.min(59, parseInt(m24[2], 10)));
        return { tz, hour: hh, minute: mm };
    }
    // Parse 12h with AM/PM: h:mm AM or h AM
    const m12 = src.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i);
    if (m12) {
        let hh = parseInt(m12[1], 10);
        const mm = m12[2] ? parseInt(m12[2], 10) : 0;
        const ampm = m12[3].toUpperCase();
        if (hh === 12)
            hh = 0;
        if (ampm === 'PM')
            hh += 12;
        hh = Math.max(0, Math.min(23, hh));
        const m = Math.max(0, Math.min(59, mm));
        return { tz, hour: hh, minute: m };
    }
    // Fallback: default 09:00
    return { tz, hour: 9, minute: 0 };
}
function parseTargetToday(now, schedule) {
    const { tz, hour, minute } = resolveTimeParts(schedule);
    const dtn = luxon_1.DateTime.fromJSDate(now, { zone: tz });
    return dtn.set({ hour, minute, second: 0, millisecond: 0 });
}
async function runOnePass() {
    const bot = new index_1.MicrosoftRewardsBot(false);
    await bot.initialize();
    await bot.run();
}
/**
 * Run a single pass either in-process or as a child process (default),
 * with a watchdog timeout to kill stuck runs.
 */
async function runOnePassWithWatchdog() {
    // Heartbeat-aware watchdog configuration
    // If a child is actively updating its heartbeat file, we allow it to run beyond the legacy timeout.
    // Defaults are generous to allow first-day passes to finish searches with delays.
    const staleHeartbeatMin = Number(process.env.SCHEDULER_STALE_HEARTBEAT_MINUTES || process.env.SCHEDULER_PASS_TIMEOUT_MINUTES || 30);
    const graceMin = Number(process.env.SCHEDULER_HEARTBEAT_GRACE_MINUTES || 15);
    const hardcapMin = Number(process.env.SCHEDULER_PASS_HARDCAP_MINUTES || 480); // 8 hours
    const checkEveryMs = 60000; // check once per minute
    // Fork per pass: safer because we can terminate a stuck child without killing the scheduler
    const forkPerPass = String(process.env.SCHEDULER_FORK_PER_PASS || 'true').toLowerCase() !== 'false';
    if (!forkPerPass) {
        // In-process fallback (cannot forcefully stop if truly stuck)
        await (0, Logger_1.log)('main', 'SCHEDULER', `Starting pass in-process (grace ${graceMin}m • stale ${staleHeartbeatMin}m • hardcap ${hardcapMin}m). Cannot force-kill if stuck.`);
        // No true watchdog possible in-process; just run
        await runOnePass();
        return;
    }
    // Child process execution
    const indexJs = path_1.default.join(__dirname, 'index.js');
    await (0, Logger_1.log)('main', 'SCHEDULER', `Spawning child for pass: ${process.execPath} ${indexJs}`);
    // Prepare heartbeat file path and pass to child
    const cfg = (0, Load_1.loadConfig)();
    const baseDir = path_1.default.join(process.cwd(), cfg.sessionPath || 'sessions');
    const hbFile = path_1.default.join(baseDir, `heartbeat_${Date.now()}.lock`);
    try {
        fs_1.default.mkdirSync(baseDir, { recursive: true });
    }
    catch { /* ignore */ }
    await new Promise((resolve) => {
        const child = (0, child_process_1.spawn)(process.execPath, [indexJs], { stdio: 'inherit', env: { ...process.env, SCHEDULER_HEARTBEAT_FILE: hbFile } });
        let finished = false;
        const startedAt = Date.now();
        const killChild = async (signal) => {
            try {
                await (0, Logger_1.log)('main', 'SCHEDULER', `Sending ${signal} to stuck child PID ${child.pid}`, 'warn');
                child.kill(signal);
            }
            catch { /* ignore */ }
        };
        const timer = setInterval(() => {
            if (finished)
                return;
            const now = Date.now();
            const runtimeMin = Math.floor((now - startedAt) / 60000);
            // Hard cap: always terminate if exceeded
            if (runtimeMin >= hardcapMin) {
                (0, Logger_1.log)('main', 'SCHEDULER', `Pass exceeded hard cap of ${hardcapMin} minutes; terminating...`, 'warn');
                void killChild('SIGTERM');
                setTimeout(() => { try {
                    child.kill('SIGKILL');
                }
                catch { /* ignore */ } }, 10000);
                return;
            }
            // Before grace, don't judge
            if (runtimeMin < graceMin)
                return;
            // Check heartbeat freshness
            try {
                const st = fs_1.default.statSync(hbFile);
                const mtimeMs = st.mtimeMs;
                const ageMin = Math.floor((now - mtimeMs) / 60000);
                if (ageMin >= staleHeartbeatMin) {
                    (0, Logger_1.log)('main', 'SCHEDULER', `Heartbeat stale for ${ageMin}m (>=${staleHeartbeatMin}m). Terminating child...`, 'warn');
                    void killChild('SIGTERM');
                    setTimeout(() => { try {
                        child.kill('SIGKILL');
                    }
                    catch { /* ignore */ } }, 10000);
                }
            }
            catch {
                // If file missing after grace, consider stale
                (0, Logger_1.log)('main', 'SCHEDULER', 'Heartbeat file missing after grace. Terminating child...', 'warn');
                void killChild('SIGTERM');
                setTimeout(() => { try {
                    child.kill('SIGKILL');
                }
                catch { /* ignore */ } }, 10000);
            }
        }, checkEveryMs);
        child.on('exit', async (code, signal) => {
            finished = true;
            clearInterval(timer);
            // Cleanup heartbeat file
            try {
                if (fs_1.default.existsSync(hbFile))
                    fs_1.default.unlinkSync(hbFile);
            }
            catch { /* ignore */ }
            if (signal) {
                await (0, Logger_1.log)('main', 'SCHEDULER', `Child exited due to signal: ${signal}`, 'warn');
            }
            else if (code && code !== 0) {
                await (0, Logger_1.log)('main', 'SCHEDULER', `Child exited with non-zero code: ${code}`, 'warn');
            }
            else {
                await (0, Logger_1.log)('main', 'SCHEDULER', 'Child pass completed successfully');
            }
            resolve();
        });
        child.on('error', async (err) => {
            finished = true;
            clearInterval(timer);
            try {
                if (fs_1.default.existsSync(hbFile))
                    fs_1.default.unlinkSync(hbFile);
            }
            catch { /* ignore */ }
            await (0, Logger_1.log)('main', 'SCHEDULER', `Failed to spawn child: ${err instanceof Error ? err.message : String(err)}`, 'error');
            resolve();
        });
    });
}
async function runPasses(passes) {
    const n = Math.max(1, Math.floor(passes || 1));
    for (let i = 1; i <= n; i++) {
        await (0, Logger_1.log)('main', 'SCHEDULER', `Starting pass ${i}/${n}`);
        const started = Date.now();
        await runOnePassWithWatchdog();
        const took = Date.now() - started;
        const sec = Math.max(1, Math.round(took / 1000));
        await (0, Logger_1.log)('main', 'SCHEDULER', `Completed pass ${i}/${n}`);
        await (0, Logger_1.log)('main', 'SCHEDULER', `Pass ${i} duration: ${sec}s`);
    }
}
async function main() {
    const cfg = (0, Load_1.loadConfig)();
    const schedule = cfg.schedule || { enabled: false };
    const passes = typeof cfg.passesPerRun === 'number' ? cfg.passesPerRun : 1;
    const offPerWeek = Math.max(0, Math.min(7, Number(cfg.humanization?.randomOffDaysPerWeek ?? 1)));
    let offDays = []; // 1..7 ISO weekday
    let offWeek = null;
    let vacMonth = null; // 'yyyy-LL'
    let vacRange = null; // ISO dates 'yyyy-LL-dd'
    const refreshOffDays = async (now) => {
        if (offPerWeek <= 0) {
            offDays = [];
            offWeek = null;
            return;
        }
        const week = now.weekNumber;
        if (offWeek === week && offDays.length)
            return;
        // choose distinct weekdays [1..7]
        const pool = [1, 2, 3, 4, 5, 6, 7];
        const chosen = [];
        for (let i = 0; i < Math.min(offPerWeek, 7); i++) {
            const idx = Math.floor(Math.random() * pool.length);
            chosen.push(pool[idx]);
            pool.splice(idx, 1);
        }
        offDays = chosen.sort((a, b) => a - b);
        offWeek = week;
        await (0, Logger_1.log)('main', 'SCHEDULER', `Selected random off-days this week (ISO): ${offDays.join(', ')}`, 'warn');
    };
    const chooseVacationRange = async (now) => {
        // Only when enabled
        if (!cfg.vacation?.enabled) {
            vacRange = null;
            vacMonth = null;
            return;
        }
        const monthKey = now.toFormat('yyyy-LL');
        if (vacMonth === monthKey && vacRange)
            return;
        // Determine month days and choose contiguous block
        const monthStart = now.startOf('month');
        const monthEnd = now.endOf('month');
        const totalDays = monthEnd.day;
        const minD = Math.max(1, Math.min(28, Number(cfg.vacation.minDays ?? 3)));
        const maxD = Math.max(minD, Math.min(31, Number(cfg.vacation.maxDays ?? 5)));
        const span = (minD === maxD) ? minD : (minD + Math.floor(Math.random() * (maxD - minD + 1)));
        const latestStart = Math.max(1, totalDays - span + 1);
        const startDay = 1 + Math.floor(Math.random() * latestStart);
        const start = monthStart.set({ day: startDay });
        const end = start.plus({ days: span - 1 });
        vacMonth = monthKey;
        vacRange = { start: start.toFormat('yyyy-LL-dd'), end: end.toFormat('yyyy-LL-dd') };
        await (0, Logger_1.log)('main', 'SCHEDULER', `Selected vacation block this month: ${vacRange.start} → ${vacRange.end} (${span} day(s))`, 'warn');
    };
    if (!schedule.enabled) {
        await (0, Logger_1.log)('main', 'SCHEDULER', 'Schedule disabled; running once then exit');
        await runPasses(passes);
        process.exit(0);
    }
    const tz = (schedule.timeZone && luxon_1.IANAZone.isValidZone(schedule.timeZone)) ? schedule.timeZone : 'UTC';
    // Default to false to avoid unexpected immediate runs
    const runImmediate = schedule.runImmediatelyOnStart === true;
    let running = false;
    // Optional initial jitter before the first run (to vary start time)
    const initJitterMin = Number(process.env.SCHEDULER_INITIAL_JITTER_MINUTES_MIN || process.env.SCHEDULER_INITIAL_JITTER_MIN || 0);
    const initJitterMax = Number(process.env.SCHEDULER_INITIAL_JITTER_MINUTES_MAX || process.env.SCHEDULER_INITIAL_JITTER_MAX || 0);
    const initialJitterBounds = [isFinite(initJitterMin) ? initJitterMin : 0, isFinite(initJitterMax) ? initJitterMax : 0];
    const applyInitialJitter = (initialJitterBounds[0] > 0 || initialJitterBounds[1] > 0);
    if (runImmediate && !running) {
        running = true;
        if (applyInitialJitter) {
            const min = Math.max(0, Math.min(initialJitterBounds[0], initialJitterBounds[1]));
            const max = Math.max(0, Math.max(initialJitterBounds[0], initialJitterBounds[1]));
            const jitterSec = (min === max) ? min * 60 : (min * 60 + Math.floor(Math.random() * ((max - min) * 60)));
            if (jitterSec > 0) {
                await (0, Logger_1.log)('main', 'SCHEDULER', `Initial jitter: delaying first run by ${Math.round(jitterSec / 60)} minute(s) (${jitterSec}s)`, 'warn');
                await new Promise((r) => setTimeout(r, jitterSec * 1000));
            }
        }
        const nowDT = luxon_1.DateTime.local().setZone(tz);
        await chooseVacationRange(nowDT);
        await refreshOffDays(nowDT);
        const todayIso = nowDT.toFormat('yyyy-LL-dd');
        const vr = vacRange;
        const isVacationToday = !!(vr && todayIso >= vr.start && todayIso <= vr.end);
        if (isVacationToday) {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Skipping immediate run: vacation day (${todayIso})`, 'warn');
        }
        else if (offDays.includes(nowDT.weekday)) {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Skipping immediate run: off-day (weekday ${nowDT.weekday})`, 'warn');
        }
        else {
            await runPasses(passes);
        }
        running = false;
    }
    for (;;) {
        const now = new Date();
        const targetToday = parseTargetToday(now, schedule);
        let next = targetToday;
        const nowDT = luxon_1.DateTime.fromJSDate(now, { zone: targetToday.zone });
        if (nowDT >= targetToday) {
            next = targetToday.plus({ days: 1 });
        }
        let ms = Math.max(0, next.toMillis() - nowDT.toMillis());
        // Optional daily jitter to further randomize the exact start time each day
        const dailyJitterMin = Number(process.env.SCHEDULER_DAILY_JITTER_MINUTES_MIN || process.env.SCHEDULER_DAILY_JITTER_MIN || 0);
        const dailyJitterMax = Number(process.env.SCHEDULER_DAILY_JITTER_MINUTES_MAX || process.env.SCHEDULER_DAILY_JITTER_MAX || 0);
        const djMin = isFinite(dailyJitterMin) ? dailyJitterMin : 0;
        const djMax = isFinite(dailyJitterMax) ? dailyJitterMax : 0;
        let extraMs = 0;
        if (djMin > 0 || djMax > 0) {
            const mn = Math.max(0, Math.min(djMin, djMax));
            const mx = Math.max(0, Math.max(djMin, djMax));
            const jitterSec = (mn === mx) ? mn * 60 : (mn * 60 + Math.floor(Math.random() * ((mx - mn) * 60)));
            extraMs = jitterSec * 1000;
            ms += extraMs;
        }
        const human = next.toFormat('yyyy-LL-dd HH:mm ZZZZ');
        const totalSec = Math.round(ms / 1000);
        if (extraMs > 0) {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Next run at ${human} plus daily jitter (+${Math.round(extraMs / 60000)}m) → in ${totalSec}s`);
        }
        else {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Next run at ${human} (in ${totalSec}s)`);
        }
        await new Promise((resolve) => setTimeout(resolve, ms));
        const nowRun = luxon_1.DateTime.local().setZone(tz);
        await chooseVacationRange(nowRun);
        await refreshOffDays(nowRun);
        const todayIso2 = nowRun.toFormat('yyyy-LL-dd');
        const vr2 = vacRange;
        const isVacation = !!(vr2 && todayIso2 >= vr2.start && todayIso2 <= vr2.end);
        if (isVacation) {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Skipping scheduled run: vacation day (${todayIso2})`, 'warn');
            continue;
        }
        if (offDays.includes(nowRun.weekday)) {
            await (0, Logger_1.log)('main', 'SCHEDULER', `Skipping scheduled run: off-day (weekday ${nowRun.weekday})`, 'warn');
            continue;
        }
        if (!running) {
            running = true;
            await runPasses(passes);
            running = false;
        }
        else {
            await (0, Logger_1.log)('main', 'SCHEDULER', 'Skipped scheduled trigger because a pass is already running', 'warn');
        }
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=scheduler.js.map