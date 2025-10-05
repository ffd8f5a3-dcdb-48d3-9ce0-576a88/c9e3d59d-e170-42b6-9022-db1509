"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBanReason = detectBanReason;
const BAN_PATTERNS = [
    { re: /suspend|suspended|suspension/i, reason: 'account suspended' },
    { re: /locked|lockout|serviceabuse|abuse/i, reason: 'locked or service abuse detected' },
    { re: /unusual.*activity|unusual activity/i, reason: 'unusual activity prompts' },
    { re: /verify.*identity|identity.*verification/i, reason: 'identity verification required' }
];
function detectBanReason(input) {
    const s = input instanceof Error ? (input.message || '') : String(input || '');
    for (const p of BAN_PATTERNS) {
        if (p.re.test(s))
            return { status: true, reason: p.reason };
    }
    return { status: false, reason: '' };
}
//# sourceMappingURL=BanDetector.js.map