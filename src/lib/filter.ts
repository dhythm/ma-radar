import type { Project } from './types';
import type { ScoreResult } from './scoring';
import { isNewProject, latestPriceDrop } from './history';

export interface ScoredProject { project: Project; result: ScoreResult }
export type SortKey = 'score' | 'newest' | 'priceAsc' | 'priceDesc' | 'profitDesc';
export interface FilterOptions {
  keyword: string;
  priceBand: 'all' | 'le30' | '30to50' | '50to100' | '100to300' | 'gt300';
  category: string;
  minScore: number;
  sort: SortKey;
  showExcluded: boolean;
  onlyNew: boolean;
  onlyDropped: boolean;
  referenceDate: string;
}

function matchesPrice(price: number | null, band: FilterOptions['priceBand']): boolean {
  if (band === 'all') return true;
  if (price === null) return false;
  switch (band) {
    case 'le30': return price <= 300_000;
    case '30to50': return price > 300_000 && price <= 500_000;
    case '50to100': return price > 500_000 && price <= 1_000_000;
    case '100to300': return price > 1_000_000 && price <= 3_000_000;
    case 'gt300': return price > 3_000_000;
  }
}

function compareNullable<Value extends string | number>(left: Value | null, right: Value | null, direction: 1 | -1): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -direction : direction;
}

export function filterAndSort(items: ScoredProject[], options: FilterOptions): ScoredProject[] {
  const keyword = options.keyword.trim().toLowerCase();
  return items.filter(({ project, result }) =>
    (options.showExcluded || !result.excluded) && result.score >= options.minScore &&
    (options.category === 'all' || options.category === project.category) &&
    (!options.onlyNew || isNewProject(project, options.referenceDate)) &&
    (!options.onlyDropped || latestPriceDrop(project) !== null) &&
    matchesPrice(project.price, options.priceBand) &&
    (!keyword || [project.title, project.summary, project.category, ...project.tags].join(' ').toLowerCase().includes(keyword))
  ).sort((left, right) => {
    switch (options.sort) {
      case 'score': return right.result.score - left.result.score || compareNullable(left.project.publishedAt, right.project.publishedAt, -1);
      case 'newest': return compareNullable(left.project.publishedAt, right.project.publishedAt, -1);
      case 'priceAsc': return compareNullable(left.project.price, right.project.price, 1);
      case 'priceDesc': return compareNullable(left.project.price, right.project.price, -1);
      case 'profitDesc': return compareNullable(left.project.monthlyProfit, right.project.monthlyProfit, -1);
    }
  });
}
