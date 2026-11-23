import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseDetailHtml } from './detail.mjs';

const html = readFileSync(new URL('./__fixtures__/detail.html', import.meta.url), 'utf8');

it('売却理由のブロックから値を取得する', () => {
  expect(parseDetailHtml(html)).toEqual({ saleReason: '別事業に注力するため' });
});

it('売却理由が存在しない場合や空欄なら null', () => {
  expect(parseDetailHtml(html.replace('売却理由', 'その他'))).toEqual({ saleReason: null });
  expect(parseDetailHtml(html.replace('別事業に注力するため', '　'))).toEqual({ saleReason: null });
});

it('ラベルの部分一致を許し、値の空白を正規化する', () => {
  expect(parseDetailHtml(html.replace('売却理由', '売却理由（補足）').replace('別事業に', '別事業に\n　')))
    .toEqual({ saleReason: '別事業に 注力するため' });
});
