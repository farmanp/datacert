# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.15] - 2026-01-15

### Added
- **Global Drag & Drop Overlay**: Added a premium full-screen glassmorphism overlay for immersive file imports.
- **Privacy Badge**: Integrated a "Local Processing" status indicator in the common navigation with pulsing animations and hover tooltips.
- **Performance Metrics**: Added real-time profiling metrics (processed size and wall-clock time) in both table and card views.
- **Interactive Error Feedback**: Implemented immediate modal error displays for unsupported file formats during import.
- **Demo Workspace**: Added a refined "Explore with Sample Data" mode with a minimal "Demo" status badge in results.
- **Automated UX Tests**: Added comprehensive unit tests for global drag interactions and performance metric formatting.

### Changed
- Refined the results header layout with better hierarchy and airier spacing.
- Enhanced file dropzone hover states with pulse rings and contextual text prompts.
- Updated breadcrumbs and navigation to better support multi-page feature exploration.

### Fixed
- Resolved context errors in `Home.test.tsx` by providing a robust `@solidjs/router` mock.
- Standardized file size formatting across the application.

---

## [0.1.14] - 2026-01-14

### Added
- Remote GCS bucket profiling with streaming support.
- JSON structure "Tree Mode" for hierarchical datasets.
- Schema validation via Great Expectations and Soda Checks.

### Changed
- Switched large Parquet/Avro files (>100MB) to DuckDB-based profiling to prevent memory issues.
- Improved SQL Mode lazy loading of DuckDB-WASM.

## [0.1.13] - 2026-01-12

### Added
- Initial batch processing support for multi-file profiling.
- Pearson correlation matrix for numeric columns.

## [0.1.12] - 2026-01-10

### Added
- PWA support with offline profiling capabilities.
- Dark theme as the default Premium UI.
