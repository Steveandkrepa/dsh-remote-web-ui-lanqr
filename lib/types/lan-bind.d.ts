/**
 * LAN bind toggle: the managed cordis patch block that pins the web
 * server's bind. On = a block binding 0.0.0.0; off = the same block binding
 * 127.0.0.1. The block takes effect on the next `dsh web` start (the live
 * patch watcher cannot rebind a running listener, and on this harness line
 * the user patch layer cannot evaluate webStartup-dependent expressions
 * reliably - static values are the only dependable form), so the plugin
 * re-asserts the block at every boot and the settings card reports the
 * running bind honestly.
 *
 * Same-id patch rows REPLACE the row config wholesale, so the block carries
 * the official web-app webserver row's full config (bind + compression)
 * with the bind values materialized. The CLI's --host 0.0.0.0 guard stays
 * intact: deliberate LAN exposure happens through this configuration layer
 * only. Until the user flips the toggle once, the plugin never touches the
 * patch file.
 *
 * The block discipline (markers, atomic write, strip-and-rewrite) follows
 * the dsh-LAN reference implementation (MIT).
 */
export declare const LAN_BIND_BLOCK_BEGIN = "# --- remote-web-ui lan-bind block (managed - do not edit) ---";
export declare const LAN_BIND_BLOCK_END = "# --- end remote-web-ui lan-bind block ---";
/** The two bind hosts the managed block pins. */
export type LanBindHost = '0.0.0.0' | '127.0.0.1';
/**
 * The absolute path of the profile patch file this toggle manages. The value
 * is config-controlled (and the runtime/environment fallbacks bypass schema
 * validation entirely), so the path is guarded twice: the profile must be a
 * single safe path segment, and the resolved file must stay under the
 * profiles directory.
 */
export declare function profilePatchFile(profile: string, home?: string): string;
/** Remove the managed block (and its markers) from patch content. */
export declare function stripManagedBlock(content: string): string;
/**
 * Render the managed block for one bind state. The values are static: the
 * user patch layer has no reliable lazy service evaluation, and the plugin
 * re-asserts the block at every boot so CLI flags (--port, --host) win by
 * rewriting it before the next start.
 */
export declare function managedBlock(host: LanBindHost, port: number): string;
/** The bind state a managed block pins (undefined when there is no block). */
export interface ManagedBindState {
    host: LanBindHost | (string & {});
    port: number | undefined;
}
/**
 * Parse the block's pinned bind out of patch content. A block whose values
 * were hand-edited reports the literals as-is so the card can surface them
 * instead of silently claiming one of the two known states.
 */
export declare function managedBindOf(content: string): ManagedBindState | undefined;
/** Full file-level state for the settings card and the boot re-assert. */
export declare function lanBindState(profile: string, home?: string): {
    blockPresent: boolean;
    host?: string;
    port?: number;
};
/**
 * Write (or rewrite) the managed block with the given bind. The rest of the
 * patch file is preserved; the block is rewritten atomically (unique temp
 * file + rename, so concurrent writers can never rename a half-written
 * file) with the original file's permissions preserved. A hand-truncated
 * unterminated block (BEGIN marker without END, which stripManagedBlock
 * cannot match) is truncated at its BEGIN marker first so the rewrite can
 * never stack a second webserver row onto the orphan.
 *
 * The written file is always exactly one valid YAML document: a base the
 * plugin manager left in flow style is re-emitted as a block sequence before
 * the managed block is appended (see mergePatchContent).
 */
export declare function writeLanBind(host: LanBindHost, port: number, profile: string, home?: string): void;
//# sourceMappingURL=lan-bind.d.ts.map