'use strict';

// 앱 상태 관리 — 메모리 캐시 + DB 쓰기
const State = (() => {
  let _items          = [];
  let _entries        = [];
  let _settings       = { goal: null };
  let _currentEntryMonth = null;
  let _reProperties   = [];
  let _rePrices       = [];

  // 첫 실행 기본 항목
  const DEFAULTS = [
    { cat: '비현금성', names: ['부동산 (전세/매매)', '송이 ISA', '규진 ISA', '송이 주택청약', '규진 주택청약'] },
    { cat: '현금성',   names: ['주식', '채권투자', '단기가용 자금', '경조사 통장', '가상화폐'] },
    { cat: '부채',     names: [] },
  ];

  // 앱 시작 시 1회 호출 (기본 항목 생성 포함)
  async function load() {
    [_items, _entries, _settings, _reProperties, _rePrices] = await Promise.all([
      DB.getItems(), DB.getEntries(), DB.getSettings(), DB.getReProperties(), DB.getRePrices(),
    ]);
    if (_items.length === 0) await _createDefaults();
  }

  // 외부에서 강제 재로드 (clear 후 등)
  async function reload() {
    [_items, _entries, _settings, _reProperties, _rePrices] = await Promise.all([
      DB.getItems(), DB.getEntries(), DB.getSettings(), DB.getReProperties(), DB.getRePrices(),
    ]);
  }

  async function _createDefaults() {
    const now = Date.now();
    let order = 0;
    DEFAULTS.forEach(({ cat, names }) => {
      names.forEach(name => {
        _items.push({ id: genId(), name, category: cat, order: order++, active: true, createdAt: now, updatedAt: now });
      });
    });
    await DB.setItems(_items);
  }

  // ── 읽기 ──────────────────────────────────
  const getItems    = () => _items;
  const getEntries  = () => _entries;
  const getSettings = () => _settings;
  const getCurrentEntryMonth = () => _currentEntryMonth;
  const getReProperties = () => _reProperties;
  const getRePrices     = () => _rePrices;

  function getRePricesForProperty(propId) {
    return _rePrices.filter(p => p.propertyId === propId).sort((a, b) => a.month.localeCompare(b.month));
  }

  function getActiveItems() {
    return _items.filter(i => i.active).sort((a, b) => a.order - b.order);
  }

  function getItemsByCategory(cat) {
    return _items.filter(i => i.category === cat).sort((a, b) => a.order - b.order);
  }

  function getEntryByMonth(month) {
    return _entries.find(e => e.month === month) || null;
  }

  function getSortedEntries() {
    return [..._entries].sort((a, b) => a.month.localeCompare(b.month));
  }

  // ── 쓰기 ──────────────────────────────────
  async function saveItem(item) {
    const idx = _items.findIndex(i => i.id === item.id);
    if (idx >= 0) _items[idx] = item; else _items.push(item);
    await DB.setItems(_items);
  }

  async function deleteItem(id) {
    _items = _items.filter(i => i.id !== id);
    await DB.setItems(_items);
  }

  async function saveEntry(entry) {
    const idx = _entries.findIndex(e => e.id === entry.id);
    if (idx >= 0) _entries[idx] = entry; else _entries.push(entry);
    await DB.setEntries(_entries);
  }

  async function deleteEntry(id) {
    _entries = _entries.filter(e => e.id !== id);
    await DB.setEntries(_entries);
  }

  async function saveSettings(s) {
    _settings = s;
    await DB.setSettings(_settings);
  }

  function setCurrentEntryMonth(m) { _currentEntryMonth = m; }

  // ── 부동산 쓰기 ───────────────────────────
  async function saveReProperty(prop) {
    const idx = _reProperties.findIndex(p => p.id === prop.id);
    if (idx >= 0) _reProperties[idx] = prop; else _reProperties.push(prop);
    await DB.setReProperties(_reProperties);
  }

  async function deleteReProperty(id) {
    _reProperties = _reProperties.filter(p => p.id !== id);
    _rePrices     = _rePrices.filter(p => p.propertyId !== id);
    await Promise.all([DB.setReProperties(_reProperties), DB.setRePrices(_rePrices)]);
  }

  async function saveRePrice(price) {
    const idx = _rePrices.findIndex(p => p.id === price.id);
    if (idx >= 0) _rePrices[idx] = price; else _rePrices.push(price);
    await DB.setRePrices(_rePrices);
  }

  async function deleteRePrice(id) {
    _rePrices = _rePrices.filter(p => p.id !== id);
    await DB.setRePrices(_rePrices);
  }

  return {
    load, reload,
    getItems, getEntries, getSettings, getCurrentEntryMonth,
    getActiveItems, getItemsByCategory, getEntryByMonth, getSortedEntries,
    saveItem, deleteItem, saveEntry, deleteEntry, saveSettings,
    setCurrentEntryMonth,
    getReProperties, getRePrices, getRePricesForProperty,
    saveReProperty, deleteReProperty, saveRePrice, deleteRePrice,
  };
})();
