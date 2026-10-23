import { expect, it } from 'vitest';
import { validateCatalog } from '../scripts/validation.mjs';

const validate = (base, target, released = true) => validateCatalog({ base, target, released, locale: 'en', label: 'test' });

it('requires released resources and permits missing draft resources', () => {
  expect(validate({ greeting: 'Hi {name}' }, {})).toEqual(['test/greeting: missing translation']);
  expect(validate({ greeting: 'Hi {name}' }, {}, false)).toEqual([]);
});

it('rejects invalid placeholders even in supplied draft resources', () => {
  expect(validate({ greeting: 'Hi {name}' }, { greeting: 'Hi {username}' }, false)).toContain(
    'test/greeting: placeholders differ');
});

it('rejects missing plural categories, missing other and changed message kinds', () => {
  const base = { items: { one: '{count} item', other: '{count} items' } };
  expect(validate(base, { items: { other: '{count} items' } })).toContain('test/items: missing plural category one');
  expect(validate(base, { items: { one: '{count} item' } })).toContain('test/items: a plural message must contain other');
  expect(validate(base, { items: '{count} items' })).toContain('test/items: message kind changed');
});
