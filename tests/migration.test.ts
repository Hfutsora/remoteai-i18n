import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { resources as client } from '../src/catalogs/client';
import { resources as coze } from '../src/catalogs/coze';
import { createI18n } from '../src/engine';
import { createErrorFormatter } from '../src/errors';

const baselines = {
  "client": "9a53d35b1bdea31663385765d056c432cf9d9cc860078ef13da86ca44c3a680f",
  "coze": "54efc3f47447847456222d9c0470eca8ea5ed35b5afe24104da1e27471db06de"
};

// New complete templates added after migration are covered by the catalog completeness checks.
const additions = new Set(['client.chat.usePlugin',
  'client.remoteDesktop.takeoverTitle', 'client.remoteDesktop.takeoverMessage',
  'client.remoteDesktop.takeoverConfirm', 'client.remoteDesktop.takeoverCancel',
  'client.remoteDesktop.connectionInUse', 'client.remoteDesktop.connectionCancelled',
]);

it('preserves the complete pre-migration Chinese, English and Russian copy', () => {
  for (const [module, resources] of Object.entries({ client, coze })) {
    const dictionaries = resources as Record<string, Record<string, string>>;
    const entries = Object.keys(dictionaries.zh).filter(key => key !== 'coze.application.title'
      && key !== 'client.app.webPageTitle' && !key.startsWith('client.skills.') && !additions.has(key))
      .map(key => [dictionaries.zh[key], dictionaries.en[key], dictionaries.ru[key]])
      .sort((a, b) => a[0].localeCompare(b[0], 'en'));
    expect(createHash('sha256').update(JSON.stringify(entries)).digest('hex'))
      .toBe(baselines[module as keyof typeof baselines]);
  }
});

it('keeps context separate and accepts code + params without interpreting parameter values', () => {
  const app = createI18n({ locale: 'en', resources: client });
  const studio = createI18n({ locale: 'en', resources: coze });
  expect(app.t('client.chat.apply')).toBe('Apply');
  expect(studio.t('coze.index.appAccess')).toBe('App access');
  const format = createErrorFormatter(client);
  expect(format('en', { code: 'client.conversation.manageProject', params: { value1: '取消 {value1}' } }))
    .toBe('Manage project: 取消 {value1}');
  expect(format('ru', 'account_id=42 /home/project/source.ts {name}'))
    .toBe('account_id=42 /home/project/source.ts {name}');
  expect(app.text('取消')).toBe('取消');
});
