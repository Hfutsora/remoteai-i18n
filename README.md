# @remoteai/i18n

Private npm workspace package. Source exports are compiled by each application's Vite, Metro or TypeScript toolchain;
there is no npm publication or separate build step. The root entry has no React, browser, storage or dictionary imports.

## Entries

| Entry | Purpose |
| --- | --- |
| `@remoteai/i18n` | Registry, instance engine, interpolation, plurals, date and number formatting |
| `@remoteai/i18n/react` | `I18nProvider` (`Provider`), `useT`, `useLocale`, `useI18n` |
| `@remoteai/i18n/common`, `/desktop`, `/coze`, `/website` | Explicitly imported module resources |
| `@remoteai/i18n/catalogs/<module>/<language>` | One module in one language, default-exported messages |
| `@remoteai/i18n/loader` | Optional dynamic imports by module and language |
| `@remoteai/i18n/legacy` | Chinese-source-key translator and existing backend-string translation |

## Instances and application policies

```ts
import { applications, createI18n } from '@remoteai/i18n';
import { resources } from '@remoteai/i18n/common';

const i18n = createI18n({ locale: 'en', enabledLanguages: applications.native, resources });
i18n.t('common.greeting', { name: 'Ada' });
i18n.t('common.items.count', { count: 2 });
i18n.setLocale('ru');
i18n.formatNumber(1234.5);
i18n.formatDate(new Date(), { dateStyle: 'long' });
```

Create one instance per application root, or per SSR request. Pass it to `<I18nProvider instance={i18n}>`.
Do not export a shared server instance. React consumers refresh on locale changes and resource loads. The website
creates its instance inside `App`; interleaved renders cannot share language state. Existing client adapters keep
their storage keys, Tauri communication, subscriptions and language initialization behavior outside this package.

`languages.json` is the language metadata source, including aliases, display names, direction and fallback.
Its `applications` lists are independent release gates. Use `isAppLanguage(app, value)` for saved preferences and
`languageOptions(applications[app])` for selectors. `resolveLanguage` only recognizes a locale; it does not enable it.
The old device policy deliberately still selects Chinese for Chinese system locales and English otherwise.

## Loading

For browser features that use semantic keys:

```ts
import { createI18n } from '@remoteai/i18n';
import { loadResource } from '@remoteai/i18n/loader';

const i18n = createI18n({ locale: 'ja', loadResource });
await i18n.load('ja', ['common', 'coze']); // Also loads these modules in fallback languages.
```

Loads are cached per instance, concurrent requests are shared, and failed loads may be retried. Loading resources
never changes the selected locale. The application decides when to call `setLocale`; for async switches it should
discard outdated user selections. A missing key follows the registered fallback chain, then `fallbackLocale`,
then returns the key. A fallback plural uses the language of the message that was found.

Native applications statically import their resources so translations remain available offline. The current native
and web legacy adapters retain their existing eager resources to avoid changing startup behavior in this extraction.
Moving those established screens to asynchronous loading is a separate migration. The package's root and React
entries never import those legacy bundles.

## Resources, types and validation

Semantic resources are JSON files under `src/catalogs/<module>/<language>/`. Desktop's existing keys and values are
preserved, split into resource chunks. New keys should use context, such as `common.actions.apply` versus
`coze.application.title`. New resource modules are registered in `catalogs.json`; that file also declares each
module's released and draft languages. The first website semantic key uses a request-owned Provider; its other
structured marketing content stays in the website for gradual migration.

```json
{
  "common.items.count": { "one": "{count} item", "other": "{count} items" }
}
```

Plural variants follow `Intl.PluralRules`; exact variants such as `=0` are supported. Parameters are replaced once,
so values containing braces remain unchanged. Pass plain text to a renderer that escapes it; the engine does not
produce or sanitize HTML. Translate presentation labels only, never database values, status IDs, paths or user text.

Run `npm run generate:i18n` after editing resources or metadata. It validates missing keys, placeholders, plural
categories and release policies, then generates typed keys/parameters, resource indexes, lazy loaders, TypeScript
metadata and the Rust acceptance table. Run `npm run check:i18n` before committing; CI checks generated drift,
TypeScript usage and behavior. Released languages must be complete; drafts may omit resources, but supplied draft
translations must have correct parameters. Legacy shared dictionaries retain their own source-key parity checks.

`i18n.t` checks generated semantic keys and parameters. `i18n.text` accepts runtime keys for compatibility or
application-owned dictionaries. Prefer `t` for new code. Backend errors can gradually move to stable semantic codes
plus parameters; existing string errors remain supported without changing their protocol or classifiers.

## Adding a language (Japanese acceptance example)

1. Add metadata to `languages.json` without adding it to any application's enabled list.
2. Add module translation resources and declare the language as draft in `catalogs.json`.
3. Generate and check. Japanese is already registered with partial `common`/`coze` resources, demonstrating fallback.
4. Complete the modules an application uses, move the language to those modules' released lists, and only then add
   it to that application's enabled list. Existing legacy screens need translations before that application ships it.

The generated Rust table uses **desktop's enabled list**, not all registered languages. Japanese is currently rejected
by desktop preference persistence because it is not released there. Each registered language declares `nativeText`:
this explicitly selects existing Rust-native resources until that language's native dialogs/notifications are ready.
Adding genuinely new Rust text resources still needs Rust work; a TypeScript dictionary cannot localize native text.
`nativeText` currently accepts `zh`, `en`, and `ru`; expanding it requires implementing and testing the native resources.

## Compatibility paths

`shared/i18n` and the existing application i18n entry points remain callable. Shared dictionary files forward to
`src/legacy/resources`; Coze's area files forward to its separate legacy dictionaries. Edit resources in this package,
not the forwarding modules. Desktop's old `translate(language, key, values)` delegates to the engine and retains its
existing typing and UI copy. Coze retains its runtime pattern recognition and its own dictionary context.
