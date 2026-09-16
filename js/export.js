function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(name, payload) {
  download(name, JSON.stringify(payload, null, 2), 'application/json');
}

export function exportCsv(name, rows) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const escape = v => `"${String(v ?? '').replaceAll('"','""')}"`;
  const csv = [columns.join(','), ...rows.map(r => columns.map(c => escape(r[c])).join(','))].join('\n');
  download(name, csv, 'text/csv;charset=utf-8');
}
