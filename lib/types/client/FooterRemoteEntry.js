import { jsx as _jsx } from "react/jsx-runtime";
import { RemoteEntry } from "./RemoteEntry.js";
/**
 * Render the remote-control trigger + pairing panel from the footer seat.
 * @param props - composed slot props (footer seat subset).
 * @returns the entry element tree.
 */
export function FooterRemoteEntry(props) {
    return (_jsx(RemoteEntry, { wide: props.wide, t: props.t }));
}
