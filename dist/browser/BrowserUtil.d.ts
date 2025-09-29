import { Page } from 'rebrowser-playwright';
import { MicrosoftRewardsBot } from '../index';
export default class BrowserUtil {
    private bot;
    constructor(bot: MicrosoftRewardsBot);
    tryDismissAllMessages(page: Page): Promise<void>;
    getLatestTab(page: Page): Promise<Page>;
    reloadBadPage(page: Page): Promise<void>;
    /**
     * Perform small human-like gestures: short waits, minor mouse moves and occasional scrolls.
     * This should be called sparingly between actions to avoid a fixed cadence.
     */
    humanizePage(page: Page): Promise<void>;
    /**
     * Capture minimal diagnostics for a page: screenshot + HTML content.
     * Files are written under ./reports/<date>/ with a safe label.
     */
    captureDiagnostics(page: Page, label: string): Promise<void>;
}
//# sourceMappingURL=BrowserUtil.d.ts.map