# Changelog

## Unreleased

### Added

- feat: typescript typings

### Change

- fix: appState should remain undefined if pkce is false

## v1.0.0-beta1 (2023-03-17)

**Note**: Synced to [v0.1.1](https://github.com/jaredhanson/passport-openidconnect/releases/tag/v0.1.1) upstream release.

### Added

- chore: use eslint and prettier
- chore: reorganised github actions

### Changed

- refactor(BREAKING_CHANGE): token claim `oid` property no longer overwrites `profile.id` and returns as `profile.oid`.

### Security

- chore: updated `mocha` deps to resolve security warnings

## v0.3.3 (2022-09-04)

**Note**: Based on upstream [v0.0.2](https://github.com/jaredhanson/passport-openidconnect/releases/tag/v0.0.2) release.

### Added

- feat: replace `profile.id` with `oid` property from id token claim
- feat: provide pkce support
