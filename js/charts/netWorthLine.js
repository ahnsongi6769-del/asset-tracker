'use strict';

// 순자산 추이 라인 차트 모듈
const NetWorthLineChart = (() => {
  // 툴팁 콜백이 참조하는 현재 filtered entries
  let _filtered = [];

  function _prepare(entries, items) {
    _filtered = entries;
    const labels  = entries.map(e => fmtMonthShort(e.month));
    const netData = entries.map(e => Compute.netWorth(e, items));
    return { labels, netData };
  }

  function _goalDataset(labels, goal) {
    if (!goal || !goal.targetAmount) return null;
    return {
      label: goal.name || '목표',
      data: Array(labels.length).fill(goal.targetAmount),
      borderColor: '#F59E0B',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
      order: 2,
    };
  }

  function create(canvasId, entries, items, goal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    const { labels, netData } = _prepare(entries, items);
    const datasets = [
      {
        label: '순자산',
        data: netData,
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
    ];
    const gd = _goalDataset(labels, goal);
    if (gd) datasets.push(gd);

    return new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        onClick(event, elements) {
          if (elements.length > 0) {
            navigate('matrix');
          }
        },
        plugins: {
          legend: { display: !!gd, labels: { font: { size: 11 }, boxWidth: 20 } },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title(items) {
                const idx = items[0].dataIndex;
                return fmtMonth(_filtered[idx]?.month || '');
              },
              label(item) {
                if (item.datasetIndex === 0) return '순자산: ' + fmtFull(item.parsed.y);
                return (item.dataset.label || '목표') + ': ' + fmtFull(item.parsed.y);
              },
              afterBody(items) {
                const idx = items[0].dataIndex;
                const comment = _filtered[idx]?.comment;
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

  function update(chart, entries, items, goal) {
    if (!chart) return;
    const { labels, netData } = _prepare(entries, items);
    chart.data.labels = labels;
    chart.data.datasets[0].data = netData;

    // 목표 데이터셋 처리
    const gd = _goalDataset(labels, goal);
    if (gd && chart.data.datasets.length > 1) {
      chart.data.datasets[1].data = Array(labels.length).fill(goal.targetAmount);
    } else if (gd && chart.data.datasets.length === 1) {
      chart.data.datasets.push(gd);
    } else if (!gd && chart.data.datasets.length > 1) {
      chart.data.datasets.splice(1, 1);
    }

    chart.update('active');
  }

  return { create, update };
})();
