import { expect, it } from 'vitest';
import ts from 'typescript';
import { translationViolations } from '../scripts/ownership.mjs';

const check = code => translationViolations(ts.createSourceFile('screen.tsx', code, ts.ScriptTarget.Latest, true));

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
