import type { Project } from './types';

export function isNewProject(project: Project, referenceDate: string): boolean {
  const ageDays = (Date.parse(`${referenceDate}T00:00:00Z`) - Date.parse(`${project.firstSeenAt}T00:00:00Z`)) / 86_400_000;
  return ageDays >= 0 && ageDays <= 2;
}

export interface PriceDrop { from: number; to: number }

export function latestPriceDrop(project: Project): PriceDrop | null {
  const previous = project.priceHistory.at(-2);
  const latest = project.priceHistory.at(-1);
  return previous && latest && latest.price < previous.price ? { from: previous.price, to: latest.price } : null;
}
