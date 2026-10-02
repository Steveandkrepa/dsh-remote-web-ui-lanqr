/**
 * Host firewall management for the LAN bind toggle: while LAN access is on,
 * keep one inbound allow rule for the bound port; when it turns off, remove
 * the rule. Windows manages the Windows Defender Firewall rule via netsh;
 * Linux uses the first available manager among firewalld / ufw / iptables.
 * On every other platform (macOS included) the plugin reports the firewall
 * as unmanaged: the port usually needs no rule there, and managing pf or the
 * application firewall is out of scope for a distributable plugin.
 *
 * Ported from the dsh-LAN reference implementation (MIT), adapted to this
 * package's structure and test seams.
 */
/** Rule name shared by every backend so re-runs recreate the same rule. */
export declare const FIREWALL_RULE_NAME = "remote-web-ui (auto)";
/** One command execution result (test seam replaces the runner). */
export interface ToolResult {
    ok: boolean;
    out: string;
    err: string;
    /** true when the binary could not be spawned at all (ENOENT et al). */
    missing?: boolean;
}
/** The command runner seam: spawnSync in production, a stub in tests. */
export type CommandRunner = (cmd: string, args: readonly string[]) => ToolResult;
/** Production runner: spawn without a shell, capture text, 20s timeout. */
export declare const spawnRunner: CommandRunner;
/** A firewall backend manages one allow rule for a TCP port. */
export interface FirewallBackend {
    /** Short label surfaced in the settings card (netsh, firewalld, ...). */
    readonly label: string;
    ruleExists(port: number): boolean;
    addRule(port: number): boolean;
    removeRule(port: number): boolean;
}
/**
 * Detect the platform firewall manager. Returns undefined when the platform
 * has no supported manager (macOS, unknown Linux without tools): the port
 * then usually needs no rule and the UI reports "unmanaged".
 */
export declare function detectFirewallBackend(platform: NodeJS.Platform, run?: CommandRunner): FirewallBackend | undefined;
/** Cached detection for the running platform (per process). */
export declare function firewallBackend(): FirewallBackend | undefined;
/** Firewall state reported to the settings card. */
export interface FirewallSummary {
    /** true when the rule state matches the LAN toggle (or nothing to manage). */
    ok: boolean;
    /** false when no supported firewall manager exists on this platform. */
    managed: boolean;
    /** Backend label or an explanation for unmanaged platforms. */
    note?: string;
}
/**
 * Delete-and-add: recreating the rule is idempotent and locale-proof (netsh
 * output is localized, so parsing the live rule's port is fragile; the Linux
 * backends follow the same recreate pattern).
 */
export declare function ensureFirewallRule(port: number): boolean;
export declare function removeFirewallRule(port: number): boolean;
/**
 * Human-readable firewall state for the status endpoint. A missing backend
 * means the platform has nothing to manage; detection stays at the call site
 * so an explicit undefined cannot silently re-probe the real OS mid-test.
 */
export declare function computeFirewallSummary(port: number, lanEnabled: boolean, backend: FirewallBackend | undefined): FirewallSummary;
/** How long a firewallSummary answer is reused before the backend is probed again. */
export declare const FIREWALL_SUMMARY_TTL_MS = 30000;
/** Forget the cached summary (rule mutations call this). */
export declare function invalidateFirewallSummary(): void;
/**
 * The settings card polls this every ten seconds; the probes are blocking
 * spawnSync subprocesses on managed platforms, so short-TTL memoization
 * keeps one poll from freezing the host event loop per request.
 */
export declare function firewallSummary(port: number, lanEnabled: boolean): FirewallSummary;
//# sourceMappingURL=firewall.d.ts.map