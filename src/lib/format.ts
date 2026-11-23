const numberFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 20 });

export function formatNumber(value: number | null): string {
  return value === null ? '非公開' : numberFormat.format(value);
}

export function formatYen(value: number | null): string {
  return value === null ? '非公開' : `${formatNumber(value)}円`;
}

export function formatDate(iso: string | null): string {
  return iso === null ? '日付不明' : iso.replaceAll('-', '/');
}
