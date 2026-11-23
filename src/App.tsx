import { useEffect, useRef, useState, type ReactNode } from 'react';
import dataJson from '../data/projects.json';
import { filterAndSort, type FilterOptions, type ScoredProject, type SortKey } from './lib/filter';
import { formatDate, formatNumber, formatYen } from './lib/format';
import { isNewProject, latestPriceDrop } from './lib/history';
import { scoreProject, type ScoreResult } from './lib/scoring';
import type { Project, ProjectsData } from './lib/types';
import { parseWatchlist, toggleWatchlist, watchlistKey } from './lib/watchlist';

const data = dataJson as ProjectsData;
const items = data.items.map(project => ({ project, result: scoreProject(project) }));
const categories = [...new Set(data.items.map(project => project.category))].sort();
const fetchedAt = data.fetchedAt === null ? '未取得' : new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(data.fetchedAt));

const referenceDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', dateStyle: 'short' })
  .format(data.fetchedAt === null ? new Date() : new Date(data.fetchedAt));
const comparisonLimit = 3;
const scoreColors = ['#316aa5', '#358162', '#c97423', '#8665a9', '#be6383', '#916951'];

function HistoryBadges({ project }: { project: Project }) {
  const drop = latestPriceDrop(project);
  return <>
    {isNewProject(project, referenceDate) && <span className="chip fresh">新着</span>}
    {drop && <span className="chip drop">値下げ {formatYen(drop.from)} → {formatYen(drop.to)}</span>}
  </>;
}

function ScoreBar({ result }: { result: ScoreResult }) {
  if (result.excluded) return null;
  return <div className="score-track" aria-hidden="true"><div className="score-fill" style={{ width: `${result.score}%` }}>
    {result.reasons.map(({ label, points }, index) => <span key={label} title={`${label} +${points}`}
      style={{ flex: points, backgroundColor: scoreColors[index % scoreColors.length] }} />)}
  </div></div>;
}

interface CardProps extends ScoredProject {
  watched: boolean;
  selected: boolean;
  comparisonFull: boolean;
  onWatch: () => void;
  onCompare: () => void;
}

function ProjectCard({ project, result, watched, selected, comparisonFull, onWatch, onCompare }: CardProps) {
  const tone = result.score >= 40 ? 'high' : result.score >= 25 ? 'medium' : 'low';
  return <article className={`card${result.excluded ? ' excluded' : ''}`}>
    <div className="chips"><span className={`score ${tone}`}>スコア {result.score}</span>
      {result.excluded && <span className="chip">除外</span>}<HistoryBadges project={project} /></div>
    <h3><a href={project.url} target="_blank" rel="noreferrer">{project.title}</a></h3>
    <div className="chips meta"><span className="chip">{project.category}</span>掲載日：{formatDate(project.publishedAt)}</div>
    <dl className="metrics">
      <div className="price"><dt>価格</dt><dd>{formatYen(project.price)}</dd></div>
      <div><dt>月利益</dt><dd>{formatYen(project.monthlyProfit)}</dd></div>
      <div><dt>月売上</dt><dd>{formatYen(project.monthlySales)}</dd></div>
      {project.followers !== null && <div><dt>フォロワー数</dt><dd>{formatNumber(project.followers)}人</dd></div>}
      {project.pv !== null && <div><dt>PV</dt><dd>{formatNumber(project.pv)}</dd></div>}
    </dl>
    {project.saleReason && <p className="sale-reason" title={project.saleReason}>売却理由：{project.saleReason}</p>}
    {project.priceHistory.length >= 2 && <p className="history">価格履歴：{project.priceHistory.map(entry =>
      `${formatYen(entry.price)}（${formatDate(entry.date)}）`).join(' → ')}</p>}
    <h4>スコア理由</h4>
    <ScoreBar result={result} />
    {result.reasons.length ? <ul className="reasons">{result.reasons.map(reason => <li key={reason.label}>
      {!result.excluded && <strong>+{reason.points} </strong>}{reason.label}
    </li>)}</ul> : <p className="meta">該当する加点項目なし</p>}
    <div className="chips">{project.tags.map(tag => <span className="chip" key={tag}>{tag}</span>)}</div>
    <p className="summary">{project.summary}</p>
    <div className="actions card-actions">
      <button type="button" aria-pressed={watched} onClick={onWatch}>{watched ? '★ ウォッチ中' : '☆ ウォッチ'}</button>
      <button type="button" aria-pressed={selected} onClick={onCompare} disabled={!selected && comparisonFull}
        title={!selected && comparisonFull ? '比較できる案件は最大3件です' : undefined}>{selected ? '比較から外す' : '比較に追加'}</button>
    </div>
  </article>;
}

const comparisonRows: [string, (item: ScoredProject) => ReactNode][] = [
  ['スコア', ({ result }) => <><strong>{result.score}点</strong><small>{result.reasons.map(reason =>
    result.excluded ? reason.label : `${reason.label} +${reason.points}`).join(' ／ ') || '該当する加点項目なし'}</small></>],
  ['価格', ({ project }) => formatYen(project.price)],
  ['月利益', ({ project }) => formatYen(project.monthlyProfit)],
  ['月売上', ({ project }) => formatYen(project.monthlySales)],
  ['投資回収の目安', ({ project: { price, monthlyProfit } }) => price !== null && monthlyProfit !== null && monthlyProfit > 0
    ? `約${formatNumber(Math.round(price / monthlyProfit * 10) / 10)}ヶ月` : '—'],
  ['カテゴリ', ({ project }) => project.category],
  ['掲載日', ({ project }) => formatDate(project.publishedAt)],
  ['売却理由', ({ project }) => project.saleReason || '—'],
  ['フォロワー数', ({ project }) => project.followers === null ? '非公開' : `${formatNumber(project.followers)}人`],
  ['PV', ({ project }) => formatNumber(project.pv)],
  ['タグ', ({ project }) => project.tags.join(' ／ ') || '—'],
  ['詳細リンク', ({ project }) => <a href={project.url} target="_blank" rel="noreferrer">ラッコM&Aで詳細を見る</a>],
];

function ComparisonTable({ selected, onClose }: { selected: ScoredProject[]; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="comparison" aria-labelledby="comparison-heading">
    <div className="comparison-header"><h2 id="comparison-heading" ref={heading} tabIndex={-1}>案件の比較表</h2>
      <button type="button" onClick={onClose}>比較表を閉じる</button></div>
    <div className="table-scroll"><table aria-labelledby="comparison-heading">
      <thead><tr><th scope="col">項目</th>{selected.map(({ project }) => <th key={project.id} scope="col">{project.title}
        <div className="chips"><HistoryBadges project={project} /></div></th>)}</tr></thead>
      <tbody>{comparisonRows.map(([label, render]) => <tr key={label}><th scope="row">{label}</th>
        {selected.map(item => <td key={item.project.id}>{render(item)}</td>)}</tr>)}</tbody>
    </table></div>
  </section>;
}

function SourceLink() {
  return <a href={data.source} target="_blank" rel="noreferrer">データ出典: ラッコM&A</a>;
}

export default function App() {
  const [options, setOptions] = useState<FilterOptions>({
    keyword: '', priceBand: 'all', category: 'all', minScore: 0, sort: 'score', showExcluded: false,
    onlyNew: false, onlyDropped: false, referenceDate,
  });
  const [watchlist, setWatchlist] = useState(() => {
    try { return parseWatchlist(window.localStorage.getItem(watchlistKey)); } catch { return []; }
  });
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [selected, setSelected] = useState<ScoredProject[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  function toggleWatch(id: number) {
    const next = toggleWatchlist(watchlist, id);
    setWatchlist(next);
    try { window.localStorage.setItem(watchlistKey, JSON.stringify(next)); } catch { return; }
  }
  function changeSelection(item: ScoredProject) {
    if (selected.includes(item)) {
      setSelected(selected.filter(entry => entry !== item));
      if (selected.length === 1) setComparisonOpen(false);
    } else if (selected.length < comparisonLimit) setSelected([...selected, item]);
  }
  function update<Key extends keyof FilterOptions>(key: Key, value: FilterOptions[Key]) {
    setOptions(previous => ({ ...previous, [key]: value }));
  }
  const visible = filterAndSort(items, options).filter(({ project }) => !onlyWatched || watchlist.includes(project.id));
  return <div className={`page${selected.length ? ' with-comparison' : ''}`}>
    <header>
      <h1>M&Aレーダー</h1>
      <p>売却案件の価格・収益・スコアを比較して、気になる案件を探せます。</p>
      <div className="meta">取得日時（日本時間）：{fetchedAt} ／ 収集件数：{items.length}件</div>
    </header>
    <main>
      <aside className="notice">価格・売上・利益などの数字は売主の掲載値です。購入判断の前に、必ず各案件の詳細ページで最新情報をご確認ください。 <SourceLink /></aside>
      {comparisonOpen && selected.length > 0 && <ComparisonTable selected={selected} onClose={() => {
        setComparisonOpen(false); openButton.current?.focus();
      }} />}
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
        <div className="filter-toggles">
          <label className="toggle"><input type="checkbox" checked={options.showExcluded} onChange={event => update('showExcluded', event.target.checked)} />YouTube除外も表示</label>
          <label className="toggle"><input type="checkbox" checked={options.onlyNew} onChange={event => update('onlyNew', event.target.checked)} />新着のみ</label>
          <label className="toggle"><input type="checkbox" checked={options.onlyDropped} onChange={event => update('onlyDropped', event.target.checked)} />値下げのみ</label>
          <label className="toggle"><input type="checkbox" checked={onlyWatched} onChange={event => setOnlyWatched(event.target.checked)} />ウォッチリストのみ表示</label>
        </div>
      </section>
      <div className="results"><h2>案件一覧</h2><span role="status">{visible.length}件 / 全{items.length}件</span></div>
      {visible.length ? <div className="cards">{visible.map(item => <ProjectCard key={item.project.id} {...item}
        watched={watchlist.includes(item.project.id)} selected={selected.includes(item)} comparisonFull={selected.length >= comparisonLimit}
        onWatch={() => toggleWatch(item.project.id)} onCompare={() => changeSelection(item)} />)}</div> :
        <p className="empty">条件に合う案件がありません。条件を緩めてみてください。</p>}
    </main>
    <footer><SourceLink /> ／ 数字は売主の掲載値です。</footer>
    {selected.length > 0 && <aside className="comparison-bar" aria-label="比較対象の案件">
      <div className="comparison-selection"><strong>比較対象 {selected.length} / {comparisonLimit}件</strong>
        <ul>{selected.map(({ project }) => <li key={project.id} title={project.title}>{project.title}</li>)}</ul></div>
      <div className="actions"><button type="button" ref={openButton} aria-expanded={comparisonOpen} onClick={() => {
        if (comparisonOpen) document.getElementById('comparison-heading')?.focus();
        else setComparisonOpen(true);
      }}>比較表を開く</button>
        <button type="button" aria-label="比較対象をクリア" onClick={() => { setSelected([]); setComparisonOpen(false); }}>クリア</button></div>
    </aside>}
  </div>;
}
