/**
 * Pair boot flow: the QR link's `pair` parameter. Runs from the client
 * apply on every page load, on any device: `pair` present → accept the
 * token, then reload so the whole SPA boots with the device cookie (the
 * accept endpoint is exempt from the pairing gate; every other /api request
 * needs the cookie). Every device — phone or PC — lands on the same official
 * Web GUI; phones get the injected portrait adaptation. Failure of accept
 * leaves a sessionStorage marker the entry renders as a one-time notice.
 */
import { acceptPair, readPairParams } from "./pair-api.js";
/** sessionStorage key for the failed-pair notice. */
export const PAIR_FAILED_MARKER = 'dsh-remote-pair-failed';
/** The browser implementation of {@link PageSurface}. */
export const browserPage = {
    get href() {
        return window.location.href;
    },
    replaceState(url) {
        window.history.replaceState(null, '', url);
    },
    navigate(url) {
        window.location.assign(url);
    },
    reload() {
        window.location.reload();
    },
};
/**
 * Run the pair boot flow for this page load.
 * @param ctx - client root context (unused since the deep-link retirement;
 * kept for call-site stability).
 * @param search - the current location.search.
 * @param page - the page surface (defaults to the browser).
 */
export function runPairBootFlow(ctx, search, page = browserPage) {
    void ctx;
    const params = readPairParams(search);
    if (params.pair !== undefined) {
        void runAccept(params.pair, page);
    }
}
/** Accept the token, then reload into the paired official UI. */
async function runAccept(token, page) {
    let ok = false;
    try {
        const result = await acceptPair(token);
        ok = result.ok;
        if (!ok)
            sessionStorage.setItem(PAIR_FAILED_MARKER, 'failed');
    }
    catch {
        sessionStorage.setItem(PAIR_FAILED_MARKER, 'failed');
    }
    // Drop the token from the URL either way: it is spent for this tab (the
    // session is established), and a failed one must not loop.
    const url = new URL(page.href);
    url.searchParams.delete('pair');
    page.replaceState(`${url.pathname}${url.search}${url.hash}`);
    if (ok) {
        // Every device reloads into the same official Web GUI at this origin.
        page.reload();
    }
}
