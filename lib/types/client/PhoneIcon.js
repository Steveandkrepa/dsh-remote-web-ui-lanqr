import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Render the phone icon.
 * @param props - size and optional class.
 * @returns the svg element.
 */
export function PhoneIcon({ size = 16, className }) {
    return (_jsx("svg", { width: size, height: size, className: className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M4.2 1.8h2.4l.9 2.4-1.5 1.1a7.4 7.4 0 0 0 4.7 4.7l1.1-1.5 2.4.9v2.4a.9.9 0 0 1-1 .9A11.4 11.4 0 0 1 3.3 2.8a.9.9 0 0 1 .9-1Z", stroke: "currentColor", strokeWidth: "1.3", strokeLinejoin: "round" }) }));
}
