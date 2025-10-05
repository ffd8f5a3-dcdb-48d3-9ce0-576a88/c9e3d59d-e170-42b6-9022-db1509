import { Page } from 'rebrowser-playwright';
import Util from './Utils';
import type { ConfigHumanization } from '../interface/Config';
export declare class Humanizer {
    private util;
    private cfg;
    constructor(util: Util, cfg?: ConfigHumanization);
    microGestures(page: Page): Promise<void>;
    actionPause(): Promise<void>;
}
export default Humanizer;
//# sourceMappingURL=Humanizer.d.ts.map