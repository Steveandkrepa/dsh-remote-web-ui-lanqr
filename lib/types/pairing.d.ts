/**
 * Pairing state machine: one active one-time token, a device-session table,
 * and presence tracking. Pure TypeScript with injected clock/randomness so
 * the whole security semantics are unit-testable without cordis. The
 * cordis-facing surfaces (routes, the api/gate listener) live next door.
 *
 * Security invariants:
 * - One active token at a time; `issue()` replaces it, so a refreshed QR
 *   immediately invalidates the previous link.
 * - A token is a bearer credential for its whole window: it is refused only
 *   when unknown, expired, or after `stop()`, and the same link may pair
 *   repeatedly within that window (each accept mints a fresh device session).
 *   Mobile flows routinely split across cookie contexts (camera preview to
 *   in-app browser to the system browser), and the later context must be
 *   able to complete its own pairing from the same link.
 * - Tokens expire; `accept()` on an expired token is refused like an
 *   unknown one (no oracle for validity).
 * - `stop()` revokes every device session and clears the token, so paired
 *   devices are cut off on their next gated request.
 * - `revoke()` drops one device session; idle sessions older than
 *   `idleExpireMs` are deleted on sweep, load, and the next gated request.
 */
import type { PostureSnapshot } from './posture.ts';
/** The observable pairing phases the panel renders. */
export type PairingPhase = 
/** The server is not bound all-interfaces: no usable QR exists. */
'lan-required'
/** Remote control was stopped; a fresh QR (issue) re-enables it. */
 | 'stopped'
/** A token is live and no device has paired with it yet. */
 | 'waiting'
/** At least one paired device was active recently. */
 | 'connected'
/** Devices are paired but none has been active within the offline window. */
 | 'disconnected';
/** One issued pairing token (keyed by its secret). */
export interface TokenRecord {
    /** Monotonic issue time (ms epoch), drives refresh ordering. */
    issuedAt: number;
    /** Absolute expiry (ms epoch); accept() past this is refused. */
    expiresAt: number;
    /** Opaque, non-secret identifier surfaced in snapshots (never the pairing secret). */
    id: string;
    /** Workspace the QR link should land the phone in (optional). */
    workspaceId?: string;
    /** LAN IP literal the QR link was built from (optional; default first). */
    address?: string;
}
/**
 * Default idle-expiry window: 30 days without a heartbeat or a gated
 * request. The reopen service worker refreshes lastSeenAt on every
 * navigation it serves, so the window only runs out through genuine
 * disuse; 30 days matches the browser-credential lifetimes the surrounding
 * flow was built around, while the effective device lifetime stays shorter
 * than the 365-day cookie because of this sweep. Override per deployment
 * through the idleExpireMs config.
 */
export declare const DEFAULT_IDLE_EXPIRE_MS: number;
/** One paired device session, keyed by the device id stored in its cookie. */
export interface DeviceSession {
    /** Pairing time (ms epoch). */
    createdAt: number;
    /** Last time the device passed a gated request or heartbeat. */
    lastSeenAt: number;
    /** Sanitized User-Agent captured at accept (optional; missing on old files). */
    userAgent?: string;
}
/** One device row in a loopback snapshot (ids are session credentials). */
export interface DeviceSnapshot {
    /** Cookie value / session credential of this device. */
    id: string;
    /** Pairing time (ms epoch). */
    createdAt: number;
    /** Last heartbeat or gated request (ms epoch). */
    lastSeenAt: number;
    /** Whether lastSeenAt is within the offline window. */
    online: boolean;
    /** Sanitized User-Agent captured at accept, when known. */
    userAgent?: string;
}
/** One tunnel status frame (auto-tunnel only; undefined when disabled). */
export interface TunnelStatus {
    /** starting: binary/process warming up; running: URL minted; failed: no URL. */
    state: 'starting' | 'running' | 'failed';
    /** The minted public URL, once the tunnel reports it. */
    url?: string;
    /** Human-readable failure detail. */
    error?: string;
}
/**
 * One relay-registry status frame (undefined while the stable-origin relay
 * is not in play: autoTunnel off, or the relay toggle disabled).
 */
export interface RelayStatus {
    /** registering: a sync is in flight; running: the mapping is accepted. */
    state: 'off' | 'registering' | 'running' | 'failed';
    /** The stable relay origin (`https://<id>.dsh-market.com`). */
    url?: string;
    /** Human-readable failure detail of the last sync attempt. */
    error?: string;
}
/** One snapshot frame pushed to desktop status streams. */
export interface PairingSnapshot {
    phase: PairingPhase;
    /** Whether the server bind is all-interfaces (a QR is constructible). */
    lanAvailable: boolean;
    /** The LAN IP literals a QR can be built from (interface order). */
    lanAddresses: string[];
    /** Configured public (tunneled) base URL, when present. */
    publicUrl?: string;
    /** Auto-tunnel status, while the auto-tunnel feature is active. */
    tunnel?: TunnelStatus;
    /** Relay-registry status, while the stable-origin relay is in play. */
    relay?: RelayStatus;
    /** Latest /api posture probe (undefined until the first round completes). */
    posture?: PostureSnapshot;
    /** Opaque (non-secret) id of the active token (undefined when stopped/lan-required). */
    tokenId?: string;
    /** Absolute expiry of the active token. */
    tokenExpiresAt?: number;
    /** Count of ever-paired devices. */
    deviceCount: number;
    /** Count of devices active within the offline window. */
    onlineCount: number;
    /** Per-device roster for the loopback panel (never sent on /api/pair/status). */
    devices: DeviceSnapshot[];
}
/** Service tunables (config-validated upstream; plain numbers here). */
export interface PairingConfig {
    /** Token lifetime; the QR stops working after this. */
    tokenTtlMs: number;
    /** A device is "online" while its lastSeenAt is newer than this. */
    offlineAfterMs: number;
    /** Hard cap on paired device sessions (oldest-evicted when full). */
    maxDevices: number;
    /** Cookie name carrying the device id. */
    cookieName: string;
    /**
     * Idle sessions older than this are deleted (memory and disk). Defaults
     * to {@link DEFAULT_IDLE_EXPIRE_MS} when omitted.
     */
    idleExpireMs?: number;
    /**
     * Path to a JSON file where paired device sessions are persisted. When
     * set, sessions survive process restarts (the phone keeps its 365-day
     * cookie), so re-pairing after a dsh web restart is not required. When
     * unset, sessions stay memory-only.
     */
    devicesFile?: string;
}
/**
 * Result of one accept() attempt. A token is a bearer credential for its whole
 * window (see the module doc), so the only refusal is `invalid`: unknown,
 * expired, or after stop(). There is no "already used" outcome.
 */
export type AcceptResult = {
    ok: true;
    deviceId: string;
} | {
    ok: false;
    code: 'invalid';
};
/** Thrown by issue() for an address outside the sampled LAN literals. */
export declare class UnknownLanAddressError extends Error {
    /**
     * @param address - the offending literal.
     */
    constructor(address: string);
}
/** Clock and entropy injection for tests. */
export interface PairingClock {
    now(): number;
    randomToken(): string;
}
/** File-operation seam for the revocation-durability step (tests). */
export interface PairingFsSeams {
    /** Remove the stale device store (defaults to fs.rmSync with force). */
    removeFile?(path: string): void;
}
/** Real clock/entropy: 32 random hex chars per token. */
export declare const defaultClock: PairingClock;
/**
 * The pairing state machine. Structural mutations issue/accept/stop/revoke
 * and config updates (LAN bases, tunnel, posture) notify state listeners
 * after the commit point that makes them true, and notification dedupes
 * against the last emitted snapshot. Presence-only updates (touchDevice /
 * heartbeat) just mark the store dirty and broadcast on the next sweep,
 * which also surfaces time-driven transitions (a device aging offline)
 * without any mutation.
 */
export declare class PairingService {
    config: PairingConfig;
    private readonly clock;
    private readonly fs;
    private readonly tokens;
    private readonly devices;
    private readonly listeners;
    private lastEmitted;
    private stopped;
    private tokenSerial;
    /** LAN base URLs keyed by the advertised IP literal (interface order). */
    private lanBases;
    /** Public (tunneled) base URL, e.g. a Cloudflare Tunnel quick URL. */
    private publicBase;
    /** Auto-tunnel status, while the auto-tunnel feature is active. */
    private tunnelStatus;
    private relayStatus;
    private posture;
    /** True when lastSeenAt changed since the last persist (flushed on sweep). */
    private dirty;
    /**
     * @param config - tunables. The settings surface replaces the object (a
     * fresh literal) when a committed section changes; every operation reads
     * the current one.
     * @param clock - clock/entropy source (injectable for tests).
     */
    constructor(config: PairingConfig, clock?: PairingClock, fs?: PairingFsSeams);
    /**
     * Restore device sessions persisted by a previous process run. A corrupt
     * or missing file is tolerated (an empty device table, never a throw) —
     * persistence is an availability convenience, not a security boundary.
     *
     * Every still-valid session is restored, deliberately without applying
     * `maxDevices`: the constructor runs with whatever cap the configuration
     * layer has delivered so far (the schema default until the saved settings
     * row is applied), and trimming here would permanently drop authorizations
     * the user never revoked — the trimmed table reaches disk on the next
     * heartbeat/sweep write. The cap is enforced where a device is admitted
     * (see `accept`), against the configuration in force at that moment.
     */
    private loadPersisted;
    /** Drop sessions whose lastSeenAt is older than idleExpireMs. */
    private evictIdle;
    /**
     * Write the current device table to the configured file. Called on the
     * mutation boundaries that change the set of live sessions (accept, stop,
     * revoke, idle eviction) and, throttled, from sweep() so lastSeenAt
     * survives a restart without a write per request.
     *
     * Device ids are session credentials (the gate authorizes requests by the
     * cookie's device id), so the file is written 0600 via a temp file and
     * atomic rename; a crash mid-write can never leave a half-written store.
     */
    private persist;
    /**
     * Persist a table change that REVOKES access (stop, per-device revoke, idle
     * eviction). A failed write would leave the revoked session on disk, and
     * {@link loadPersisted} restores that file verbatim on the next start — the
     * device's still-valid cookie would authorize again after an explicit
     * revocation. When the write cannot be made durable, the stale store is
     * removed instead (a missing file already loads as an empty table), so the
     * failure costs a re-pair rather than silently undoing the revocation.
     */
    private persistRevocation;
    /** The default LAN base URL (the first interface; undefined when not LAN-reachable). */
    get lanBaseUrl(): string | undefined;
    /** The LAN base URL for one specific literal (undefined when not constructible). */
    lanBaseUrlFor(address: string): string | undefined;
    /** The LAN IP literals QR links can be built from (interface order). */
    get lanAddresses(): string[];
    /** Set the LAN base URLs once the server bind is known (interface order). */
    setLanBases(entries: readonly {
        address: string;
        base: string;
    }[]): void;
    /** The configured public (tunneled) base URL, when present. */
    get publicBaseUrl(): string | undefined;
    /**
     * Set or clear the public base URL (a tunnel in front of this server). The
     * value is canonicalized to its origin: a trailing slash (what a browser
     * address-bar copy produces) or a path would mint a dead `//pair-accept`
     * link, which WHATWG resolves as an authority rather than a path.
     */
    setPublicBaseUrl(url: string | undefined): void;
    /** Set or clear the auto-tunnel status frame (undefined when the feature is off). */
    setTunnelStatus(status: TunnelStatus | undefined): void;
    /** Set or clear the relay-registry status frame (undefined when not in play). */
    setRelayStatus(status: RelayStatus | undefined): void;
    /** Set the latest /api posture probe result (see posture.ts). */
    setPosture(snapshot: PostureSnapshot | undefined): void;
    /**
     * Issue a fresh token, replacing (invalidating) any previous one. A
     * stopped service re-arms through this call (the panel's refresh button).
     * @param workspaceId - optional workspace the QR link should land in.
     * @param address - optional LAN IP literal the QR must be built from; the
     * default is the public base (when configured) or the first interface.
     * Unknown addresses are refused.
     * @returns the token secret and its expiry.
     * @throws {Error} when no reachable base exists (no all-interfaces bind and
     * no public base) — callers surface this as the lan-required state instead
     * of minting an unusable QR.
     */
    issue(workspaceId?: string, address?: string): {
        token: string;
        expiresAt: number;
    };
    /**
     * Redeem a token and bind a device session. The token is a bearer
     * credential for its whole window, not a single-use nonce: it is refused
     * only when unknown, past its expiry, or after stop(), and every successful
     * call — including a repeat within the same window — mints a fresh device
     * session (see the module doc for the mobile cookie-context rationale).
     * @param token - the token secret from the QR link.
     * @param userAgent - optional User-Agent header captured at accept.
     * @returns the new device id, or a refusal code.
     */
    accept(token: string, userAgent?: string): AcceptResult;
    /**
     * Stop remote control: revoke every device session and clear the token.
     * The phone's next gated /api request 403s; the panel falls back to
     * stopped until a fresh QR is issued.
     */
    stop(): void;
    /**
     * Revoke one paired device. The next gated request from that cookie is
     * refused; other sessions stay live. Unknown ids are a no-op.
     * @param deviceId - the cookie value of the device to drop.
     * @returns true when a live session was removed.
     */
    revoke(deviceId: string): boolean;
    /**
     * The api/gate path: record activity for a device id and report whether
     * the request may proceed. Unknown or revoked ids (including any device
     * after stop() or idle expiry) are refused.
     *
     * Presence refreshes are throttled on purpose: every gated request (and
     * the mobile SSE keepalive) lands here, so a broadcast per call would fan
     * a full snapshot out to every status stream on the hot path. The refresh
     * only updates lastSeenAt and marks the store dirty; the snapshot reaches
     * listeners at the next sweep() (structural changes notify immediately).
     * @param deviceId - the cookie value of the requesting device.
     * @returns true when the device session is live and was refreshed.
     */
    touchDevice(deviceId: string): boolean;
    /** Explicit presence heartbeat (the phone's client sends these). */
    heartbeat(deviceId: string): boolean;
    /**
     * Periodic sweep: drop idle sessions, flush a dirty lastSeenAt, and
     * re-evaluate the derived snapshot (a device aging past the offline
     * window flips the phase to disconnected). Emits only when the snapshot
     * actually changed.
     */
    sweep(): void;
    /** The current snapshot (fresh object per call — stable between emits). */
    snapshot(): PairingSnapshot;
    /** Whether a cookie value names a currently live (non-idle) device session. */
    hasDevice(deviceId: string): boolean;
    /**
     * Number of device sessions in the table, including idle ones whose idle
     * window has not been swept yet. Restore keeps every persisted session
     * (see `loadPersisted`), so this can exceed the configured cap until the
     * next `accept` trims the excess.
     */
    deviceCount(): number;
    /** Subscribe to snapshot changes (each emit passes a fresh snapshot). */
    onState(listener: (snapshot: PairingSnapshot) => void): () => void;
    private activeToken;
    /**
     * Return a live session, deleting it first when idle-expired. Side-effecting
     * so a stale cookie cannot pass the gate between sweeps.
     */
    private liveSession;
    private toDeviceSnapshot;
    private derivePhase;
    private isOnlineAt;
    private notify;
}
/**
 * Canonical origin of a public base URL. An unparsable value is returned
 * verbatim so the caller's malformed-base warning stays the single owner of
 * that case.
 * @param url - the configured public base.
 */
export declare function canonicalBaseUrl(url: string): string;
/** Strip control characters and cap the User-Agent stored with a session. */
export declare function sanitizeUserAgent(raw: string | undefined): string | undefined;
//# sourceMappingURL=pairing.d.ts.map