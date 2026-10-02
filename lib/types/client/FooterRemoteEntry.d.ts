/**
 * Sidebar footer-seat wrapper for the remote-control entry.
 *
 * Current dsh web shells declare `sidebar.footer.action` (the seat beside
 * the settings trigger) instead of the legacy `sidebar.remote` seat this
 * plugin was written against. The footer seat supplies `{ wide }`; the
 * pairing link is origin-agnostic, so no workspace source is involved.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Entry props: the footer seat's column state and the standard locale seat. */
export type FooterRemoteEntryProps = PropsLocale<'remote'> & {
    /** Whether the sidebar renders wide content (false = 56px rail). */
    wide: boolean;
};
/**
 * Render the remote-control trigger + pairing panel from the footer seat.
 * @param props - composed slot props (footer seat subset).
 * @returns the entry element tree.
 */
export declare function FooterRemoteEntry(props: FooterRemoteEntryProps): import("react").JSX.Element;
//# sourceMappingURL=FooterRemoteEntry.d.ts.map