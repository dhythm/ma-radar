// robots.txt 確認結果: User-agent: * は /project/list/ を取得可、Crawl-delay: 10。
// 専用 User-Agent を明示し、日次実行・ページ間は10秒待機、エラー時は再試行しない。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { parseListHtml } from './parse.mjs';

const source = 'https://rakkoma.com/project/list';
const userAgent = 'ma-radar/0.1 (+https://github.com/dhythm/ma-radar)';

async function collect() {
  const { values } = parseArgs({ options: {
    pages: { type: 'string', default: '1' },
    file: { type: 'string' },
    out: { type: 'string', default: 'data/projects.json' },
  } });
  const pages = Number(values.pages);
  if (!Number.isSafeInteger(pages) || pages < 1) throw new Error('--pages には正の整数を指定してください');
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
      const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
      addHtml(await response.text());
    }
  }
  const data = { fetchedAt: new Date().toISOString(), source, items: [...byId.values()] };
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, JSON.stringify(data, null, 2) + '\n');
  console.log(`${data.items.length}件を ${values.out} に保存しました`);
}

collect().catch((error) => {
  console.error(`収集失敗: ${error.message}`);
  process.exitCode = 1;
});
