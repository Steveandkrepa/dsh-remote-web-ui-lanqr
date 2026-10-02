/** The snapshot a form reports before the Host has answered with this entry. */
function pendingSnapshot() {
    return {
        status: 'loading',
        value: undefined,
        base: undefined,
        user: undefined,
        revision: undefined,
        writable: false,
        mode: 'host',
    };
}
/**
 * Create a settings form bound to the profile entry id this Host serves, and
 * rebound whenever the shared describe mirror names a different one of this
 * package's rows.
 * @param options - the shared forms service and this package's candidate row ids.
 * @returns a form delegating to the currently resolved entry's own form.
 */
export function createServedEntryForm(options) {
    const { forms, entryIds } = options;
    const fallbackId = entryIds[0];
    const namespaceId = entryIds[entryIds.length - 1];
    const listeners = new Set();
    let boundId;
    let bound;
    let offBound;
    let snapshot = pendingSnapshot();
    /** Republish: the delegated snapshot when one is bound, the pending one otherwise. */
    const publish = () => {
        if (bound !== undefined)
            snapshot = bound.getSnapshot();
        for (const listener of [...listeners])
            listener();
    };
    /**
     * The entry id the mirror currently justifies. An unanswered or empty mirror
     * is not evidence of absence, so it keeps the first candidate; a mirror that
     * answers without any of this package's rows leaves the namespace itself.
     * @returns the entry id to bind.
     */
    const resolve = () => {
        let served;
        try {
            served = forms.describe().getSnapshot().view?.namespaces.map(row => row.ns);
        }
        catch {
            // A mirror that refuses the read is unanswered too, not absent.
            served = undefined;
        }
        if (served === undefined || served.length === 0)
            return fallbackId;
        return entryIds.find(id => served.includes(id)) ?? namespaceId;
    };
    /** Bind (or rebind) the resolved entry's form; a no-op while it is unchanged. */
    const bind = () => {
        const target = resolve();
        if (target === boundId)
            return;
        offBound?.();
        offBound = undefined;
        let form;
        try {
            form = forms.get(target);
        }
        catch {
            // A service that refuses the id stays unbound; the next mirror answer
            // retries rather than pinning a wrong entry for the session.
            boundId = undefined;
            return;
        }
        boundId = target;
        bound = form;
        offBound = form.subscribe(() => { publish(); });
        publish();
    };
    // The mirror subscription lives for the page: the card owns its form for the
    // session, and the ConfigForm contract carries no disposer to hang it on. The
    // callback is cheap (a resolve plus a no-op while the id is unchanged). A
    // mirror without a subscription seat keeps the initial binding.
    try {
        forms.describe().subscribe(() => { bind(); });
    }
    catch {
        // A describe face that refuses the subscription: the initial binding stands.
    }
    bind();
    return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        set: (field, value) => bound?.set(field, value) ?? Promise.resolve(false),
        unset: (field) => bound?.unset(field) ?? Promise.resolve(false),
        mutate: (ops, expectedRevision) => bound?.mutate(ops, expectedRevision) ?? Promise.resolve(false),
    };
}
