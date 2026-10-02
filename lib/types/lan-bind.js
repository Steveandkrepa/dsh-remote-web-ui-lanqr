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
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { parseDocument } from 'yaml';
import { dshHome } from "./dsh-home.js";
/** Profile names safe to interpolate into the patch path: one path segment, no traversal. */
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const LAN_BIND_BLOCK_BEGIN = '# --- remote-web-ui lan-bind block (managed - do not edit) ---';
export const LAN_BIND_BLOCK_END = '# --- end remote-web-ui lan-bind block ---';
/**
 * The absolute path of the profile patch file this toggle manages. The value
 * is config-controlled (and the runtime/environment fallbacks bypass schema
 * validation entirely), so the path is guarded twice: the profile must be a
 * single safe path segment, and the resolved file must stay under the
 * profiles directory.
 */
export function profilePatchFile(profile, home = dshHome()) {
    if (!PROFILE_PATTERN.test(profile)) {
        throw new Error(`remote-web-ui: unsafe lan-bind profile ${JSON.stringify(profile)}`);
    }
    const file = resolve(join(home, 'profiles', profile, 'cordis.patch.yml'));
    const root = resolve(join(home, 'profiles')) + sep;
    if (!file.startsWith(root)) {
        throw new Error(`remote-web-ui: lan-bind profile ${JSON.stringify(profile)} escapes the profiles directory`);
    }
    return file;
}
function readPatchContent(file) {
    if (!existsSync(file))
        return '';
    return readFileSync(file, 'utf8');
}
/** Escape one literal string for embedding into a RegExp pattern. */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Remove the managed block (and its markers) from patch content. */
export function stripManagedBlock(content) {
    const begin = escapeRegex(LAN_BIND_BLOCK_BEGIN);
    const end = escapeRegex(LAN_BIND_BLOCK_END);
    const pattern = new RegExp(`\\r?\\n?${begin}[\\s\\S]*?${end}\\r?\\n?`, 'g');
    return content.replace(pattern, '\n');
}
/**
 * Render the managed block for one bind state. The values are static: the
 * user patch layer has no reliable lazy service evaluation, and the plugin
 * re-asserts the block at every boot so CLI flags (--port, --host) win by
 * rewriting it before the next start.
 */
/**
 * Whether the base opens a flow collection at the root. That is the shape the
 * plugin manager's YAML document round-trip leaves behind when it appends rows
 * to the profile's placeholder `[]`: `[ { id: … }, … ]`. Every other base
 * (empty, block sequence, comment-only prefix) keeps the historical string
 * concatenation, so the common paths stay byte-identical.
 */
function isFlowRoot(base) {
    return base.trimStart().startsWith('[');
}
/** Force one parsed collection (and its item collections) into block style. */
function toBlockStyle(node) {
    if (typeof node !== 'object' || node === null)
        return;
    const collection = node;
    if (!Array.isArray(collection.items) && typeof collection.flow !== 'boolean')
        return;
    collection.flow = false;
    for (const item of collection.items ?? [])
        toBlockStyle(item);
}
/** Plain-value view of one parsed node (YAML nodes keep their own accessors). */
function plainOf(node) {
    if (typeof node !== 'object' || node === null)
        return node;
    const json = node.toJSON;
    return typeof json === 'function' ? json.call(node) : node;
}
/**
 * Produce the file text for one bind state. A flow-style base is re-emitted as
 * a block sequence before the managed block is appended, so the file stays
 * exactly one valid YAML document; concatenating the block onto a non-empty
 * flow array produced two root documents and the profile failed to parse at
 * `dsh web` startup (#1675). A base that cannot be parsed is refused with the
 * file path rather than written half-valid.
 */
function mergePatchContent(base, block, file) {
    if (base.length === 0)
        return block;
    if (!isFlowRoot(base))
        return `${base}\n\n${block}`;
    const doc = parseDocument(base, { uniqueKeys: false });
    if (doc.errors.length > 0 || doc.contents === null) {
        throw new Error(`remote-web-ui: cannot update the lan-bind block in ${file}: ${doc.errors[0]?.message ?? 'the patch file is not a YAML document'}`);
    }
    if (!('items' in doc.contents)) {
        throw new Error(`remote-web-ui: cannot update the lan-bind block in ${file}: the patch file is not a top-level patch list`);
    }
    toBlockStyle(doc.contents);
    const rendered = doc.toString({ lineWidth: 0 }).trimEnd();
    return `${rendered}\n\n${block}`;
}
/**
 * Render the managed block for one bind state. The values are static: the
 * user patch layer has no reliable lazy service evaluation, and the plugin
 * re-asserts the block at every boot so CLI flags (--port, --host) win by
 * rewriting it before the next start.
 */
export function managedBlock(host, port) {
    return [
        LAN_BIND_BLOCK_BEGIN,
        '- id: webserver',
        "  name: '@deepseek-ai/dsh-host-webserver'",
        '  config:',
        `    host: '${host}'`,
        `    port: ${String(port)}`,
        '    compression: gzip',
        '    compressionLevel: 1',
        '    compressionThresholdBytes: 1024',
        LAN_BIND_BLOCK_END,
        '',
    ].join('\n');
}
/**
 * Parse the block's pinned bind out of patch content. A block whose values
 * were hand-edited reports the literals as-is so the card can surface them
 * instead of silently claiming one of the two known states.
 */
export function managedBindOf(content) {
    const begin = content.indexOf(LAN_BIND_BLOCK_BEGIN);
    if (begin === -1)
        return undefined;
    const end = content.indexOf(LAN_BIND_BLOCK_END, begin);
    const block = end === -1 ? content.slice(begin) : content.slice(begin, end);
    const hostMatch = /host:\s*'([^']+)'/.exec(block);
    const portMatch = /port:\s*(\d+)/.exec(block);
    return {
        host: hostMatch?.[1] ?? '',
        port: portMatch !== null ? Number(portMatch[1]) : undefined,
    };
}
/** Full file-level state for the settings card and the boot re-assert. */
export function lanBindState(profile, home = dshHome()) {
    const state = managedBindOf(readPatchContent(profilePatchFile(profile, home)));
    if (state === undefined)
        return { blockPresent: false };
    return { blockPresent: true, host: state.host, port: state.port };
}
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
export function writeLanBind(host, port, profile, home = dshHome()) {
    const file = profilePatchFile(profile, home);
    const stripped = stripManagedBlock(readPatchContent(file));
    const orphanBegin = stripped.indexOf(LAN_BIND_BLOCK_BEGIN);
    const rawBase = (orphanBegin === -1 ? stripped : stripped.slice(0, orphanBegin)).trimEnd();
    const base = rawBase.replace(/\[\s*\]\s*$/, '').trimEnd();
    const block = managedBlock(host, port);
    const content = mergePatchContent(base, block, file);
    const mode = existsSync(file) ? statSync(file).mode & 0o777 : 0o600;
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.remote-web-ui-tmp-${process.pid.toString(36)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    writeFileSync(temp, content, { mode });
    renameSync(temp, file);
}
