/**
 * Anonymous install telemetry shared by the DSH Web UI family plugins.
 *
 * Once per UTC day per browser, each wired plugin sends one heartbeat to
 * the dsh-market edge API listing its package name (and version when known).
 * The payload carries no conversation data and no identifiers beyond a random
 * UUID generated in localStorage; the server hashes it with a deployment salt
 * before storage and never persists IP addresses. Sends are fire-and-forget:
 * failures stay silent and simply retry on a later mount or day. The system
 * is documented in docs/telemetry.md.
 */
export type TelemetryChannel = 'market' | 'npm' | 'unknown';
export interface TelemetryItem {
    /** npm package name or asset id, e.g. "@linxin666/dsh-pet" or "skin:harbor". */
    name: string;
    /** Installed version when known; omitted otherwise. */
    version?: string;
    /** Install channel when determinable (market = Workshop install). */
    channel?: TelemetryChannel;
}
/**
 * Fire the daily heartbeat for the given items at most once per UTC day per
 * browser. Never throws and never blocks the caller. Items without an explicit
 * version inherit the bundle's baked build version.
 */
export declare function reportDailyHeartbeat(items: readonly TelemetryItem[]): void;
//# sourceMappingURL=telemetry.d.ts.map