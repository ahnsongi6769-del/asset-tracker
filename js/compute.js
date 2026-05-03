'use strict';

// 순수 계산 함수 모음
const Compute = (() => {

  // 카테고리 합계 (active 항목만)
  function catTotal(entry, items, cat) {
    if (!entry) return 0;
    return items
      .filter(i => i.category === cat && i.active)
      .reduce((s, i) => s + (entry.values[i.id] || 0), 0);
  }

  // 모든 항목 포함 카테고리 합계 (비활성 포함 — 매트릭스 과거 데이터용)
  function catTotalAll(entry, items, cat) {
    if (!entry) return 0;
    return items
      .filter(i => i.category === cat)
      .reduce((s, i) => s + (entry.values[i.id] || 0), 0);
  }

  function totalAssets(entry, items) {
    return catTotal(entry, items, '비현금성') + catTotal(entry, items, '현금성');
  }

  function totalDebts(entry, items) {
    return catTotal(entry, items, '부채');
  }

  function netWorth(entry, items) {
    return totalAssets(entry, items) - totalDebts(entry, items);
  }

  // 전월 대비 순자산 증감 (null: 이전 달 없음)
  function delta(cur, prev, items) {
    if (!cur || !prev) return null;
    return netWorth(cur, items) - netWorth(prev, items);
  }

  // 증감률 (%)
  function deltaRate(cur, prev, items) {
    if (!cur || !prev) return null;
    const p = netWorth(prev, items);
    if (p === 0) return null;
    return ((netWorth(cur, items) - p) / Math.abs(p)) * 100;
  }

  // 목표 달성률 (%)
  function goalProgress(entry, items, goal) {
    if (!goal || !goal.targetAmount || !entry) return null;
    return (netWorth(entry, items) / goal.targetAmount) * 100;
  }

  // 총 자산 중 비현금성 비율 (%)
  function noncashRatio(entry, items) {
    const total = totalAssets(entry, items);
    if (!total) return 0;
    return (catTotal(entry, items, '비현금성') / total) * 100;
  }

  return { catTotal, catTotalAll, totalAssets, totalDebts, netWorth, delta, deltaRate, goalProgress, noncashRatio };
})();
