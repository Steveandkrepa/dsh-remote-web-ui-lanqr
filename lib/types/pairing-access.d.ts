/**
 * Optional cordis service other host plugins can ctx.get without taking a
 * package dependency: a live paired-device cookie is an allow path on
 * routes that sit outside /api (and therefore outside api/gate).
 */
import type { IncomingMessage } from 'node:http';
import { Service, type Context } from '@deepseek-ai/cordis';
/** Named lookup key sibling plugins pass to ctx.get. */
export declare const REMOTE_WEB_UI_PAIRING = "remoteWebUiPairing";
/**
 * Pairing identity for one HTTP request. Structural: consumers must not
 * import this class, only the method shape.
 */
export declare class RemoteWebUiPairing extends Service {
    private readonly check;
    /**
     * @param ctx - host plugin context.
     * @param check - live cookie + session predicate (re-read per request).
     */
    constructor(ctx: Context, check: (request: IncomingMessage) => boolean);
    /**
     * Whether the request carries a live paired-device cookie.
     * @param request - the incoming HTTP request.
     * @returns true when the session is live and was refreshed.
     */
    isPairedDevice(request: IncomingMessage): boolean;
}
//# sourceMappingURL=pairing-access.d.ts.map