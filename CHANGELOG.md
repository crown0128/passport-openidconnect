# Changelog

## v1.0.0-beta3 (2023-04-25)

### Changed

- refactor: use `SessionContext` to hold pkce verifier instead of `appState`
- fix: removed unused `meta` argument from `Session.store()`
- fix: improved type definitions for typescript
- fix: "openid" added to scope even if already present. Take in fix from uptream [PR#99](https://github.com/jaredhanson/passport-openidconnect/pull/99).

### Added

- docs: more jsdocs updates
- docs: add constructor parameter description to README

## v1.0.0-beta2 (2023-04-18)

**Note**: Synced to [v0.1.1](https://github.com/jaredhanson/passport-openidconnect/releases/tag/v0.1.1) upstream release.

### Added

- feat: typescript typings

### Changed

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
