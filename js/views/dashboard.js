'use strict';

const DashboardView = (() => {
  let _lineChart  = null;
  let _barChart   = null;
  let _donutChart = null;

  let _entries  = [];
  let _items    = [];
  let _settings = {};
  let _period   = localStorage.getItem('chartPeriod') || '12';

  // ── 공개 API ──────────────────────────────────────────────

  function render() {
    _destroyCharts();

    _entries  = State.getSortedEntries();
    _items    = State.getItems();
    _settings = State.getSettings();

    const latest = _entries.length ? _entries[_entries.length - 1] : null;
    const prev   = _entries.length > 1 ? _entries[_entries.length - 2] : null;

    document.getElementById('view-container').innerHTML = _buildHTML(latest, prev);
    _bindEvents();
    if (_entries.length > 0) _initCharts();
  }

  // ── 차트 관리 ─────────────────────────────────────────────

  function _destroyCharts() {
    if (_lineChart)  { _lineChart.destroy();  _lineChart  = null; }
    if (_barChart)   { _barChart.destroy();   _barChart   = null; }
    if (_donutChart) { _donutChart.destroy(); _donutChart = null; }
  }

  function _getFiltered() {
    if (_period === 'all') return _entries;
    return _entries.slice(-parseInt(_period));
  }

  function _initCharts() {
    const filtered = _getFiltered();
    const latest   = _entries[_entries.length - 1];
    const goal     = _settings.goal;

    if (_entries.length >= 2) {
      _lineChart = NetWorthLineChart.create('chart-networth', filtered, _items, goal);
      _barChart  = MonthlyDeltaChart.create('chart-delta', filtered, _items);
    }
    if (latest) {
      _donutChart = CompositionChart.create('chart-composition', latest, _items);
    }
  }

  function _changePeriod(period) {
    _period = period;
    localStorage.setItem('chartPeriod', period);

    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });

    const filtered = _getFiltered();
    if (_lineChart) NetWorthLineChart.update(_lineChart, filtered, _items, _settings.goal);
    if (_barChart)  MonthlyDeltaChart.update(_barChart,  filtered, _items);
  }

  // ── HTML 생성 ─────────────────────────────────────────────

  function _buildHTML(latest, prev) {
    const hasData = !!latest;

    if (!hasData) {
      return `<div class="view dashboard-view">
        <header class="view-header"><h1 class="view-title">자산 관리</h1></header>
        <div class="dashboard-scroll">
          <div class="empty-hero">
            <div class="empty-icon">📊</div>
            <div class="empty-title">아직 입력된 데이터가 없어요</div>
            <div class="empty-desc">아래 버튼으로 첫 번째 기록을 시작해보세요</div>
          </div>
          <button id="btn-dashboard-entry" class="fab-button">+ 이번 달 입력</button>
        </div>
      </div>`;
    }

    const net    = Compute.netWorth(latest, _items);
    const d      = Compute.delta(latest, prev, _items);
    const dr     = Compute.deltaRate(latest, prev, _items);
    const debts  = Compute.totalDebts(latest, _items);
    const goal   = _settings.goal;
    const hasDebtItems = _items.some(i => i.category === '부채' && i.active);

    const pBtn = p => `<button class="period-btn${_period === p ? ' active' : ''}" data-period="${p}">${p === 'all' ? '전체' : p + '개월'}</button>`;

    return `
    <div class="view dashboard-view">
      <header class="view-header"><h1 class="view-title">자산 관리</h1></header>
      <div class="dashboard-scroll">

        <!-- 순자산 히어로 -->
        <div class="hero-section">
          <div class="hero-net-label">순자산</div>
          <div class="hero-net-value">${fmtShort(net)}</div>
          <div class="hero-month">${fmtMonth(latest.month)} 기준</div>
          ${d !== null ? `
            <div class="hero-delta ${d >= 0 ? 'positive' : 'negative'}">
              ${fmtSigned(d)}
              ${dr !== null ? `<span class="hero-rate">(${dr >= 0 ? '+' : ''}${dr.toFixed(1)}%)</span>` : ''}
              <span class="hero-delta-label">전월 대비</span>
            </div>` : ''}
        </div>

        <!-- ① 순자산 추이 라인 차트 -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">순자산 추이</span>
            <div class="period-toggle">
              ${['3','6','12','all'].map(pBtn).join('')}
            </div>
          </div>
          ${_entries.length >= 2
            ? `<div class="chart-container" style="height:220px"><canvas id="chart-networth"></canvas></div>`
            : `<div class="chart-no-data">두 달치 데이터가 쌓이면 추이 차트가 보여요 📈</div>`}
        </div>

        <!-- ② 월별 증감 막대 차트 -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">월별 증감</span>
          </div>
          ${_entries.length >= 2
            ? `<div class="chart-container" style="height:200px"><canvas id="chart-delta"></canvas></div>
               <div id="delta-detail" class="delta-detail hidden"></div>`
            : `<div class="chart-no-data">두 달치 데이터가 쌓이면 증감 차트가 보여요 📊</div>`}
        </div>

        <!-- ③ 자산 구성 도넛 차트 -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">자산 구성</span>
          </div>
          <div class="chart-container chart-donut-container" style="height:260px">
            <canvas id="chart-composition"></canvas>
          </div>
        </div>

        <!-- 부채 + 목표 카드 (2열) -->
        <div class="card-row-2">
          ${hasDebtItems
            ? `<div class="card">
                <div class="card-label">총 부채</div>
                <div class="card-value debt-color">${fmtShort(debts)}</div>
               </div>`
            : `<div class="card card-muted">
                <div class="card-label">총 부채</div>
                <div class="card-value-muted">없음</div>
               </div>`}
          ${_goalCard(latest, goal)}
        </div>

        <!-- 코멘트 카드 -->
        ${latest.comment ? _commentCard(latest) : ''}

        <!-- FAB -->
        <button id="btn-dashboard-entry" class="fab-button">+ 이번 달 입력</button>
        <div style="height:16px"></div>
      </div>
    </div>`;
  }

  function _goalCard(entry, goal) {
    if (!goal) {
      return `<div class="card">
        <div class="card-label">목표 진척도</div>
        <div class="card-value-muted">미설정</div>
        <button class="card-link-btn" id="btn-goto-goal">설정하기 →</button>
      </div>`;
    }
    const pct     = Compute.goalProgress(entry, _items, goal);
    const clamped = Math.min(Math.max(pct || 0, 0), 100);
    return `<div class="card">
      <div class="card-label">목표 진척도</div>
      <div class="goal-name">${esc(goal.name)}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${clamped.toFixed(1)}%"></div></div>
      <div class="goal-detail">
        ${fmtShort(Compute.netWorth(entry, _items))} / ${fmtShort(goal.targetAmount)}
        <span class="goal-pct">${pct !== null ? pct.toFixed(1) + '%' : '-'}</span>
      </div>
    </div>`;
  }

  function _commentCard(entry) {
    const line1 = entry.comment.split('\n')[0];
    return `<div class="card">
      <div class="card-label">최근 코멘트 · ${fmtMonth(entry.month)}</div>
      <div class="card-comment-text">${esc(line1)}</div>
    </div>`;
  }

  // ── 이벤트 ────────────────────────────────────────────────

  function _bindEvents() {
    document.getElementById('btn-dashboard-entry')?.addEventListener('click', () => navigate('entry'));
    document.getElementById('btn-goto-goal')?.addEventListener('click', () => navigate('settings'));

    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => _changePeriod(btn.dataset.period));
    });
  }

  return { render };
})();
