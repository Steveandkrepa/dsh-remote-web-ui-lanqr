import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ConfigForm, ConfigForms } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type RemoteSettings } from './RemoteSettingsCard.tsx';
import { type RemoteKey } from './locales.ts';
export type { RemoteEntryProps } from './RemoteEntry.tsx';
export type { PanelState, RemotePanelProps } from './RemotePanel.tsx';
export type { PairFailedNoticeProps } from './PairFailedNotice.tsx';
export type { RemoteKey } from './locales.ts';
export type { RemoteSettingsCardFace, RemoteSettingsCardState } from './RemoteSettingsCard.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Mobile remote-control surface copy. */
        remote: RemoteKey;
    }
    interface SlotMap {
        /**
         * The sidebar foot seat beside the settings trigger, declared by the
         * sidebar shell on deployments that carry the feature seat; the shell
         * passes only its column display state.
         */
        /**
         * The child slot the Web UI plugin group declares; this card registers
         * into the group's list seat rather than the official
         * bundle-configuration seat. Spelled here with the same shape so this
         * package can register without depending on the sibling UI package.
         */
        'web-ui.plugin.item': {
            kind: 'list';
            scope: 'root';
            owner: SettingsPluginItemOwnerProps;
        };
    }
}
/** Owner share of the sidebar remote-control seat: the column display state the trigger renders against. */
export interface SidebarRemoteOwnerProps {
    /** Whether the sidebar renders wide content (false = 56px rail). */
    wide: boolean;
}
/** Owner share of a plugin card (the section supplies nothing). */
export interface SettingsPluginItemOwnerProps {
    /** Marker field: card owner props are intentionally empty. */
    children?: never;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /**
         * Optional family settings binder provided by dsh-web-settings; absent
         * when that group plugin is not installed, so callers fall back to the
         * official `ctx.configForms` service.
         *
         * The 0.1.7 client addresses one form per active profile entry id and
         * carries no package identity, so the family binder resolves a family
         * settings namespace to the entry that owns it and hands back that entry's
         * shared form; the official service is addressed by the entry id directly.
         */
        webUiSettings?: {
            bind<S>(spec: {
                namespace: string;
                decode?: (section: unknown) => S | undefined;
            }): ConfigForm<S>;
        };
    }
}
/**
 * The profile entry id this package's own row carries, for a page that serves
 * no family binder.
 *
 * The shared describe mirror answers asynchronously, so at plugin activation it
 * usually holds nothing yet — and an unanswered or empty mirror is not evidence
 * of absence. Binding the bare namespace there left the card bound to an entry
 * the Host does not serve, and the form is bound once per session, so the card
 * never recovered (every save answered `No configurable plugin entry`). The
 * aggregate row id matches nearly every deployment; only a mirror that answers
 * with OTHER plugins' rows falls back to the namespace itself (the pre-0.1.7
 * keying shape), because that answer is the one that actually proves this
 * package's own row is not served.
 * @param forms - the shared configuration forms service.
 * @returns the entry id to bind.
 */
export declare function servedEntryId(forms: ConfigForms): string;
/**
 * Bind the settings form the remote-control card reads and writes.
 *
 * The family binder comes first: it resolves this package's family namespace
 * onto the profile entry id the Host serves the form under, and keeps the
 * loopback bridge as its own fallback. A page without that group (or one where
 * its client half has not applied yet) binds through the shared forms service,
 * on the entry id the describe mirror justifies and rebound as soon as the
 * mirror answers — see {@link createServedEntryForm}.
 * @param ctx - client context carrying the family binder and/or the shared forms service.
 * @returns the form the card stages and saves through.
 */
export declare function bindSettingsForm(ctx: ClientContext): ConfigForm<RemoteSettings>;
/** Services required by this plugin. */
export declare const inject: string[];
/**
 * Register the remote-control surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map