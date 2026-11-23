import { expect, it } from 'vitest';
import { isNewProject, latestPriceDrop } from './history';
import type { Project } from './types';

const base: Project = {
  id: 1, title: '', summary: '', url: '', kind: 'other', category: '', tags: [],
  publishedAt: null, price: null, monthlyProfit: null, monthlySales: null, pv: null, followers: null,
  saleReason: null, firstSeenAt: '2024-02-28', lastSeenAt: '2024-02-28', priceHistory: [],
};

it.each<[string, boolean]>([
  ['2024-02-27', false], ['2024-02-28', true], ['2024-02-29', true], ['2024-03-01', true], ['2024-03-02', false],
])('基準日 %s から0〜2日前に初確認した案件のみ新着', (referenceDate, expected) => {
  expect(isNewProject(base, referenceDate)).toBe(expected);
});

it.each<[number[], ReturnType<typeof latestPriceDrop>]>([
  [[50, 100, 0], { from: 100, to: 0 }], [[100, 50, 75], null], [[100, 100], null], [[100], null], [[], null],
])('履歴 %j の最後の変化が値下げならその価格を返す', (prices, expected) => {
  const priceHistory = prices.map((price, index) => ({ date: `2024-03-0${index + 1}`, price }));
  expect(latestPriceDrop({ ...base, priceHistory })).toEqual(expected);
});
