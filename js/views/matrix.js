'use strict';

const MatrixView = (() => {

  function render() {
    const items   = State.getItems();
    const entries = State.getSortedEntries();  // 오름차순 (왼=오래된, 오=최신)
    const settings = State.getSettings();

    document.getElementById('view-container').innerHTML = buildHTML(items, entries, settings);

    // 최신 월이 보이도록 오른쪽 끝으로 스크롤
    const wrapper = document.querySelector('.matrix-wrapper');
    if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;

    bindEvents(entries);
  }

  function buildHTML(items, entries, settings) {
    if (!entries.length) {
      return `<div class="view matrix-view">
        <header class="view-header"><h1 class="view-title">매트릭스</h1></header>
        <div class="empty-state-center">
          <div class="empty-icon">📋</div>
          <div class="empty-desc">데이터가 없어요. 먼저 이번 달 입력을 시작해보세요.</div>
        </div>
      </div>`;
    }

    const cats = ['비현금성', '현금성', '부채'];
    const months = entries.map(e => e.month);

    // 부채 항목 존재 여부
    const hasDebt = items.some(i => i.category === '부채');

    let tableRows = '';

    cats.forEach(cat => {
      const catItems = items.filter(i => i.category === cat).sort((a, b) => a.order - b.order);
      if (cat === '부채' && catItems.length === 0) return;

      const catLabel = cat === '비현금성' ? '비현금성 자산' : cat === '현금성' ? '현금성 자산' : '부채';

      // 카테고리 헤더 행 — 첫 셀만 sticky 유지, 나머지는 빈 셀로 채움
      tableRows += `<tr class="cat-header-row">
        <td class="matrix-name-cell cat-label-cell">${catLabel}</td>
        ${months.map(() => `<td class="cat-header-empty"></td>`).join('')}
      </tr>`;

      // 항목 행
      catItems.forEach(item => {
        const activeClass = item.active ? '' : ' inactive-item';
        tableRows += `<tr class="item-data-row${activeClass}">
          <td class="matrix-name-cell item-name-cell">${esc(item.name)}</td>
          ${months.map((m, mi) => {
            const entry = entries[mi];
            const val = entry ? (entry.values[item.id] || 0) : null;
            const display = val !== null ? (val > 0 ? fmtNum(val) : '0') : '-';
            return `<td class="matrix-val-cell clickable" data-month="${esc(m)}">${display}</td>`;
          }).join('')}
        </tr>`;
      });

      // 카테고리 소계 행
      tableRows += `<tr class="subtotal-row">
        <td class="matrix-name-cell subtotal-label">소계</td>
        ${months.map((m, mi) => {
          const entry = entries[mi];
          const total = Compute.catTotalAll(entry, items, cat);
          return `<td class="matrix-val-cell subtotal-val">${entry ? fmtNum(total) : '-'}</td>`;
        }).join('')}
      </tr>`;
    });

    // 총 자산 행
    tableRows += `<tr class="total-row">
      <td class="matrix-name-cell total-label">총 자산</td>
      ${months.map((m, mi) => {
        const e = entries[mi];
        return `<td class="matrix-val-cell total-val">${e ? fmtNum(Compute.totalAssets(e, items)) : '-'}</td>`;
      }).join('')}
    </tr>`;

    // 총 부채 행 (부채 항목이 있을 때만)
    if (hasDebt) {
      tableRows += `<tr class="total-row debt-total-row">
        <td class="matrix-name-cell total-label debt-label">총 부채</td>
        ${months.map((m, mi) => {
          const e = entries[mi];
          return `<td class="matrix-val-cell total-val debt-val">${e ? fmtNum(Compute.totalDebts(e, items)) : '-'}</td>`;
        }).join('')}
      </tr>`;
    }

    // 순자산 행
    tableRows += `<tr class="total-row net-total-row">
      <td class="matrix-name-cell total-label net-label">순자산</td>
      ${months.map((m, mi) => {
        const e = entries[mi];
        return `<td class="matrix-val-cell total-val net-val">${e ? fmtNum(Compute.netWorth(e, items)) : '-'}</td>`;
      }).join('')}
    </tr>`;

    // 증감액 행
    tableRows += `<tr class="delta-row">
      <td class="matrix-name-cell delta-label">증감</td>
      ${months.map((m, mi) => {
        if (mi === 0) return `<td class="matrix-val-cell delta-val">-</td>`;
        const cur  = entries[mi];
        const prev = entries[mi - 1];
        const d    = Compute.delta(cur, prev, items);
        if (d === null) return `<td class="matrix-val-cell delta-val">-</td>`;
        const cls  = d >= 0 ? 'delta-pos' : 'delta-neg';
        return `<td class="matrix-val-cell delta-val ${cls}">${fmtSigned(d)}</td>`;
      }).join('')}
    </tr>`;

    // 목표 달성률 행 (목표 설정 시)
    if (settings.goal) {
      tableRows += `<tr class="goal-row">
        <td class="matrix-name-cell goal-label">목표 달성</td>
        ${months.map((m, mi) => {
          const e   = entries[mi];
          const pct = Compute.goalProgress(e, items, settings.goal);
          return `<td class="matrix-val-cell goal-val">${pct !== null ? pct.toFixed(0) + '%' : '-'}</td>`;
        }).join('')}
      </tr>`;
    }

    // 코멘트 행
    tableRows += `<tr class="comment-row">
      <td class="matrix-name-cell comment-label">코멘트</td>
      ${months.map((m, mi) => {
        const e   = entries[mi];
        const txt = e && e.comment ? e.comment.split('\n')[0] : '';
        return `<td class="matrix-val-cell comment-val" title="${esc(txt)}">${esc(txt)}</td>`;
      }).join('')}
    </tr>`;

    return `<div class="view matrix-view">
      <header class="view-header"><h1 class="view-title">매트릭스</h1></header>
      <div class="matrix-wrapper">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="matrix-name-cell matrix-head-name">항목</th>
              ${months.map(m => `<th class="matrix-head-month">${fmtMonthShort(m)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;
  }

  function bindEvents(entries) {
    // 데이터 셀 탭 → 해당 월 입력 화면
    document.querySelectorAll('.matrix-val-cell.clickable').forEach(cell => {
      cell.addEventListener('click', () => {
        navigate('entry', { month: cell.dataset.month });
      });
    });
  }

  return { render };
})();
