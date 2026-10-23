import { expect, it } from 'vitest';
import { createLegacyTranslator, translateText, translateBackendMessage } from '../src/legacy';
import { english } from '../src/legacy/resources/en';
import { russian } from '../src/legacy/resources/ru';
import cozeEnglish from '../src/legacy/coze/en';
import cozeRussian from '../src/legacy/coze/ru';

const parameters = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

it('preserves every existing source-key translation and its parameters', () => {
  for (const [locale, dictionary] of Object.entries({ en: english, ru: russian }) as
    ['en' | 'ru', Readonly<Record<string, string>>][]) {
    for (const [source, target] of Object.entries(dictionary)) {
      expect(translateText(locale, source), source).toBe(target);
      expect(translateText('zh', source), source).toBe(source);
      expect(parameters(target), `${locale}/${source}`).toEqual(parameters(source));
    }
  }
  expect(Object.keys(english).filter(key => !Object.hasOwn(russian, key))).toEqual([]);
});

it('keeps Coze context independent and leaves unknown backend data intact', () => {
  const t = createLegacyTranslator({ en: cozeEnglish, ru: cozeRussian });
  expect(t('en', '应用访问')).toBe('App access');
  expect(translateText('en', '应用')).toBe('Apply');
  const businessData = 'account_id=42 /home/project/source.ts {name}';
  expect(translateBackendMessage('ru', businessData)).toBe(businessData);
  expect(t('en', 'missing {name}', { name: '$&{name}' })).toBe('missing $&{name}');
});

it('checks Coze legacy translations independently from desktop copy', () => {
  expect(Object.keys(cozeEnglish).filter(key => !Object.hasOwn(cozeRussian, key))).toEqual([]);
  for (const dictionary of [cozeEnglish, cozeRussian]) {
    for (const [source, target] of Object.entries(dictionary)) {
      expect(parameters(target), source).toEqual(parameters(source));
    }
  }
});
