/**
 * Auto-tunnel manager: spawns a Cloudflare tunnel through the `cloudflared`
 * npm package — its postinstall downloads the platform binary and the
 * readiness policy below validates it and re-fetches when it cannot run (the
 * desktop payload stages one tree for every shipped OS/arch), so no
 * user-side tooling is involved — surfaces the public URL, and restarts the
 * process after unexpected exits with exponential backoff. Two modes: the
 * accountless quick tunnel (`https://xxx.trycloudflare.com`, hostname minted
 * per start) and an account named tunnel (`cloudflared tunnel run --token`,
 * fixed public hostname — the mode that lets a paired phone keep its
 * bookmark and pairing cookie across restarts).
 *
 * The cloudflared package's Tunnel is a thin spawn wrapper; this manager
 * owns the lifecycle policy (binary readiness, URL timeout, restart
 * backoff, and the public-URL readiness watchdog) around it. All seams — the
 * tunnel factory, binary readiness, the URL probe, timers — are injectable
 * so the whole lifecycle is unit-testable without a real binary or network.
 *
 * 'running' is not a terminal state: the connector can lose its edge
 * registration while the process keeps living, which leaves a hostname that
 * no longer resolves. The watchdog below probes the public URL of a running
 * tunnel and reuses the crash-restart path when it stops answering, so the
 * relay is re-registered against a freshly minted URL instead of proxying a
 * dead one (issue #1723).
 */
/** The observable tunnel lifecycle the settings/panel surfaces render. */
export type TunnelPhase = 'stopped' | 'starting' | 'running' | 'failed';
/**
 * What the manager should run. `quick` is the accountless trycloudflare
 * tunnel whose hostname is minted per start (and dies with the process);
 * `named` is an account tunnel whose public hostname is fixed — the point
 * of the named mode is that a paired phone keeps its bookmark and its
 * pairing cookie across restarts.
 */
export type TunnelTarget = {
    kind: 'quick';
    targetUrl: string;
    originHostHeader?: string;
} | {
    kind: 'named';
    token: string;
    publicUrl: string;
};
/** The event face the named adapter wraps (a cloudflared package Tunnel). */
interface NamedTunnelProcess {
    on(event: 'connected', listener: () => void): unknown;
    on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
    on(event: 'error', listener: (value: Error) => void): unknown;
    off(event: string, listener: (...args: any[]) => void): unknown;
    stop(): boolean;
}
/**
 * Wrap a named-tunnel process so it fits the quick-tunnel handle shape: the
 * fixed public URL is reported through the same `url` event once the first
 * edge connection registers (cloudflared fires `connected` per connection,
 * so only the first is taken), and exit/error pass through. The manager's
 * URL timeout, crash-restart backoff, and stop semantics then stay fully
 * mode-agnostic.
 * @param inner - the running named-tunnel process.
 * @param publicUrl - the fixed public hostname ingress maps to this server.
 * @returns a handle emitting `url` once the tunnel is reachable.
 */
export declare function namedTunnelHandle(inner: NamedTunnelProcess, publicUrl: string): TunnelHandle;
/** One tunnel status frame. */
export interface TunnelInfo {
    phase: TunnelPhase;
    /** The minted public URL, once the tunnel reports it. */
    url?: string;
    /** Human-readable failure detail (binary install, URL timeout, spawn error). */
    error?: string;
}
/** The tunnel handle subset this manager uses (the package's Tunnel fits). */
export interface TunnelHandle {
    on(event: string, listener: (...args: any[]) => void): unknown;
    off(event: string, listener: (...args: any[]) => void): unknown;
    stop(): boolean;
}
/**
 * Probe one public tunnel URL from the host. Resolves true when the URL is
 * served (any HTTP answer below 500 — a harness without credentials answers
 * 401/403, which is a healthy round trip), false for a DNS failure, a refused
 * connection, a timeout, or a Cloudflare 5xx (530 "Origin DNS error" / 1033)
 * — the shapes a tunnel that lost its edge registration produces.
 *
 * The probe must never reject: the watchdog reads a rejection as a dead
 * tunnel and restarts on it, so a local programming error would otherwise
 * recycle working tunnels forever.
 * @param url - the tunnel's public URL.
 * @param timeoutMs - how long one probe may take.
 * @returns whether the URL answered as a live origin.
 */
export declare function probeTunnelUrl(url: string, timeoutMs: number): Promise<boolean>;
/** Injectable seams (defaults are the real cloudflared package + node timers). */
export interface TunnelManagerOptions {
    /** Spawn one tunnel process for the target (quick or named). */
    factory?: (target: TunnelTarget) => TunnelHandle;
    /** Make sure the cloudflared binary exists, downloading it when absent. */
    ensureBinary?: () => Promise<void>;
    /** Wait up to this long for the tunnel URL before failing the attempt. */
    urlTimeoutMs?: number;
    /** First restart delay after an unexpected failure (exponential base). */
    restartBaseMs?: number;
    /** Cap on the exponential restart delay. */
    restartMaxMs?: number;
    /** Timer source (injected in tests). */
    timer?: {
        setTimeout(fn: () => void, ms: number): unknown;
        clearTimeout(t: unknown): void;
    };
    /** Probe one public URL; false means the tunnel stopped answering. */
    probe?: (url: string, timeoutMs: number) => Promise<boolean>;
    /** How often to probe the public URL of a running tunnel (0 disables it). */
    healthCheckIntervalMs?: number;
    /** Consecutive probe failures after which the tunnel is restarted. */
    healthCheckFailures?: number;
    /** How long one probe may take. */
    probeTimeoutMs?: number;
}
/**
 * Probe whether the binary at `path` actually executes on this machine. The
 * desktop payload stages one dependency tree for every shipped OS/arch, so a
 * binary can exist with the wrong architecture (the arm64 darwin
 * `bin/cloudflared` on an x64 mac); existence alone must not skip the
 * reinstall.
 */
export declare function binaryRuns(executable: string): Promise<boolean>;
/** Injectable seams of the default binary readiness (tests swap them all). */
export interface BinaryReadinessSeams {
    exists?: (path: string) => boolean;
    runs?: (executable: string) => Promise<boolean>;
    install?: (path: string) => Promise<unknown>;
}
/**
 * Build the default readiness policy over a binary path: skip when the
 * binary has already proven runnable in this process, validate an existing
 * file before trusting it (a stale or wrong-arch binary must not disable
 * the reinstall), and re-fetch the current platform binary otherwise.
 */
export declare function createBinaryReadiness(executable: string, seams?: BinaryReadinessSeams): () => Promise<void>;
/** How many archive downloads one process may attempt before giving up. */
export declare const MAX_BINARY_INSTALL_ATTEMPTS = 3;
/** How often a running tunnel's public URL is probed (issue #1723). */
export declare const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 60000;
/** Consecutive failed probes before the tunnel is declared dead. */
export declare const DEFAULT_HEALTH_CHECK_FAILURES = 2;
/** How long one public-URL probe may take. */
export declare const DEFAULT_PROBE_TIMEOUT_MS = 10000;
/**
 * Spawn flags for one quick target. `originHostHeader` stamps the Host the
 * local webserver sees: the plugin's phone-facing fence trusts the configured
 * public host (the stable relay origin, Host-bound) and the harness
 * browser-auth binds cookies to the Host authority, while the Workers relay
 * cannot control the origin-side Host at all (fetch forces it to the URL
 * authority) — so the connector must restamp it with the stable origin.
 */
export declare function quickTunnelFlags(originHostHeader?: string): Record<string, string | boolean>;
/**
 * Command-line arguments for a named tunnel. The account token is deliberately
 * NOT part of the argv: `--token <t>` would expose an account credential to any
 * local user through ps/proc for the whole tunnel lifetime, while the flag's own
 * environment variable (TUNNEL_TOKEN, see cloudflared's tunnel run flags) is not
 * readable that way. Note: `--no-autoupdate` and `--protocol` are flags for the
 * `tunnel` command and must appear BEFORE the `run` subcommand. Putting them
 * after `run` causes cloudflared to exit immediately with "flag provided but not
 * defined: -no-autoupdate" (issues #1432, #1433).
 */
export declare function namedTunnelArgs(): string[];
/**
 * Run one spawn call with TUNNEL_TOKEN set, restoring the previous value
 * afterwards. The cloudflared package's Tunnel spawns with the inherited
 * environment inside its constructor, so the variable only has to exist for
 * that call; the child keeps its own copy of the environment.
 * @param token - the named-tunnel token.
 * @param spawnTunnel - the call that creates the child process.
 * @returns whatever the spawn call returns.
 */
export declare function withTunnelTokenEnv<T>(token: string, spawnTunnel: () => T): T;
/**
 * Own the lifecycle of one auto-tunnel: start/stop, URL surfacing, and
 * crash-restart backoff.
 */
export declare class TunnelManager {
    private readonly factory;
    private readonly ensureBinary;
    private readonly urlTimeoutMs;
    private readonly restartBaseMs;
    private readonly restartMaxMs;
    private readonly timer;
    private readonly probe;
    private readonly healthCheckIntervalMs;
    private readonly healthCheckFailures;
    private readonly probeTimeoutMs;
    private phase;
    private url;
    private error;
    private target;
    private handle;
    private urlTimer;
    private restartTimer;
    private healthTimer;
    private healthFailures;
    private attempts;
    private generation;
    private stopping;
    private readonly urlListeners;
    private readonly phaseListeners;
    /**
     * @param options - seams; defaults spawn the real quick tunnel.
     */
    constructor(options?: TunnelManagerOptions);
    /** The current status frame. */
    get info(): TunnelInfo;
    /**
     * Start (or keep) a tunnel toward `target`. Restarting with a different
     * target tears the old tunnel down first; restarting with the same target
     * while running is a no-op. A string is the quick mode's local target URL.
     *
     * In quick mode the URL surfaces when cloudflared mints the ephemeral
     * trycloudflare hostname; in named mode the fixed `publicUrl` surfaces
     * once the first edge connection registers (see {@link namedTunnelHandle}).
     * @param target - what to run (a string means quick toward that local URL).
     */
    start(target: TunnelTarget | string): void;
    /** Stop the tunnel for good: no restarts, no state. */
    stop(): void;
    /** Alias of {@link stop} for plugin-effect disposal. */
    dispose(): void;
    /** Subscribe to minted tunnel URLs (fire-and-forget duplicates dropped). */
    onUrl(listener: (url: string) => void): () => void;
    /** Subscribe to every phase change. */
    onPhase(listener: (info: TunnelInfo) => void): () => void;
    private attempt;
    private handleUrl;
    /**
     * Watch the readiness of a running tunnel. cloudflared can keep its process
     * (and its metrics port) alive while every edge connection is gone, leaving
     * a minted hostname that no longer resolves: the manager used to report
     * 'running' forever and the relay kept forwarding to that dead address, so
     * the phone hit Cloudflare 1016 instead of the relay's offline page
     * (issue #1723). A bounded number of consecutive probe failures ends the
     * attempt through the ordinary fail/backoff path, which mints a new URL and
     * re-announces the relay.
     */
    private startHealthWatch;
    /** One probe round of the running tunnel's public URL. */
    private healthCheck;
    /** Cancel the readiness watchdog (teardown, restart, stop). */
    private stopHealthWatch;
    private handleExit;
    private fail;
    /** Stop the current process and cancel every pending timer (no phase change). */
    private teardown;
    private setPhase;
}
export {};
//# sourceMappingURL=tunnel.d.ts.map