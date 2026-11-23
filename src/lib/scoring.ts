import type { Project } from './types';

export interface ScoreReason { label: string; points: number }
export interface ScoreResult { score: number; excluded: boolean; reasons: ScoreReason[] }

export function scoreProject(project: Project): ScoreResult {
  const { title, summary, tags, category, price, monthlyProfit, followers, pv } = project;
  const text = [title, summary, ...tags].join(' ');
  if (/youtube|ユーチューブ/i.test(`${text} ${category}`)) {
    return { score: 0, excluded: true, reasons: [{ label: 'YouTube案件のため除外', points: 0 }] };
  }

  const reasons: ScoreReason[] = [];
  const add = (label: string, points: number) => reasons.push({ label, points });
  const has = (keywords: string[]) => keywords.some((keyword) => text.includes(keyword));
  if (has(['忙しく','多忙','時間が取れ','時間がなく','時間がない','本業が忙','他事業','事業に集中','手が回ら']))
    add('売却理由が「多忙・他事業集中」に該当', 20);
  if (has(['マニュアル','未経験','初心者','簡単','シンプル','仕組み化','誰でも','専門知識不要','スキル不要']))
    add('運用がシンプル・スキル不要の示唆あり', 15);
  if (has(['外注','一人','個人運営','副業','片手間','従業員なし','ワンオペ','自動化']))
    add('一人または外注のみで運営できそう', 15);
  if (price !== null) {
    if (price <= 300_000) add('価格が30万円以下', 15);
    else if (price <= 500_000) add('価格が50万円以下', 12);
    else if (price <= 1_000_000) add('価格が100万円以下', 8);
    else if (price <= 2_000_000) add('価格が200万円以下', 4);
  }
  if (has(['在庫なし','在庫不要','在庫を持た'])) add('在庫なし', 5);
  if (monthlyProfit !== null && monthlyProfit > 0) {
    add('月利益が黒字（売主掲載値）', 10);
    if (monthlyProfit >= 100_000) add('月利益が10万円以上', 5);
    if (price !== null) {
      const months = price / monthlyProfit;
      if (months <= 12) add('投資回収の目安が12ヶ月以内', 5);
      else if (months <= 24) add('投資回収の目安が24ヶ月以内', 3);
    }
  }
  if ((followers ?? 0) >= 10_000 || (pv ?? 0) >= 10_000) add('利用者・アクセスの実績あり', 5);
  if (tags.some((tag) => tag.includes('本人確認'))) add('本人確認済みの売主', 3);
  reasons.sort((left, right) => right.points - left.points);
  return { score: Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0)), excluded: false, reasons };
}
