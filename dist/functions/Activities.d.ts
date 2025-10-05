import { Page } from 'rebrowser-playwright';
import { MicrosoftRewardsBot } from '../index';
import { DashboardData, MorePromotion, PromotionalItem } from '../interface/DashboardData';
import type { ActivityHandler } from '../interface/ActivityHandler';
export default class Activities {
    private bot;
    private handlers;
    constructor(bot: MicrosoftRewardsBot);
    registerHandler(handler: ActivityHandler): void;
    run(page: Page, activity: MorePromotion | PromotionalItem): Promise<void>;
    getTypeLabel(activity: MorePromotion | PromotionalItem): string;
    private classifyActivity;
    doSearch: (page: Page, data: DashboardData) => Promise<void>;
    doABC: (page: Page) => Promise<void>;
    doPoll: (page: Page) => Promise<void>;
    doThisOrThat: (page: Page) => Promise<void>;
    doQuiz: (page: Page) => Promise<void>;
    doUrlReward: (page: Page) => Promise<void>;
    doSearchOnBing: (page: Page, activity: MorePromotion | PromotionalItem) => Promise<void>;
    doReadToEarn: (accessToken: string, data: DashboardData) => Promise<void>;
    doDailyCheckIn: (accessToken: string, data: DashboardData) => Promise<void>;
}
//# sourceMappingURL=Activities.d.ts.map