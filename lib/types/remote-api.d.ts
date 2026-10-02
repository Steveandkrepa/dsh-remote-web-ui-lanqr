/**
 * The remote desktop data channel: `/remote` is this plugin's own prefix, so
 * the paired-device cookie is the access control. After that gate, every
 * fenced same-origin path the browser rewrote here is re-issued to 127.0.0.1
 * as a loopback-shaped request so sibling plugin fences (and the connection
 * plugin's `/api`) accept it — no `--trusted-host` and no per-plugin pairing
 * consult.
 *
 * Security model:
 * - Every request must carry a live paired-device credential, enforced before
 *   any bytes are forwarded and before any host call. This gate is
 *   unconditional and does NOT follow `requirePairingForLan`: the channel
 *   re-issues traffic with the process's own browser-auth credential, so it is
 *   an authentication amplifier — an unpaired caller admitted here would reach
 *   the full host API without ever holding that credential. The LAN policy
 *   governs the plain `/api` surface only (whether the harness fence's LAN
 *   auto-trust stands on its own); it can never widen this channel.
 * - A paired remote desktop is a full-control credential: the browser half
 *   flips the official UI into host mode (the transport ownsHost hook), so
 *   the configuration plane (settings, credentials, presets, deliverables)
 *   rides this channel like every other call. The four control planes in
 *   LOCAL_ONLY_PREFIXES stay physically local.
 * - Everything else is HTTP- or WebSocket-proxied to the local port with
 *   Host rewritten, Origin and cookies dropped, and a synthetic same-origin
 *   browser marker added after authentication. Plugin loopback fences then
 *   pass. The pairing cookie never leaves this process.
 */
import type { IncomingMessage } from 'node:http';
import type { WebRoute, WebUpgradeRoute } from '@deepseek-ai/dsh-host-webserver';
import type { PairingService } from './pairing.ts';
import type { InnerAuth } from './inner-auth.ts';
export { LOCAL_ONLY_PREFIXES, PLUGIN_MANAGER_PATH, REMOTE_API_PATHS, REMOTE_DEVICE_HEADER, REMOTE_DEVICE_QUERY, REMOTE_PREFIX, REMOTE_UPGRADE_PATHS, WEB_UI_SETTINGS_BRIDGE_PATH, localOnlyDenial, } from './remote-methods.ts';
export { REMOTE_API_PREFIX } from './remote-methods.ts';
/** Route-family dependencies. */
export interface RemoteApiDeps {
    /** The pairing service (device gate + cookie name). */
    service: PairingService;
    /** Local webServer port the loopback proxy connects to. */
    port: number;
    /**
     * The process's inner browser-auth credential attached to re-issued
     * requests (the connection plugin's /api route enforces that cookie and
     * the pairing gate above already ran). Undefined keeps the previous
     * cookie-less behavior — the inner route then answers 401 on this cohort.
     */
    auth?: InnerAuth;
}
/**
 * Map `/remote/...` to the inner path, or undefined when the outer path is
 * not a safe rewrite target.
 */
export declare function innerPathOf(pathname: string): string | undefined;
/**
 * Whether a paired inner path must stay physically local (delegates to the
 * shared LOCAL_ONLY_PREFIXES table).
 * @returns a denial message, or undefined when the path may be proxied.
 */
export declare function loopbackOnlyDenial(innerPath: string): string | undefined;
/**
 * Resolve a live device credential for a gated HTTP request: the pairing
 * cookie first, then the cookieless header the boot patch attaches. Unknown
 * or revoked ids are a no-op - a stale id never re-arms a device.
 * @returns the touched device id, or undefined when neither credential is live.
 */
export declare function pairedDeviceIdOf(req: IncomingMessage, service: PairingService): string | undefined;
/**
 * Build the remote desktop channel HTTP routes.
 * @param deps - pairing service + local port + inner credential.
 * @returns the routes to register on webServer.
 */
export declare function makeRemoteApiRoutes(deps: RemoteApiDeps): WebRoute[];
/**
 * Map one outer upgrade URL onto the loopback path, dropping the cookieless
 * device credential on the way in.
 *
 * The outer handshake carries the device id as `?device=<id>` because WebSocket
 * handshakes cannot carry headers from the Web API. That id is a live session
 * credential — it opens the full host API through this same channel — and the
 * inner leg is a request the rest of the loopback origin sees (on a WebSocket
 * leg, a raw handshake request line written to a loopback socket), so forwarding
 * it handed a working credential to every other observer of the local port for
 * no benefit: the gate above has already authenticated the caller, and no
 * upstream route reads the parameter (the gateway mux matches on path alone).
 * The rest of the query rides through unchanged, so a caller's own parameters
 * still reach the upstream.
 */
export declare function upgradeInnerPath(reqUrl: string | undefined, fallbackPath: string): string;
/**
 * Build the WebSocket upgrade routes for the event streams and known plugin
 * sockets. webServer matches upgrades by exact path.
 * @param deps - pairing service + local port + live pairing policy.
 * @returns the upgrade routes to register on webServer.
 */
export declare function makeRemoteApiUpgradeRoutes(deps: RemoteApiDeps): WebUpgradeRoute[];
//# sourceMappingURL=remote-api.d.ts.map