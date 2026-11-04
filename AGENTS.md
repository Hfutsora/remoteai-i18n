# Internationalization repository

Keep instructions in English.

- This is the independent `piperhex/remoteai-i18n` repository and Remote AI's `packages/i18n` submodule.
- Keep translation sources, language policies and platform resource sources here. Do not copy source
  dictionaries into consumers. Published dependency packages are immutable snapshots, not editable copies.
- Preserve public `@remoteai/i18n` entries, released languages, fallback behavior and semantic protocol values.
- Package generation and tests must work without a parent checkout. Application generation and ownership
  checks require an explicit host root; never infer it from this repository's location.
- Run `npm run generate`, `npm run check`, `npm run pack:release` and `npm run test:package` before release.
  Validate affected consumers separately using their integration and ownership checks.
- Publish `i18n-v<version>` tags. Keep published assets immutable; use a new version for changes.
- Keep individual scripts focused and generally below 500 lines. Test path boundaries and package consumers.
- After verification, commit only task changes and push the configured upstream. Merge remote updates
  without rewriting history; abort conflicts and report them. Push the child before updating a parent gitlink.
