/**
 * The remote-channel rewrite contract as pure data (issue #987): both the
 * browser patch (client/remote-channel.ts) and the parse-time boot patch
 * (remote-channel-boot.ts, inlined into index.html by the host) decide from
 * these tables, so the two can never drift apart.
 * @module @linxin666/dsh-remote-web-ui/remote-channel-rules
 */
/** The gated mirror prefix (must match src/remote-methods.ts). */
export declare const REMOTE_PREFIX = "/remote";
import { REMOTE_DEVICE_HEADER, REMOTE_DEVICE_QUERY } from './remote-methods.ts';
/**
 * The schemes that can deliver a page a remote party controls: the network
 * transports, plus the documents a network page can mint. Every other scheme
 * is registered and served by an application on this machine, so its page is
 * the machine's own page whatever the application calls the scheme.
 *
 * The list is deliberately the *web* side rather than an allowlist of known
 * desktop shells. The official DSH Desktop shell serves its Web GUI from
 * `dsh-app://app/` (`location.hostname === 'app'`), which no hostname
 * predicate can recognise; a scheme allowlist fixed that instance (#1682) but
 * left the next shell — or a `file:` page — fenced behind a pairing page it
 * can never complete, because a pairing link is reachable only over the
 * network. Naming the web side instead makes an unknown application scheme
 * local by construction.
 *
 * `blob:`, `data:`, `about:` and `filesystem:` stay on the web side: a
 * network page mints those documents, so they must keep the fence.
 */
export declare const WEB_PAGE_PROTOCOLS: readonly string[];
/**
 * Whether one page scheme can carry a document a remote party controls.
 * @param protocol - `location.protocol` of the page (for example `https:`).
 * @returns true for the network transports and the documents they mint.
 */
export declare function isWebPageProtocol(protocol: string): boolean;
/**
 * Hostname-only loopback classification: localhost, the IPv6 loopback literal
 * (WHATWG keeps its brackets) and any 127/8 IPv4 literal. Kept string-in,
 * boolean-out and dependency-free so the browser half and the inlined boot
 * script can both run it verbatim.
 * @param hostname - a page/cookie hostname, IPv6 literals bracketed.
 * @returns true for a loopback name or literal.
 */
export declare function isLoopbackHostname(hostname: string): boolean;
/**
 * Whether the current page is served from the machine running the host, so
 * its same-origin traffic must NOT be fenced behind the pairing channel.
 * Three independent facts all describe the page itself and any one is enough:
 *
 * - the page's own hostname is loopback;
 * - the page's protocol is not a {@link WEB_PAGE_PROTOCOLS} web scheme, so an
 *   application on this machine delivered it — the desktop shell's
 *   `dsh-app://app/` is one such page, and a scheme this build has never
 *   heard of is another;
 * - the official connection transport already declared this shell the host
 *   owner (`__DSH_TRANSPORT__.ownsHost === true`) AND the page is not a
 *   network origin. The official client reads the same hook to derive
 *   `connection.isLoopback`, and the desktop shell sets it before any boot
 *   entry — without this term the plugin's predicate contradicts the host's
 *   own conclusion (#1682). The network-origin guard is deliberate: this
 *   plugin's own device-gated landing (a LAN or tunnel page) publishes the
 *   same hook to grant a paired remote the full UI, and that page must keep
 *   riding the gated channel — `ownsHost` buys the presentation, never an
 *   exemption from the pairing fence.
 *
 * The order matters: loopback is checked first so a loopback page keeps its
 * exemption even on a scheme no list carries, and the scheme test runs before
 * the hook test so a web page always reaches the network-origin guard. A
 * missing or empty scheme is not evidence of a local page - the fence stays
 * up - because a real document always reports its own scheme.
 *
 * @param hostname - `location.hostname` of the page.
 * @param protocol - `location.protocol` of the page (for example `https:`).
 * @param transportOwnsHost - `__DSH_TRANSPORT__?.ownsHost` as read by the caller.
 * @returns true when the page is local and needs no remote channel.
 */
export declare function isLocalPage(hostname: string, protocol?: string, transportOwnsHost?: boolean): boolean;
export { REMOTE_DEVICE_HEADER, REMOTE_DEVICE_QUERY };
/** Connection-plugin method prefix under the gated channel. */
export declare const REMOTE_API_PREFIX = "/remote/api";
/**
 * The window global the device-gated app landing publishes to grant host mode.
 * Set by the /pair-app capture script, read by the parse-time boot patch: the
 * transport hook (ownsHost) is server-granted, not asserted from the origin.
 */
export declare const REMOTE_HOST_GRANT_GLOBAL = "__DSH_REMOTE_HOST_GRANT__";
/** Every decision input of the remote-channel rewrite, JSON-serializable. */
export interface RemoteChannelRules {
    readonly remotePrefix: string;
    readonly apiPrefix: string;
    readonly pairPrefix: string;
    readonly updatePrefix: string;
    readonly settingsBridgePrefix: string;
    readonly sidebarPrefix: string;
    readonly gitPrefix: string;
    readonly petPrefix: string;
    readonly wsPaths: readonly string[];
    /** Header carrying the cookieless device credential on gated fetches. */
    readonly deviceHeader: string;
    /** sessionStorage key holding the device credential (set by /pair-app). */
    readonly deviceKey: string;
    /** Query parameter carrying it on WebSocket upgrades. */
    readonly deviceQuery: string;
    /** Raw upload route the boot hook keeps on the gated channel. */
    readonly uploadPath: string;
    /** Page global the pre-Cordis upload hook is published under. */
    readonly uploadHookGlobal: string;
    /**
     * Schemes that can carry a remotely controlled document (see
     * WEB_PAGE_PROTOCOLS): a page on any other scheme is delivered by an
     * application on this machine. Carried in the rules so the inlined boot
     * script applies the same list.
     */
    readonly webProtocols: readonly string[];
    /**
     * Page global carrying the server-issued host-mode grant. Only the plugin's
     * own device-gated app landing (/pair-app) publishes it; the boot patch
     * therefore enables the official UI's host mode only for a shell the server
     * actually granted, never for one that merely happens to sit on a
     * non-loopback origin.
     */
    readonly hostGrantGlobal: string;
}
/** The live rule set. */
export declare const REMOTE_CHANNEL_RULES: RemoteChannelRules;
/** The window global the boot patch publishes its seat under. */
export declare const REMOTE_CHANNEL_BOOT_GLOBAL = "__DSH_REMOTE_CHANNEL_BOOT__";
/**
 * The seat the parse-time boot patch installs: hook seats the plugin's
 * client apply adopts, a pending-unpaired flag for signals raised before
 * adoption, and restore() retiring the patch (also removes the global).
 */
export interface RemoteChannelBootSeat {
    onUnpaired: (() => void) | null;
    onPaired: (() => void) | null;
    pendingUnpaired: boolean;
    restore(): void;
}
//# sourceMappingURL=remote-channel-rules.d.ts.map