'use strict';

// ── 라우터 ──────────────────────────────────────────────────

function navigate(view, params = {}) {
  // 입력 화면 진입 시 대상 월 설정
  if (view === 'entry') {
    State.setCurrentEntryMonth(params.month || currentMonth());
  }

  // 탭 활성 상태 갱신
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // 화면 렌더링
  switch (view) {
    case 'dashboard': DashboardView.render(); break;
    case 'matrix':    MatrixView.render();    break;
    case 'entry':     EntryView.render(params.month || null); break;
    case 'settings':  SettingsView.render();  break;
  }
}

// ── 탭 바인딩 ────────────────────────────────────────────────

function bindTabNav() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
}

// ── 초기화 ──────────────────────────────────────────────────

async function init() {
  try {
    await State.load();
    bindTabNav();
    navigate('dashboard');
  } catch (e) {
    console.error('앱 초기화 실패:', e);
    document.getElementById('view-container').innerHTML = `
      <div style="padding:40px 24px;text-align:center;font-family:sans-serif">
        <h2>앱을 시작할 수 없습니다</h2>
        <p style="color:#64748b;margin-top:12px;line-height:1.6">
          IndexedDB를 열 수 없습니다.<br>
          시크릿 모드에서는 동작하지 않을 수 있습니다.
        </p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
