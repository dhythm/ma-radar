import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseListHtml } from './parse.mjs';

const fixture = readFileSync(new URL('./__fixtures__/list.html', import.meta.url), 'utf8');

it('実カード2件の掲載値を抽出し、平均・最高・要約内の数値は使わない', () => {
  const items = parseListHtml(fixture);
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({
    id: 23157, url: 'https://rakkoma.com/project/detail/23157', publishedAt: '2026-09-29',
    title: '【完全外注可】登録者10万人超｜いらすとやを活用したエンタメ系YouTubeショートチャンネル譲渡【ショート動画メイン】',
    price: 9_750_000, monthlySales: 1_751_177, monthlyProfit: 1_578_309, followers: 91_000, pv: null,
    kind: 'account', category: 'YouTube', tags: ['購入後のサポートあり', '収益化審査通過', '全て外注運営（引継ぎ可能）', '売上急上昇', '本人確認'],
    summary: expect.stringContaining('総再生回数4億回'),
  });
  expect(items[1]).toMatchObject({ id: 23632, monthlySales: null, monthlyProfit: null, followers: 3560,
    category: 'SNS・アカウント', summary: expect.stringContaining('YouTube') });
});

it.each([['-', null], ['', null], ['未定', null], ['0円', 0], [' 1,200 円 ', 1200]])('価格 %j を %s に変換', (text, price) => {
  const html = `<li class="project_list"><a href="/project/detail/1"></a><span class="project_list_price_item">${text}</span></li>`;
  expect(parseListHtml(html, 'https://example.org')[0]).toMatchObject({ price, publishedAt: null, summary: '', tags: [],
    kind: 'other', category: 'その他', pv: null, url: 'https://example.org/project/detail/1' });
});
