import { useState } from 'react';
import dataJson from '../data/projects.json';
import { filterAndSort, type FilterOptions, type ScoredProject, type SortKey } from './lib/filter';
import { formatDate, formatNumber, formatYen } from './lib/format';
import { scoreProject } from './lib/scoring';
import type { ProjectsData } from './lib/types';

const data = dataJson as ProjectsData;
const items = data.items.map(project => ({ project, result: scoreProject(project) }));
const categories = [...new Set(data.items.map(project => project.category))].sort();
const fetchedAt = data.fetchedAt === null ? '未取得' : new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(data.fetchedAt));

function ProjectCard({ project, result }: ScoredProject) {
  const tone = result.score >= 40 ? 'high' : result.score >= 25 ? 'medium' : 'low';
  return <article className={`card${result.excluded ? ' excluded' : ''}`}>
    <div className="chips"><span className={`score ${tone}`}>スコア {result.score}</span>
      {result.excluded && <span className="chip">除外</span>}</div>
    <h3><a href={project.url} target="_blank" rel="noreferrer">{project.title}</a></h3>
    <div className="chips meta"><span className="chip">{project.category}</span>掲載日：{formatDate(project.publishedAt)}</div>
    <dl className="metrics">
      <div className="price"><dt>価格</dt><dd>{formatYen(project.price)}</dd></div>
      <div><dt>月利益</dt><dd>{formatYen(project.monthlyProfit)}</dd></div>
      <div><dt>月売上</dt><dd>{formatYen(project.monthlySales)}</dd></div>
      {project.followers !== null && <div><dt>フォロワー数</dt><dd>{formatNumber(project.followers)}人</dd></div>}
      {project.pv !== null && <div><dt>PV</dt><dd>{formatNumber(project.pv)}</dd></div>}
    </dl>
    <h4>スコア理由</h4>
    {result.reasons.length ? <ul className="reasons">{result.reasons.map(reason => <li key={reason.label}>
      {!result.excluded && <strong>+{reason.points} </strong>}{reason.label}
    </li>)}</ul> : <p className="meta">該当する加点項目なし</p>}
    <div className="chips">{project.tags.map(tag => <span className="chip" key={tag}>{tag}</span>)}</div>
    <p className="summary">{project.summary}</p>
  </article>;
}

function SourceLink() {
  return <a href={data.source} target="_blank" rel="noreferrer">データ出典: ラッコM&A</a>;
}

export default function App() {
  const [options, setOptions] = useState<FilterOptions>({
    keyword: '', priceBand: 'all', category: 'all', minScore: 0, sort: 'score', showExcluded: false,
  });
  function update<Key extends keyof FilterOptions>(key: Key, value: FilterOptions[Key]) {
    setOptions(previous => ({ ...previous, [key]: value }));
  }
  const visible = filterAndSort(items, options);
  return <div className="page">
    <header>
      <h1>M&Aレーダー</h1>
      <p>売却案件の価格・収益・スコアを比較して、気になる案件を探せます。</p>
      <div className="meta">取得日時（日本時間）：{fetchedAt} ／ 収集件数：{items.length}件</div>
    </header>
    <main>
      <aside className="notice">価格・売上・利益などの数字は売主の掲載値です。購入判断の前に、必ず各案件の詳細ページで最新情報をご確認ください。 <SourceLink /></aside>
      <section className="filters" aria-label="絞り込みと並び替え">
        <label>キーワード検索<input type="search" placeholder="タイトル・タグなど" value={options.keyword} onChange={event => update('keyword', event.target.value)} /></label>
        <label>価格帯<select value={options.priceBand} onChange={event => update('priceBand', event.target.value as FilterOptions['priceBand'])}>
          <option value="all">全て</option><option value="le30">〜30万円</option><option value="30to50">30〜50万円</option>
          <option value="50to100">50〜100万円</option><option value="100to300">100〜300万円</option><option value="gt300">300万円〜</option>
        </select></label>
        <label>カテゴリ<select value={options.category} onChange={event => update('category', event.target.value)}>
          <option value="all">全カテゴリ</option>{categories.map(category => <option key={category}>{category}</option>)}
        </select></label>
        <label>最低スコア<select value={options.minScore} onChange={event => update('minScore', Number(event.target.value))}>
          <option value={0}>指定なし</option>{[20, 30, 40].map(score => <option key={score} value={score}>{score}以上</option>)}
        </select></label>
        <label>並び替え<select value={options.sort} onChange={event => update('sort', event.target.value as SortKey)}>
          <option value="score">スコア順</option><option value="newest">新着順</option><option value="priceAsc">価格が安い順</option>
          <option value="priceDesc">価格が高い順</option><option value="profitDesc">月利益が高い順</option>
        </select></label>
        <label className="toggle"><input type="checkbox" checked={options.showExcluded} onChange={event => update('showExcluded', event.target.checked)} />YouTube除外も表示</label>
      </section>
      <div className="results"><h2>案件一覧</h2><span role="status">{visible.length}件 / 全{items.length}件</span></div>
      {visible.length ? <div className="cards">{visible.map(item => <ProjectCard key={item.project.id} {...item} />)}</div> :
        <p className="empty">条件に合う案件がありません。条件を緩めてみてください。</p>}
    </main>
    <footer><SourceLink /> ／ 数字は売主の掲載値です。</footer>
  </div>;
}
