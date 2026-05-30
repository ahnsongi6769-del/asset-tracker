'use strict';

const RealEstateView = (() => {
  let _mode           = 'list';
  let _selectedPropId = null;
  let _chart          = null;

  // ── Public API ─────────────────────────────────────────────

  function renderList() {
    _mode = 'list';
    _render();
  }

  function render() {
    _render();
  }

  function _render() {
    _destroyChart();
    if (_mode === 'detail' && _selectedPropId) {
      _renderDetail();
    } else {
      _mode = 'list';
      _renderList();
    }
  }

  // ── Chart ──────────────────────────────────────────────────

  function _destroyChart() {
    if (_chart) { _chart.destroy(); _chart = null; }
  }

  // ── List View ──────────────────────────────────────────────

  function _renderList() {
    const props = State.getReProperties();
    document.getElementById('view-container').innerHTML = _buildListHTML(props);
    _bindListEvents(props.length > 0);
  }

  function _buildListHTML(props) {
    const hasProps = props.length > 0;
    const cards = hasProps
      ? props.map(_buildPropertyCard).join('')
      : `<div class="empty-hero">
          <div class="empty-icon">🏠</div>
          <div class="empty-title">등록된 매물이 없어요</div>
          <div class="empty-desc">아래 버튼으로 부동산을 추가해보세요</div>
        </div>`;

    return `
    <div class="view re-view">
      <header class="view-header">
        <h1 class="view-title">부동산</h1>
        <button id="btn-re-add-prop-header" class="btn-re-header-add">+ 추가</button>
      </header>
      <div class="re-scroll">
        ${cards}
        ${hasProps ? `<button id="btn-re-fab" class="fab-button">+ 매물 추가</button>` : ''}
        <div style="height:16px"></div>
      </div>
    </div>`;
  }

  function _buildPropertyCard(prop) {
    const prices       = State.getRePricesForProperty(prop.id);
    const latest       = prices.length > 0 ? prices[prices.length - 1] : null;
    const currentPrice = latest ? latest.price : null;

    let gainHtml = `<div class="re-card-gain neutral">시세 미입력</div>`;
    if (currentPrice !== null) {
      const diff = currentPrice - prop.purchasePrice;
      const pct  = prop.purchasePrice > 0 ? diff / prop.purchasePrice * 100 : 0;
      const cls  = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
      gainHtml = `<div class="re-card-gain ${cls}">${_fmtGainShort(diff)} (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)</div>`;
    }

    return `
    <div class="re-property-card" data-id="${esc(prop.id)}">
      <div class="re-card-body">
        <div class="re-card-name">${esc(prop.name)}</div>
        <div class="re-card-meta">구매가 ${fmtShort(prop.purchasePrice)} · ${fmtMonth(prop.purchaseMonth)}</div>
        ${currentPrice !== null
          ? `<div class="re-card-current">현재 시세 <strong>${fmtShort(currentPrice)}</strong> <span class="re-card-month">(${fmtMonth(latest.month)})</span></div>`
          : `<div class="re-card-current re-card-no-price">시세 입력 전</div>`}
        ${gainHtml}
      </div>
      <div class="re-card-arrow">›</div>
    </div>`;
  }

  function _bindListEvents(hasFab) {
    document.getElementById('btn-re-add-prop-header')?.addEventListener('click', _openPropertyModal);
    if (hasFab) document.getElementById('btn-re-fab')?.addEventListener('click', _openPropertyModal);

    document.querySelectorAll('.re-property-card').forEach(card => {
      card.addEventListener('click', () => {
        _selectedPropId = card.dataset.id;
        _mode = 'detail';
        _render();
      });
    });
  }

  // ── Detail View ────────────────────────────────────────────

  function _renderDetail() {
    const prop = State.getReProperties().find(p => p.id === _selectedPropId);
    if (!prop) { _mode = 'list'; _renderList(); return; }

    const prices = State.getRePricesForProperty(prop.id);
    document.getElementById('view-container').innerHTML = _buildDetailHTML(prop, prices);
    _bindDetailEvents(prop, prices);
    if (prices.length >= 1) {
      _chart = RealEstateLineChart.create('chart-re', prices, prop.purchasePrice);
    }
  }

  function _buildDetailHTML(prop, prices) {
    const latest       = prices.length > 0 ? prices[prices.length - 1] : null;
    const currentPrice = latest ? latest.price : null;

    let gainHtml = '';
    if (currentPrice !== null) {
      const diff = currentPrice - prop.purchasePrice;
      const pct  = prop.purchasePrice > 0 ? diff / prop.purchasePrice * 100 : 0;
      const cls  = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
      gainHtml = `
        <div class="re-summary-gain ${cls}">
          ${_fmtGainShort(diff)}
          <span class="re-summary-gain-pct">(${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>
        </div>`;
    }

    const historyRows = [...prices].reverse().map(p => `
      <div class="re-price-row">
        <div class="re-price-main">
          <span class="re-price-month">${fmtMonth(p.month)}</span>
          <span class="re-price-val">${fmtShort(p.price)}</span>
          ${p.basis ? `<span class="re-price-basis">${esc(p.basis)}</span>` : ''}
          <div class="re-price-actions">
            <button class="btn-re-price-edit" data-id="${esc(p.id)}">수정</button>
            <button class="btn-re-price-delete" data-id="${esc(p.id)}">삭제</button>
          </div>
        </div>
        ${p.note ? `<div class="re-price-note-text">${esc(p.note)}</div>` : ''}
      </div>`).join('');

    return `
    <div class="view re-detail-view">
      <header class="view-header re-detail-header">
        <button id="btn-re-back" class="btn-re-back">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15l-5-5 5-5"/>
          </svg>
          뒤로
        </button>
        <h1 class="view-title re-detail-title">${esc(prop.name)}</h1>
        <button id="btn-re-delete-prop" class="btn-re-delete">삭제</button>
      </header>
      <div class="re-detail-scroll">

        <div class="card re-summary-card">
          <div class="re-summary-cols">
            <div class="re-summary-col">
              <div class="re-sum-label">구매가</div>
              <div class="re-sum-value">${fmtShort(prop.purchasePrice)}</div>
              <div class="re-sum-sub">${fmtMonth(prop.purchaseMonth)}</div>
            </div>
            <div class="re-summary-arrow">→</div>
            <div class="re-summary-col">
              <div class="re-sum-label">현재 시세</div>
              <div class="re-sum-value">${currentPrice !== null ? fmtShort(currentPrice) : '—'}</div>
              <div class="re-sum-sub">${latest ? fmtMonth(latest.month) + ' 기준' : '미입력'}</div>
            </div>
          </div>
          ${gainHtml}
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">시세 추이</span>
          </div>
          ${prices.length >= 1
            ? `<div class="chart-container" style="height:220px"><canvas id="chart-re"></canvas></div>`
            : `<div class="chart-no-data">시세를 추가하면 추이 차트가 보여요 📈</div>`}
        </div>

        <div class="card">
          <div class="card-label">시세 이력</div>
          ${prices.length === 0
            ? `<div class="re-history-empty">아직 입력된 시세가 없어요</div>`
            : `<div class="re-price-list">${historyRows}</div>`}
        </div>

        <button id="btn-re-add-price" class="fab-button">+ 시세 추가</button>
        <div style="height:16px"></div>
      </div>
    </div>`;
  }

  function _bindDetailEvents(prop, prices) {
    document.getElementById('btn-re-back')?.addEventListener('click', () => {
      _mode = 'list';
      _render();
    });

    document.getElementById('btn-re-delete-prop')?.addEventListener('click', async () => {
      const ok = await confirm_(`"${prop.name}" 매물을 삭제할까요?\n시세 이력도 모두 삭제됩니다.`);
      if (!ok) return;
      await State.deleteReProperty(prop.id);
      _mode = 'list';
      _selectedPropId = null;
      _render();
    });

    document.getElementById('btn-re-add-price')?.addEventListener('click', () => _openPriceModal(prop.id, null));

    document.querySelectorAll('.btn-re-price-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = prices.find(px => px.id === btn.dataset.id);
        if (p) _openPriceModal(prop.id, p);
      });
    });

    document.querySelectorAll('.btn-re-price-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const priceId = btn.dataset.id;
        const p = prices.find(px => px.id === priceId);
        if (!p) return;
        const ok = await confirm_(`${fmtMonth(p.month)} 시세(${fmtShort(p.price)})를 삭제할까요?`);
        if (!ok) return;
        await State.deleteRePrice(priceId);
        _render();
      });
    });
  }

  // ── Modal: Property ────────────────────────────────────────

  function _openPropertyModal() {
    document.getElementById('re-prop-name').value           = '';
    document.getElementById('re-prop-purchase-price').value = '';
    document.getElementById('re-prop-purchase-month').value = currentMonth();
    document.getElementById('modal-re-property').classList.remove('hidden');
    setTimeout(() => document.getElementById('re-prop-name').focus(), 50);
  }

  function _closePropertyModal() {
    document.getElementById('modal-re-property').classList.add('hidden');
  }

  async function _saveProperty() {
    const name  = document.getElementById('re-prop-name').value.trim();
    const price = parseNum(document.getElementById('re-prop-purchase-price').value);
    const month = document.getElementById('re-prop-purchase-month').value;
    if (!name)  { alert('매물명을 입력해주세요.'); return; }
    if (!price) { alert('구매가를 입력해주세요.'); return; }
    if (!month) { alert('구매 연월을 선택해주세요.'); return; }

    const prop = { id: genId(), name, purchasePrice: price, purchaseMonth: month, createdAt: Date.now(), updatedAt: Date.now() };
    await State.saveReProperty(prop);
    _closePropertyModal();
    _selectedPropId = prop.id;
    _mode = 'detail';
    _render();
  }

  // ── Modal: Price ───────────────────────────────────────────

  function _openPriceModal(propId, existingPrice) {
    const isEdit = !!existingPrice;
    document.getElementById('re-price-id').value       = isEdit ? existingPrice.id : '';
    document.getElementById('re-price-prop-id').value  = propId;
    document.getElementById('re-price-month').value    = isEdit ? existingPrice.month : currentMonth();
    document.getElementById('re-price-value').value    = isEdit ? existingPrice.price.toLocaleString('ko-KR') : '';
    document.getElementById('re-price-basis').value    = isEdit ? (existingPrice.basis || '') : '';
    document.getElementById('re-price-note').value     = isEdit ? (existingPrice.note || '') : '';
    document.getElementById('re-price-modal-title').textContent = isEdit ? '시세 수정' : '시세 추가';
    document.getElementById('modal-re-price').classList.remove('hidden');
    setTimeout(() => document.getElementById('re-price-value').focus(), 50);
  }

  function _closePriceModal() {
    document.getElementById('modal-re-price').classList.add('hidden');
  }

  async function _savePrice() {
    const editId = document.getElementById('re-price-id').value;
    const propId = document.getElementById('re-price-prop-id').value;
    const month  = document.getElementById('re-price-month').value;
    const price  = parseNum(document.getElementById('re-price-value').value);
    const basis  = document.getElementById('re-price-basis').value;
    const note   = document.getElementById('re-price-note').value.trim();
    if (!month) { alert('연월을 선택해주세요.'); return; }
    if (!price) { alert('시세를 입력해주세요.'); return; }

    if (editId) {
      const target = State.getRePrices().find(p => p.id === editId);
      if (!target) return;
      if (target.month !== month) {
        const conflict = State.getRePricesForProperty(propId).find(p => p.month === month && p.id !== editId);
        if (conflict) {
          const ok = await confirm_(`${fmtMonth(month)} 시세가 이미 있어요.\n기존 항목을 삭제하고 덮어쓸까요?`);
          if (!ok) return;
          await State.deleteRePrice(conflict.id);
        }
      }
      await State.saveRePrice({ ...target, month, price, basis, note, updatedAt: Date.now() });
    } else {
      const existing = State.getRePricesForProperty(propId).find(p => p.month === month);
      if (existing) {
        const ok = await confirm_(`${fmtMonth(month)} 시세가 이미 있어요.\n덮어쓸까요?`);
        if (!ok) return;
        await State.saveRePrice({ ...existing, price, basis, note, updatedAt: Date.now() });
      } else {
        await State.saveRePrice({ id: genId(), propertyId: propId, month, price, basis, note, createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
    _closePriceModal();
    _render();
  }

  // ── Stable input formatters ────────────────────────────────

  function _fmtPurchasePriceInput(e) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    e.target.value = raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '';
  }

  function _fmtPriceValueInput(e) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    e.target.value = raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '';
  }

  // ── Modal event binding (called once at init) ──────────────

  function bindModalEvents() {
    document.getElementById('re-prop-purchase-price').addEventListener('input', _fmtPurchasePriceInput);
    document.getElementById('re-prop-cancel').addEventListener('click', _closePropertyModal);
    document.getElementById('re-prop-save').addEventListener('click', _saveProperty);
    document.getElementById('modal-re-property').querySelector('.modal-backdrop').addEventListener('click', _closePropertyModal);

    document.getElementById('re-price-value').addEventListener('input', _fmtPriceValueInput);
    document.getElementById('re-price-cancel').addEventListener('click', _closePriceModal);
    document.getElementById('re-price-save').addEventListener('click', _savePrice);
    document.getElementById('modal-re-price').querySelector('.modal-backdrop').addEventListener('click', _closePriceModal);
  }

  // ── Helper ─────────────────────────────────────────────────

  function _fmtGainShort(diff) {
    if (diff === 0) return '0원';
    return (diff > 0 ? '+' : '-') + fmtShort(Math.abs(diff));
  }

  return { render, renderList, bindModalEvents };
})();
