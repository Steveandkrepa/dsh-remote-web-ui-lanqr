/**
 * The /api/pair route family + the desktop status stream. Exact routes
 * under /api: the webserver matches exact paths before the connection
 * plugin's /api prefix, so these handlers own the full response lifecycle
 * and apply their own trust fence (loopback-only for control endpoints;
 * loopback-or-LAN for the phone-facing accept/heartbeat/status). The cookie
 * set on accept is the device identity the plugin's own surfaces enforce:
 * the /remote channel gate and the api/gate listener. Alongside the JSON
 * family sit the phone-facing top-level pages (exact routes /pair-accept,
 * /pair-app, /pair-app.sw.js) with their own LAN-or-public fence. Note that
 * on the 0.1.2-alpha.2 cohort nothing emits api/gate — direct /api is
 * governed by the harness fence + browser auth — while the /remote channel
 * always enforces the pairing cookie itself.
 *
 * The app landing is reached with a one-time grant, never with the device id
 * itself: /pair-accept mints a short-lived, single-consume grant
 * (pair-grant.ts) and redirects to /pair-app?grant=<g>, and only the landing's
 * own response carries the device credential into the shell. The device cookie
 * stays the primary credential; the grant only keeps a live session credential
 * out of the URL, the address bar, and every log on the redirect path.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import { z } from 'zod';
import { type PairingService, type PairingSnapshot } from './pairing.ts';
import { type PairGrantStore } from './pair-grant.ts';
/**
 * Browser-trust fence for the /api/pair routes, mirroring the connection
 * package's internal fence semantics (Host/Origin based, DNS-rebinding and
 * cross-site defense). The connection package no longer exports its trust
 * predicate — the fence for the /api prefix lives inside the connection
 * plugin — so the pairing routes, which must stay reachable from LAN phones
 * ahead of the connection prefix route (exact routes match first), carry
 * their own copy scoped to the literals the QR links advertise.
 * @param request - the node HTTP request.
 * @param trustedHosts - non-loopback authorities this surface serves: exact
 * `host:port`, or port-less `host` matching any port.
 * @returns true when the Host is ours (loopback or trusted) and any attached
 * browser markers are same-origin.
 */
export declare function isTrustedApiRequest(request: IncomingMessage, trustedHosts: readonly string[]): boolean;
/**
 * Whether the request's Host is an authority this surface serves: loopback, or
 * a trusted entry (exact `host:port`, or port-less `host` matching any port).
 * The browser-marker checks stay in {@link isTrustedApiRequest}: a pairing
 * entry page is a navigation, and its authority is the token or device
 * credential it carries, not who linked to it.
 * @param request - the node HTTP request.
 * @param trustedHosts - non-loopback authorities this surface serves.
 * @returns true when the Host is ours.
 */
export declare function isTrustedHost(request: IncomingMessage, trustedHosts: readonly string[]): boolean;
/**
 * Whether the request is a top-level document navigation — the shape every
 * phone uses to open a pairing link. Browsers label it `Sec-Fetch-Mode:
 * navigate` with `Sec-Fetch-Dest: document`; in-app browsers (WeChat, and
 * anything else wrapping a WKWebView) additionally attach `Sec-Fetch-Site:
 * cross-site` or an opaque `Origin: null`, which the API fence must keep
 * refusing but which says nothing about a document navigation: the pairing
 * token or the device id in the URL is what authorizes it.
 * @param request - the node HTTP request.
 * @returns true for a top-level document navigation.
 */
export declare function isTopLevelDocumentNavigation(request: IncomingMessage): boolean;
/**
 * Test whether a hostname represents a private local-area network (RFC 1918 / ULA / mDNS / loopback).
 * Supports pairing in container-bridged (Docker) or NAT-proxied topologies where the host
 * machine's LAN IP or proxy domain differs from the container's internal sampled network interface.
 */
export declare function isPrivateOrLocalHostname(hostname: string): boolean;
/**
 * Validates that an incoming request is non-cross-site (rejects cross-site fetch metadata
 * and ensures Origin matches Host when present).
 */
export declare function isNonCrossSite(request: IncomingMessage): boolean;
/**
 * The rate-limit bucket key for one accept attempt (pure; unit-tested).
 * A forwarded hop separates buckets behind the auto-tunnel (every internet
 * client arrives from 127.0.0.1 there) — but only for loopback peers, since a
 * direct LAN client can rotate the header freely. The caller passes the hop it
 * trusts (the edge-appended LAST one; see rateLimitAccept), and the hop is
 * truncated so one oversized header cannot mint a huge key.
 * @param socketIp - the socket peer address.
 * @param forwarded - the trusted XFF hop, already trimmed, if any.
 * @param bucket - page (GET /pair-accept) vs api (POST /api/pair/accept).
 */
export declare function acceptLimitKey(socketIp: string, forwarded: string | undefined, bucket: 'page' | 'api'): string;
/**
 * Hard cap on live accept buckets. The key is caller-influenced (a forwarded
 * hop), so a rotating flood must not grow the table without bound: past the
 * cap the oldest bucket is evicted, the same FIFO stance as
 * {@link addBounded}. A legitimate client that loses its bucket merely starts
 * a fresh window.
 */
export declare const MAX_ACCEPT_BUCKETS = 1024;
/**
 * Cap on the dynamically trusted hosts (see {@link addBounded}): room for
 * every legitimate router/proxy aliasing shape, small enough that a flood of
 * distinct private Host headers cannot grow the table unboundedly.
 */
export declare const MAX_DYNAMIC_TRUSTED_HOSTS = 64;
/**
 * FIFO-bounded Set insert: past `max` entries the oldest one is evicted
 * (a Set iterates in insertion order). The dynamic trusted-host table is fed
 * by caller-controlled Host headers, so it must stay bounded; an evicted
 * legitimate host re-adds itself on that device's next gated request.
 */
export declare function addBounded(set: Set<string>, value: string, max: number): void;
/**
 * The host authority of a configured public base URL, e.g. `foo.trycloudflare.com`
 * from `https://foo.trycloudflare.com`. Undefined when the URL does not parse —
 * a malformed config then simply contributes no fence entry (and the panel
 * falls back to LAN-only URLs).
 * @param url - the configured public base URL (or undefined).
 * @returns the `host[:port]` authority the fence should trust.
 */
export declare function publicHostOf(url: string | undefined): string | undefined;
/**
 * The cookieless device credential: pass the device id from the /pair-app
 * URL into sessionStorage (and localStorage for tab reloads) before any app
 * script runs - same key the boot patch and the channel gate read. The
 * replaceState to '/' hides the credential URL from the address bar and
 * leaves the SPA at its canonical root path. The reopen service worker is
 * registered in the same breath: later navigations to '/' (history,
 * bookmark, tab restore) must not fall through to the harness index gate,
 * which the cookieless flow can never satisfy.
 */
export declare const APP_DEVICE_STORAGE_KEY = "dsh-remote-device";
export declare function appShellCaptureScript(deviceId: string): string;
/**
 * Patch the official index document with the device-capture script. The script
 * goes immediately after the opening <head> tag, ahead of the harness-injected
 * parse-time channel boot patch: that patch installs the transport host-mode
 * hook only when this server-served marker is already set (see
 * remote-channel-boot.ts), so host mode is granted by the device-gated landing
 * instead of being asserted from the origin.
 */
export declare function patchAppShell(html: string, deviceId: string): string;
/**
 * The reopen service worker served at PAIR_PATHS.appServiceWorker. A paired
 * phone comes back to `/` from history, bookmarks, or tab restore; the
 * harness fallback seat answers that navigation with its browser-auth 401,
 * and the cookieless mobile flow never holds a browser-auth cookie. The
 * worker owns navigations to `/` instead: network-first through /pair-app
 * (which validates the device cookie and refreshes its presence), the
 * cached shell for offline opens, and a pass-through of the original
 * request when the plugin no longer answers. Plain-HTTP LAN origins are not
 * secure contexts, so the worker never registers there — the LAN reopen
 * path stays "scan a fresh QR", which is cheap in-network.
 *
 * Kept as a plain string (same pattern as the capture script): it must load
 * with no build step, run on every JS engine that ships service workers,
 * and be assertable as source in tests. Bump SHELL_CACHE when the storage
 * layout changes so old caches are pruned on activate.
 */
export declare function appServiceWorkerScript(): string;
/** Route paths (exact matches under /api). */
export declare const PAIR_PATHS: {
    readonly issue: "/api/pair/issue";
    readonly accept: "/api/pair/accept";
    readonly stop: "/api/pair/stop";
    readonly revoke: "/api/pair/revoke";
    readonly heartbeat: "/api/pair/heartbeat";
    readonly status: "/api/pair/status";
    readonly events: "/api/pair/events";
    readonly lanBind: "/api/pair/lan-bind";
    /** Top-level accept-and-redirect entry the QR link points at. */
    readonly acceptPage: "/pair-accept";
    /** The cookieless app landing: serves the official shell for a paired device. */
    readonly appPage: "/pair-app";
    /**
     * The reopen service worker (registered by the capture script). Root-level
     * path so its default script-directory scope already covers `/`.
     */
    readonly appServiceWorker: "/pair-app.sw.js";
};
/**
 * /api/pair request payload contracts. Each POST endpoint validates its body
 * against one of these instead of reaching into a hand-parsed object: the
 * control-plane endpoints that carry no meaningful payload use the permissive
 * pairActionPayloadSchema so their smoke calls keep working unchanged, while
 * issue/accept enforce their optional/required fields. Unknown (extra) keys
 * are tolerated exactly as the previous manual reads ignored them.
 */
export declare const issuePayloadSchema: z.ZodObject<{
    address: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const acceptPayloadSchema: z.ZodObject<{
    token: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const revokePayloadSchema: z.ZodObject<{
    deviceId: z.ZodString;
}, z.core.$strip>;
export declare const pairActionPayloadSchema: z.ZodObject<{}, z.core.$loose>;
/** The SSE fan-out for desktop panel status. */
export declare class PairingEventsStream {
    private readonly streams;
    /**
     * @param service - the pairing service whose snapshots are fanned out.
     */
    constructor(service: PairingService);
    /** Open one stream; the response is owned to completion. */
    open(req: IncomingMessage, res: ServerResponse): void;
    /** Push one frame to every open stream (contained per stream). */
    push(snapshot: PairingSnapshot): void;
    /** Stream count (tests/diagnostics). */
    get size(): number;
}
/** Route-family dependencies (test seam). */
export interface PairRoutesDeps {
    /** The pairing service. */
    service: PairingService;
    /** Current desktop gate policy, re-read for every status response. */
    requirePairingForLan?: boolean | (() => boolean);
    /**
     * LAN-bind facts for the settings card (managed patch block state, live
     * bind host/port, firewall summary). Re-read per request so a hot-reloaded
     * rebind and a fresh toggle round are both reflected without a restart.
     * The route is loopback-only; undefined drops it (tests).
     */
    lanBindStatus?: () => Record<string, unknown>;
    /**
     * The official index document to serve on the /pair-app landing. The
     * plugin fetches it from the inner loopback with its own credential and
     * patches it with the device-capture script, so a paired device loads
     * the app shell WITHOUT passing the harness index gate - the mobile flow
     * then needs no browser cookie at all (the channel gate accepts the
     * cookieless header/query credential). Undefined drops the route (tests).
     */
    indexDocument?: (deviceId: string) => Promise<string | undefined>;
    /** Extra trusted non-loopback hosts (from config or environment). */
    trustedHosts?: readonly string[] | (() => readonly string[]);
    /**
     * The one-time grant table behind the /pair-accept → /pair-app redirect.
     * Defaults to a fresh store; tests inject one with a fixed clock/entropy.
     */
    grants?: PairGrantStore;
}
/**
 * Build the /api/pair route family.
 * @param deps - service + fence inputs.
 * @returns the exact routes to register on webServer.
 */
export declare function makeRoutes(deps: PairRoutesDeps): WebRoute[];
/**
 * Whether the request reached this process over TLS. The harness itself serves
 * plain HTTP; a tunnel edge terminates TLS and stamps `x-forwarded-proto`
 * (the same signal {@link appOrigin} trusts when it rebuilds a redirect).
 */
export declare function isHttpsRequest(req: IncomingMessage): boolean;
/**
 * The device cookie for one request. `Secure` is added only when the request
 * arrived over TLS: LAN pairing runs on plain HTTP, where a Secure cookie is
 * simply dropped by the browser and the phone would silently lose its session.
 */
export declare function deviceCookie(req: IncomingMessage, cookieName: string, deviceId: string): string;
//# sourceMappingURL=routes.d.ts.map