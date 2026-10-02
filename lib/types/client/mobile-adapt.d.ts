/**
 * Portrait-touch adaptation of the OFFICIAL desktop Web GUI (the dsh-LAN
 * approach): while a touch device is in portrait, inject a CSS + gesture
 * layer on top of the running SPA instead of maintaining a second UI. The
 * official layout already auto-collapses the sidebar below 1024px; this
 * layer adds touch-target sizing, 16px inputs (iOS focus zoom), safe-area
 * padding, a floating whale button as the collapsed-sidebar entry (with a
 * verified toggle fallback for cohorts whose layout face mounts inert),
 * swipe gestures, long-press session menus, a bottom-sheet composer picker
 * (model / effort / permission menus), desktop-surface suppression, and
 * composer/header compaction.
 * Landscape, desktop, and wide viewports stay untouched; a manual
 * sessionStorage opt-out (dsh-remote-force-desktop=1) disables the layer.
 *
 * Selector strategy: CSS Modules class names are hash-prefixed with the
 * semantic name as a stable suffix (`pI_x6G_centerCol`), so attribute
 * suffix selectors survive official rebuilds that only change the hash. The
 * semantic names were read off the 0.1.2-alpha.1 official client build and
 * are re-verified on every GUI QA round; rules borrowed from the dsh-LAN
 * reference (MIT, v47-v78) keep their version comments.
 * @module @linxin666/dsh-remote-web-ui/client/mobile-adapt
 */
import type { RemoteKey } from './locales.ts';
/** The window global the plugin apply() wires the layout service into. */
export interface RemoteAdaptGlobal {
    evaluate: () => void;
    /** Wired by the plugin apply once ctx.layout is live. */
    toggleSidebar: (() => void) | null;
    /** Wired by the plugin apply once ctx.layout is live. */
    closeDetails: (() => void) | null;
    /**
     * Wired by the plugin apply once the `remote` locale namespace is bound:
     * the translate seat the injected surfaces (whale, compact picker) read
     * their labels from. Null until then; label reads fall back to English
     * (the SDK's universal fallback) and the 600ms sync tick re-renders the
     * labels once the seat is wired.
     */
    translate: ((key: RemoteKey) => string) | null;
    /** Plugin master switch: false reverts the layer, true re-evaluates. */
    setEnabled(on: boolean): void;
    /** Replays a pending closeDetails once the layout face is wired (the first apply ran before the wiring). */
    flushCloseDetails(): void;
}
/**
 * Install the adaptation layer. Runs once per page (idempotent); the
 * evaluate loop re-applies on orientation/resize and reverts off-portrait.
 */
export declare function startMobileAdapt(): void;
//# sourceMappingURL=mobile-adapt.d.ts.map