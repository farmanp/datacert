# Release Process Guide

This guide documents how to properly build, test, and publish the DataCert npm package.

## Overview

DataCert is a **hybrid package** - it includes:
- CLI tool (`datacert` command)
- Web UI (served via `datacert serve`)
- WASM profiling engine

**Critical**: The web UI must be built BEFORE packaging the CLI.

---

## Pre-Release Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Code committed to `main` branch
- [ ] Version bumped in `package.json`

---

## Build Process

### 1. Build WASM Module
```bash
npm run build:wasm
```
**Output**: `src/wasm/pkg/` (included in both CLI and web)

### 2. Build Web UI
```bash
npm run build
```
**Output**: `dist/` directory containing:
- `dist/assets/` - Bundled JS/CSS/WASM
- `dist/index.html` - App entry point
- `dist/sw.js` - Service worker (with inlined workbox)
- `dist/icons/` - PWA icons
- `dist/manifest.json` - PWA manifest

**⚠️ CRITICAL**: This step MUST complete successfully before building CLI.

### 3. Build CLI Package
```bash
npm run build:cli
```
**Output**: `dist/cli/` directory containing:
```
dist/cli/
├── cli/           # Compiled TypeScript CLI code
│   ├── index.js   # Entry point (bin/datacert)
│   ├── commands/  # CLI commands
│   └── utils/     # CLI utilities
├── wasm/          # WASM module for CLI profiler
│   └── pkg/
└── web/           # Web UI for 'datacert serve'
    ├── assets/    # ← Copied from dist/assets/
    ├── index.html # ← Copied from dist/index.html
    ├── sw.js      # ← Copied from dist/sw.js
    └── icons/     # ← Copied from dist/icons/
```

**What this does**:
1. Compiles TypeScript CLI code → `dist/cli/cli/`
2. Copies WASM files → `dist/cli/wasm/pkg/`
3. **Copies built web UI** → `dist/cli/web/`

---

## Testing Before Publish

### Test Local Build

**ALWAYS test the local build before publishing:**

```bash
# Start the CLI web server with local build
node dist/cli/cli/index.js serve
```

Then in an **incognito/private browser window** (to avoid cache):
1. Navigate to `http://localhost:3000`
2. Upload a CSV file
3. Test basic profiling
4. Go to `/sql-mode` and test SQL queries
5. Verify no console errors

**Why incognito?** Service workers cache aggressively. Incognito ensures you're testing the actual build, not cached code.

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to load workbox" | Old dist/ build | Run `npm run build` again |
| "DuckDB threading error" | Old code bundled | Check source files, rebuild |
| 404 for assets | Forgot `build:cli` | Run `npm run build:cli` |

---

## Release Workflow

### Full Release Command Sequence

```bash
# 1. Clean build (optional but recommended)
rm -rf dist/

# 2. Build everything in order
npm run build:wasm  # WASM module
npm run build       # Web UI
npm run build:cli   # CLI package

# 3. Test locally
node dist/cli/cli/index.js serve
# → Open browser and test

# 4. Bump version
# Edit package.json, change version (e.g., 0.1.9 → 0.1.10)

# 5. Rebuild CLI with new version
npm run build:cli

# 6. Commit and tag
git add package.json
git commit -m "chore: bump version to v0.1.10"
git tag v0.1.10
git push origin main
git push origin v0.1.10

# 7. Publish to npm
npm publish --access public
```

---

## Version Numbering

Use [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.2.0): New features, backward compatible
- **PATCH** (0.1.1): Bug fixes

### Recent Examples
- `0.1.9`: Fixed DuckDB threading bugs (patch)
- `0.2.0`: Would be adding new CLI commands (minor)
- `1.0.0`: Would be stable public API (major)

---

## Troubleshooting

### "Cannot publish over previously published version"

You forgot to bump the version! Or you're trying to republish the same version.

**Fix**:
```bash
# Edit package.json, increment version
npm run build:cli
git add package.json
git commit -m "chore: bump version"
npm publish --access public
```

### Published package still has bugs

The published package uses the **dist/cli/** folder content. If bugs exist:

1. Verify source code is fixed
2. Run full build sequence
3. Test locally with `node dist/cli/cli/index.js serve`
4. Bump version
5. Rebuild: `npm run build:cli`
6. Republish

**Remember**: `npm publish` only uploads what's in `dist/cli/` (per `files` in package.json).

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run build:wasm` | Compile Rust → WASM |
| `npm run build` | Build web UI → `dist/` |
| `npm run build:cli` | Package CLI → `dist/cli/` |
| `node dist/cli/cli/index.js serve` | Test local CLI |
| `npm publish --access public` | Publish to npm |

---

## Notes

- **Always test locally** before publishing
- **Always rebuild** after version bumps
- **Use incognito** for testing to avoid cache
- `dist/cli/web/` is what users get when running `npx datacert serve`

## Related

- [ADR-021: DuckDB Single-Threaded Mode](./adr-021-duckdb-single-threaded.md)
- [FEAT-020: SQL Mode](../../tickets/FEAT-020-sql-mode.md)
