# Plausible Proxy Worker

A Cloudflare Workers-based proxy for Plausible Analytics that allows you to serve analytics from your own domain, improving data collection reliability by avoiding ad-blockers and privacy extensions.

## Overview

This worker acts as a first-party proxy between your website and Plausible Analytics, routing requests through your own domain (e.g., `analytics.yourdomain.com`) instead of directly to `plausible.io`. This approach:

- **Bypasses ad-blockers** that commonly block third-party analytics scripts
- **Improves data accuracy** by avoiding browser privacy features that block cross-origin requests
- **Maintains privacy** while ensuring complete analytics coverage
- **Reduces script loading failures** caused by network-level blocking

## How It Works

The worker provides two main endpoints:

1. **`/p.js`** - Serves the Plausible analytics script from your domain
2. **`/api/event`** - Proxies analytics events to Plausible's servers

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

### 2. Configure Your Domain

Edit `wrangler.jsonc` to configure your analytics subdomain:

```jsonc
{
  "routes": [
    {
      "pattern": "analytics.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

Replace `yourdomain.com` with your actual domain.

### 3. Optional: Set Host Allowlist

For additional security, you can restrict which domains can use your proxy by setting the `ALLOW_HOSTS` environment variable:

```jsonc
{
  "vars": {
    "ALLOW_HOSTS": "analytics.yourdomain.com,analytics.anotherdomain.com"
  }
}
```

### 4. Deploy

```bash
npm run deploy
```

## Usage

### Update Your Website

Replace your existing Plausible script tag:

**Before:**
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

**After:**
```html
<script defer data-domain="yourdomain.com" src="https://analytics.yourdomain.com/p.js"></script>
```

### DNS Configuration

Ensure your analytics subdomain points to your Cloudflare Workers:

1. In your Cloudflare dashboard, go to your domain's DNS settings
2. Add a CNAME record: `analytics` pointing to your worker (this is usually handled automatically by the route configuration)

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

- **`ALLOW_HOSTS`** (optional): Comma-separated list of allowed hostnames for additional security

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

- **Host allowlist**: Optional restriction of which domains can use the proxy
- **CORS headers**: Proper cross-origin resource sharing configuration
- **Security headers**: Includes `x-content-type-options` and `referrer-policy`
- **Request forwarding**: Preserves necessary headers (User-Agent, Referer) for accurate analytics

## Troubleshooting

### Analytics Not Working

1. **Check domain configuration**: Ensure your analytics subdomain is properly configured in `wrangler.jsonc`
2. **Verify DNS**: Confirm your subdomain resolves correctly
3. **Check browser console**: Look for any JavaScript errors or network failures
4. **Test endpoints directly**: Visit `https://analytics.yourdomain.com/p.js` to verify the script loads

### CORS Issues

If you encounter CORS errors:

1. Verify the script is loaded from the same domain as configured
2. Check that the `data-domain` attribute matches your actual domain
3. Ensure the worker is properly handling OPTIONS preflight requests

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