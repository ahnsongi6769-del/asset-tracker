'use strict';

const RealEstateLineChart = (() => {
  let _sorted = [];

  function create(canvasId, prices, purchasePrice) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    _sorted = [...prices].sort((a, b) => a.month.localeCompare(b.month));
    const labels    = _sorted.map(p => fmtMonthShort(p.month));
    const priceData = _sorted.map(p => p.price);

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '시세',
            data: priceData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.10)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#3B82F6',
            order: 1,
          },
          {
            label: '구매가',
            data: Array(labels.length).fill(purchasePrice),
            borderColor: '#F59E0B',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, labels: { font: { size: 11 }, boxWidth: 20 } },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title(items) {
                const idx = items[0].dataIndex;
                return fmtMonth(_sorted[idx]?.month || '');
              },
              label(item) {
                if (item.datasetIndex === 1) return '구매가: ' + fmtFull(item.parsed.y);
                const diff = item.parsed.y - purchasePrice;
                const pct  = purchasePrice > 0 ? diff / purchasePrice * 100 : 0;
                return [
                  '시세: ' + fmtFull(item.parsed.y),
                  '평가손익: ' + (diff >= 0 ? '+' : '') + Math.round(diff).toLocaleString('ko-KR') + '원 (' + (diff >= 0 ? '+' : '') + pct.toFixed(1) + '%)',
                ];
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
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
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

  return { create };
})();
