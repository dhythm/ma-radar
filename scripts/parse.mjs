import { load } from 'cheerio';

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

function parseYen(text) {
  const digits = text.replace(/[,\s円]/g, '');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(digits)) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

function categoryFor(title, kind) {
  if (/youtube|ユーチューブ/i.test(title)) return 'YouTube';
  if (title.includes('アプリ')) return 'アプリ';
  if (/EC|ネットショップ|ショップ|物販/i.test(title)) return 'EC・物販';
  if (kind === 'account') return 'SNS・アカウント';
  if (kind === 'site') return 'Webサイト';
  return 'その他';
}

export function parseListHtml(html, baseUrl = 'https://rakkoma.com') {
  const $ = load(html);
  const items = [];
  for (const element of $('li.project_list')) {
    const card = $(element);
    const href = card.find('a[href^="/project/detail/"]').first().attr('href');
    const match = href?.match(/^\/project\/detail\/(\d+)\/?$/);
    if (!match) continue;

    const heading = card.find('.project_list_name h3').first();
    const title = normalize(heading.text());
    const icons = heading.find('i.project_list_icon');
    const kind = icons.hasClass('account_icon') ? 'account' : icons.hasClass('pc_icon') ? 'site' : 'other';
    const date = card.find('.project_list_state .date span').first().text().trim();
    const stats = { monthlySales: null, monthlyProfit: null, pv: null, followers: null };
    for (const element of card.find('.project_list_stat')) {
      const stat = $(element);
      const label = stat.find('.project_list_stat_label').text();
      const value = parseYen(stat.find('.project_list_stat_value').first().text());
      if (label.includes('売上')) stats.monthlySales = value;
      else if (label.includes('利益')) stats.monthlyProfit = value;
      else if (label.includes('PV')) stats.pv = value;
      else if (/フォロワー|登録者/.test(label)) stats.followers = value;
    }
    items.push({
      id: Number(match[1]), title, url: new URL(href, baseUrl).href,
      publishedAt: /^\d{4}\/\d{2}\/\d{2}$/.test(date) ? date.replaceAll('/', '-') : null,
      price: parseYen(card.find('.project_list_price_item').first().text()),
      ...stats, kind, category: categoryFor(title, kind),
      tags: card.find('.project_list_tag_item').toArray().map((tag) => normalize($(tag).text())).filter(Boolean),
      summary: normalize(card.find('.project_list_summary_text').text()),
    });
  }
  return items;
}
