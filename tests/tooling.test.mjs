import { expect, it } from 'vitest';
import { dreamSkinCopy, scienceFictionThemes } from '../tooling/dreamSkin.mjs';

it('uses released catalog copy for theme integration and rejects missing translations', () => {
  const themes = scienceFictionThemes();
  expect(themes).toHaveLength(100);
  for (const theme of themes) {
    const copy = dreamSkinCopy(theme.key);
    expect(theme.nameZh).toBe(copy.nameZh);
    expect(theme.englishName).toBe(copy.nameEn);
  }
  expect(dreamSkinCopy('natureAlpineGlow').nameEn).toBe('Alpine Glow');
  expect(() => dreamSkinCopy('untranslated-theme')).toThrow('Add zh dream skin copy to packages/i18n first');
});
