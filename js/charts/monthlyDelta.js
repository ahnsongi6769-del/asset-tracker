'use strict';

// 월별 증감 막대 차트 모듈
const MonthlyDeltaChart = (() => {
  let _deltaEntries = [];  // 각 막대에 해당하는 "이번 달" 엔트리

  function _build(entries, items) {
    const labels  = [];
    const data    = [];
    _deltaEntries = [];

    for (let i = 1; i < entries.length; i++) {
      const cur  = entries[i];
      const prev = entries[i - 1];
      const d    = Compute.netWorth(cur, items) - Compute.netWorth(prev, items);
      labels.push(fmtMonthShort(cur.month));
      data.push(d);
      _deltaEntries.push(cur);
    }
    return { labels, data };
  }

  function create(canvasId, entries, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    const { labels, data } = _build(entries, items);

    const bgColors = data.map(v => v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)');
    const bdColors = data.map(v => v >= 0 ? '#10B981'              : '#EF4444');

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '월별 증감',
          data,
          backgroundColor: bgColors,
          borderColor: bdColors,
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick(event, elements) {
          if (elements.length === 0) return;
          const idx   = elements[0].index;
          const entry = _deltaEntries[idx];
          if (!entry) return;

          const detailEl = document.getElementById('delta-detail');
          if (!detailEl) return;
          const comment = entry.comment ? esc(entry.comment) : '<span style="color:#94a3b8">코멘트 없음</span>';
          detailEl.innerHTML = `<strong>${fmtMonth(entry.month)}</strong>&nbsp;· ${comment}`;
          detailEl.classList.remove('hidden');
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title(items) {
                const idx = items[0].dataIndex;
                return fmtMonth(_deltaEntries[idx]?.month || '');
              },
              label(item) {
                return fmtDeltaText(item.parsed.y);
              },
              afterBody(items) {
                const idx  = items[0].dataIndex;
                const prev = items[0].chart.data._prevNetWorths?.[idx];
                if (prev && prev !== 0) {
                  const d   = items[0].parsed.y;
                  const pct = ((d / Math.abs(prev)) * 100).toFixed(1);
                  return `전월 대비 ${d >= 0 ? '+' : ''}${pct}%`;
                }
                return null;
              },
              footer(items) {
                const idx     = items[0].dataIndex;
                const comment = _deltaEntries[idx]?.comment;
                if (!comment) return null;
                return comment.length > 44 ? comment.substring(0, 44) + '…' : comment;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#64748b' },
          },
          y: {
            grid: {
              // 0선 강조
              color: ctx => ctx.tick.value === 0 ? 'rgba(100,116,139,0.6)' : 'rgba(0,0,0,0.05)',
              lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1,
            },
            ticks: {
              font: { size: 11 },
              color: '#64748b',
              callback: v => fmtCompact(v),
            },
          },
        },
      },
    });
  }

  function update(chart, entries, items) {
    if (!chart) return;
    const { labels, data } = _build(entries, items);
    chart.data.labels = labels;
    chart.data.datasets[0].data    = data;
    chart.data.datasets[0].backgroundColor = data.map(v => v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)');
    chart.data.datasets[0].borderColor     = data.map(v => v >= 0 ? '#10B981' : '#EF4444');
    chart.update('active');

    // 기간 변경 시 detail 패널 숨김
    const detailEl = document.getElementById('delta-detail');
    if (detailEl) detailEl.classList.add('hidden');
  }

  return { create, update };
})();
