# Changelog

All notable changes to this project will be documented in this file.

## 0.1.3 - 2026-04-18

### Fixed
- Scoped distributed Barkdown styles to Barkdown-prefixed selectors only, preventing leakage of global utility classes into host applications.
- Added a build-time CSS scope guard that fails if `dist/style.css` contains unscoped class selectors.
- Adjusted demo tagline spacing below the Barkdown logo for cleaner header layout.

### Changed
- Removed Tailwind/PostCSS from package build dependencies.
- Switched demo Tailwind usage to a CDN include in `index.html` instead of local Tailwind build tooling.
