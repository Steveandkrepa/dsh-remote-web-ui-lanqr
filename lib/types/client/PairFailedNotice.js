import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * One-time failed-pairing notice: a fixed toast rendered on the phone after
 * a QR accept failed (invalid/used token or a network error). Mounted by
 * the client apply with a plain React root — no slot machinery for a
 * transient diagnostic.
 */
import { useEffect, useState } from 'react';
import css from './remote.module.css';
/**
 * Render the failed-pair toast (auto-dismisses).
 * @param props - localized copy.
 * @returns the toast element.
 */
export function PairFailedNotice({ t }) {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const timer = window.setTimeout(() => { setVisible(false); }, 8000);
        return () => { window.clearTimeout(timer); };
    }, []);
    if (!visible)
        return null;
    return (_jsxs("div", { className: css.notice, role: "alert", children: [_jsx("p", { className: css.noticeTitle, children: t('pair.failed.title') }), _jsx("p", { className: css.noticeDetail, children: t('pair.failed.detail') })] }));
}
