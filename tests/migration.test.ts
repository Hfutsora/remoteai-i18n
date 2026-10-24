import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { resources as client } from '../src/catalogs/client';
import { resources as coze } from '../src/catalogs/coze';
import { createI18n } from '../src/engine';
import { createErrorFormatter } from '../src/errors';
import gitConflicts from '../src/catalogs/client/zh/git-conflicts.json';
import discovery from '../src/catalogs/client/zh/discovery.json';
import deviceScreen from '../src/catalogs/client/zh/deviceScreen.json';
import messageQueue from '../src/catalogs/client/zh/messageQueue.json';
import ssh from '../src/catalogs/client/zh/ssh.json';
import downloadSelection from '../src/catalogs/client/zh/downloadSelection.json';
import commandMetrics from '../src/catalogs/client/zh/commandMetrics.json';

const baselines = {
  "client": "b2c6d30f6b5a33b6fd5b4054640b20cb76471f3ef42a9b7c1e6572a73cf62650",
  "coze": "54efc3f47447847456222d9c0470eca8ea5ed35b5afe24104da1e27471db06de"
};

// New complete templates added after migration are covered by the catalog completeness checks.
const additions = new Set(['client.chat.usePlugin',
  ...Object.keys(gitConflicts),
  ...Object.keys(discovery),
  ...Object.keys(deviceScreen),
  ...Object.keys(messageQueue),
  ...Object.keys(ssh),
  ...Object.keys(downloadSelection),
  ...Object.keys(commandMetrics),
  'client.remoteDesktop.takeoverTitle', 'client.remoteDesktop.takeoverMessage',
  'client.remoteDesktop.takeoverConfirm', 'client.remoteDesktop.takeoverCancel',
  'client.remoteDesktop.connectionInUse', 'client.remoteDesktop.connectionCancelled',
  'client.appearance.globalFontSize', 'client.appearance.globalFontDescription',
  'client.appearance.followGlobalFont', 'client.appearance.followGlobalFontDescription',
  'client.appearance.guiFontSettings',
  'client.chat.attachments.count', 'client.chat.attachments.view', 'client.chat.attachments.details',
  'client.chat.attachments.viewFile', 'client.chat.attachments.name', 'client.chat.attachments.path',
  'client.chat.attachments.size', 'client.chat.attachments.modified', 'client.chat.attachments.bytes',
  'client.chat.attachments.loading', 'client.chat.attachments.unavailable', 'client.chat.attachments.pathPending',
  'client.chat.attachments.folderSize',
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
