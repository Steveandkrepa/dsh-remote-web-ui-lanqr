import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
/** Notice props: localized copy. */
export interface FenceNoticeProps {
    t: TranslateNS<'remote'>;
    /** Retry after the user has opened a freshly issued computer pairing link. */
    onRetry: () => void;
    /** Optional custom pairing acceptor for testing / dependency injection. */
    onAccept?: (token: string) => Promise<{
        ok: true;
    } | {
        ok: false;
        code: 'invalid' | 'used' | 'forbidden';
    }>;
}
/**
 * Extract a pairing token from either a raw token string or a copied pairing link URL.
 */
export declare function extractPairToken(input: string): string | undefined;
/**
 * Render the unpaired blocking page.
 * @param props - localized copy.
 * @returns the notice element.
 */
export declare function FenceNotice({ t, onRetry, onAccept }: FenceNoticeProps): import("react").JSX.Element;
//# sourceMappingURL=FenceNotice.d.ts.map