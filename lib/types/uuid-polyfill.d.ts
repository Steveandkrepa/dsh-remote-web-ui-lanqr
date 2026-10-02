/**
 * Polyfill for crypto.randomUUID for non-secure contexts (LAN HTTP)
 * where the browser does not expose crypto.randomUUID.
 *
 * The script string is injected as an inline <script> in the desktop HTML
 * head so the SDK's mintRpcId() sees a working randomUUID even on plain
 * http:// origins (#1024).
 */
export declare const UUID_POLYFILL_SCRIPT: string;
//# sourceMappingURL=uuid-polyfill.d.ts.map