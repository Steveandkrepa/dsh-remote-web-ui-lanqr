import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Entry props: the sidebar column state and the standard locale seat. */
export type RemoteEntryProps = PropsLocale<'remote'> & {
    /** Whether the sidebar renders wide content (false = 56px rail). */
    wide: boolean;
};
/**
 * Render the remote-control trigger and panel.
 * @param props - composed slot props (contract in this package).
 * @returns the entry element tree.
 */
export declare function RemoteEntry({ wide, t }: RemoteEntryProps): import("react").JSX.Element;
//# sourceMappingURL=RemoteEntry.d.ts.map