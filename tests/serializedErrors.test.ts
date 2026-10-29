import { expect, it } from 'vitest';
import { resources } from '../src/catalogs/client';
import { createErrorFormatter } from '../src/errors';

const format = createErrorFormatter(resources);
const details = '修复登录 (thread-1) → src/{id}.tsx\n发布任务 (thread-2) → src/{id}.tsx';

it.each(['zh', 'en', 'ru', 'ja'] as const)('formats task conflicts over string transports in %s', language => {
  const payload = { code: 'client.gitActivity.filesBusy', params: { details } };
  const expected = format(language, payload);
  expect(format(language, JSON.stringify(payload))).toBe(expected);
  expect(format(language, new Error(JSON.stringify(payload)))).toBe(expected);
  expect(expected).toContain(details);
  expect(expected).not.toContain('client.gitActivity');
  if (language !== 'zh') expect(expected).not.toContain('以下文件');
});

it('preserves unrecognized text and refuses malformed structured parameters', () => {
  for (const text of ['{bad json', '{"code":"unknown.code"}',
    '{"code":"client.gitActivity.filesBusy","params":{"details":{"path":"secret"}}}',
    '{"code":"client.gitActivity.filesBusy","params":[]}']) {
    expect(format('zh', text)).toBe(text);
  }
  expect(format('en', 'client.gitActivity.operationBusy')).toBe(resources.en['client.gitActivity.operationBusy']);
});
