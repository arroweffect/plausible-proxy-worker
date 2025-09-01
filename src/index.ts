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

/**
 * Plausible first-party proxy for analytics.<client>.com
 * - GET  /p.js        -> plausible.io/js/plausible.js
 * - POST /api/event   -> plausible.io/api/event
 *
 * Test: wrangler dev  (http://localhost:8787/p.js)
 */

const UPSTREAM = 'https://plausible.io';

// Optional: comma-separated allowlist of analytics hosts, e.g. "analytics.bullingtonconsulting.com,analytics.acme.com"
const ALLOW_HOSTS = (globalThis as any).ALLOW_HOSTS as string | undefined;

export default {
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url);
		const host = url.host;

		// Host allowlist (defense-in-depth)
		if (ALLOW_HOSTS) {
			const ok = ALLOW_HOSTS.split(',')
				.map((s) => s.trim())
				.includes(host);
			if (!ok) return new Response('Forbidden', { status: 403 });
		}

		// CORS preflight
		if (req.method === 'OPTIONS') {
			return new Response(null, { headers: cors(req, host) });
		}

		// Serve script
		if (req.method === 'GET' && url.pathname === '/p.js') {
			const res = await fetch(`${UPSTREAM}/js/plausible.js`, { headers: forward(req) });
			return new Response(res.body, {
				status: res.status,
				headers: {
					'content-type': 'application/javascript; charset=utf-8',
					'cache-control': 'public, max-age=3600', // 1h edge cache
					...cors(req, host), // fine if Origin missing
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
				status: res.status, // 202 on success
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'cache-control': 'no-store',
					...cors(req, host),
					...sec(),
				},
			});
		}

		// 404
		return new Response('Not found', { status: 404, headers: cors(req, host) });
	},
};

// CORS: allow only the site origins derived from this analytics host (apex + www)
function cors(req: Request, host: string): Record<string, string> {
	const root = host.startsWith('analytics.') ? host.slice('analytics.'.length) : host;
	const allowed = new Set([`https://${root}`, `https://www.${root}`]);

	const origin = req.headers.get('origin') ?? '';
	if (!origin) {
		// No Origin (e.g., GET /p.js in some contexts): keep headers minimal
		return {
			'access-control-allow-methods': 'GET,POST,OPTIONS',
			'access-control-allow-headers': 'content-type',
			'access-control-max-age': '86400',
			vary: 'Origin',
		};
	}

	if (allowed.has(origin)) {
		return {
			'access-control-allow-origin': origin,
			'access-control-allow-methods': 'GET,POST,OPTIONS',
			'access-control-allow-headers': 'content-type',
			'access-control-max-age': '86400',
			vary: 'Origin',
		};
	}

	// Not allowed: return only Vary so browser blocks it
	return { vary: 'Origin' };
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
