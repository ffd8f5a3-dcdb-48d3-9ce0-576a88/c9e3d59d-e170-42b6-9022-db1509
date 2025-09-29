import { Config } from '../interface/Config';
type WebhookContext = 'summary' | 'ban' | 'security' | 'compromised' | 'spend' | 'error' | 'default';
interface DiscordField {
    name: string;
    value: string;
    inline?: boolean;
}
interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: DiscordField[];
}
interface ConclusionPayload {
    content?: string;
    embeds?: DiscordEmbed[];
    context?: WebhookContext;
}
/**
 * Send a final structured summary to the configured webhook,
 * and optionally mirror a plain-text summary to NTFY.
 *
 * This preserves existing webhook behavior while adding NTFY
 * as a separate, optional channel.
 */
export declare function ConclusionWebhook(config: Config, content: string, payload?: ConclusionPayload): Promise<void>;
export {};
//# sourceMappingURL=ConclusionWebhook.d.ts.map