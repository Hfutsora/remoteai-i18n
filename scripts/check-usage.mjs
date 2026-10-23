import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { translationViolations } from './ownership.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const roots = ['shared', 'apps/desktop/src', 'apps/web/src', 'apps/native/src', 'apps/coze/ui/src',
  'apps/admin-ui/src', 'apps/website/src'];
const errors = [];
const han = /\p{Script=Han}/u;
const keyArguments = { t: 0, uiText: 0, displayText: 0, translateMessage: 1, msg: 0 };

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/.test(entry.name) && !/\.(test|generated)\./.test(entry.name) ? [file] : [];
  });
}

function literalKeys(node) {
  if (!node) return [];
  if (ts.isStringLiteralLike(node)) return [node];
  if (ts.isParenthesizedExpression(node)) return literalKeys(node.expression);
  if (ts.isConditionalExpression(node)) return [...literalKeys(node.whenTrue), ...literalKeys(node.whenFalse)];
  if (ts.isBinaryExpression(node)
    && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
    return [...literalKeys(node.left), ...literalKeys(node.right)];
  }
  return [];
}

function checkFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const report = (node, message) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    errors.push(`${path.relative(root, file)}:${line}: ${message}`);
  };
  const visit = node => {
    if (ts.isStringLiteralLike(node) && /(?:shared\/i18n|@remoteai\/i18n\/legacy)/.test(node.text)) {
      report(node, 'Retired i18n import; use the package or the application locale adapter.');
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && Object.hasOwn(keyArguments, node.expression.text)) {
      for (const key of literalKeys(node.arguments[keyArguments[node.expression.text]])) {
        if (han.test(key.text)) report(key, 'Use a semantic message key.');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  for (const node of translationViolations(source)) {
    report(node, 'Keep translation resources in packages/i18n; import them through a public package entry.');
  }
}

const files = roots.flatMap(directory => sourceFiles(path.join(root, directory)));
files.push(path.join(root, 'apps/native/App.tsx'));
files.forEach(checkFile);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`i18n: checked ${files.length} application and shared source files`);
}
