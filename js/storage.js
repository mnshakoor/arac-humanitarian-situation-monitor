const KEYS = {
  bookmarks: 'ahsm.bookmarks',
  watchlist: 'ahsm.watchlist',
  mode: 'ahsm.mode'
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export const storage = {
  getBookmarks: () => read(KEYS.bookmarks, []),
  toggleBookmark(id) {
    const list = new Set(read(KEYS.bookmarks, []));
    list.has(id) ? list.delete(id) : list.add(id);
    write(KEYS.bookmarks, [...list]);
    return [...list];
  },
  getWatchlist: () => read(KEYS.watchlist, []),
  toggleWatchlist(iso3) {
    const list = new Set(read(KEYS.watchlist, []));
    list.has(iso3) ? list.delete(iso3) : list.add(iso3);
    write(KEYS.watchlist, [...list]);
    return [...list];
  },
  getMode: () => read(KEYS.mode, 'standard'),
  setMode: mode => write(KEYS.mode, mode)
};
