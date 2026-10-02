/**
 * The inner browser credential for the remote desktop channel. The proxied
 * /api re-issues requests to 127.0.0.1, where the connection plugin's route
 * enforces the harness browser-auth cookie — an authority-bound signed cookie
 * with no loopback exemption on this cohort line, so a cookie minted for the
 * device's own authority can never satisfy the inner check. The process
 * therefore redeems its own launch token (the same one-time exchange every
 * paired device's first navigation performs) and attaches the resulting
 * cookie to inner requests. The credential is only ever exercised behind the
 * pairing gate: the `/remote` channel always requires a live paired-device
 * credential before this module is consulted, regardless of the
 * requirePairingForLan LAN policy (issue #1665).
 */
/** Browser-auth credential the proxy attaches to loopback-bound requests. */
export interface InnerAuth {
    /**
     * Resolve the `name=value` cookie pair for inner requests, or undefined
     * when the launch token is unavailable (the proxy then sends without a
     * credential and the inner route answers 401, exactly as before).
     */
    ready(): Promise<string | undefined>;
    /** Drop the cached credential; the next ready() re-redeems. */
    invalidate(): void;
}
/**
 * Build the inner-auth handle.
 * @param launchUrl - the launch-token URL for the inner loopback authority
 *   (the connection service's authenticatedUrl of `http://127.0.0.1:<port>/`),
 *   or undefined when the connection service or port is unavailable.
 * @param fetchImpl - injectable fetch (tests).
 */
export declare function createInnerAuth(launchUrl: () => string | undefined, fetchImpl?: typeof fetch): InnerAuth;
//# sourceMappingURL=inner-auth.d.ts.map