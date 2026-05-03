'use strict';

// 차트 축 레이블용 — "원" 없이 짧게
function fmtCompact(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const abs  = Math.abs(Math.round(n));
  const sign = n < 0 ? '-' : '';
  if (abs === 0) return '0';
  if (abs >= 100_000_000) {
    const v = abs / 100_000_000;
    return sign + (v % 1 === 0 ? v : v.toFixed(1)) + '억';
  }
  if (abs >= 10_000_000) return sign + Math.round(abs / 10_000_000) + '천만';
  if (abs >= 10_000)     return sign + Math.round(abs / 10_000) + '만';
  return sign + abs.toLocaleString('ko-KR');
}

// 차트 툴팁용 — 정확한 값 + "원"
function fmtFull(n) {
  return Math.round(Math.abs(n || 0)).toLocaleString('ko-KR') + '원';
}

// 증감 툴팁용 — 부호 + 정확한 값
function fmtDeltaText(n) {
  if (!n && n !== 0) return '0원';
  return (n >= 0 ? '+' : '-') + fmtFull(n);
}
