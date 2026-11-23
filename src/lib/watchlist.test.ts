import { describe, expect, it } from 'vitest';
import { parseWatchlist, toggleWatchlist } from './watchlist';

describe('parseWatchlist', () => {
  it.each([null, '', '[', 'null', '42', '{}'])('配列を復元できなければ空にする: %s', raw => {
    expect(parseWatchlist(raw)).toEqual([]);
  });
  it('数値だけを重複なく保存順に復元する', () => {
    expect(parseWatchlist('[3,"4",null,2,3,{},false,[1],2]')).toEqual([3, 2]);
  });
});

describe('toggleWatchlist', () => {
  it('元の配列は変更せず、未登録なら追加し登録済みなら外す', () => {
    const ids = [3, 2];
    expect(toggleWatchlist(ids, 4)).toEqual([3, 2, 4]);
    expect(toggleWatchlist(ids, 3)).toEqual([2]);
    expect(ids).toEqual([3, 2]);
  });
});
