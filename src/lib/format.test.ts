import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, formatYen } from './format';

describe('数値表示', () => {
  it.each<[number | null, string, string]>([
    [null, '非公開', '非公開'],
    [0, '0', '0円'],
    [999, '999', '999円'],
    [1_000, '1,000', '1,000円'],
    [1_500_000, '1,500,000', '1,500,000円'],
    [-1_234, '-1,234', '-1,234円'],
  ])('%s の桁区切りと通貨', (value, number, yen) => {
    expect(formatNumber(value)).toBe(number);
    expect(formatYen(value)).toBe(yen);
  });
});

describe('formatDate', () => {
  it.each<[string | null, string]>([
    ['2026-01-01', '2026/01/01'], ['2024-02-29', '2024/02/29'], [null, '日付不明'],
  ])('%s の掲載日', (iso, expected) => expect(formatDate(iso)).toBe(expected));
});
