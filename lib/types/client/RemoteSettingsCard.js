import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The remote-control settings card: pairing security and device limits.
 * Registers into the `web-ui.plugin.item` child slot the Web UI plugin group
 * renders, bound to the `remote-web-ui` profile entry's configuration form.
 */
import { useEffect, useState } from 'react';
import { PluginSettingsCard, ValueField, BooleanField } from "./PluginSettingsCard.js";
import { CardForm, booleanField, numberField, secretField, textField } from "./settings-form.js";
import { LanBindStatusError, readLanBindStatus, shouldStopLanBindPoll } from "./pair-api.js";
/** Bridges the `remote-web-ui` form onto the card's staged form. */
export class RemoteSettingsCardController {
    form;
    store;
    /** @param scope - the configuration form for the `remote-web-ui` entry. */
    constructor(scope) {
        this.form = new CardForm(scope, [
            booleanField('enabled'),
            numberField('tokenTtlMs'),
            numberField('offlineAfterMs'),
            numberField('maxDevices'),
            numberField('idleExpireMs'),
            textField('cookieName'),
            booleanField('requirePairingForLan'),
            textField('publicBaseUrl'),
            booleanField('autoTunnel'),
            secretField('tunnelToken'),
            booleanField('relay'),
            booleanField('lanBind'),
        ]);
        this.store = this.form.bind(() => this.projection());
    }
    projection() {
        return {
            ...this.form.shell(),
            enabled: this.form.field('enabled'),
            tokenTtlMs: this.form.field('tokenTtlMs'),
            offlineAfterMs: this.form.field('offlineAfterMs'),
            maxDevices: this.form.field('maxDevices'),
            idleExpireMs: this.form.field('idleExpireMs'),
            cookieName: this.form.field('cookieName'),
            requirePairingForLan: this.form.field('requirePairingForLan'),
            publicBaseUrl: this.form.field('publicBaseUrl'),
            autoTunnel: this.form.field('autoTunnel'),
            tunnelToken: this.form.field('tunnelToken'),
            relay: this.form.field('relay'),
            lanBind: this.form.field('lanBind'),
        };
    }
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject() {
        return { hooks: { remoteSettingsCard: this.store }, ...this.form.actions() };
    }
    /**
     * Release the card's form subscription and bound stores; the slot
     * disposer calls this on teardown.
     */
    dispose() {
        this.form.dispose();
    }
}
/**
 * Render the remote-control card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function RemoteSettingsCard(props) {
    const { t } = props;
    const state = props.useRemoteSettingsCard(snapshot => snapshot);
    const disabled = !state.writable;
    const fieldProps = {
        overriddenLabel: t('settings.overridden'),
        resetLabel: t('settings.reset'),
        invalidLabel: t('settings.invalidNumber'),
        disabled,
    };
    return (_jsxs(PluginSettingsCard, { t: t, titleKey: "settings.title", descriptionKey: "settings.description", defaultOpen: false, state: state, onSave: props.save, onDiscard: props.discard, children: [_jsx(BooleanField, { id: "settings-remote-enabled", label: t('settings.enabled'), hint: t('settings.enabledHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.enabled, onEdit: (text) => { props.edit('enabled', text); }, onReset: () => { props.resetField('enabled'); } }), _jsx(ValueField, { id: "settings-remote-token-ttl", label: t('settings.tokenTtlMs'), hint: t('settings.tokenTtlMsHint'), numeric: true, ...fieldProps, ...state.tokenTtlMs, onEdit: (text) => { props.edit('tokenTtlMs', text); }, onReset: () => { props.resetField('tokenTtlMs'); } }), _jsx(ValueField, { id: "settings-remote-offline", label: t('settings.offlineAfterMs'), hint: t('settings.offlineAfterMsHint'), numeric: true, ...fieldProps, ...state.offlineAfterMs, onEdit: (text) => { props.edit('offlineAfterMs', text); }, onReset: () => { props.resetField('offlineAfterMs'); } }), _jsx(ValueField, { id: "settings-remote-max-devices", label: t('settings.maxDevices'), hint: t('settings.maxDevicesHint'), numeric: true, ...fieldProps, ...state.maxDevices, onEdit: (text) => { props.edit('maxDevices', text); }, onReset: () => { props.resetField('maxDevices'); } }), _jsx(ValueField, { id: "settings-remote-idle-expire", label: t('settings.idleExpireMs'), hint: t('settings.idleExpireMsHint'), numeric: true, ...fieldProps, ...state.idleExpireMs, onEdit: (text) => { props.edit('idleExpireMs', text); }, onReset: () => { props.resetField('idleExpireMs'); } }), _jsx(ValueField, { id: "settings-remote-cookie", label: t('settings.cookieName'), hint: t('settings.cookieNameHint'), ...fieldProps, ...state.cookieName, onEdit: (text) => { props.edit('cookieName', text); }, onReset: () => { props.resetField('cookieName'); } }), _jsx(BooleanField, { id: "settings-remote-fence", label: t('settings.requirePairingForLan'), hint: t('settings.requirePairingForLanHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.requirePairingForLan, onEdit: (text) => { props.edit('requirePairingForLan', text); }, onReset: () => { props.resetField('requirePairingForLan'); } }), _jsx(ValueField, { id: "settings-remote-public-base", label: t('settings.publicBaseUrl'), hint: t('settings.publicBaseUrlHint'), placeholder: "https://example.trycloudflare.com", ...fieldProps, ...state.publicBaseUrl, onEdit: (text) => { props.edit('publicBaseUrl', text); }, onReset: () => { props.resetField('publicBaseUrl'); } }), _jsx(BooleanField, { id: "settings-remote-auto-tunnel", label: t('settings.autoTunnel'), hint: t('settings.autoTunnelHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.autoTunnel, onEdit: (text) => { props.edit('autoTunnel', text); }, onReset: () => { props.resetField('autoTunnel'); } }), _jsx(ValueField, { id: "settings-remote-tunnel-token", label: t('settings.tunnelToken'), hint: t('settings.tunnelTokenHint'), placeholder: "eyJ...", ...fieldProps, ...state.tunnelToken, onEdit: (text) => { props.edit('tunnelToken', text); }, onReset: () => { props.resetField('tunnelToken'); } }), _jsx(BooleanField, { id: "settings-remote-relay", label: t('settings.relay'), hint: t('settings.relayHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.relay, onEdit: (text) => { props.edit('relay', text); }, onReset: () => { props.resetField('relay'); } }), _jsx(LanBindStatus, { t: t }), _jsx(BooleanField, { id: "settings-remote-lan-bind", label: t('settings.lanBind'), hint: t('settings.lanBindHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.lanBind, onEdit: (text) => { props.edit('lanBind', text); }, onReset: () => { props.resetField('lanBind'); } })] }));
}
/**
 * Live LAN-bind facts above the toggle: the managed block's host, the live
 * bind, the firewall summary, and the reachable LAN URLs. Polls the
 * loopback-only status endpoint; a failure (non-loopback origin) renders
 * nothing — the pairing panel carries the loopback banner instead.
 */
function LanBindStatus({ t }) {
    const [frame, setFrame] = useState(undefined);
    useEffect(() => {
        let alive = true;
        const read = () => {
            void readLanBindStatus().then((value) => {
                if (alive)
                    setFrame(value);
            }).catch((error) => {
                // The endpoint is loopback-only: a 401/403 means this origin (a paired
                // phone) can never read it, so the 10s poll stops instead of retrying a
                // known refusal for as long as the card stays expanded.
                if (error instanceof LanBindStatusError && shouldStopLanBindPoll(error.status))
                    window.clearInterval(timer);
            });
        };
        const timer = window.setInterval(read, 10_000);
        read();
        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, []);
    if (frame === undefined)
        return null;
    const lanOn = frame.blockHost === '0.0.0.0';
    const firewallText = frame.firewall.managed
        ? t(frame.firewall.ok ? 'lan.firewall.ok' : 'lan.firewall.bad')
        : t('lan.firewall.unmanaged');
    const lines = [
        t('lan.bind', { host: frame.bindHost, port: String(frame.port) }) + ' · ' + firewallText,
    ];
    if (lanOn && frame.lanUrls.length > 0) {
        lines.push(t('lan.urls', { urls: frame.lanUrls.join('  ') }));
    }
    if (!lanOn) {
        lines.push(t('lan.off'));
    }
    if (frame.setting === null) {
        lines.push(t('lan.untouched'));
    }
    if (frame.pendingRestart === true) {
        lines.push(t('lan.pendingRestart'));
    }
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, lineHeight: '18px', opacity: 0.85 }, children: lines.map((line, index) => (_jsx("div", { style: { wordBreak: 'break-all' }, children: line }, index))) }));
}
