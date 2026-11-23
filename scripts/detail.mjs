import { load } from 'cheerio';

export function parseDetailHtml(html) {
  const $ = load(html);
  for (const element of $('.detail_site_data_block')) {
    const block = $(element);
    if (block.find('.detail_site_data_title').text().includes('売却理由')) {
      const value = block.find('.detail_site_data_content_detail').text().replace(/\s+/g, ' ').trim();
      return { saleReason: value || null };
    }
  }
  return { saleReason: null };
}
