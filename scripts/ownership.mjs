import ts from 'typescript';

const languages = new Set(['zh', 'en', 'ru', 'ja']);
const languageCondition = /\b(language|lang|zh|isZh|isEn|isChinese|isEnglish)\b/;
const translatedCharacters = /[\p{Script=Han}\p{Script=Cyrillic}\p{Script=Hiragana}]/u;

function textLeaves(node) {
  if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) return [node];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return textLeaves(node.expression);
  if (ts.isConditionalExpression(node)) return [...textLeaves(node.whenTrue), ...textLeaves(node.whenFalse)];
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap(property => ts.isPropertyAssignment(property) ? textLeaves(property.initializer) : []);
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(textLeaves);
  return [];
}

/** Catch dictionaries and inline language branches without flagging locale adapters or user-provided content. */
export function translationViolations(source) {
  const errors = [];
  const visit = node => {
    if (ts.isObjectLiteralExpression(node)) {
      const entries = node.properties.filter(property => ts.isPropertyAssignment(property)
        && languages.has(property.name.getText(source).replace(/["']/g, '')));
      if (entries.length >= 2 && entries.some(entry => textLeaves(entry.initializer)
        .some(leaf => translatedCharacters.test(leaf.getText(source))))) errors.push(node);
    }
    if (ts.isConditionalExpression(node) && languageCondition.test(node.condition.getText(source))) {
      const leaves = [...textLeaves(node.whenTrue), ...textLeaves(node.whenFalse)];
      if (leaves.some(leaf => translatedCharacters.test(leaf.getText(source)))) errors.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return errors;
}
