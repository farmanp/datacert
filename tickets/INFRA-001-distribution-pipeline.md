# INFRA-001: Distribution Pipeline

## Status: COMPLETED

## Summary
Make DataCert instantly usable without cloning/building from source via three distribution methods:
1. **Hosted web app** - Visit datacert.app, zero install
2. **npm/npx CLI** - `npx datacert profile data.csv`
3. **Docker image** - `docker run -p 8080:80 datacert/datacert`

## Implementation Details

### Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `vercel.json` | Created | Vercel hosting config with COOP/COEP headers |
| `package.json` | Modified | Removed private flag, added npm metadata |
| `src/cli/utils/wasm-loader.ts` | Fixed | Corrected WASM path for npm distribution |
| `.npmignore` | Created | Only include CLI dist in npm package |
| `Dockerfile` | Created | Multi-stage build (node:20-alpine → nginx:alpine) |
| `docker/nginx.conf` | Created | Nginx config for SPA + WASM with required headers |
| `.dockerignore` | Created | Exclude dev files from Docker context |
| `.github/workflows/ci.yml` | Created | CI pipeline (build, lint, test) |
| `.github/workflows/deploy.yml` | Created | Auto-deploy to Vercel on push to main |
| `.github/workflows/release.yml` | Created | Publish to npm + Docker Hub on tag |

### Required GitHub Secrets

Before the workflows work, these secrets must be configured in the repository:

| Secret | Source | Used By |
|--------|--------|---------|
| `VERCEL_TOKEN` | Vercel account settings → Tokens | deploy.yml |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` | deploy.yml |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` | deploy.yml |
| `NPM_TOKEN` | npmjs.com → Access Tokens (Automation) | release.yml |
| `DOCKERHUB_USERNAME` | Docker Hub account username | release.yml |
| `DOCKERHUB_TOKEN` | Docker Hub → Account Settings → Security → Access Tokens | release.yml |

### Setup Steps (Manual)

#### 1. Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Link project (creates .vercel/project.json)
vercel link

# Get org and project IDs from .vercel/project.json
cat .vercel/project.json

# Add secrets to GitHub repository settings
```

#### 2. npm Setup
```bash
# Login to npm
npm login

# Create automation token at npmjs.com
# Add NPM_TOKEN secret to GitHub
```

#### 3. Docker Hub Setup
```bash
# Create repository at hub.docker.com
# Create access token at Docker Hub → Account Settings → Security
# Add DOCKERHUB_USERNAME and DOCKERHUB_TOKEN secrets to GitHub
```

### Verification Commands

**Web (after Vercel deploy):**
```bash
curl -I https://datacert.app | grep -E "(Cross-Origin|Content-Type)"
```

**npm (after publish):**
```bash
npx datacert profile tests/fixtures/sample.csv
npx datacert profile *.csv --format markdown
```

**Docker (after push):**
```bash
docker run -p 8080:80 datacert/datacert
curl http://localhost:8080
```

### Technical Notes

#### COOP/COEP Headers
Required for SharedArrayBuffer (WASM threading):
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These are configured in:
- `vercel.json` for Vercel hosting
- `docker/nginx.conf` for Docker deployment

#### WASM Path Fix
The CLI's wasm-loader.ts had incorrect path resolution:
- **Before**: `../../wasm/pkg/datacert_wasm_bg.wasm` (wrong after tsc compilation)
- **After**: `../wasm/pkg/datacert_wasm_bg.wasm` (correct for dist/cli structure)

The compiled structure is:
```
dist/cli/
├── cli/
│   └── utils/
│       └── wasm-loader.js  (compiled from src/cli/utils/)
└── wasm/
    └── pkg/
        └── datacert_wasm_bg.wasm  (copied by build:cli script)
```

#### npm Package Contents
`.npmignore` ensures only CLI distribution is published:
- `dist/cli/**/*` - CLI code and WASM
- `package.json`, `README.md`, `LICENSE` - metadata

Web app dist is NOT included (use Vercel hosting instead).

## Release Process

To publish a new version:

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Push with tag
git push && git push --tags

# 3. GitHub Actions will automatically:
#    - Build and test
#    - Publish to npm
#    - Build and push Docker image
```

## Dependencies

- Node.js 18+ (for CLI)
- Rust + wasm-pack (for WASM compilation)
- GitHub Actions (for CI/CD)
- Vercel account (for hosting)
- npm account (for package publishing)
- Docker Hub account (for image hosting)
