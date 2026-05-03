'use strict';

const EntryView = (() => {
  let _month = null;
  let _existing = null;  // 현재 월의 저장된 기록
  let _prev = null;      // 이전 달 기록 (pre-fill용)

  function render(month = null) {
    _month = month || State.getCurrentEntryMonth() || currentMonth();
    _loadData();
    _renderForm();
  }

  function _loadData() {
    _existing = State.getEntryByMonth(_month);
    _prev     = State.getEntryByMonth(prevMonth(_month));
  }

  function _renderForm() {
    const activeItems = State.getActiveItems();
    const isEdit = !!_existing;

    document.getElementById('view-container').innerHTML = `
      <div class="view entry-view">
        <header class="view-header entry-header">
          <h1 class="view-title">${isEdit ? '기록 수정' : '이번 달 입력'}</h1>
          <input type="month" id="month-picker" class="month-picker" value="${_month}">
        </header>
        <div class="entry-scroll-area" id="entry-scroll">
          ${_buildCategorySections(activeItems)}
          <div class="entry-comment-wrap">
            <label class="field-label" for="entry-comment">코멘트</label>
            <textarea id="entry-comment" class="entry-comment-input"
              placeholder="이번 달 메모 (예: 상여 입금, 연봉 협상 완료 등)"
              rows="3">${esc(_existing ? (_existing.comment || '') : '')}</textarea>
          </div>
          <div style="height:24px"></div>
        </div>
        <footer class="entry-footer">
          <div class="entry-summary-row">
            <div class="entry-sum-item">
              <span class="entry-sum-label">총 자산</span>
              <span id="fs-assets" class="entry-sum-val assets-color">0원</span>
            </div>
            <div class="entry-sum-item">
              <span class="entry-sum-label">총 부채</span>
              <span id="fs-debts" class="entry-sum-val debt-color">0원</span>
            </div>
            <div class="entry-sum-item">
              <span class="entry-sum-label">순자산</span>
              <span id="fs-net" class="entry-sum-val net-positive-color">0원</span>
            </div>
          </div>
          <button id="btn-entry-save" class="btn-primary btn-full">저장</button>
        </footer>
      </div>`;

    _recalc();
    _bindEvents();
  }

  function _buildCategorySections(activeItems) {
    const cats = [
      { key: '비현금성', label: '비현금성 자산', cls: 'cat-noncash' },
      { key: '현금성',   label: '현금성 자산',   cls: 'cat-cash' },
      { key: '부채',     label: '부채',           cls: 'cat-debt' },
    ];
    return cats.map(c => {
      const catItems = activeItems.filter(i => i.category === c.key);
      if (catItems.length === 0) return '';
      return _buildSection(c, catItems);
    }).join('');
  }

  function _buildSection({ key, label, cls }, items) {
    const rows = items.map(item => {
      const savedVal = _existing ? (_existing.values[item.id] ?? 0) : null;
      const prevVal  = _prev     ? (_prev.values[item.id]     ?? 0) : 0;

      // 편집 중이면 저장된 값, 새 입력이면 이전 달 값 pre-fill (gray 스타일)
      let displayVal  = '';
      let isPrefilled = false;
      if (savedVal !== null) {
        displayVal = savedVal > 0 ? fmtNum(savedVal) : '';
      } else if (prevVal > 0) {
        displayVal  = fmtNum(prevVal);
        isPrefilled = true;
      }

      return `<div class="entry-item-row">
        <label class="entry-item-label">${esc(item.name)}</label>
        <div class="entry-input-wrap">
          <input type="text"
            class="entry-item-input${isPrefilled ? ' prefilled' : ''}"
            data-item-id="${esc(item.id)}"
            data-cat="${esc(key)}"
            data-prev="${prevVal}"
            value="${esc(displayVal)}"
            inputmode="numeric"
            autocomplete="off"
            placeholder="${prevVal > 0 ? fmtNum(prevVal) : '0'}"
          >
          <span class="entry-input-unit">원</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="entry-cat-section">
      <div class="entry-cat-header">
        <span class="entry-cat-title ${cls}">${label}</span>
        <span class="entry-cat-subtotal" data-cat="${esc(key)}">0원</span>
      </div>
      <div class="entry-cat-items">${rows}</div>
    </div>`;
  }

  function _recalc() {
    let assets = 0, debts = 0;
    const cats = {};

    document.querySelectorAll('.entry-item-input').forEach(input => {
      const val = parseNum(input.value);
      const cat = input.dataset.cat;
      cats[cat] = (cats[cat] || 0) + val;
      if (cat === '부채') debts += val; else assets += val;
    });

    // 카테고리 소계
    Object.entries(cats).forEach(([cat, total]) => {
      const el = document.querySelector(`.entry-cat-subtotal[data-cat="${cat}"]`);
      if (el) el.textContent = fmtNum(total) + '원';
    });

    // 푸터 요약
    const net   = assets - debts;
    const setEl = (id, txt, cls) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = txt; if (cls) el.className = 'entry-sum-val ' + cls; }
    };
    setEl('fs-assets', fmtNum(assets) + '원');
    setEl('fs-debts',  fmtNum(debts) + '원');
    setEl('fs-net', fmtSigned(net), net >= 0 ? 'net-positive-color' : 'net-negative-color');
  }

  function _bindEvents() {
    // 월 변경
    document.getElementById('month-picker').addEventListener('change', (e) => {
      if (!e.target.value) return;
      _month = e.target.value;
      _loadData();
      _renderForm();
    });

    // 금액 입력: 자동 콤마 포맷 + prefilled 스타일 제거
    document.querySelectorAll('.entry-item-input').forEach(input => {
      input.addEventListener('focus', () => input.classList.remove('prefilled'));
      input.addEventListener('input', () => {
        const raw = input.value.replace(/[^\d]/g, '');
        input.value = raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '';
        input.classList.remove('prefilled');
        _recalc();
      });
    });

    // 코멘트 자동 높이 조절
    const commentEl = document.getElementById('entry-comment');
    if (commentEl) {
      commentEl.addEventListener('input', () => {
        commentEl.style.height = 'auto';
        commentEl.style.height = commentEl.scrollHeight + 'px';
      });
    }

    // 저장
    document.getElementById('btn-entry-save').addEventListener('click', _save);
  }

  async function _save() {
    // 값 수집 (prefilled 포함 — input.value에 이미 값이 있음)
    const values = {};
    document.querySelectorAll('.entry-item-input').forEach(input => {
      values[input.dataset.itemId] = parseNum(input.value);
    });

    const comment = (document.getElementById('entry-comment').value || '').trim();
    const now = Date.now();

    // 같은 달 중복 검사 (새 입력일 때)
    if (!_existing) {
      const dup = State.getEntryByMonth(_month);
      if (dup) {
        const ok = await confirm_(`${fmtMonth(_month)}은 이미 입력되어 있어요.\n덮어쓸까요?`);
        if (!ok) return;
        await State.deleteEntry(dup.id);
      }
    }

    await State.saveEntry({
      id:        _existing ? _existing.id : genId(),
      month:     _month,
      values,
      comment,
      createdAt: _existing ? _existing.createdAt : now,
      updatedAt: now,
    });

    navigate('dashboard');
  }

  return { render };
})();
