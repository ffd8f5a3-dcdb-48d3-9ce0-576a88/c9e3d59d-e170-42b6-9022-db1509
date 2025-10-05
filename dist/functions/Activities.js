"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Search_1 = require("./activities/Search");
const ABC_1 = require("./activities/ABC");
const Poll_1 = require("./activities/Poll");
const Quiz_1 = require("./activities/Quiz");
const ThisOrThat_1 = require("./activities/ThisOrThat");
const UrlReward_1 = require("./activities/UrlReward");
const SearchOnBing_1 = require("./activities/SearchOnBing");
const ReadToEarn_1 = require("./activities/ReadToEarn");
const DailyCheckIn_1 = require("./activities/DailyCheckIn");
class Activities {
    constructor(bot) {
        this.handlers = [];
        this.doSearch = async (page, data) => {
            const search = new Search_1.Search(this.bot);
            await search.doSearch(page, data);
        };
        this.doABC = async (page) => {
            const abc = new ABC_1.ABC(this.bot);
            await abc.doABC(page);
        };
        this.doPoll = async (page) => {
            const poll = new Poll_1.Poll(this.bot);
            await poll.doPoll(page);
        };
        this.doThisOrThat = async (page) => {
            const thisOrThat = new ThisOrThat_1.ThisOrThat(this.bot);
            await thisOrThat.doThisOrThat(page);
        };
        this.doQuiz = async (page) => {
            const quiz = new Quiz_1.Quiz(this.bot);
            await quiz.doQuiz(page);
        };
        this.doUrlReward = async (page) => {
            const urlReward = new UrlReward_1.UrlReward(this.bot);
            await urlReward.doUrlReward(page);
        };
        this.doSearchOnBing = async (page, activity) => {
            const searchOnBing = new SearchOnBing_1.SearchOnBing(this.bot);
            await searchOnBing.doSearchOnBing(page, activity);
        };
        this.doReadToEarn = async (accessToken, data) => {
            const readToEarn = new ReadToEarn_1.ReadToEarn(this.bot);
            await readToEarn.doReadToEarn(accessToken, data);
        };
        this.doDailyCheckIn = async (accessToken, data) => {
            const dailyCheckIn = new DailyCheckIn_1.DailyCheckIn(this.bot);
            await dailyCheckIn.doDailyCheckIn(accessToken, data);
        };
        this.bot = bot;
    }
    // Register external/custom handlers (optional extension point)
    registerHandler(handler) {
        this.handlers.push(handler);
    }
    // Centralized dispatcher for activities from dashboard/punchcards
    async run(page, activity) {
        // First, try custom handlers (if any)
        for (const h of this.handlers) {
            try {
                if (h.canHandle(activity)) {
                    await h.run(page, activity);
                    return;
                }
            }
            catch (e) {
                this.bot.log(this.bot.isMobile, 'ACTIVITY', `Custom handler ${(h.id || 'unknown')} failed: ${e instanceof Error ? e.message : e}`, 'error');
            }
        }
        const kind = this.classifyActivity(activity);
        try {
            switch (kind.type) {
                case 'poll':
                    await this.doPoll(page);
                    break;
                case 'abc':
                    await this.doABC(page);
                    break;
                case 'thisOrThat':
                    await this.doThisOrThat(page);
                    break;
                case 'quiz':
                    await this.doQuiz(page);
                    break;
                case 'searchOnBing':
                    await this.doSearchOnBing(page, activity);
                    break;
                case 'urlReward':
                    await this.doUrlReward(page);
                    break;
                default:
                    this.bot.log(this.bot.isMobile, 'ACTIVITY', `Skipped activity "${activity.title}" | Reason: Unsupported type: "${String(activity.promotionType)}"!`, 'warn');
                    break;
            }
        }
        catch (e) {
            this.bot.log(this.bot.isMobile, 'ACTIVITY', `Dispatcher error for "${activity.title}": ${e instanceof Error ? e.message : e}`, 'error');
        }
    }
    getTypeLabel(activity) {
        const k = this.classifyActivity(activity);
        switch (k.type) {
            case 'poll': return 'Poll';
            case 'abc': return 'ABC';
            case 'thisOrThat': return 'ThisOrThat';
            case 'quiz': return 'Quiz';
            case 'searchOnBing': return 'SearchOnBing';
            case 'urlReward': return 'UrlReward';
            default: return 'Unsupported';
        }
    }
    classifyActivity(activity) {
        const type = (activity.promotionType || '').toLowerCase();
        if (type === 'quiz') {
            // Distinguish Poll/ABC/ThisOrThat vs general quiz using current heuristics
            const max = activity.pointProgressMax;
            const url = (activity.destinationUrl || '').toLowerCase();
            if (max === 10) {
                if (url.includes('pollscenarioid'))
                    return { type: 'poll' };
                return { type: 'abc' };
            }
            if (max === 50)
                return { type: 'thisOrThat' };
            return { type: 'quiz' };
        }
        if (type === 'urlreward') {
            const name = (activity.name || '').toLowerCase();
            if (name.includes('exploreonbing'))
                return { type: 'searchOnBing' };
            return { type: 'urlReward' };
        }
        return { type: 'unsupported' };
    }
}
exports.default = Activities;
//# sourceMappingURL=Activities.js.map