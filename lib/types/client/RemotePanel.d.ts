import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { PairingPhase } from '../pairing.ts';
import { type DeviceFrame, type PostureFrame, type RelayStatusFrame, type TunnelStatusFrame } from './pair-api.ts';
/** The panel's view state, owned by the entry component. */
export type PanelState = {
    kind: 'lan-required';
    tunnel?: TunnelStatusFrame;
} | {
    kind: 'loopback-required';
} | {
    kind: 'unreachable';
} | {
    kind: 'ready';
    url: string;
    expiresAt: number;
    expired: boolean;
    phase: PairingPhase;
    deviceCount: number;
    onlineCount: number;
    /** Authorized devices for the roster under the QR card. */
    devices: DeviceFrame[];
    /** The LAN literal the current QR was built from. */
    address: string;
    /** Every constructible LAN literal (interface order). */
    lanAddresses: string[];
    /** The active pairing token itself (useful in Docker/reverse proxy topologies). */
    token?: string;
    /** Whether this QR is built on the configured public (tunneled) base. */
    public: boolean;
    /** The configured public (tunneled) base URL, when present. */
    publicBaseUrl?: string;
    /** Auto-tunnel status, while the auto-tunnel feature is active. */
    tunnel?: TunnelStatusFrame;
    /** Relay-registry status, while the stable-origin relay is in play. */
    relay?: RelayStatusFrame;
    /** Latest /api posture probe, once a round has completed. */
    posture?: PostureFrame;
};
/** Full panel props: copy + view state + actions. */
export interface RemotePanelProps {
    t: TranslateNS<'remote'>;
    state: PanelState;
    copied: boolean;
    copiedToken?: boolean;
    onClose(): void;
    onStop(): void;
    onRefresh(): void;
    onCopy(url: string): void;
    onCopyToken?(token: string): void;
    /** Re-mint the QR against a different LAN address. */
    onPickAddress(address: string): void;
    /** Re-mint the QR against the configured public (tunneled) base. */
    onPickPublic(): void;
    /** Revoke one paired device. */
    onRevoke(deviceId: string): void;
}
/**
 * Render the pairing panel.
 * @param props - copy, state, and actions.
 * @returns the panel element tree.
 */
export declare function RemotePanel({ t, state, copied, copiedToken, onClose, onStop, onRefresh, onCopy, onCopyToken, onPickAddress, onPickPublic, onRevoke, }: RemotePanelProps): import("react").JSX.Element;
//# sourceMappingURL=RemotePanel.d.ts.map