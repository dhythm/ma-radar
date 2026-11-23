import { describe, expect, it } from 'vitest';
import { scoreProject } from './scoring';
import type { Project } from './types';

const base: Project = {
  id: 1, title: '', summary: '', url: '', kind: 'other', category: 'その他', tags: [],
  publishedAt: null, price: null, monthlyProfit: null, monthlySales: null, pv: null, followers: null,
};
const score = (fields: Partial<Project>) => scoreProject({ ...base, ...fields });

describe('scoreProject', () => {
  it.each([{ title: 'youtube' }, { summary: 'ユーチューブ' }, { category: 'YouTube' }, { tags: ['YouTube運用'] }])('YouTubeを加点より先に除外: %o', (fields) => {
    expect(score({ ...fields, price: 1 })).toEqual({ score: 0, excluded: true, reasons: [{ label: 'YouTube案件のため除外', points: 0 }] });
  });

  it('数値不明なら加点しない', () => {
    expect(score({})).toEqual({ score: 0, excluded: false, reasons: [] });
  });

  it.each<[Partial<Project>, number]>([
    [{ title: '本業が忙しく時間がない' }, 20], [{ summary: '初心者向けマニュアル' }, 15],
    [{ tags: ['一人で副業'] }, 15], [{ summary: '在庫を持たない' }, 5],
    [{ monthlyProfit: 0 }, 0], [{ monthlyProfit: -100 }, 0], [{ monthlyProfit: 99_999 }, 10],
    [{ monthlyProfit: 100_000 }, 15], [{ followers: 10_000 }, 5], [{ pv: 10_000 }, 5],
    [{ pv: 9_999, followers: 9_999 }, 0], [{ tags: ['本人確認済み'] }, 3], [{ title: '本人確認' }, 0],
  ])('各条件を独立に加点: %o → %i', (fields, expected) => {
    expect(score(fields).score).toBe(expected);
  });

  it.each([[0, 15], [300_000, 15], [300_001, 12], [500_000, 12], [500_001, 8],
    [1_000_000, 8], [1_000_001, 4], [2_000_000, 4], [2_000_001, 0]])('価格 %i 円で %i 点', (price, expected) => {
    expect(score({ price }).score).toBe(expected);
  });

  it.each([[120_000, 5], [120_001, 3], [240_000, 3], [240_001, 0]])('回収目安の境界: %i 円で追加 %i 点', (price, extra) => {
    expect(score({ price, monthlyProfit: 10_000 }).score).toBe(15 + 10 + extra);
  });

  it('全条件一致でも100以内で、理由は点数の降順', () => {
    const result = score({ title: '多忙・簡単・外注・在庫不要', price: 300_000, monthlyProfit: 100_000,
      pv: 10_000, followers: 10_000, tags: ['本人確認'] });
    const points = result.reasons.map((reason) => reason.points);
    expect(points).toEqual([20, 15, 15, 15, 10, 5, 5, 5, 5, 3]);
    expect(result.score).toBe(Math.min(100, points.reduce((sum, value) => sum + value, 0)));
  });
});
