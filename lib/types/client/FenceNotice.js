import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Unpaired-desktop notice: a full-page blocking surface rendered when the remote channel
 * (see remote-channel.ts) refuses a call because this desktop browser has no
 * live paired-device cookie. Retires automatically once a gated call
 * succeeds (the channel reports pairing) or when the channel itself is
 * torn down (requirePairingForLan off / plugin disabled), so it never
 * outlives the unpaired state it describes.
 */
import { useState } from 'react';
import { acceptPair } from "./pair-api.js";
import css from './remote.module.css';
/**
 * Extract a pairing token from either a raw token string or a copied pairing link URL.
 */
export function extractPairToken(input) {
    const trimmed = input.trim();
    if (trimmed === '')
        return undefined;
    try {
        const url = new URL(trimmed);
        const token = url.searchParams.get('pair');
        if (token !== null && token !== '')
            return token;
    }
    catch {
        // Plain token string
    }
    return trimmed;
}
/**
 * Render the unpaired blocking page.
 * @param props - localized copy.
 * @returns the notice element.
 */
export function FenceNotice({ t, onRetry, onAccept = acceptPair }) {
    const [tokenInput, setTokenInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(undefined);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = extractPairToken(tokenInput);
        if (!token)
            return;
        setSubmitting(true);
        setErrorMsg(undefined);
        try {
            const result = await onAccept(token);
            if (result.ok) {
                onRetry();
                return;
            }
            if (result.code === 'invalid') {
                setErrorMsg(t('fence.unpaired.tokenInvalid'));
            }
            else {
                setErrorMsg(t('fence.unpaired.tokenFailed'));
            }
        }
        catch {
            setErrorMsg(t('fence.unpaired.tokenFailed'));
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx("div", { className: css.fencePage, role: "dialog", "aria-modal": "true", "aria-labelledby": "remote-fence-title", children: _jsxs("main", { className: css.fenceCard, "data-dsh-plugin": "remote-web-ui", children: [_jsx("div", { className: css.fenceMark, "aria-hidden": "true", children: "\u00D7" }), _jsx("p", { className: css.fenceEyebrow, children: t('fence.unpaired.eyebrow') }), _jsx("h1", { id: "remote-fence-title", className: css.fenceTitle, children: t('fence.unpaired.title') }), _jsx("p", { className: css.fenceDetail, children: t('fence.unpaired.hint') }), _jsxs("ol", { className: css.fenceSteps, children: [_jsx("li", { children: t('fence.unpaired.stepDesktop') }), _jsx("li", { children: t('fence.unpaired.stepLink') }), _jsx("li", { children: t('fence.unpaired.stepOpen') })] }), _jsxs("form", { className: css.fenceForm, onSubmit: handleSubmit, children: [_jsxs("div", { className: css.fenceInputRow, children: [_jsx("input", { type: "text", className: css.fenceInput, placeholder: t('fence.unpaired.tokenPlaceholder'), value: tokenInput, onChange: event => {
                                        setTokenInput(event.target.value);
                                        if (errorMsg !== undefined)
                                            setErrorMsg(undefined);
                                    }, disabled: submitting, "aria-label": t('fence.unpaired.tokenPlaceholder') }), _jsx("button", { className: css.fencePairButton, type: "submit", disabled: submitting || tokenInput.trim() === '', children: submitting ? t('fence.unpaired.pairing') : t('fence.unpaired.pairAction') })] }), errorMsg !== undefined && (_jsx("p", { className: css.fenceError, role: "alert", children: errorMsg }))] }), _jsx("button", { className: css.fenceRetry, type: "button", onClick: onRetry, children: t('fence.unpaired.retry') }), _jsx("p", { className: css.fenceFootnote, children: t('fence.unpaired.footnote') })] }) }));
}
