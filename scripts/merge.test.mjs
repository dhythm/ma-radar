import { expect, it } from 'vitest';
import { mergeProjects } from './merge.mjs';

const today = '2026-11-23';
const before = '2026-11-20';
const legacy = { id: 1, price: 100, title: '旧案件', tags: ['旧'] };
const saved = { ...legacy, firstSeenAt: before, lastSeenAt: before, saleReason: '多忙', priceHistory: [{ date: before, price: 100 }] };

it('新規案件の初回・最終日と初値を設定し、非公開価格は記録しない', () => {
  const fresh = { ...legacy, firstSeenAt: '', lastSeenAt: '', saleReason: '移転', priceHistory: [] };
  expect(mergeProjects([], [fresh, { id: 2, price: null }], today)).toEqual([
    { id: 2, price: null, firstSeenAt: today, lastSeenAt: today, saleReason: null, priceHistory: [] },
    { ...fresh, firstSeenAt: today, lastSeenAt: today, priceHistory: [{ date: today, price: 100 }] },
  ]);
});

it.each([0, 100, null])('既存案件の一覧情報を更新し、価格 %s が変わった場合のみ履歴に追記', price => {
  const item = { ...legacy, title: '変更後', tags: [], price, saleReason: null };
  expect(mergeProjects([saved], [item], today)).toEqual([{ ...saved, ...item, saleReason: '多忙', lastSeenAt: today,
    priceHistory: price === 0 ? [...saved.priceHistory, { date: today, price: 0 }] : saved.priceHistory }]);
});

it('新しい売却理由があれば上書きし、空の履歴は価格から初期化する', () => {
  const [item] = mergeProjects([{ ...saved, priceHistory: [] }], [{ ...legacy, saleReason: '移転' }], today);
  expect(item.saleReason).toBe('移転');
  expect(item.priceHistory).toEqual([{ date: today, price: 100 }]);
});

it('今回未掲載なら既存案件の日付を更新せず、新しいオブジェクトで返す', () => {
  const [item] = mergeProjects([saved], [], today);
  expect(item).toEqual(saved);
  expect(item).not.toBe(saved);
});

it('今回の掲載有無にかかわらず v1 案件を補完する', () => {
  const initial = { ...legacy, firstSeenAt: today, lastSeenAt: today, saleReason: null, priceHistory: [{ date: today, price: 100 }] };
  expect(mergeProjects([legacy], [], today)).toEqual([initial]);
  expect(mergeProjects([legacy], [{ ...legacy, price: 50 }], today)).toEqual([{ ...initial, price: 50,
    priceHistory: [...initial.priceHistory, { date: today, price: 50 }] }]);
});

it('最終日、初回日、ID の降順で並べ、入力配列・オブジェクトを変更しない', () => {
  const existing = [saved, { ...saved, id: 9 }, { ...saved, id: 8, firstSeenAt: '2026-11-19' }];
  const fresh = [{ ...legacy, price: 75 }, { ...legacy, id: 3 }, { ...legacy, id: 2 }];
  const snapshot = structuredClone([existing, fresh]);
  expect(mergeProjects(existing, fresh, today).map(item => item.id)).toEqual([3, 2, 1, 9, 8]);
  expect([existing, fresh]).toEqual(snapshot);
});
