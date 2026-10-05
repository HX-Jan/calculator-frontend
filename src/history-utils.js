export function historyExpression(expression) {
  return expression.replace(/\bpi\b/g, 'π').replaceAll('*', '×').replaceAll('/', '÷');
}

export function localDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateHeading(timestamp, now = new Date()) {
  const key = localDateKey(timestamp);
  if (key === localDateKey(now)) return '今天';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === localDateKey(yesterday)) return '昨天';
  return key;
}
// Text prefixes stop spreadsheets evaluating expressions or rounding long results.
export function historyCsv(records) {
  const cell = (value) => '"' + String(value).replaceAll('"', '""') + '"';
  const rows = [
    ['ID', '表达式（文本）', '结果（文本）', '角度单位', '时间（UTC）'],
    ...records.map((record) => [
      record.id,
      "'" + record.expression,
      "'" + record.result,
      (record.angle_mode || 'deg').toUpperCase(),
      record.created_at,
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
