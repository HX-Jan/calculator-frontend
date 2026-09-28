import test from 'node:test';
import assert from 'node:assert/strict';
import { historyCsv, dateHeading } from '../src/history-utils.js';
test('CSV preserves quoted expressions, long decimals and formula safety', () => {
  const csv = historyCsv([
    {
      id: 1,
      expression: '-1+root(8,3)',
      result: '0.1234567890123456789012345678',
      angle_mode: 'rad',
      created_at: '2026-09-28T12:00:00Z',
    },
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'-1+root(8,3)"'));
  assert.ok(csv.includes('"\'0.1234567890123456789012345678"'));
  assert.ok(csv.includes('"RAD"'));
  assert.ok(
    historyCsv([{ id: 2, expression: '="x"', result: '1', created_at: 'x' }]).includes(
      '"\'=""x"""',
    ),
  );
});
test('date headings cross month boundaries using local calendar dates', () => {
  const now = new Date(2026, 9, 1, 10);
  assert.equal(dateHeading(new Date(2026, 9, 1, 0), now), '今天');
  assert.equal(dateHeading(new Date(2026, 8, 30, 23), now), '昨天');
  assert.equal(dateHeading(new Date(2026, 8, 29, 23), now), '2026-09-29');
});
