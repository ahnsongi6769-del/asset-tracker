'use strict';

// UUID 생성
function genId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 현재 월 "YYYY-MM"
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 이전 월
function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

// 월 표시 (2026-05 → "2026년 5월")
function fmtMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

// 월 짧은 표시 (2026-05 → "26.05")
function fmtMonthShort(month) {
  const [y, m] = month.split('-').map(Number);
  return `${String(y).slice(2)}.${String(m).padStart(2, '0')}`;
}

// 오늘 날짜 문자열 "YYYY-MM-DD"
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 숫자 → 천 단위 콤마 (절댓값)
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(Math.abs(n)).toLocaleString('ko-KR');
}

// 부호 포함 "원" 단위 (양수: +1,000원, 음수: -1,000원)
function fmtSigned(n) {
  if (!n) return '0원';
  return (n >= 0 ? '+' : '-') + fmtNum(n) + '원';
}

// 큰 금액 짧게 표시 (1.2억원, 3,400만원)
function fmtShort(n) {
  if (!n) return '0원';
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? '-' : '';
  if (abs >= 100_000_000) {
    const uk = abs / 100_000_000;
    return sign + (uk % 1 === 0 ? uk : uk.toFixed(1)) + '억원';
  }
  if (abs >= 10_000_000) {
    const man = Math.round(abs / 10_000);
    return sign + man.toLocaleString('ko-KR') + '만원';
  }
  if (abs >= 10_000) {
    const man = Math.round(abs / 10_000);
    return sign + man + '만원';
  }
  return sign + fmtNum(n) + '원';
}

// 문자열 → 숫자 (콤마 제거)
function parseNum(str) {
  if (!str) return 0;
  const n = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// HTML 이스케이프
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 커스텀 확인 다이얼로그 (네이티브 confirm 대체)
function confirm_(message) {
  return new Promise((resolve) => {
    const modal  = document.getElementById('modal-confirm');
    const msgEl  = document.getElementById('confirm-message');
    const okBtn  = document.getElementById('confirm-ok');
    const noBtn  = document.getElementById('confirm-cancel');
    const bdrop  = document.getElementById('confirm-backdrop');

    msgEl.innerHTML = esc(message).replace(/\n/g, '<br>');
    modal.classList.remove('hidden');

    function done(result) {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
      noBtn.removeEventListener('click', onNo);
      bdrop.removeEventListener('click', onNo);
      resolve(result);
    }
    const onOk = () => done(true);
    const onNo = () => done(false);

    okBtn.addEventListener('click', onOk);
    noBtn.addEventListener('click', onNo);
    bdrop.addEventListener('click', onNo);
  });
}
