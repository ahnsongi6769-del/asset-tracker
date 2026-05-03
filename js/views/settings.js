'use strict';

const SettingsView = (() => {
  let _editItemId = null;  // null = 새 항목

  function render() {
    const items    = State.getItems();
    const settings = State.getSettings();

    document.getElementById('view-container').innerHTML = `
      <div class="view settings-view">
        <header class="view-header"><h1 class="view-title">설정</h1></header>
        <div class="settings-scroll">

          <!-- 항목 관리 -->
          <section class="settings-section">
            <h2 class="settings-section-title">항목 관리</h2>
            ${_buildCatGroup(items, '비현금성', '비현금성 자산')}
            ${_buildCatGroup(items, '현금성',   '현금성 자산')}
            ${_buildCatGroup(items, '부채',     '부채')}
          </section>

          <!-- 단기 목표 -->
          <section class="settings-section">
            <h2 class="settings-section-title">단기 목표</h2>
            <div class="goal-form">
              <div class="form-group">
                <label class="field-label" for="goal-name">목표 이름</label>
                <input type="text" id="goal-name" class="form-input"
                  value="${esc(settings.goal ? settings.goal.name : '')}"
                  placeholder="예: 2억 목표">
              </div>
              <div class="form-group">
                <label class="field-label" for="goal-amount">목표 금액</label>
                <div class="input-with-unit">
                  <input type="text" id="goal-amount" class="form-input"
                    value="${settings.goal ? fmtNum(settings.goal.targetAmount) : ''}"
                    inputmode="numeric" placeholder="200,000,000">
                  <span class="input-unit">원</span>
                </div>
              </div>
              <button id="btn-save-goal" class="btn-primary btn-full">목표 저장</button>
            </div>
          </section>

          <!-- 데이터 관리 -->
          <section class="settings-section">
            <h2 class="settings-section-title">데이터 관리</h2>
            <div class="data-action-list">
              <button id="btn-export" class="data-action-item">
                <span>📤</span><span>JSON 내보내기</span>
              </button>
              <label class="data-action-item" style="cursor:pointer">
                <span>📥</span><span>JSON 불러오기</span>
                <input type="file" id="input-import" accept=".json" style="display:none">
              </label>
              <button id="btn-clear-all" class="data-action-item danger">
                <span>🗑️</span><span>전체 삭제</span>
              </button>
            </div>
          </section>

          <div style="height:24px"></div>
        </div>
      </div>`;

    _bindEvents();
  }

  function _buildCatGroup(items, catKey, catLabel) {
    const catItems = items.filter(i => i.category === catKey).sort((a, b) => a.order - b.order);

    const rows = catItems.map((item, idx) => `
      <div class="settings-item-row" data-id="${esc(item.id)}">
        <div class="item-order-btns">
          <button class="btn-order" data-id="${esc(item.id)}" data-dir="up"   ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn-order" data-id="${esc(item.id)}" data-dir="down" ${idx === catItems.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
        <span class="item-row-name${item.active ? '' : ' item-inactive'}">${esc(item.name)}</span>
        <div class="item-row-actions">
          <button class="btn-toggle-active${item.active ? ' is-active' : ''}" data-id="${esc(item.id)}"
            title="${item.active ? '비활성화' : '활성화'}">
            ${item.active ? '●' : '○'}
          </button>
          <button class="btn-edit-item" data-id="${esc(item.id)}">편집</button>
          <button class="btn-delete-item" data-id="${esc(item.id)}">삭제</button>
        </div>
      </div>`).join('');

    return `<div class="item-cat-group">
      <div class="item-cat-header">
        <h3 class="item-cat-title">${catLabel}</h3>
      </div>
      <div class="item-cat-list">${rows}</div>
      <button class="btn-add-item" data-cat="${esc(catKey)}">+ 항목 추가</button>
    </div>`;
  }

  function _bindEvents() {
    // 항목 추가
    document.querySelectorAll('.btn-add-item').forEach(btn => {
      btn.addEventListener('click', () => _openModal(null, btn.dataset.cat));
    });

    // 순서 이동
    document.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', async () => {
        await _moveItem(btn.dataset.id, btn.dataset.dir);
        render();
      });
    });

    // 활성/비활성 토글
    document.querySelectorAll('.btn-toggle-active').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = State.getItems().find(i => i.id === btn.dataset.id);
        if (!item) return;
        await State.saveItem({ ...item, active: !item.active, updatedAt: Date.now() });
        render();
      });
    });

    // 편집
    document.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = State.getItems().find(i => i.id === btn.dataset.id);
        if (item) _openModal(item);
      });
    });

    // 삭제
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm_('이 항목을 삭제할까요?\n기존 기록 데이터는 유지됩니다.');
        if (!ok) return;
        await State.deleteItem(btn.dataset.id);
        render();
      });
    });

    // 목표 저장
    document.getElementById('btn-save-goal').addEventListener('click', async () => {
      const name   = document.getElementById('goal-name').value.trim();
      const amount = parseNum(document.getElementById('goal-amount').value);
      await State.saveSettings({ goal: name || amount ? { name: name || '목표', targetAmount: amount } : null });
      alert('저장되었습니다.');
    });

    // 목표 금액 자동 포맷
    document.getElementById('goal-amount').addEventListener('input', (e) => {
      const raw = e.target.value.replace(/[^\d]/g, '');
      e.target.value = raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '';
    });

    // 내보내기
    document.getElementById('btn-export').addEventListener('click', _export);

    // 불러오기
    document.getElementById('input-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) { _import(file); e.target.value = ''; }
    });

    // 전체 삭제
    document.getElementById('btn-clear-all').addEventListener('click', _clearAll);

    // 모달 버튼
    document.getElementById('item-edit-save').addEventListener('click', _saveFromModal);
    document.getElementById('item-edit-cancel').addEventListener('click', _closeModal);
    document.getElementById('item-edit-backdrop').addEventListener('click', _closeModal);
  }

  async function _moveItem(id, dir) {
    const item     = State.getItems().find(i => i.id === id);
    if (!item) return;
    const catItems = State.getItemsByCategory(item.category);
    const idx      = catItems.findIndex(i => i.id === id);
    const swapIdx  = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= catItems.length) return;

    const sibling  = catItems[swapIdx];
    const now      = Date.now();
    // 순서값 교환
    const tmpOrder = item.order;
    await State.saveItem({ ...item,    order: sibling.order, updatedAt: now });
    await State.saveItem({ ...sibling, order: tmpOrder,      updatedAt: now });
  }

  function _openModal(item = null, defaultCat = '현금성') {
    _editItemId = item ? item.id : null;
    document.getElementById('item-edit-title').textContent    = item ? '항목 편집' : '항목 추가';
    document.getElementById('item-edit-name').value           = item ? item.name : '';
    document.getElementById('item-edit-category').value       = item ? item.category : defaultCat;
    document.getElementById('modal-item-edit').classList.remove('hidden');
    setTimeout(() => document.getElementById('item-edit-name').focus(), 50);
  }

  function _closeModal() {
    document.getElementById('modal-item-edit').classList.add('hidden');
    _editItemId = null;
  }

  async function _saveFromModal() {
    const name     = document.getElementById('item-edit-name').value.trim();
    const category = document.getElementById('item-edit-category').value;
    if (!name) { alert('항목명을 입력해주세요.'); return; }

    const now   = Date.now();
    const items = State.getItems();

    if (_editItemId) {
      const existing = items.find(i => i.id === _editItemId);
      if (existing) await State.saveItem({ ...existing, name, category, updatedAt: now });
    } else {
      const catItems = items.filter(i => i.category === category);
      const maxOrder = catItems.length ? Math.max(...catItems.map(i => i.order)) + 1 : items.length;
      await State.saveItem({ id: genId(), name, category, order: maxOrder, active: true, createdAt: now, updatedAt: now });
    }

    _closeModal();
    render();
  }

  async function _export() {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `assets-backup-${todayStr().replace(/-/g, '')}.json`
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function _import(file) {
    try {
      const data     = JSON.parse(await file.text());
      const overwrite = confirm('확인 = 기존 데이터 삭제 후 불러오기\n취소 = 기존 데이터에 병합');
      await DB.importAll(data, overwrite ? 'overwrite' : 'merge');
      await State.reload();
      render();
      alert('불러오기 완료!');
    } catch (e) {
      alert('파일 오류: ' + e.message);
    }
  }

  async function _clearAll() {
    const ok = await confirm_('모든 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.');
    if (!ok) return;
    await DB.clearAll();
    await State.reload();
    render();
  }

  return { render };
})();
