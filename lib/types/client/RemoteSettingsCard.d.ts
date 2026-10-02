/**
 * The remote-control settings card: pairing security and device limits.
 * Registers into the `web-ui.plugin.item` child slot the Web UI plugin group
 * renders, bound to the `remote-web-ui` profile entry's configuration form.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import { type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts';
/** The remote-control fields this card edits (the namespace's full schema). */
export interface RemoteSettings {
    /** Master switch for the plugin. */
    enabled?: boolean;
    /** Token lifetime in ms; the QR link dies after this. */
    tokenTtlMs?: number;
    /** A device is "online" while its lastSeenAt is newer than this (ms). */
    offlineAfterMs?: number;
    /** Hard cap on paired device sessions (oldest evicted when full). */
    maxDevices?: number;
    /** Idle sessions older than this (ms) are deleted. */
    idleExpireMs?: number;
    /** Cookie name carrying the paired device id. */
    cookieName?: string;
    /** Fence flag: whether non-loopback /api requests must carry a live paired-device cookie. */
    requirePairingForLan?: boolean;
    /** Public (tunneled) base URL the QR link is built from when set. */
    publicBaseUrl?: string;
    /** When on, the plugin runs its own Cloudflare quick tunnel automatically. */
    autoTunnel?: boolean;
    /**
     * Cloudflare named-tunnel token: when set (and autoTunnel is off), the
     * plugin runs the named tunnel toward the fixed public hostname — a phone
     * paired once keeps its session across restarts.
     */
    tunnelToken?: string;
    /**
     * Stable-origin relay: when on (default), the quick tunnel is fronted by a
     * fixed `<id>.dsh-market.com` subdomain so the phone's bookmark and
     * pairing cookie survive restarts without any setup.
     */
    relay?: boolean;
    /**
     * LAN bind toggle: once flipped, the plugin manages the profile patch's
     * webserver block (0.0.0.0 / 127.0.0.1) and the host firewall rule.
     */
    lanBind?: boolean;
}
/** What the remote-control card renders. */
export interface RemoteSettingsCardState extends CardShell {
    /** Master switch. */
    enabled: CardFieldState;
    /** Token lifetime. */
    tokenTtlMs: CardFieldState;
    /** Device offline threshold. */
    offlineAfterMs: CardFieldState;
    /** Paired-device cap. */
    maxDevices: CardFieldState;
    /** Idle-expiry window. */
    idleExpireMs: CardFieldState;
    /** Device cookie name. */
    cookieName: CardFieldState;
    /** LAN fence flag. */
    requirePairingForLan: CardFieldState;
    /** Public (tunneled) base URL. */
    publicBaseUrl: CardFieldState;
    /** Auto public tunnel switch. */
    autoTunnel: CardFieldState;
    /** Named-tunnel token (stored redacted by the Host). */
    tunnelToken: CardFieldState;
    /** Stable-origin relay switch. */
    relay: CardFieldState;
    /** LAN bind toggle. */
    lanBind: CardFieldState;
}
/** The registration-side face the card's slot entry injects. */
export interface RemoteSettingsCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as useRemoteSettingsCard. */
        remoteSettingsCard: SnapshotStore<RemoteSettingsCardState>;
    };
}
/** Bridges the `remote-web-ui` form onto the card's staged form. */
export declare class RemoteSettingsCardController {
    private readonly form;
    private readonly store;
    /** @param scope - the configuration form for the `remote-web-ui` entry. */
    constructor(scope: ConfigForm<RemoteSettings>);
    private projection;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): RemoteSettingsCardFace;
    /**
     * Release the card's form subscription and bound stores; the slot
     * disposer calls this on teardown.
     */
    dispose(): void;
}
/** Props the renderer binds for the remote-control card. */
export type RemoteSettingsCardProps = PropsRuntime<'web-ui.plugin.item'> & PropsLocale<'remote'> & InjectFace<RemoteSettingsCardFace>;
/**
 * Render the remote-control card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export declare function RemoteSettingsCard(props: RemoteSettingsCardProps): import("react").JSX.Element;
//# sourceMappingURL=RemoteSettingsCard.d.ts.map