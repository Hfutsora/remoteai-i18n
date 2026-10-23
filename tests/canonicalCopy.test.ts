import { expect, it } from 'vitest';
import { resources } from '../src/catalogs/client';
import { createErrorFormatter } from '../src/errors';
import bulkErrors from '../src/copy/client/bulkErrors';
import connectionErrors from '../src/copy/client/connectionErrors';
import desktopUpdate from '../src/copy/client/desktopUpdate';
import gitNotices from '../src/copy/client/gitNotices';
import guiUpdate from '../src/copy/client/guiUpdate';
import permissionWait from '../src/copy/client/permissionWait';

it('keeps canonical service copy translatable in every released client language', () => {
  const format = createErrorFormatter(resources);
  const sources = new Set(Object.values(resources.zh));
  for (const copy of [bulkErrors, connectionErrors, desktopUpdate, gitNotices, guiUpdate, permissionWait]) {
    for (const value of Object.values(copy)) {
      expect(sources.has(value), value).toBe(true);
      expect(format('zh', value)).toBe(value);
      for (const language of ['en', 'ru', 'ja'] as const) {
        const translated = format(language, value);
        expect(translated, `${language}: ${value}`).not.toBe(value);
        expect(translated).not.toContain('client.');
      }
    }
  }
});
