// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createI18n } from '../src';
import { I18nProvider, useLocale, useT } from '../src/react';
import { resources } from '../src/catalogs/common';

function Copy() {
  const t = useT();
  const locale = useLocale();
  return <button lang={locale}>{t('common.actions.copy')}</button>;
}

it('isolates concurrent SSR requests and nested providers', async () => {
  const results = await Promise.all((['zh', 'en', 'ru', 'ja'] as const).map(async locale => {
    const instance = createI18n({ locale, resources });
    await Promise.resolve();
    return renderToString(<I18nProvider instance={instance}><Copy /></I18nProvider>);
  }));
  expect(results).toEqual(['复制', 'Copy', 'Копировать', 'コピー'].map((copy, index) =>
    `<button lang="${['zh', 'en', 'ru', 'ja'][index]}">${copy}</button>`));
  const outer = createI18n({ locale: 'en', resources });
  const inner = createI18n({ locale: 'ja', resources });
  const result = renderToString(<I18nProvider instance={outer}>
    <Copy /><I18nProvider instance={inner}><Copy /></I18nProvider><Copy />
  </I18nProvider>);
  expect(result).toBe('<button lang="en">Copy</button><button lang="ja">コピー</button><button lang="en">Copy</button>');
});

it('updates after language changes, resource loads and provider replacement', async () => {
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const instance = createI18n({ locale: 'en', enabledLanguages: ['en', 'ja'], resources: { en: resources.en } });
  const render = async (node: ReactElement) => { await act(async () => root.render(node)); };
  try {
    await render(<I18nProvider instance={instance}><Copy /></I18nProvider>);
    expect(container.textContent).toBe('Copy');
    await act(async () => instance.setLocale('ja'));
    expect(container.querySelector('button')?.lang).toBe('ja');
    await act(async () => instance.addResources('ja', resources.ja));
    expect(container.textContent).toBe('コピー');
    await render(<I18nProvider instance={createI18n({ locale: 'ru', resources })}><Copy /></I18nProvider>);
    expect(container.textContent).toBe('Копировать');
  } finally {
    await act(async () => root.unmount());
    delete environment.IS_REACT_ACT_ENVIRONMENT;
  }
});
