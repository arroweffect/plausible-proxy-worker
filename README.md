# Plausible Proxy Worker

A scalable Cloudflare Workers-based proxy for Plausible Analytics that serves multiple client websites from a single deployment using the `analytics.<client>.com` pattern.

## Overview

This worker acts as a first-party proxy between your websites and Plausible Analytics, routing requests through client-specific subdomains (e.g., `analytics.bullingtonconsulting.com`) instead of directly to `plausible.io`. This approach:

- **Bypasses ad-blockers** that commonly block third-party analytics scripts
- **Improves data accuracy** by avoiding browser privacy features that block cross-origin requests
- **Scales to multiple clients** with a single worker deployment
- **Maintains privacy** while ensuring complete analytics coverage
- **Automatically handles CORS** for both apex and www domains

## How It Works

The worker provides two main endpoints:

1. **`/p.js`** - Serves the Plausible analytics script from your domain
2. **`/api/event`** - Proxies analytics events to Plausible's servers

### Multi-Client Architecture

- Deploy once, serve unlimited client domains
- Pattern: `analytics.<client>.com` automatically allows:
  - `https://<client>.com` (apex domain)
  - `https://www.<client>.com` (www subdomain)
- Smart CORS handling based on the analytics hostname

## Setup

### Prerequisites

- Cloudflare account with Workers enabled
- Custom domain managed through Cloudflare
- Node.js and npm installed locally

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd plausible-worker
npm install
```

### 2. Configure Your Domains

Edit `wrangler.jsonc` to configure your analytics subdomains for multiple clients:

```jsonc
{
  "routes": [
    {
      "pattern": "analytics.client1.com/*",
      "zone_name": "client1.com"
    },
    {
      "pattern": "analytics.client2.com/*",
      "zone_name": "client2.com"
    }
    // Add more client domains as needed
  ]
}
```

### 3. Optional: Restrict Access with Host Allowlist

For additional security, you can restrict which analytics domains can use your proxy by setting the `ALLOW_HOSTS` environment variable in `wrangler.toml`:

```toml
[vars]
ALLOW_HOSTS = "analytics.client1.com,analytics.client2.com"
```

Or via Cloudflare dashboard: Workers & Pages → Your Worker → Settings → Variables

**Note:** Without `ALLOW_HOSTS`, any domain with the `analytics.<domain>` pattern can use your worker.

### 4. Deploy

```bash
npm run deploy
```

## Usage

### Update Your Client Websites

For each client website, replace the Plausible script tag:

**Before:**
```html
<script defer data-domain="clientdomain.com" src="https://plausible.io/js/script.js"></script>
```

**After:**
```html
<script defer data-domain="clientdomain.com" src="https://analytics.clientdomain.com/p.js"></script>
```

The worker automatically handles CORS to allow requests from both `clientdomain.com` and `www.clientdomain.com`.

### DNS Configuration

For each client domain:

1. In Cloudflare dashboard, go to the client domain's DNS settings
2. Add a CNAME record: `analytics` pointing to your worker route
3. Or use a wildcard route in your worker configuration to handle all `analytics.*` subdomains automatically

## Development

### Local Development

Start the development server:

```bash
npm run dev
```

This will start a local server at `http://localhost:8787/` where you can test your worker.

### Testing

Run the test suite:

```bash
npm run test
```

### Type Generation

Generate TypeScript types for Cloudflare bindings:

```bash
npm run cf-typegen
```

## Configuration Options

### Environment Variables

- **`ALLOW_HOSTS`** (optional): Comma-separated list of allowed analytics hostnames
  - Example: `"analytics.client1.com,analytics.client2.com"`
  - If not set: Any `analytics.<domain>` can use the worker
  - If set: Only listed domains can use the worker (403 for others)

### Routes

Configure which domains should route to your worker in `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "analytics.domain1.com/*",
    "zone_name": "domain1.com"
  },
  {
    "pattern": "analytics.domain2.com/*", 
    "zone_name": "domain2.com"
  }
]
```

## Security Features

- **Smart CORS Policy**: Automatically allows only the correct origin based on analytics hostname
  - `analytics.example.com` → allows `https://example.com` and `https://www.example.com`
  - Denies all other origins (returns minimal headers to trigger browser blocking)
- **Host allowlist**: Optional restriction via `ALLOW_HOSTS` environment variable
- **Defense in depth**: Multiple security layers (host validation + CORS)
- **Security headers**: Includes `x-content-type-options` and `referrer-policy`
- **Minimal data forwarding**: Only forwards necessary headers (User-Agent, Referer) to Plausible

## Troubleshooting

### Analytics Not Working

1. **Check domain configuration**: Ensure your analytics subdomain is properly configured in `wrangler.jsonc`
2. **Verify DNS**: Confirm your subdomain resolves correctly
3. **Check browser console**: Look for any JavaScript errors or network failures
4. **Test endpoints directly**: Visit `https://analytics.yourdomain.com/p.js` to verify the script loads

### CORS Issues

If you encounter CORS errors:

1. **Check the origin**: The worker automatically allows requests from:
   - `https://<client>.com` (if analytics is at `analytics.<client>.com`)
   - `https://www.<client>.com` (www variant)
2. **Verify script source**: Ensure your script tag uses `https://analytics.<client>.com/p.js`
3. **Check `data-domain`**: Should match your actual domain in Plausible
4. **Subdomain sites**: If your site is at `app.example.com`, you need `analytics.app.example.com`

### 403 Forbidden Errors

If you're getting 403 errors and have `ALLOW_HOSTS` configured:

1. Verify your domain is included in the allowlist
2. Check for typos in domain names
3. Ensure there are no extra spaces in the comma-separated list

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]