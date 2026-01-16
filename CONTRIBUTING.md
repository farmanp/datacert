# Contributing to DataCert

First off, thank you for considering contributing to DataCert! It's people like you that make DataCert such a great tool.

## 🛠 Project Architecture

DataCert is a hybrid application combining:
- **Core Engine**: Rust (compiled to WASM) for high-performance data processing.
- **Frontend**: SolidJS + Tailwind CSS for the user interface.
- **CLI**: Node.js wrapper for local execution.

Please read the [Architecture Documentation](docs/architecture/README.md) to understand the system design before making major changes.

## 🐛 Bug Reports

We use GitHub Issues for bug tracking.
**[Open a Bug Report](https://github.com/farmanp/datacert/issues/new?template=bug_report.md)**

When filing a bug, please include:
- A clear title and description.
- Steps to reproduce (including a sample CSV if possible/safe).
- Browser/OS version.
- Expected vs. Actual behavior.

## 💡 Feature Requests

Have an idea?
**[Open a Feature Request](https://github.com/farmanp/datacert/issues/new?template=feature_request.md)**

## 💻 Development Workflow

### Prerequisites
- Node.js (LTS)
- Rust & Cargo (Latest Stable)
- `wasm-pack` (`cargo install wasm-pack`)

### Setup
1. Fork and clone the repo.
2. Install dependencies: `npm install`
3. Build the WASM module: `npm run build:wasm`
4. Start the dev server: `npm run dev`

### Project Structure
- `src/app`: SolidJS Frontend code.
- `src/wasm`: Rust Core Engine code.
- `tests/`: Integration and Unit tests.
- `tickets/`: Feature specifications and task tracking.

## ✅ Testing & Quality

We prioritize stability and correctness.
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **End-to-End Tests**: `npm run test:e2e`
- **Linting**: `npm run lint` & `npm run format`

**All PRs must pass the full test suite (`npm test`) before merging.**

## 📝 Commit Messages

We encourage clear, descriptive commit messages.
- Use the present tense ("Add feature" not "Added feature").
- Reference issues if applicable ("Fixes #123").

## 📄 License

By contributing, you agree that your contributions will be licensed under its MIT License.
