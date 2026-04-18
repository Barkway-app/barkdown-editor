# Changelog

All notable changes to this project will be documented in this file.

## 0.1.5 - 2026-04-18

### Added
- Added `disabled` and `readonly` flags to `BarkdownEditor` so host apps can render non-editable states while consistently blocking toolbar, hotkey, and merge-tag write actions.

## 0.1.4 - 2026-04-18

### Changed
- Replaced the default inserted markdown link URL with a neutral `url` placeholder so the package no longer ships a hardcoded Barkway domain in runtime link insertion behavior.

### Docs
- Added an explicit licensing section to the README clarifying that the package is licensed as `GPL-3.0-only` and pointing to the full license text.

## 0.1.3 - 2026-04-18

### Fixed
- Scoped distributed Barkdown styles to Barkdown-prefixed selectors only, preventing leakage of global utility classes into host applications.
- Added a build-time CSS scope guard that fails if `dist/style.css` contains unscoped class selectors.
- Adjusted demo tagline spacing below the Barkdown logo for cleaner header layout.

### Changed
- Removed Tailwind/PostCSS from package build dependencies.
- Switched demo Tailwind usage to a CDN include in `index.html` instead of local Tailwind build tooling.
