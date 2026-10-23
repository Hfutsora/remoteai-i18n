import { createI18n } from '../engine';
import { interpolate } from '../messages';
import type { Resources, TranslationValues } from '../messages';
import type { Language } from '../registry';
import { english } from './resources/en';
import { russian } from './resources/ru';

export { interpolate } from '../messages';
export type { TranslationValues } from '../messages';
export { createBackendTranslator, translateBackendMessage } from './resources/backend/translateBackendMessage';
export type { BackendDictionaries, BackendDictionary, BackendTranslator } from './resources/backend/translateBackendMessage';

/** A Chinese source key is its own fallback; no shared current-language state is installed. */
export function createLegacyTranslator(dictionaries: Resources, sourceLanguage: Language = 'zh') {
  // Legacy fallback is the original source, rather than the semantic engine's locale fallback chain.
  const engines = new Map<Language, ReturnType<typeof createI18n>>();
  return (language: Language, source: string, values: TranslationValues = {}): string => {
    if (language === sourceLanguage) return interpolate(source, values);
    let engine = engines.get(language);
    if (!engine) {
      engine = createI18n({ locale: language, resources: { [language]: dictionaries[language] ?? {} } });
      engines.set(language, engine);
    }
    return engine.text(source, values, language);
  };
}

export const translateText = createLegacyTranslator({ en: english, ru: russian });
