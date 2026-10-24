export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', symbol: '€', name: 'Евро', label: 'EUR (€) — Евро' },
  { code: 'USD', symbol: '$', name: 'Доллар США', label: 'USD ($) — Доллар США' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль', label: 'RUB (₽) — Рубль' },
  { code: 'PLN', symbol: 'zł', name: 'Польский злотый', label: 'PLN (zł) — Злотый' },
  { code: 'GBP', symbol: '£', name: 'Британский фунт', label: 'GBP (£) — Фунт стерлингов' },
  { code: 'CHF', symbol: 'CHF', name: 'Швейцарский франк', label: 'CHF — Франк' },
  { code: 'TRY', symbol: '₺', name: 'Турецкая лира', label: 'TRY (₺) — Лира' },
  { code: 'GEL', symbol: '₾', name: 'Грузинский лари', label: 'GEL (₾) — Лари' },
  { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге', label: 'KZT (₸) — Тенге' },
  { code: 'UAH', symbol: '₴', name: 'Украинская гривна', label: 'UAH (₴) — Гривна' },
  { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль', label: 'BYN (Br) — Белорусский рубль' },
  { code: 'CZK', symbol: 'Kč', name: 'Чешская крона', label: 'CZK (Kč) — Чешская крона' },
  { code: 'HUF', symbol: 'Ft', name: 'Венгерский форинт', label: 'HUF (Ft) — Форинт' },
  { code: 'SEK', symbol: 'kr', name: 'Шведская крона', label: 'SEK (kr) — Шведская крона' },
  { code: 'NOK', symbol: 'kr', name: 'Норвежская крона', label: 'NOK (kr) — Норвежская крона' },
  { code: 'ILS', symbol: '₪', name: 'Новый израильский шекель', label: 'ILS (₪) — Шекель' },
];

export const getCurrencySymbol = (code: string | undefined): string => {
  if (!code) return '€';
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.symbol : code;
};

export const formatCurrencyLabel = (code: string | undefined): string => {
  if (!code) return 'EUR (€)';
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? `${found.code} (${found.symbol})` : code;
};
