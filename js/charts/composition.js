'use strict';

// 자산 구성 도넛 차트 모듈 — 항목별 표시
const CompositionChart = (() => {

  // 카테고리별 색상 팔레트 (값 큰 순서로 톤이 진→연하게 분배됨)
  const NONCASH_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];
  const CASH_COLORS    = ['#0891B2', '#06B6D4', '#22D3EE', '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE'];

  // 도넛 중앙 텍스트 인라인 플러그인
  const _centerPlugin = {
    id: 'doughnutCenter',
    afterDraw(chart) {
      const ct = chart.data.centerText;
      if (!ct) return;
      const { ctx, chartArea: { left, top, right, bottom } } = chart;
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;

      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      ctx.font      = '11px -apple-system, "Apple SD Gothic Neo", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(ct.label, cx, cy - 12);

      ctx.font      = 'bold 16px -apple-system, "Apple SD Gothic Neo", sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(ct.value, cx, cy + 8);

      ctx.restore();
    },
  };

  function _build(entry, items) {
    // 활성 + 부채 제외 + 값 > 0인 항목만, 값 큰 순서로 정렬
    const assetItems = items
      .filter(i => i.active && i.category !== '부채')
      .map(i => ({
        name:     i.name,
        category: i.category,
        value:    entry.values[i.id] || 0,
      }))
      .filter(i => i.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = assetItems.reduce((s, i) => s + i.value, 0);

    // 카테고리별로 인덱스를 따로 카운트해 팔레트 분배
    let noncashIdx = 0, cashIdx = 0;
    const labels = [];
    const data   = [];
    const colors = [];

    assetItems.forEach(it => {
      labels.push(it.name);
      data.push(it.value);
      if (it.category === '비현금성') {
        colors.push(NONCASH_COLORS[noncashIdx % NONCASH_COLORS.length]);
        noncashIdx++;
      } else {
        colors.push(CASH_COLORS[cashIdx % CASH_COLORS.length]);
        cashIdx++;
      }
    });

    return { labels, data, colors, total };
  }

  function create(canvasId, entry, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    const { labels, data, colors, total } = _build(entry, items);

    return new Chart(canvas, {
      type: 'doughnut',
      plugins: [_centerPlugin],
      data: {
        centerText: { label: '총 자산', value: fmtShort(total) },
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 },
              padding: 10,
              usePointStyle: true,
              pointStyleWidth: 10,
              boxHeight: 8,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label(item) {
                const val = item.parsed;
                const sum = item.dataset.data.reduce((a, b) => a + b, 0);
                const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : 0;
                return `${item.label}: ${fmtFull(val)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function update(chart, entry, items) {
    if (!chart) return;
    const { labels, data, colors, total } = _build(entry, items);
    chart.data.labels                       = labels;
    chart.data.centerText                   = { label: '총 자산', value: fmtShort(total) };
    chart.data.datasets[0].data             = data;
    chart.data.datasets[0].backgroundColor  = colors;
    chart.update('active');
  }

  return { create, update };
})();
