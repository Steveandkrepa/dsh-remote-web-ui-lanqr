/**
 * Remote-presence to pet-visibility link (user requirement): while at least
 * one paired device is online (an active phone mirror session), the
 * host-global pet is hidden through the pet's OWN hide switch (the
 * PetService.setVisible RPC, the same one the pet's hide button uses);
 * once the last device stays offline past a grace window, the pet is
 * restored. The pet plugin is optional: without it (or on any pet failure)
 * the link is a no-op - the remote-control feature never depends on the
 * pet being installed.
 *
 * The visibility is host-global by design (the pet is host-global, no
 * session dimension): the desktop and the phone share one pet, so the link
 * hides it while the operator is away on a phone mirror and restores it
 * when the mirror ends. A manual user hide is respected: if the pet is
 * already hidden when the first device comes online, nothing is recorded
 * and nothing is restored later.
 */
/** The pet service seam the link needs (structural slice, no package edge). */
export interface PresencePetSeam {
    /** RPC: show or hide the pet. */
    setVisible(visible: boolean): Promise<unknown>;
    /** Read the current display state (the visibility the user sees). */
    state(): Promise<{
        display?: {
            visible?: boolean;
        };
    }>;
}
/** Dependencies of the presence link (all injectable for tests). */
export interface PresencePetDeps {
    /** Subscribe to pairing snapshot changes (fires with every state change). */
    onState(listener: (snapshot: {
        phase: string;
        onlineCount: number;
    }) => void): () => void;
    /** Resolve the pet service seam (undefined when the pet plugin is absent). */
    pet(): PresencePetSeam | undefined;
    /** Grace before restoring the pet after the last device went offline. */
    restoreAfterMs?: number;
    timers?: {
        setTimeout(fn: () => void, ms: number): unknown;
        clearTimeout(t: unknown): void;
    };
}
/**
 * Start the presence link. Returns the disposer (withdraws the state
 * subscription and cancels a pending restore).
 * @param deps - pairing stream + pet seam (+ test seams).
 */
export declare function startRemotePresencePet(deps: PresencePetDeps): () => void;
//# sourceMappingURL=remote-presence-pet.d.ts.map