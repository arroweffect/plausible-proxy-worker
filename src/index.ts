/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// First-party Plausible proxy for all clients via analytics.<client>.com
const UPSTREAM = 'https://plausible.io';

// Optional: comma-separated allowlist of hostnames, e.g. "analytics.bullingtonconsulting.com,analytics.acme.com"
const ALLOW_HOSTS = (globalThis as any).ALLOW_HOSTS as string | undefined;

export default {
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url);
		const host = url.host;

		// Host allowlist (defense in depth)
		if (
			ALLOW_HOSTS &&
			!ALLOW_HOSTS.split(',')
				.map((s) => s.trim())
				.includes(host)
		) {
			return new Response('Forbidden', { status: 403 });
		}

		// CORS / preflight
		if (req.method === 'OPTIONS') return new Response(null, { headers: cors(url) });

		// Serve script
		if (req.method === 'GET' && url.pathname === '/p.js') {
			const res = await fetch(`${UPSTREAM}/js/plausible.js`, { headers: forward(req) });
			return new Response(res.body, {
				status: res.status,
				headers: {
					'content-type': 'application/javascript; charset=utf-8',
					'cache-control': 'public, max-age=3600', // 1h
					...cors(url),
					...sec(),
				},
			});
		}

		// Forward events
		if (req.method === 'POST' && url.pathname === '/api/event') {
			const body = await req.text(); // pass-through
			const res = await fetch(`${UPSTREAM}/api/event`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'user-agent': req.headers.get('user-agent') ?? '',
					referer: req.headers.get('referer') ?? '',
				},
				body,
			});
			return new Response(res.body, {
				status: res.status, // Plausible returns 202 on success
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'cache-control': 'no-store',
					...cors(url),
					...sec(),
				},
			});
		}

		return new Response('Not found', { status: 404, headers: cors(url) });
	},
};

function cors(url: URL) {
	const origin = `${url.protocol}//${url.host}`;
	return {
		'access-control-allow-origin': origin,
		'access-control-allow-methods': 'GET,POST,OPTIONS',
		'access-control-allow-headers': 'content-type',
		'access-control-max-age': '86400',
		vary: 'Origin',
	};
}
function sec() {
	return {
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'strict-origin-when-cross-origin',
	};
}
function forward(req: Request) {
	return {
		'user-agent': req.headers.get('user-agent') ?? '',
		referer: req.headers.get('referer') ?? '',
	};
}
