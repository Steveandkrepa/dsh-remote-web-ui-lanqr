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
import { readCookie } from "./gate.js";
import { writeJson } from "./http.js";
import { proxyLoopbackHttp, proxyLoopbackUpgrade } from "./loopback-proxy.js";
import { REMOTE_DEVICE_HEADER, REMOTE_DEVICE_QUERY, REMOTE_PREFIX, REMOTE_UPGRADE_PATHS, localOnlyDenial, } from "./remote-methods.js";
export { LOCAL_ONLY_PREFIXES, PLUGIN_MANAGER_PATH, REMOTE_API_PATHS, REMOTE_DEVICE_HEADER, REMOTE_DEVICE_QUERY, REMOTE_PREFIX, REMOTE_UPGRADE_PATHS, WEB_UI_SETTINGS_BRIDGE_PATH, localOnlyDenial, } from "./remote-methods.js";
export { REMOTE_API_PREFIX } from "./remote-methods.js";
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
/** Reject traversal and empty segments; allow plugin file-path characters. */
function isSafeSegment(segment) {
    if (segment === '')
        return false;
    let decoded;
    try {
        decoded = decodeURIComponent(segment);
    }
    catch {
        return false;
    }
    return decoded !== '.' && decoded !== '..' && !decoded.includes('/') && !decoded.includes('\\') && !decoded.includes('\0');
}
/** One SDK-shaped error envelope (keeps the desktop client's parse path intact). */
function envelopeError(res, status, rpcId, code, message) {
    writeJson(res, status, {
        type: 'server-response',
        rpcId,
        result: { ok: false, error: { code, message, details: { issues: [] } } },
    });
}
/**
 * Map `/remote/...` to the inner path, or undefined when the outer path is
 * not a safe rewrite target.
 */
export function innerPathOf(pathname) {
    if (pathname === REMOTE_PREFIX || pathname === `${REMOTE_PREFIX}/`)
        return undefined;
    if (!pathname.startsWith(`${REMOTE_PREFIX}/`))
        return undefined;
    const rest = pathname.slice(REMOTE_PREFIX.length);
    if (!rest.startsWith('/'))
        return undefined;
    const segments = rest.slice(1).split('/');
    if (segments.length === 0 || segments.some(segment => !isSafeSegment(segment))) {
        return undefined;
    }
    return rest;
}
/**
 * Whether a paired inner path must stay physically local (delegates to the
 * shared LOCAL_ONLY_PREFIXES table).
 * @returns a denial message, or undefined when the path may be proxied.
 */
export function loopbackOnlyDenial(innerPath) {
    return localOnlyDenial(innerPath);
}
/**
 * Resolve a live device credential for a gated HTTP request: the pairing
 * cookie first, then the cookieless header the boot patch attaches. Unknown
 * or revoked ids are a no-op - a stale id never re-arms a device.
 * @returns the touched device id, or undefined when neither credential is live.
 */
export function pairedDeviceIdOf(req, service) {
    const cookieDevice = readCookie(req.headers.cookie, service.config.cookieName);
    const headerDevice = typeof req.headers[REMOTE_DEVICE_HEADER] === 'string'
        ? req.headers[REMOTE_DEVICE_HEADER]
        : undefined;
    const id = cookieDevice ?? headerDevice;
    if (id === undefined)
        return undefined;
    return service.touchDevice(id) ? id : undefined;
}
/**
 * Build the remote desktop channel HTTP routes.
 * @param deps - pairing service + local port + inner credential.
 * @returns the routes to register on webServer.
 */
export function makeRemoteApiRoutes(deps) {
    const { service, port } = deps;
    const handler = (req, res) => {
        // Paired credential first — before any bytes are buffered or forwarded.
        // Unconditional by design: this channel attaches the process's own
        // browser-auth cookie to every re-issued call, so admitting an unpaired
        // caller would hand out that credential's authority (issue #1665).
        const paired = pairedDeviceIdOf(req, service);
        if (paired === undefined) {
            req.resume();
            envelopeError(res, 403, 'invalid-request', 'unpaired', 'this device is not paired with the desktop');
            return;
        }
        const method = req.method ?? 'GET';
        if (!ALLOWED_METHODS.has(method)) {
            req.resume();
            res.writeHead(405).end();
            return;
        }
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const inner = innerPathOf(url.pathname);
        if (inner === undefined) {
            req.resume();
            res.writeHead(404).end();
            return;
        }
        const denied = loopbackOnlyDenial(inner);
        if (denied !== undefined) {
            req.resume();
            envelopeError(res, 403, 'invalid-request', 'forbidden', denied);
            return;
        }
        proxyLoopbackHttp(req, res, port, `${inner}${url.search}`, deps.auth);
    };
    return [{ kind: 'prefix', path: REMOTE_PREFIX, handler }];
}
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
export function upgradeInnerPath(reqUrl, fallbackPath) {
    if (reqUrl === undefined || reqUrl === '')
        return fallbackPath;
    let url;
    try {
        url = new URL(reqUrl, 'http://127.0.0.1');
    }
    catch {
        return fallbackPath;
    }
    const inner = innerPathOf(url.pathname);
    if (inner === undefined)
        return fallbackPath;
    url.searchParams.delete(REMOTE_DEVICE_QUERY);
    return `${inner}${url.search}`;
}
/**
 * Build the WebSocket upgrade routes for the event streams and known plugin
 * sockets. webServer matches upgrades by exact path.
 * @param deps - pairing service + local port + live pairing policy.
 * @returns the upgrade routes to register on webServer.
 */
export function makeRemoteApiUpgradeRoutes(deps) {
    const { service, port } = deps;
    const handlerFor = (fallbackPath) => (req, socket, head) => {
        // WebSocket handshakes cannot carry headers from the Web API, so the
        // cookieless credential rides the query; the cookie stays the primary.
        // The gate is unconditional here too (issue #1665).
        let queryDevice;
        try {
            queryDevice = new URL(req.url ?? '/', 'http://127.0.0.1').searchParams.get(REMOTE_DEVICE_QUERY) ?? undefined;
        }
        catch { /* fall through to the cookie */ }
        const deviceId = pairedDeviceIdOf(req, service);
        const paired = deviceId ?? (queryDevice !== undefined && service.touchDevice(queryDevice) ? queryDevice : undefined);
        if (paired === undefined) {
            socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
        }
        const inner = upgradeInnerPath(req.url, fallbackPath);
        const denied = loopbackOnlyDenial(inner.split('?')[0] ?? inner);
        if (denied !== undefined) {
            socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
        }
        // The inner handshake needs the browser-auth credential (the gateway
        // event-stream route enforces it); resolving it is async, so the
        // handshake bytes are written once it settles. A missing credential
        // proceeds as before — the gateway route then refuses.
        void Promise.resolve(deps.auth?.ready())
            .catch(() => undefined)
            .then((cookie) => {
            if (socket.destroyed)
                return;
            proxyLoopbackUpgrade(req, socket, head, port, inner, typeof cookie === 'string' ? cookie : undefined);
        });
    };
    return REMOTE_UPGRADE_PATHS.map((path) => ({
        path,
        handler: handlerFor(path.slice(REMOTE_PREFIX.length)),
    }));
}
