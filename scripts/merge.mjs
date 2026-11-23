export function mergeProjects(existingItems, freshItems, today) {
  const byId = new Map();
  for (const item of existingItems) {
    byId.set(item.id, {
      ...item,
      saleReason: item.saleReason ?? null,
      firstSeenAt: item.firstSeenAt || today,
      lastSeenAt: item.lastSeenAt || today,
      priceHistory: item.priceHistory ?? (item.price == null ? [] : [{ date: today, price: item.price }]),
    });
  }
  for (const item of freshItems) {
    const existing = byId.get(item.id);
    const history = existing?.priceHistory ?? [];
    byId.set(item.id, {
      ...item,
      saleReason: item.saleReason ?? existing?.saleReason ?? null,
      firstSeenAt: existing?.firstSeenAt ?? today,
      lastSeenAt: today,
      priceHistory: item.price != null && history.at(-1)?.price !== item.price
        ? [...history, { date: today, price: item.price }] : history,
    });
  }
  return [...byId.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt)
    || right.firstSeenAt.localeCompare(left.firstSeenAt) || right.id - left.id);
}
