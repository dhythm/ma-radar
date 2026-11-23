import { describe, expect, it } from 'vitest';
import { filterAndSort, type FilterOptions, type ScoredProject, type SortKey } from './filter';
import type { Project } from './types';

const defaults: FilterOptions = {
  keyword: '', priceBand: 'all', category: 'all', minScore: 0, sort: 'score', showExcluded: false,
};

function item(id: number, fields: Partial<Project> = {}, score = 0, excluded = false): ScoredProject {
  return {
    project: {
      id, title: '', summary: '', category: 'ブログ', tags: [], url: '', kind: 'site',
      publishedAt: null, price: null, monthlySales: null, monthlyProfit: null, pv: null, followers: null, ...fields,
    },
    result: { score, excluded, reasons: [] },
  };
}

function ids(items: ScoredProject[], options: Partial<FilterOptions>) {
  return filterAndSort(items, { ...defaults, ...options }).map(entry => entry.project.id);
}

describe('filterAndSort', () => {
  const inventory = [
    item(1, { title: 'MY Blog', summary: '初心者向け', category: 'Webサイト', tags: ['SEO対策'] }, 30),
    item(2, { category: 'Webサイト運営' }, 20), item(3, {}, 0, true),
  ];
  it.each(['  y bl  ', '心者', 'bサイ', 'eo対策'])('キーワード部分一致: %s', keyword => {
    expect(ids(inventory.slice(0, 1).concat(item(4)), { keyword })).toEqual([1]);
  });
  it('空白のみなら絞り込まず、除外案件は指定時のみ含める', () => {
    expect(ids(inventory, { keyword: '  ' })).toEqual([1, 2]);
    expect(ids(inventory, { showExcluded: true })).toEqual([1, 2, 3]);
  });
  it('カテゴリは完全一致、最低スコアは境界を含む', () => {
    expect(ids(inventory, { category: 'Webサイト' })).toEqual([1]);
    expect(ids(inventory, { minScore: 30, showExcluded: true })).toEqual([1]);
    expect(ids(inventory, { minScore: 31 })).toEqual([]);
    expect(ids(inventory, { keyword: 'SEO', category: 'ブログ' })).toEqual([]);
  });

  const prices = [null, 0, 300_000, 300_001, 500_000, 500_001, 1_000_000, 1_000_001, 3_000_000, 3_000_001];
  it.each<[FilterOptions['priceBand'], number[]]>([
    ['all', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], ['le30', [1, 2]], ['30to50', [3, 4]],
    ['50to100', [5, 6]], ['100to300', [7, 8]], ['gt300', [9]],
  ])('価格帯 %s の境界と非公開値', (priceBand, expected) => {
    expect(ids(prices.map((price, index) => item(index, { price })), { priceBand })).toEqual(expected);
  });

  const sortable = [
    item(1, {}, 30), item(2, { price: 100, monthlyProfit: -100, publishedAt: '2026-11-01' }, 30),
    item(3, { price: 0, monthlyProfit: 0, publishedAt: '2025-12-01' }, 30),
    item(4, { price: 50, monthlyProfit: 20, publishedAt: '2026-11-02' }, 10),
  ];
  it.each<[SortKey, number[]]>([
    ['score', [2, 3, 1, 4]], ['newest', [4, 2, 3, 1]], ['priceAsc', [3, 4, 2, 1]],
    ['priceDesc', [2, 4, 3, 1]], ['profitDesc', [4, 3, 2, 1]],
  ])('%s は null を末尾にし、元配列を変更しない', (sort, expected) => {
    const original = [...sortable];
    expect(ids(sortable, { sort })).toEqual(expected);
    expect(sortable).toEqual(original);
  });
});
