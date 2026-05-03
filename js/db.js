'use strict';

// IndexedDB 접근 모듈 — idb-keyval 기반
const DB = (() => {
  const { get, set, clear: clearStore } = idbKeyval;

  const KEY_ITEMS    = 'items';
  const KEY_ENTRIES  = 'entries';
  const KEY_SETTINGS = 'settings';

  async function getItems()    { return (await get(KEY_ITEMS))    || []; }
  async function setItems(v)   { await set(KEY_ITEMS, v); }

  async function getEntries()  { return (await get(KEY_ENTRIES))  || []; }
  async function setEntries(v) { await set(KEY_ENTRIES, v); }

  async function getSettings() { return (await get(KEY_SETTINGS)) || { goal: null }; }
  async function setSettings(v){ await set(KEY_SETTINGS, v); }

  async function exportAll() {
    const [items, entries, settings] = await Promise.all([getItems(), getEntries(), getSettings()]);
    return { version: 2, exportedAt: new Date().toISOString(), items, entries, settings };
  }

  // mode: 'overwrite' | 'merge'
  async function importAll(data, mode = 'overwrite') {
    if (mode === 'overwrite') {
      await clearStore();
    }
    if (Array.isArray(data.items)) {
      const base = mode === 'merge' ? await getItems() : [];
      await setItems(mergeById(base, data.items));
    }
    if (Array.isArray(data.entries)) {
      const base = mode === 'merge' ? await getEntries() : [];
      await setEntries(mergeById(base, data.entries));
    }
    if (data.settings) {
      await setSettings(data.settings);
    }
  }

  async function clearAll() { await clearStore(); }

  function mergeById(existing, incoming) {
    const map = new Map(existing.map(x => [x.id, x]));
    incoming.forEach(x => map.set(x.id, x));
    return [...map.values()];
  }

  return { getItems, setItems, getEntries, setEntries, getSettings, setSettings, exportAll, importAll, clearAll };
})();
