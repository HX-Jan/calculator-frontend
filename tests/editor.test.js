import test from 'node:test';
import assert from 'node:assert/strict';
import { operandRange } from '../src/expression-editor.js';
import { scientific, reusable } from '../src/result-view.js';

test('decimal formatting preserves every digit without floating point', () => {
  assert.equal(scientific('9007199254740993'), '9.007199254740993E15');
  assert.equal(
    scientific('-0.0001234567890123456789012345678'),
    '-1.234567890123456789012345678E-4',
  );
  assert.equal(scientific('1000000000000000000000000000'), '1E27');
  assert.equal(scientific('0'), '0');
  assert.equal(scientific('-0.000'), '0');
  assert.equal(reusable('0.' + '0'.repeat(800) + '12345'), '1.2345E-801');
  assert.equal(reusable('0.3333333333333333333333333333'), '0.3333333333333333333333333333');
});

test('operand boundaries distinguish unary signs, exponents and nested calls', () => {
  for (const [expression, expected] of [
    ['2+sin(30)', 'sin(30)'],
    ['-3', '-3'],
    ['2-3', '3'],
    ['2*-3', '-3'],
    ['2+(-3)', '(-3)'],
    ['1+2.5E-10', '2.5E-10'],
    ['2+sqrt((9+7))', 'sqrt((9+7))'],
    ['2+5!', '5!'],
    ['2+π', 'π'],
    ['2+pi', 'pi'],
    ['2+e', 'e'],
    ['sin(', ''],
  ]) {
    const [start, end] = operandRange(expression, expression.length);
    assert.equal(expression.slice(start, end), expected, expression);
  }
  assert.deepEqual(operandRange('2+3*4', 2, 5), [2, 5]);
});

import { ExpressionEditor } from '../src/expression-editor.js';
function createEditor() {
  const input = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    addEventListener() {},
    focus() {},
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    setRangeText(text, start, end) {
      this.value = this.value.slice(0, start) + text + this.value.slice(end);
    },
  };
  const errors = [];
  return {
    input,
    errors,
    editor: new ExpressionEditor(
      input,
      () => {},
      (message) => errors.push(message),
    ),
  };
}
test('completed results seed operators but digits replace the previous expression', () => {
  const { input, editor } = createEditor();
  editor.set('12+8');
  editor.answer = '20';
  editor.phase = 'completed';
  editor.insert('×');
  editor.insert('3');
  assert.equal(input.value, '(20)×3');
  editor.answer = '60';
  editor.phase = 'completed';
  editor.insert('7');
  assert.equal(input.value, '7');
  editor.set('12+8');
  editor.phase = 'completed';
  editor.manual();
  editor.insert('9');
  assert.equal(input.value, '12+89');
});
test('generated closing brackets skip correctly through nested functions', () => {
  const { input, editor } = createEditor();
  editor.wrap('sin(');
  editor.wrap('sqrt(');
  editor.insert('9');
  editor.insert(')');
  editor.insert(')');
  assert.equal(input.value, 'sin(sqrt(9))');
  assert.equal(input.selectionStart, input.value.length);
  editor.set('');
  editor.wrap('sin(');
  editor.backspace();
  assert.equal(input.value, 'sin');
});
test('wrapping a completed negative value requests immediate calculation', () => {
  const { input, editor } = createEditor();
  editor.set('2-5');
  editor.answer = '-3';
  editor.phase = 'completed';
  assert.deepEqual(editor.wrap('(', ')^2'), { applied: true, completed: true });
  assert.equal(input.value, '(-3)^2');
});
test('busy and overlength edits cannot change input', () => {
  const { input, editor, errors } = createEditor();
  editor.set('1');
  editor.phase = 'requesting';
  editor.insert('2');
  assert.equal(input.value, '1');
  editor.phase = 'editing';
  editor.set('1'.repeat(500));
  editor.insert('2');
  assert.equal(input.value.length, 500);
  assert.equal(errors.length, 1);
});

test('undo and redo restore clear, function wrapping and selection', () => {
  const { editor, input } = createEditor();
  editor.set('2+3');
  input.setSelectionRange(0, 3);
  editor.wrap('sqrt(');
  assert.equal(input.value, 'sqrt(2+3)');
  editor.history();
  assert.equal(input.value, '2+3');
  assert.equal(input.selectionEnd, 3);
  editor.history(true);
  assert.equal(input.value, 'sqrt(2+3)');
  editor.set('');
  editor.history();
  assert.equal(input.value, 'sqrt(2+3)');
  editor.history(true);
  assert.equal(input.value, '');
});
test('new edits discard redo; generated brackets survive undo', () => {
  const { editor, input } = createEditor();
  editor.wrap('sin(');
  editor.insert('3');
  editor.insert('0');
  editor.history();
  assert.equal(input.value, 'sin(3)');
  editor.insert('9');
  assert.equal(editor.redoStack.length, 0);
  editor.insert(')');
  assert.equal(input.value, 'sin(39)');
});
test('completed continuation is one undo step and busy history is inert', () => {
  const { editor, input } = createEditor();
  editor.set('12+8');
  editor.answer = '20';
  editor.phase = 'completed';
  editor.insert('*');
  editor.history();
  assert.equal(input.value, '12+8');
  editor.phase = 'requesting';
  editor.history();
  assert.equal(input.value, '12+8');
});
test('undo stack is bounded', () => {
  const { editor } = createEditor();
  for (let i = 0; i < 150; i++) editor.insert('1');
  assert.equal(editor.undoStack.length, 100);
});
