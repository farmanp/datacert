# AI-Ready Infra Template

## 1. Objective (Required)
**What:**
Set up the monorepo project structure with Vite, SolidJS frontend, and Rust/WASM toolchain for the DataCert PWA.

**Why:**
This is the foundational infrastructure required before any feature development can begin. The WASM toolchain is critical for achieving the performance targets (10MB CSV < 3s, 100MB < 15s).

## 2. Scope (Required)
**In Scope:**
- Initialize npm project with Vite + SolidJS
- Configure Rust workspace with wasm-pack and wasm-bindgen
- Set up Tailwind CSS for styling
- Configure TypeScript with strict mode
- Create directory structure per PRD specification
- Set up vitest for testing
- Configure ESLint and Prettier
- Create basic development scripts (dev, build, test)

**Out of Scope:**
- PWA configuration (separate ticket)
- Web Worker setup (separate ticket)
- Actual parser/statistics implementation
- CI/CD pipeline

## 3. Technical Approach
**Strategy:**
1. Initialize Vite project with SolidJS template
2. Add Rust workspace in `src/wasm/` directory
3. Configure wasm-pack to output to `src/wasm/pkg/`
4. Set up Vite plugin for WASM loading
5. Create placeholder modules for each subsystem

**Files to Create:**
- `package.json` - npm dependencies and scripts
- `vite.config.ts` - Vite configuration with WASM support
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind setup
- `src/wasm/Cargo.toml` - Rust workspace configuration
- `src/wasm/src/lib.rs` - WASM entry point
- `src/app/index.tsx` - SolidJS entry point
- `src/app/App.tsx` - Root component

**Dependencies:**
```json
{
  "solid-js": "^1.8.x",
  "@solidjs/router": "^0.10.x",
  "vite": "^5.x",
  "vite-plugin-solid": "^2.x",
  "tailwindcss": "^3.x",
  "vitest": "^1.x"
}
```

**Rust Dependencies (Cargo.toml):**
```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
js-sys = "0.3"
web-sys = "0.3"
```

## 4. Acceptance Criteria (Required)
- [ ] `npm run dev` starts Vite dev server with HMR
- [ ] `npm run build` produces production bundle
- [ ] `npm run build:wasm` compiles Rust to WASM successfully
- [ ] SolidJS app renders "DataCert" placeholder
- [ ] WASM module can be imported and called from TypeScript
- [ ] Tailwind CSS classes work in components
- [ ] TypeScript compilation has zero errors
- [ ] Total JS bundle size < 50KB (excluding WASM)

## 5. Rollback Plan
Delete project directory and reinitialize if fundamental configuration issues arise.

## 6. Planned Git Commit Message(s)
- chore(project): initialize vite + solidjs project structure
- chore(wasm): configure rust workspace with wasm-pack
- chore(style): add tailwind css configuration
- chore(test): configure vitest for unit testing

## 7. Verification
- [ ] All acceptance criteria pass
- [ ] `npm test` runs without errors
- [ ] Dev server loads in Chrome, Firefox, Safari
- [ ] WASM binary size < 500KB initially
