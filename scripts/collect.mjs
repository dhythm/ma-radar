// robots.txt 確認結果: User-agent: * は /project/list/ を取得可、Crawl-delay: 10。
// 専用 User-Agent を明示し、日次実行・ページ間は10秒待機、エラー時は再試行しない。
// 詳細取得にも上限を設け、一覧から詳細への遷移を含めて Crawl-delay 10秒を守る。失敗時は売却理由を null のまま収集を続ける。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { parseListHtml } from './parse.mjs';
import { parseDetailHtml } from './detail.mjs';
import { mergeProjects } from './merge.mjs';

const source = 'https://rakkoma.com/project/list';
const userAgent = 'ma-radar/0.1 (+https://github.com/dhythm/ma-radar)';

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function readExisting(path) {
  try {
    const { items } = JSON.parse(await readFile(path, 'utf8'));
    if (!Array.isArray(items)) throw new Error(`${path}: items が配列ではありません`);
    return items;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function collect() {
  const { values } = parseArgs({ options: {
    pages: { type: 'string', default: '1' },
    file: { type: 'string' },
    out: { type: 'string', default: 'data/projects.json' },
    'detail-limit': { type: 'string', default: '20' },
    'no-details': { type: 'boolean' },
  } });
  const pages = Number(values.pages);
  if (!Number.isSafeInteger(pages) || pages < 1) throw new Error('--pages には正の整数を指定してください');
  const detailLimit = Number(values['detail-limit']);
  if (!Number.isSafeInteger(detailLimit) || detailLimit < 0) throw new Error('--detail-limit には0以上の整数を指定してください');
  const byId = new Map();
  function addHtml(html) {
    for (const project of parseListHtml(html)) {
      if (!byId.has(project.id)) byId.set(project.id, project);
    }
  }

  if (values.file !== undefined) {
    addHtml(await readFile(values.file, 'utf8'));
  } else {
    for (let page = 1; page <= pages; page++) {
      if (page > 1) await sleep(10_000);
      // ページネーションは一覧ページ内のリンクで ?page=N 形式であることを確認済み。
      const url = page === 1 ? source : `${source}?page=${page}`;
      addHtml(await fetchHtml(url));
    }
  }
  const existing = values.file === undefined ? await readExisting(values.out) : [];
  const now = new Date();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', dateStyle: 'short' }).format(now);
  const items = mergeProjects(existing, [...byId.values()], today);
  let detailCount = 0;
  if (values.file === undefined && !values['no-details']) {
    const targets = items.filter(item => byId.has(item.id) && item.saleReason === null)
      .sort((left, right) => right.id - left.id).slice(0, detailLimit);
    for (const item of targets) {
      await sleep(10_000);
      try {
        item.saleReason = parseDetailHtml(await fetchHtml(item.url)).saleReason;
        detailCount++;
      } catch (error) {
        console.warn(`詳細取得失敗 (${item.url}): ${error.message}`);
      }
    }
  }
  const data = { fetchedAt: now.toISOString(), source, items };
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, JSON.stringify(data, null, 2) + '\n');
  console.log(`総件数 ${items.length}件、新規 ${items.length - new Set(existing.map(item => item.id)).size}件、詳細取得 ${detailCount}件を ${values.out} に保存しました`);
}

collect().catch((error) => {
  console.error(`収集失敗: ${error.message}`);
  process.exitCode = 1;
});
