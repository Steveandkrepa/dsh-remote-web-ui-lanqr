/**
 * Deployment posture probe: verify that the connection plugin's `/api` fence
 * actually refuses non-loopback requests for every origin this deployment
 * advertises (the public tunnel host, the LAN bases). The fence is the SDK's
 * own Host check — the one seam a plugin cannot mount a gate into — so this
 * probe is the guardrail that makes a re-opened `/api` (for example a
 * re-added `--trusted-host`, or the SDK's LAN-literal auto-trust under
 * `--host 0.0.0.0`) visible instead of silent.
 *
 * The probe issues loopback requests with a forged Host header — the exact
 * shape a tunnel or LAN client produces — and treats anything other than a
 * 403 or a 401 as exposed. The fence is documented to refuse with 403; the
 * harness answers 401 when the Host fence PASSED but the browser-auth cookie
 * is missing (the connection plugin checks the fence first and the cookie
 * second). A 401 therefore means the /api surface is still gated — reporting
 * it as open produced a false CRITICAL on exactly the supported LAN
 * deployment (0.0.0.0 bind auto-trusts the LAN literals) and desensitized the
 * one alarm that should mean a real exposure.
 */
import http from 'node:http';
/** Whether any probed origin is currently exposed. */
export function anyExposed(snapshot) {
    return snapshot.hosts.some(host => host.exposed);
}
/**
 * Build the forged Host values to probe: the public base authority (host or
 * host:port as written in the URL) plus every LAN base literal.
 * @param publicBaseUrl - the configured public base URL (or undefined).
 * @param lanAddresses - the LAN interface addresses the QR advertises.
 * @param port - the local webServer port (LAN hosts are probed as host:port).
 * @returns Host header values, de-duplicated.
 */
export function postureTargets(publicBaseUrl, lanAddresses, port) {
    const targets = [];
    if (publicBaseUrl !== undefined) {
        try {
            const url = new URL(publicBaseUrl);
            const authority = url.port === '' ? url.hostname : `${url.hostname}:${url.port}`;
            if (authority !== '')
                targets.push(authority);
        }
        catch {
            // A malformed base is ignored elsewhere with a warning; nothing to probe.
        }
    }
    for (const address of lanAddresses) {
        targets.push(`${address}:${String(port)}`);
    }
    return [...new Set(targets)];
}
const defaultRequest = (options, onStatus) => {
    const request = http.request(options, response => { onStatus(response.statusCode ?? 0); });
    request.on('error', () => { onStatus(0); });
    return request;
};
/**
 * Probe one forged Host against the local `/api` fence.
 * @param port - the local webServer port.
 * @param hostHeader - the Host header to forge.
 * @param request - transport seam.
 * @param timeoutMs - give up after this long (counts as not exposed; the
 * fence being unreachable is not evidence it is open).
 * @returns true when the probe got past the fence.
 */
async function probeHost(port, hostHeader, request, timeoutMs) {
    return await new Promise(resolve => {
        let settled = false;
        const finish = (exposed) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            handle.destroy();
            resolve(exposed);
        };
        const handle = request({
            host: '127.0.0.1',
            port,
            method: 'POST',
            path: '/api/session.list',
            headers: { host: hostHeader, 'content-type': 'application/json' },
            timeout: timeoutMs,
        }, status => { finish(status !== 403 && status !== 401); });
        const timer = setTimeout(() => { finish(false); }, timeoutMs + 1_000);
        handle.on('error', () => { finish(false); });
        handle.end('{}');
    });
}
/**
 * Run one posture probe round.
 * @returns the snapshot for this round.
 */
export async function probePosture(options) {
    const { port, targets } = options;
    const request = options.request ?? defaultRequest;
    const timeoutMs = options.timeoutMs ?? 3_000;
    const now = options.now ?? (() => Date.now());
    const hosts = [];
    for (const target of targets) {
        // Sequential on purpose: one slow host must not multiply the round's latency.
        hosts.push({ host: target, exposed: await probeHost(port, target, request, timeoutMs) });
    }
    return { checkedAt: now(), hosts };
}
/**
 * Reserve an advertised-target key so a second trigger with the same set
 * does not overlap an in-flight round. Pair with {@link releasePostureKey}
 * on failure — otherwise that key never retries.
 */
export function claimPostureKey(current, key) {
    if (current === key)
        return { run: false, next: current };
    return { run: true, next: key };
}
/**
 * Drop a failed in-flight key so the next trigger re-probes the same targets.
 * A newer key that started meanwhile is left alone.
 */
export function releasePostureKey(current, attempted) {
    return current === attempted ? undefined : current;
}
