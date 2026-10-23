import { expect, it } from 'vitest';
import ts from 'typescript';
import { mappedKeyViolations, nativeTranslationTables, translationViolations } from '../scripts/ownership.mjs';

const check = code => translationViolations(ts.createSourceFile('screen.tsx', code, ts.ScriptTarget.Latest, true));

it('recognizes native localized template tables', () => {
  expect(nativeTranslationTables('const BUILTIN_ZH: Copy = Copy {}; const BUILTIN_EN: Copy = Copy {};'))
    .toEqual(['BUILTIN']);
  expect(nativeTranslationTables('const DEFAULT_PORT: u16 = 8080;')).toEqual([]);
});

it('rejects translation dictionaries and inline copy in application code', () => {
  expect(check('const copy = { zh: { save: "保存" }, en: { save: "Save" } };')).toHaveLength(1);
  expect(check('const label = language === "zh" ? "保存" : "Save";')).toHaveLength(1);
  expect(check('const label = zh ? `共 ${count} 项` : `${count} items`;')).toHaveLength(1);
});

it('allows platform locale adapters, user data and package resource references', () => {
  expect(check('const locales = { zh: zhCN, en: enUS };')).toEqual([]);
  expect(check('const locale = language === "zh" ? "zh-CN" : "en-US";')).toEqual([]);
  expect(check('const questions = [{ zh: userText, en: translatedUserText }];')).toEqual([]);
  expect(check('const label = zh ? copy.saveChinese : copy.saveEnglish;')).toEqual([]);
});

it('rejects bilingual tuples, concatenated branches and fragments inside interpolation calls', () => {
  expect(check('const labels = { network: ["网络连接失败", "Network failure"] };')).toHaveLength(1);
  expect(check('const label = zh ? "按日期" + "统计" : "Count by date";')).toHaveLength(1);
  expect(check('const label = zh ? interpolate(copy.hours, { rest: `${rest} 分` }) : copy.hours;'))
    .toHaveLength(1);
  expect(check('function label(locale) { if (locale === "zh") return "保存"; return copy.save; }'))
    .toHaveLength(1);
  expect(check('const errors = [["文件不可用", "FILE_UNAVAILABLE"]];')).toEqual([]);
});

it('rejects Chinese keys passed indirectly through mapped label tuples', () => {
  const checkMapped = code => mappedKeyViolations(ts.createSourceFile('screen.tsx', code, ts.ScriptTarget.Latest, true));
  expect(checkMapped('const fields = [["输入", "inputTokens"]] as const; fields.map(([label]) => displayText(label));'))
    .toHaveLength(1);
  expect(checkMapped('const details = [["协议", value]]; details.map(([label]) => displayText(String(label)));'))
    .toHaveLength(1);
  expect(checkMapped('const fields = [["client.chat.input", "inputTokens"]]; fields.map(([label]) => t(label));'))
    .toEqual([]);
  expect(checkMapped('const errors = [["文件不可用", "FILE_UNAVAILABLE"]]; errors.map(([message]) => normalize(message));'))
    .toEqual([]);
});
