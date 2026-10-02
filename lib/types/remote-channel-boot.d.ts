/**
 * Parse-time remote-channel boot patch (issue #987): the browser-half patch
 * (client/remote-channel.ts) installs when this plugin's boot entry runs,
 * but `dsh-client-connection` boots earlier and opens its event streams
 * unrewritten — on a non-loopback origin the SDK fence rejects them and the
 * workspace list never loads. The host therefore inlines this classic script
 * right after the opening <head> tag (webserver/index-inject), so the
 * fetch/WebSocket/EventSource/src rewrite is active before ANY boot entry
 * executes. The plugin's client apply later adopts the installed seat
 * (hooks + pending unpaired signal) instead of patching twice.
 *
 * The rewrite decisions are generated from REMOTE_CHANNEL_RULES, the same
 * data the browser patch consumes — the two cannot drift apart. On this
 * 0.1.2-alpha.2 line the "configuration plane is local" behavior lives in
 * the browser (client plugins branch on connection.isLoopback), so the
 * script also flips the official UI into host mode by installing the
 * transport hook `__DSH_TRANSPORT__ = { ownsHost: true }` before the
 * connection plugin reads it: the paired remote desktop gets the full
 * settings/credentials/presets surface, and every call still rides the
 * gated /remote channel. Host mode is server-granted, not origin-asserted:
 * the hook is installed only when the device-gated app landing (/pair-app)
 * published the grant marker (REMOTE_HOST_GRANT_GLOBAL) ahead of this
 * script, so a shell served to an unpaired browser - a fence-open
 * deployment - never presents itself as the machine owner. It finally
 * publishes the official pre-Cordis
 * upload hook (`__DSH_FILE_UPLOAD__`), because the background upload
 * transport otherwise runs inside a Web Worker whose own globals the
 * main-thread rewrite cannot reach (issue #1580). The script self-skips on
 * loopback origins and never throws.
 * @module @linxin666/dsh-remote-web-ui/remote-channel-boot
 */
import { type RemoteChannelRules } from './remote-channel-rules.ts';
/**
 * Build the inline boot script. The result contains no `</script` sequence
 * (the injection contract) and installs a {@link RemoteChannelBootSeat} on
 * the window global.
 */
export declare function buildRemoteChannelBootScript(rules?: RemoteChannelRules): string;
/** Boot-watchdog latch: one self-reload per session while the boot is broken. */
export declare const BOOT_WATCHDOG_KEY = "dsh-remote-boot-reload";
/**
 * Build the boot-watchdog script fragment. A remote boot has no recovery
 * path of its own: the SPA mounts nothing when a boot-critical request dies
 * (a tunnel-edge 429 under burst, a dropped stream, a boot-order race), and
 * the phone then shows a permanently blank shell. The watchdog polls for the
 * app's conversation surface and reloads once when it never appears; the
 * sessionStorage latch keeps a genuinely broken deployment from looping,
 * and a successful boot clears the latch so a later failure can recover.
 */
export declare function buildBootWatchdogScript(waitMs?: number, pollMs?: number): string;
/** The script this plugin contributes; built once from the live rules. */
export declare const REMOTE_CHANNEL_BOOT_SCRIPT: string;
//# sourceMappingURL=remote-channel-boot.d.ts.map