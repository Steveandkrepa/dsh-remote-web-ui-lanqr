import { Service } from '@deepseek-ai/cordis';
/** Named lookup key sibling plugins pass to ctx.get. */
export const REMOTE_WEB_UI_PAIRING = 'remoteWebUiPairing';
/**
 * Pairing identity for one HTTP request. Structural: consumers must not
 * import this class, only the method shape.
 */
export class RemoteWebUiPairing extends Service {
    check;
    /**
     * @param ctx - host plugin context.
     * @param check - live cookie + session predicate (re-read per request).
     */
    constructor(ctx, check) {
        super(ctx, REMOTE_WEB_UI_PAIRING);
        this.check = check;
    }
    /**
     * Whether the request carries a live paired-device cookie.
     * @param request - the incoming HTTP request.
     * @returns true when the session is live and was refreshed.
     */
    isPairedDevice(request) {
        return this.check(request);
    }
}
