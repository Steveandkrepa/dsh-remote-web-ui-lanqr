/**
 * Relay registry client: a stable `https://<id>.dsh-market.com` origin in
 * front of the plugin-managed quick tunnel, so a paired phone keeps one
 * bookmark and one cookie context across `dsh web` restarts.
 *
 * The plugin mints an id + secret on first run and persists them per profile
 * under `$DSH_HOME/remote-web-ui-registry/`; every tunnel (re)start
 * re-registers the current quick URL with the market worker. Registration is
 * best-effort: a registry outage never blocks the tunnel — the QR just falls
 * back to the raw quick URL for that session (the pre-relay behavior).
 */
/** The market worker's registration endpoints (dsh-market.com edge API). */
export declare const RELAY_REGISTER_URL = "https://dsh-market.com/api/relay/register";
export declare const RELAY_UNREGISTER_URL = "https://dsh-market.com/api/relay/unregister";
/**
 * The public origin template: one stable single-label subdomain per
 * registration id. Single label on purpose — Universal SSL covers exactly
 * one subdomain level, so a two-level hostname would get no certificate.
 */
export declare const RELAY_BASE_SUFFIX = ".dsh-market.com";
export declare const RELAY_ID_RE: RegExp;
export declare const RELAY_SECRET_RE: RegExp;
/** Persisted per-profile relay identity. */
export interface RelayIdentity {
    id: string;
    secret: string;
    /**
     * True only for an identity minted in this process that has never been
     * accepted by the registry: the first register carries `new_secret` so
     * the endpoint may create the row; refreshes authenticate with `secret`
     * alone and must not re-claim an id that already exists.
     */
    fresh?: boolean;
}
/** The observable relay lifecycle the settings card renders. */
export type RelayState = {
    state: 'off';
} | {
    state: 'registering';
} | {
    state: 'running';
    url: string;
} | {
    state: 'failed';
    error: string;
};
/** Registry storage layout: one file per profile under the relay directory. */
export declare function relayIdentityFile(profile: string, home?: string): string;
/** Generate one identity pair (id: 8-byte hex slug; secret: 32-byte base64url). */
export declare function generateRelayIdentity(random?: (size: number) => Buffer): RelayIdentity;
/**
 * Load (or lazily mint) the per-profile relay identity. The file is written
 * owner-only on first mint; a corrupt file is reminted (the phone then
 * re-pairs once — the same cost as losing the devices file).
 */
export declare function loadRelayIdentity(profile: string, home?: string, random?: (size: number) => Buffer): RelayIdentity;
/** Best-effort removal of the mapping (used on disable; errors are swallowed). */
export declare function unregisterRelay(identity: RelayIdentity, endpoint?: string, fetchFn?: typeof fetch): Promise<void>;
/**
 * The stable relay base for one identity — the origin the QR and the phone
 * bookmark use while (or after) the registration is accepted.
 */
export declare function relayBaseOf(identity: RelayIdentity): string;
/**
 * Registration loop with capped exponential backoff. Re-registration happens
 * on every tunnel start (the quick URL can change after a crash-restart);
 * failures retry with backoff and surface the last error to the card.
 */
export declare class RelayRegistrar {
    private readonly identity;
    private readonly setState;
    private readonly options;
    private timer;
    private attempts;
    private lastError;
    private disposed;
    constructor(identity: RelayIdentity, setState: (state: RelayState) => void, options?: {
        fetchFn?: typeof fetch;
        registerUrl?: string;
        unregisterUrl?: string;
        baseDelayMs?: number;
        maxDelayMs?: number;
        timerFn?: (fn: () => void, ms: number) => NodeJS.Timeout;
    });
    /** The stable relay base for the QR while registered. */
    get baseUrl(): string;
    /** The last registration failure detail (undefined while healthy). */
    get error(): string | undefined;
    /** Push one tunnel target; resolves the stable base once accepted. */
    announce(target: string): Promise<string | undefined>;
    /** Best-effort removal of the registry row (the relay toggle turned off). */
    unregister(): Promise<void>;
    private scheduleRetry;
    /** Stop retrying and clear the card state (tunnel stopped or disabled). */
    dispose(): void;
}
//# sourceMappingURL=relay-registry.d.ts.map