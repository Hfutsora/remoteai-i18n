import { createI18n } from '../src';

const i18n = createI18n({ locale: 'en' });
i18n.t('common.actions.copy');
i18n.t('common.greeting', { name: 'Ada' });
i18n.t('common.items.count', { count: 2 });
// @ts-expect-error Unknown semantic key.
i18n.t('common.actions.coppy');
// @ts-expect-error Required parameter is missing.
i18n.t('common.greeting');
// @ts-expect-error Parameter names are checked.
i18n.t('common.greeting', { username: 'Ada' });
// @ts-expect-error Plurals require a number.
i18n.t('common.items.count', { count: '2' });
// @ts-expect-error Parameterless messages do not accept arbitrary parameters.
i18n.t('common.actions.copy', { accidental: 'value' });
