# DataCert Deployment Guide

This guide explains how DataCert is distributed and how to release new versions.

---

## Distribution Methods

| Method | Use Case | Install Command |
|--------|----------|-----------------|
| **npm/npx** | Local UI + CLI profiling | `npx datacert` |
| **Docker** | Self-hosted web UI, air-gapped environments | `docker run -p 8080:80 datacert/datacert` |
| **Vercel** | Public hosted web app | Visit https://datacert.app |

---

## Quick Start (npm)

```bash
# Open local UI in browser
npx datacert

# Or headless profiling
npx datacert profile data.csv
```

**Commands:**
```bash
datacert                    # Opens UI at http://localhost:3000
datacert -p 8080            # Custom port
datacert --no-open          # Start server without opening browser
datacert profile data.csv   # Headless profiling (no UI)
datacert profile *.csv -f markdown  # Multiple files, markdown output
```

---

## npm Package Distribution

### What Gets Published

The CLI and bundled web UI are published to npm. The `files` field in `package.json` controls this:

```json
{
  "files": ["dist/cli/**/*"]
}
```

**Published structure:**
```
datacert/
├── dist/cli/
│   ├── cli/
│   │   ├── index.js          # Entry point (shebang: #!/usr/bin/env node)
│   │   ├── commands/
│   │   │   ├── profile.js    # Profile command implementation
│   │   │   └── serve.js      # Local server command
│   │   └── utils/
│   │       └── wasm-loader.js # Loads WASM binary
│   ├── wasm/
│   │   └── pkg/
│   │       ├── datacert_wasm_bg.wasm  # Rust/WASM binary (~2.2MB)
│   │       └── datacert_wasm.js       # JS bindings
│   └── web/                  # Bundled web UI (~3.5MB)
│       ├── index.html
│       ├── assets/
│       └── ...
├── package.json
├── README.md
└── LICENSE
```

### How It Works

**UI Mode (`datacert`):**
1. **User runs:** `npx datacert`
2. **npm downloads** the package (~5.7MB total)
3. **Local server starts** on port 3000 with COOP/COEP headers
4. **Browser opens** to http://localhost:3000
5. **Web UI runs locally** - all processing stays on user's machine

**Headless Mode (`datacert profile`):**
1. **User runs:** `npx datacert profile data.csv`
2. **CLI loads WASM** via `wasm-loader.js`
3. **Profiling runs** using the Rust/WASM engine
4. **Results output** to stdout (JSON, markdown, or YAML)

### Building the CLI

```bash
# 1. Build WASM first (required)
npm run build:wasm

# 2. Build CLI (compiles TypeScript, copies WASM)
npm run build:cli
```

The `build:cli` script does:
```bash
tsc -p tsconfig.cli.json && \
mkdir -p dist/cli/wasm/pkg && \
cp src/wasm/pkg/datacert_wasm_bg.wasm dist/cli/wasm/pkg/ && \
chmod +x dist/cli/cli/index.js
```

### Testing Locally Before Publish

```bash
# Test the built CLI directly
./dist/cli/cli/index.js profile tests/fixtures/sample.csv

# Or simulate npx with npm link
npm link
datacert profile tests/fixtures/sample.csv
npm unlink datacert
```

### Publishing to npm

**Manual publish:**
```bash
# Ensure you're logged in
npm login

# Build everything
npm run build:wasm
npm run build:cli

# Publish (removes "private" flag check)
npm publish --access public
```

**Automated publish (via GitHub Actions):**

Push a version tag to trigger the release workflow:
```bash
# Bump version
npm version patch  # 0.1.0 → 0.1.1
# or
npm version minor  # 0.1.0 → 0.2.0
# or
npm version major  # 0.1.0 → 1.0.0

# Push with tags
git push && git push --tags
```

The `release.yml` workflow will:
1. Build WASM and CLI
2. Run `npm publish --access public`
3. Also build and push Docker image

### Required Setup

1. **npm account:** Create at https://npmjs.com
2. **Automation token:** npmjs.com → Access Tokens → Generate New Token → Automation
3. **GitHub secret:** Add `NPM_TOKEN` to repo Settings → Secrets → Actions

### CLI Usage Examples

```bash
# Basic profiling
npx datacert profile data.csv

# Multiple files with glob
npx datacert profile "data/*.csv"

# Output as markdown (great for PRs)
npx datacert profile data.csv --format markdown

# Output as YAML
npx datacert profile data.csv --format yaml

# Quality gates for CI/CD
npx datacert profile data.csv --fail-on-missing 5 --fail-on-invalid 1

# Specify delimiter
npx datacert profile data.tsv --delimiter "\t"
```

---

## Docker Distribution

### What Gets Built

The Docker image contains the **web UI** (not the CLI). It's a static SPA served by nginx.

**Image layers:**
```
nginx:alpine (~8MB)
└── /usr/share/nginx/html/
    ├── index.html
    ├── manifest.json
    ├── sw.js (service worker)
    ├── assets/
    │   ├── datacert_wasm_bg-*.wasm (~2.2MB)
    │   ├── index-*.js (~900KB)
    │   └── index-*.css (~50KB)
    ├── icons/
    └── samples/
```

**Final image size:** ~15MB

### How It Works

1. **Multi-stage build:**
   - Stage 1 (`builder`): Install Rust, wasm-pack, Node.js deps, build everything
   - Stage 2 (`nginx:alpine`): Copy only the `dist/` output

2. **nginx serves** the SPA with special headers:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`
   - These headers enable `SharedArrayBuffer` for WASM threading

3. **SPA routing:** All non-asset requests return `index.html`

### Building the Image

```bash
# Build image
docker build -t datacert:latest .

# Build with specific tag
docker build -t datacert:1.0.0 .
```

**Build takes ~5-10 minutes** (Rust compilation is slow). Subsequent builds are faster due to Docker layer caching.

### Running Locally

```bash
# Run on port 8080
docker run -p 8080:80 datacert:latest

# Run in background
docker run -d -p 8080:80 --name datacert datacert:latest

# View logs
docker logs datacert

# Stop
docker stop datacert && docker rm datacert
```

Access at: http://localhost:8080

### Publishing to Docker Hub

**Manual push:**
```bash
# Login to Docker Hub
docker login

# Tag for Docker Hub
docker tag datacert:latest your-username/datacert:latest
docker tag datacert:latest your-username/datacert:1.0.0

# Push
docker push your-username/datacert:latest
docker push your-username/datacert:1.0.0
```

**Automated push (via GitHub Actions):**

Same as npm - push a version tag:
```bash
npm version patch
git push && git push --tags
```

The `release.yml` workflow will:
1. Build the Docker image
2. Tag as `datacert/datacert:latest` and `datacert/datacert:<version>`
3. Push to Docker Hub

### Required Setup

1. **Docker Hub account:** Create at https://hub.docker.com
2. **Create repository:** Create `datacert` repository in Docker Hub
3. **Access token:** Account Settings → Security → New Access Token
4. **GitHub secrets:** Add to repo Settings → Secrets → Actions:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: The access token

### Docker Compose (Optional)

For more complex setups, create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  datacert:
    image: datacert/datacert:latest
    ports:
      - "8080:80"
    restart: unless-stopped
    # Optional: health check
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

### Customizing nginx Config

To override the default nginx config, mount your own:

```bash
docker run -p 8080:80 \
  -v /path/to/custom-nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  datacert/datacert:latest
```

### Air-Gapped / Offline Deployment

For environments without internet access:

```bash
# On a machine with internet, save the image
docker save datacert/datacert:latest > datacert-image.tar

# Transfer datacert-image.tar to air-gapped machine

# On air-gapped machine, load the image
docker load < datacert-image.tar

# Run
docker run -p 8080:80 datacert/datacert:latest
```

---

## CI/CD Workflows

### Workflow Overview

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Build, lint, test |
| `deploy.yml` | Push to main | Deploy to Vercel |
| `release.yml` | Push tag `v*` | Publish npm + Docker |

### CI Workflow (`ci.yml`)

Runs on every push and PR:

1. Checkout code
2. Setup Node.js 20 + Rust
3. Install wasm-pack
4. `npm ci` (install deps)
5. `npm run build:wasm`
6. `npm run typecheck`
7. `npm run lint`
8. `npm run test:rust`
9. `npm run build` (web)
10. `npm run build:cli`
11. Upload `dist/` as artifact

### Release Workflow (`release.yml`)

Triggered by version tags (e.g., `v0.1.0`, `v1.0.0`):

**npm job:**
1. Build WASM + CLI
2. `npm publish --access public`

**Docker job:**
1. Build image with `docker/build-push-action`
2. Tag as `latest` and version
3. Push to Docker Hub

---

## Release Checklist

When releasing a new version:

1. **Update CHANGELOG** (if you have one)

2. **Bump version:**
   ```bash
   npm version patch  # or minor/major
   ```

3. **Push with tags:**
   ```bash
   git push && git push --tags
   ```

4. **Monitor GitHub Actions:**
   - Check `release.yml` workflow completes
   - Verify npm package at https://npmjs.com/package/datacert
   - Verify Docker image at https://hub.docker.com/r/datacert/datacert

5. **Verify installations:**
   ```bash
   # npm (may take a few minutes to propagate)
   npx datacert@latest profile test.csv

   # Docker
   docker pull datacert/datacert:latest
   docker run -p 8080:80 datacert/datacert:latest
   ```

---

## Troubleshooting

### npm: "WASM file not found"

The WASM path in `wasm-loader.ts` may be wrong. After compilation:
- `wasm-loader.js` is at `dist/cli/cli/utils/`
- WASM file is at `dist/cli/wasm/pkg/`
- Path should be `../wasm/pkg/datacert_wasm_bg.wasm`

### Docker: SharedArrayBuffer not available

Check browser console for COOP/COEP headers. The nginx config must include:
```nginx
add_header Cross-Origin-Opener-Policy same-origin;
add_header Cross-Origin-Embedder-Policy require-corp;
```

### Docker: WASM MIME type error

Ensure nginx.conf has:
```nginx
types {
    application/wasm wasm;
}
```

### GitHub Actions: Permission denied

Ensure secrets are configured:
- `NPM_TOKEN` for npm publish
- `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` for Docker push
