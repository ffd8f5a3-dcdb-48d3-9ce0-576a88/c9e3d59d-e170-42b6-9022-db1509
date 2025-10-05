"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobState = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class JobState {
    constructor(cfg) {
        const dir = cfg.jobState?.dir || path_1.default.join(process.cwd(), cfg.sessionPath, 'job-state');
        this.baseDir = dir;
        if (!fs_1.default.existsSync(this.baseDir))
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
    }
    fileFor(email) {
        const safe = email.replace(/[^a-z0-9._-]/gi, '_');
        return path_1.default.join(this.baseDir, `${safe}.json`);
    }
    load(email) {
        const file = this.fileFor(email);
        if (!fs_1.default.existsSync(file))
            return { days: {} };
        try {
            const raw = fs_1.default.readFileSync(file, 'utf-8');
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && parsed.days ? parsed : { days: {} };
        }
        catch {
            return { days: {} };
        }
    }
    save(email, state) {
        const file = this.fileFor(email);
        fs_1.default.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
    }
    isDone(email, day, offerId) {
        const st = this.load(email);
        const d = st.days[day];
        if (!d)
            return false;
        return d.doneOfferIds.includes(offerId);
    }
    markDone(email, day, offerId) {
        const st = this.load(email);
        if (!st.days[day])
            st.days[day] = { doneOfferIds: [] };
        const d = st.days[day];
        if (!d.doneOfferIds.includes(offerId))
            d.doneOfferIds.push(offerId);
        this.save(email, st);
    }
}
exports.JobState = JobState;
exports.default = JobState;
//# sourceMappingURL=JobState.js.map