/**
 * One-time pairing grants for the /pair-app landing.
 *
 * The QR entry (`/pair-accept?pair=<token>`) used to hand the freshly minted
 * device id to the app landing in its own URL (`/pair-app?device=<id>`). A
 * device id is a live session credential: the channel gate authorizes every
 * gated request by it and the cookie it mirrors lives a year, so a URL carrying
 * it leaks that credential into browser history, the address bar, and every log
 * on the path. The landing is reached with a one-time grant instead — 256 bits
 * of entropy, a short TTL, and single-consume semantics — and the device id
 * reaches the client only inside the server-rendered shell (the capture script
 * the landing patches in).
 *
 * Consume semantics follow the reference implementation's one-time host
 * capability (zcode `packages/server/src/hostCapability.ts`): the record is
 * deleted on EVERY consume attempt — success, expiry, or replay — so a captured
 * grant is worthless after its first use and a replayed one can never resolve,
 * and only a first use inside the TTL yields a device.
 *
 * @module @linxin666/dsh-remote-web-ui/pair-grant
 */
import { randomBytes } from 'node:crypto';
/**
 * Default grant lifetime. The grant only has to survive one redirect chain
 * from the accept page to the app landing, tunnel round trips included, so it
 * is far shorter than the device session it stands in for.
 */
export const DEFAULT_PAIR_GRANT_TTL_MS = 60_000;
/**
 * Cap on live grants. The accept page is rate-limited per source, but the
 * table is still caller-driven, so it stays bounded (oldest evicted first)
 * exactly like the device table.
 */
export const MAX_LIVE_GRANTS = 256;
/**
 * Build the grant table. Pure TypeScript with injected clock/randomness so the
 * whole one-time semantics are unit-testable without a server.
 */
export function createPairGrantStore(options = {}) {
    const ttlMs = options.ttlMs ?? DEFAULT_PAIR_GRANT_TTL_MS;
    const now = options.now ?? (() => Date.now());
    const createGrant = options.createGrant ?? (() => randomBytes(32).toString('base64url'));
    const entries = new Map();
    const purgeExpired = (at) => {
        for (const [grant, entry] of entries) {
            if (entry.expiresAt <= at)
                entries.delete(grant);
        }
    };
    return {
        issue(deviceId) {
            const issuedAt = now();
            purgeExpired(issuedAt);
            while (entries.size >= MAX_LIVE_GRANTS) {
                const oldest = entries.keys().next().value;
                if (oldest === undefined)
                    break;
                entries.delete(oldest);
            }
            const grant = createGrant();
            const expiresAt = issuedAt + ttlMs;
            entries.set(grant, { deviceId, expiresAt });
            return { grant, expiresAt };
        },
        consume(grant) {
            if (grant === undefined || grant === '')
                return undefined;
            const consumedAt = now();
            const entry = entries.get(grant);
            // Delete before validating: a replayed grant must never resolve, and an
            // expired one must not linger in the table.
            entries.delete(grant);
            purgeExpired(consumedAt);
            if (entry === undefined || entry.expiresAt <= consumedAt)
                return undefined;
            return entry.deviceId;
        },
        peek(grant) {
            if (grant === undefined || grant === '')
                return undefined;
            const at = now();
            const entry = entries.get(grant);
            if (entry === undefined)
                return undefined;
            if (entry.expiresAt <= at) {
                entries.delete(grant);
                return undefined;
            }
            return entry.deviceId;
        },
        get size() {
            return entries.size;
        },
    };
}
