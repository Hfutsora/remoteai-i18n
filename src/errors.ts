import { createTextErrorFormatter, safeString, type ErrorDictionaries } from './errorText';
import type { Language } from './registry';
import { createI18n } from './engine';
import type { Resources, TranslationValues } from './messages';

export interface DisplayError {
  code: string;
  params?: TranslationValues;
  message?: string;
}

/** Decode text responses at the transport boundary; application copy uses semantic keys directly. */
export function createErrorFormatter(resources: Resources, templateKeys?: readonly string[]) {
  const engine = createI18n({ locale: 'zh', resources });
  const sources = resources.zh ?? {};
  const dictionaries: ErrorDictionaries = {};
  for (const language of Object.keys(resources) as Language[]) {
    if (language === 'zh') continue;
    const exact: Record<string, string> = {};
    const templates: Record<string, string> = {};
    for (const [key, source] of Object.entries(sources)) {
      if (typeof source !== 'string') continue;
      exact[source] = engine.text(key, {}, language);
      if (!templateKeys || templateKeys.includes(key)) templates[source] = exact[source];
    }
    dictionaries[language] = { exact, templates };
  }
  const decodeText = createTextErrorFormatter(dictionaries);
  return (language: Language, error: unknown): string => {
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
      const display = error as DisplayError;
      if (Object.hasOwn(sources, display.code)) return engine.text(display.code, display.params, language);
      return decodeText(language, display.message ?? display.code);
    }
    const message = error instanceof Error ? error.message : safeString(error);
    if (Object.hasOwn(sources, message)) return engine.text(message, {}, language);
    return decodeText(language, message);
  };
}
