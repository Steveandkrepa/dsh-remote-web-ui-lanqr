/**
 * Mobile remote control for the dsh web GUI — host half. Mounts the pairing
 * service (one-time tokens, device sessions, revocation), the /api/pair
 * route family (issue/accept/stop/heartbeat/status/events), the api/gate
 * listener that enforces pairing on every other /api request from
 * non-loopback hosts, and the presence sweep. The browser half (the
 * `./client` entry) renders the sidebar entry, the pairing panel, and the
 * phone-side pair/accept + deep-link flow.
 */
import type { IncomingMessage } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { type PairingConfig } from './pairing.ts';
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * Volatile config values were committed into the running fiber without a
         * remount; dispatched to the owning fiber only. Spelled here because the
         * Loader package is not a dependency of this plugin, with the Loader's own
         * shape so the two declarations merge when a Host program carries both.
         * @param paths - changed config paths as key arrays; every value is committed before dispatch.
         * @mode emit
         */
        'loader/volatile-update'(paths: readonly (readonly string[])[]): void;
        /**
         * Waterfall seam on the /api transport fence: the connection plugin
         * fires this per /api request before bridging to the API proxy on
         * deployments that carry the pairing/revocation seam; call `next()` to
         * delegate, return false (without calling it) to veto with 403.
         *
         * Cohort note (0.1.2-alpha.2): the official runtime ships NO emitter
         * for this event, so the listener below never fires there and direct
         * /api stays under the harness fence + browser auth. It is wired anyway
         * so cohort lines that do carry the seam get pairing enforcement on
         * direct /api without a plugin change.
         */
        'api/gate'(this: Context, request: IncomingMessage, method: string | undefined, next: () => boolean | Promise<boolean>): boolean | Promise<boolean>;
    }
}
/** Stable cordis plugin name. */
export declare const name = "remote-web-ui";
/** Services required before the pairing surfaces can mount. */
export declare const inject: string[];
/**
 * Settings namespace of the remote-control capability. Under the 0.1.7
 * settings model the namespace IS the Host profile entry id, so this is also
 * the id the browser half asks `ctx.configForms` for (the family binder
 * resolves the same value to the owning entry). Spelled here rather than
 * imported: the browser half spells the same value and must not depend on a
 * Host package.
 */
export declare const REMOTE_WEB_UI_SETTINGS_NAMESPACE: SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /** Token lifetime in ms; the QR link dies after this. */
    tokenTtlMs?: number;
    /** A device is "online" while its lastSeenAt is newer than this (ms). */
    offlineAfterMs?: number;
    /** Hard cap on paired device sessions (oldest evicted when full). */
    maxDevices?: number;
    /**
     * Idle sessions older than this (ms) are deleted from memory and disk.
     * Default is 30 days; a leftover cookie no longer authorizes after expiry.
     */
    idleExpireMs?: number;
    /** Cookie name carrying the paired device id. */
    cookieName?: string;
    /**
     * When true (default), a desktop Web GUI opened at a non-loopback origin
     * rides the gated `/remote/api` channel, whose requests must carry a live
     * paired-device cookie — the QR is the only way into remote desktop, and
     * stop()/revoke() cut the channel and the pairing cookie off immediately.
     * This policy selects the transport; it never loosens the channel, whose
     * gate is unconditional (issue #1665). Scope
     * note for this cohort: direct /api is governed by the harness fence +
     * browser-auth cookie (the api/gate seam has no emitter on 0.1.2-alpha.2),
     * so a harness browser credential a device has already redeemed is not
     * invalidated by stop() — see the README security model. Set false to keep
     * the desktop on plain `/api` (only useful when that origin is already
     * trusted for `/api`). Turning the policy off does NOT open the channel:
     * the /remote proxy attaches the process's own browser-auth credential only
     * when the request itself presents a live paired-device credential, so an
     * unpaired LAN/tunnel caller is forwarded without it and the inner route
     * answers 401.
     */
    requirePairingForLan?: boolean;
    /**
     * Public base URL of a tunnel in front of this server (e.g. a Cloudflare
     * Tunnel quick URL `https://xxx.trycloudflare.com` or a named-tunnel
     * subdomain). When set, the QR link is built from it — a phone anywhere
     * can pair — and its host is trusted by the phone-facing pairing fence.
     * Leave unset for LAN-only usage. Malformed values are ignored with a
     * warning (LAN-only behavior preserved). Ignored while `autoTunnel` is on.
     */
    publicBaseUrl?: string;
    /**
     * Extra trusted host authorities (exact host:port or port-less host) allowed
     * to access pairing endpoints and remote web services. Useful in Docker, reverse proxy,
     * or NAT environments where incoming request Host headers differ from the container's
     * internal network addresses. Can also be set via the DSH_REMOTE_TRUSTED_HOSTS env var.
     */
    trustedHosts?: string[];
    /**
     * Absolute path to a JSON file where paired device sessions are persisted.
     * Defaults to `$DSH_HOME/remote-web-ui-devices.json` so a paired device
     * keeps its session across `dsh web` restarts (the cookie already lives
     * 365 days). Override to another absolute path when needed.
     */
    devicesFile?: string;
    /**
     * When true, the plugin runs its own Cloudflare quick tunnel (the
     * cloudflared binary ships with the package — no user-side install) and
     * feeds the minted public URL into the QR base and the phone-facing
     * pairing fence dynamically, so phones anywhere can pair without any manual
     * tunnel setup. The minted hostname changes on every start, so a paired
     * phone must re-pair after each restart. The manual `publicBaseUrl` and
     * `tunnelToken` are ignored while this is on.
     */
    autoTunnel?: boolean;
    /**
     * Cloudflare named-tunnel token (`cloudflared tunnel run --token <t>`).
     * When set (and `autoTunnel` is off), the plugin runs the named tunnel
     * itself — same binary, same lifecycle management — toward the fixed
     * public hostname configured in the Cloudflare dashboard. Because that
     * hostname never changes, a paired phone keeps its bookmark and its
     * pairing cookie across `dsh web` restarts: pair once, never again.
     * Requires `publicBaseUrl` to name that same hostname (the token does not
     * carry it); without a valid `publicBaseUrl` the tunnel stays off and a
     * warning explains what is missing. Treated as a secret: the settings
     * surface stores it redacted.
     */
    tunnelToken?: string;
    /**
     * Stable-origin relay: when on (default), the quick tunnel is fronted by a
     * fixed `https://<id>.dsh-market.com` subdomain (the dsh-market worker's
     * registry), so the phone's bookmark and pairing cookie survive `dsh web`
     * restarts without any user setup. Traffic transits the dsh-market edge
     * (the same trust point as the quick tunnel itself); turn off to fall back
     * to the raw ephemeral quick URL. Named tunnels keep their dashboard
     * hostname and never touch the relay.
     */
    relay?: boolean;
    /**
     * LAN bind toggle. When the user flips it (true or false) the plugin
     * writes the managed webserver block into the profile patch — true pins
     * the bind default to 0.0.0.0 (an explicit --host flag still wins), false
     * pins it back to 127.0.0.1 — and maintains the matching host firewall
     * rule (Windows netsh; Linux firewalld/ufw/iptables; other platforms
     * report the firewall as unmanaged). The block takes effect when the
     * process next applies the profile — the live patch watcher recomposes on
     * some profile shapes, otherwise on the next start — and the settings
     * card reports the divergence (pendingRestart) instead of guessing.
     * While the toggle has never been set (undefined), the plugin does not
     * touch the patch file at all.
     */
    lanBind?: boolean;
    /**
     * The profile whose cordis.patch.yml the LAN bind toggle manages. Defaults
     * to the profile the Host booted (its `profileContext`), then to the
     * DSH_PROFILE environment variable, then "web" — the Desktop client boots
     * "desktop" without exporting DSH_PROFILE, so the environment alone names
     * the wrong profile there. Must be a single safe path segment (the runtime
     * and environment fallbacks bypass this schema, so the path builder asserts
     * containment independently).
     */
    profile?: string;
    /** Master switch for the plugin (browser half + host pairing surfaces). */
    enabled?: boolean;
}
/**
 * Plugin config schema. Under the 0.1.7 settings model this schema IS the
 * entry's settings page: the Host derives one form per profile entry from it
 * and serves that form only when at least one field is `volatile()`. The marker
 * is also what admits a write and what keeps the edit on the live path — the
 * Loader commits the new value into the field's reference and announces
 * `loader/volatile-update` on this fiber instead of remounting the row, so the
 * pairing service, its device sessions, the tunnel and the route registrations
 * survive a settings save (see {@link applyImpl}'s sync).
 *
 * The schema is left to inference rather than annotated with `z<Config>`: a
 * volatile field's parsed output is a live reference while its accepted input
 * stays the plain value, so the two sides no longer share one shape and the
 * annotation would reject the schema the Host must be given.
 *
 * The deployment-level fields (`trustedHosts`, `devicesFile`, `profile`) are
 * deliberately NOT volatile: they belong in the profile patch, so the form
 * leaves them to the operator instead of offering a card control that a
 * document write could not honor.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    tokenTtlMs: z<number, number, "volatile-defined">;
    offlineAfterMs: z<number, number, "volatile-defined">;
    maxDevices: z<number, number, "volatile-defined">;
    idleExpireMs: z<number, number, "volatile-defined">;
    cookieName: z<string, string, "volatile-defined">;
    requirePairingForLan: z<boolean, boolean, "volatile-defined">;
    publicBaseUrl: z<string, string, "volatile">;
    trustedHosts: z<string[], string[], "plain">;
    devicesFile: z<string, string, "plain">;
    autoTunnel: z<boolean, boolean, "volatile-defined">;
    tunnelToken: z<string, string, "volatile">;
    relay: z<boolean, boolean, "volatile-defined">;
    lanBind: z<boolean, boolean, "volatile">;
    profile: z<string, string, "plain">;
    enabled: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    tokenTtlMs: z<number, number, "volatile-defined">;
    offlineAfterMs: z<number, number, "volatile-defined">;
    maxDevices: z<number, number, "volatile-defined">;
    idleExpireMs: z<number, number, "volatile-defined">;
    cookieName: z<string, string, "volatile-defined">;
    requirePairingForLan: z<boolean, boolean, "volatile-defined">;
    publicBaseUrl: z<string, string, "volatile">;
    trustedHosts: z<string[], string[], "plain">;
    devicesFile: z<string, string, "plain">;
    autoTunnel: z<boolean, boolean, "volatile-defined">;
    tunnelToken: z<string, string, "volatile">;
    relay: z<boolean, boolean, "volatile-defined">;
    lanBind: z<boolean, boolean, "volatile">;
    profile: z<string, string, "plain">;
    enabled: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
/**
 * Fully resolved config: every field non-optional except `publicBaseUrl`,
 * which legitimately resolves to `undefined` when unset (the schema keeps it
 * optional, so `Required` alone would over-narrow it to `string`).
 */
type ResolvedConfig = Required<Omit<Config, 'publicBaseUrl' | 'trustedHosts' | 'devicesFile' | 'lanBind' | 'profile' | 'tunnelToken'>> & {
    publicBaseUrl: string | undefined;
    trustedHosts: string[] | undefined;
    devicesFile: string;
    /** undefined until the user flips the toggle once; undefined never writes the patch. */
    lanBind: boolean | undefined;
    tunnelToken: string | undefined;
    profile: string;
};
/**
 * The stable reference a `volatile()` config field resolves to; its owner
 * updates it in place when the user saves.
 */
interface ConfigRef<T> {
    /** @returns the value currently committed for the running instance. */
    get(): T;
}
/** One resolved config field: a live reference, or a plain value from a hand-built context. */
type ConfigField<T> = ConfigRef<T> | T;
/** The config the Host hands {@link applyImpl} — the runtime face of {@link Config}. */
export interface ResolvedConfigFields {
    tokenTtlMs?: ConfigField<number>;
    offlineAfterMs?: ConfigField<number>;
    maxDevices?: ConfigField<number>;
    idleExpireMs?: ConfigField<number>;
    cookieName?: ConfigField<string>;
    requirePairingForLan?: ConfigField<boolean>;
    publicBaseUrl?: ConfigField<string>;
    trustedHosts?: ConfigField<string[]>;
    devicesFile?: ConfigField<string>;
    autoTunnel?: ConfigField<boolean>;
    tunnelToken?: ConfigField<string>;
    relay?: ConfigField<boolean>;
    lanBind?: ConfigField<boolean>;
    profile?: ConfigField<string>;
    enabled?: ConfigField<boolean>;
}
/**
 * The single mapping from resolved plugin config to the pairing service
 * config. Both the constructed service and every later apply of this row
 * reuse it, so no field can be silently dropped.
 */
export declare function pairingConfigOf(resolved: Pick<ResolvedConfig, 'tokenTtlMs' | 'offlineAfterMs' | 'maxDevices' | 'idleExpireMs' | 'cookieName' | 'devicesFile'>): PairingConfig;
/** Default paired-session store: `$DSH_HOME/remote-web-ui-devices.json`. */
export declare function defaultDevicesFile(home?: string): string;
/**
 * Mount the pairing service, routes, gate listener, and presence sweep.
 * @param ctx - host plugin context carrying webServer.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare const apply: typeof applyImpl;
declare function applyImpl(ctx: Context, config?: ResolvedConfigFields): void;
export {};
//# sourceMappingURL=index.d.ts.map