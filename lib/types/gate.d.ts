/**
 * The `api/gate` listener: application-level access control layered on top
 * of the transport fence (the fence is Host/Origin based and explicitly not
 * an authentication layer — packages/client/connection documents this
 * event as the sanctioned seam for pairing/revocation).
 *
 * Policy: loopback requests (the desktop) pass without a device identity;
 * every non-loopback /api request must carry a live, non-revoked device
 * cookie — intended to make the QR the only way into a LAN-exposed dsh web
 * and to give "停止" real teeth for direct /api callers.
 *
 * Cohort reality (0.1.2-alpha.2): NOTHING emits api/gate in the official
 * runtime, so this listener never fires there and direct /api is governed
 * solely by the harness fence + browser-auth cookie. The pairing gate with
 * real teeth lives on the plugin's own /remote channel (remote-api.ts); the
 * listener stays wired for cohort lines that do carry the seam, and the
 * README security model states the gap plainly.
 */
import type { IncomingMessage } from 'node:http';
import type { PairingService } from './pairing.ts';
/**
 * Loopback classification for the desktop client. The predicates now live in
 * the shared synced copy (shared/host/loopback.ts, mirrored to ./loopback.ts
 * by scripts/sync-shared.mjs): localhost, IPv6 loopback, and any IPv4 address
 * in 127/8.
 * @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
 * @returns true for localhost, IPv6 loopback, or any IPv4 address in 127/8.
 */
/**
 * Read one cookie value from a Cookie header.
 * @param header - the raw Cookie header value (or undefined).
 * @param name - the cookie name.
 * @returns the value, or undefined when absent.
 */
export declare function readCookie(header: string | undefined, name: string): string | undefined;
/**
 * The effective Host hostname of a request.
 * @param request - node HTTP request.
 * @returns the normalized hostname, or undefined when unparsable.
 */
export declare function hostnameOf(request: IncomingMessage): string | undefined;
/** Whether a request comes from the desktop loopback client (loopback socket AND loopback Host). */
export declare function isLoopbackClient(request: IncomingMessage): boolean;
/**
 * Build the api/gate listener for one pairing service.
 * @param service - the pairing service.
 * @param requirePairingForLan - when false, non-loopback requests pass
 * without a device cookie (the feature then only manages tokens/status;
 * revocation of paired devices still holds). A function is re-read per
 * request, so a settings edit takes effect without a restart. Defaults to true.
 * @param enabled - when false, every non-loopback request is vetoed while
 * loopback stays available. A function is re-read per request so the fence
 * stays mounted for the plugin lifetime and disabling the plugin cannot open
 * a LAN-exposed /api. Defaults to true.
 * @returns the cordis waterfall listener: call `next()` to delegate,
 * return false (without calling it) to veto with 403.
 */
export declare function makeGateListener(service: PairingService, requirePairingForLan?: boolean | (() => boolean), enabled?: boolean | (() => boolean)): (request: IncomingMessage, method: string | undefined, next: () => boolean | Promise<boolean>) => boolean | Promise<boolean>;
/**
 * Whether a request carries a live, non-revoked paired-device cookie for
 * this service. Sibling host routes outside /api (the right-panel
 * /sidebar/* routes, etc.) use the same check via the remoteWebUiPairing service.
 * @param service - the pairing service that owns the device table.
 * @param request - the incoming HTTP request.
 * @returns true when the cookie names a live session (and lastSeenAt was refreshed).
 */
export declare function isPairedDeviceRequest(service: PairingService, request: IncomingMessage): boolean;
//# sourceMappingURL=gate.d.ts.map