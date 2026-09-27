import { reusable } from './result-view.js';

// Locate syntax only; evaluation belongs exclusively to the backend.
export function operandRange(text, start, end = start) {
  if (start !== end) return [start, end];
  let right = start;
  while (right > 0 && /\s/.test(text[right - 1])) right--;
  let cursor = right;
  while (cursor > 0 && /[!%]/.test(text[cursor - 1])) cursor--;
  if (text[cursor - 1] === ')') {
    let depth = 1;
    cursor--;
    while (cursor > 0 && depth) {
      cursor--;
      if (text[cursor] === ')') depth++;
      if (text[cursor] === '(') depth--;
    }
    if (depth) return [start, start];
    while (cursor > 0 && /[a-z]/i.test(text[cursor - 1])) cursor--;
  } else {
    const match = text
      .slice(0, cursor)
      .match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$|(?:pi|e|π)$/);
    if (!match) return [start, start];
    cursor -= match[0].length;
  }
  // Include a unary sign, but leave a binary addition/subtraction outside.
  let sign = cursor;
  while (sign > 0 && /\s/.test(text[sign - 1])) sign--;
  if (sign > 0 && /[+-]/.test(text[sign - 1])) {
    const preceding = text.slice(0, sign - 1).trimEnd();
    if (!preceding || /[(*÷×/^,+-]$/.test(preceding)) cursor = sign - 1;
  }
  return [cursor, right];
}

export class ExpressionEditor {
  constructor(input, changed, error) {
    this.input = input;
    this.changed = changed;
    this.error = error;
    this.phase = 'editing';
    this.answer = null;
    this.closings = new Set();
    input.addEventListener('pointerdown', () => this.manual());
    input.addEventListener('paste', () => {
      if (this.phase === 'completed') this.set('');
    });
    input.addEventListener('keydown', (event) => {
      if (
        /^(Arrow|Home|End)/.test(event.key) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a')
      )
        this.manual();
    });
    input.addEventListener('input', () => {
      this.closings.clear();
      this.phase = 'editing';
      this.changed();
    });
    input.addEventListener('beforeinput', (event) => {
      if (this.phase === 'requesting' || event.isComposing) return;
      if (event.inputType === 'insertText' && event.data !== null) {
        event.preventDefault();
        this.insert(event.data);
      } else if (event.inputType === 'deleteContentBackward') {
        event.preventDefault();
        this.backspace();
      }
    });
  }
  manual() {
    if (this.phase === 'completed') this.phase = 'editing';
  }
  replace(start, end, value, caret = start + value.length, autoClosing = false) {
    if (this.input.value.length - (end - start) + value.length > 500) {
      this.error('表达式不能超过 500 个字符。', true);
      return false;
    }
    const delta = value.length - (end - start);
    this.closings = new Set(
      [...this.closings]
        .filter((p) => p < start || p >= end)
        .map((p) => (p >= end ? p + delta : p)),
    );
    this.input.setRangeText(value, start, end, 'end');
    if (autoClosing) this.closings.add(start + value.length - 1);
    this.input.setSelectionRange(caret, caret);
    this.phase = 'editing';
    this.changed();
    this.input.focus();
    return true;
  }
  set(value) {
    this.closings.clear();
    return this.replace(0, this.input.value.length, value);
  }
  skipClosing() {
    const p = this.input.selectionStart;
    if (p === this.input.selectionEnd && this.input.value[p] === ')' && this.closings.has(p)) {
      this.closings.delete(p);
      this.input.setSelectionRange(p + 1, p + 1);
      return true;
    }
    return false;
  }
  insert(value) {
    if (this.phase === 'requesting') return;
    if (this.phase === 'completed') {
      const seed = /^[+\-*/×÷^!%]/.test(value) ? `(${reusable(this.answer)})` : '';
      this.set(seed);
    }
    if (value === ')' && this.skipClosing()) {
      this.input.focus();
      return;
    }
    this.replace(this.input.selectionStart, this.input.selectionEnd, value);
  }
  emptyPair() {
    const p = this.input.selectionStart;
    return p === this.input.selectionEnd && this.input.value.slice(p - 1, p + 1) === '()';
  }
  backspace() {
    if (this.phase === 'requesting') return;
    this.manual();
    let start = this.input.selectionStart,
      end = this.input.selectionEnd;
    if (start === end) {
      if (this.emptyPair()) end++;
      start = Math.max(0, start - 1);
    }
    this.replace(start, end, '');
  }
  target() {
    if (this.phase === 'completed')
      return {
        start: 0,
        end: this.input.value.length,
        text: reusable(this.answer),
        completed: true,
      };
    const [start, end] = operandRange(
      this.input.value,
      this.input.selectionStart,
      this.input.selectionEnd,
    );
    return { start, end, text: this.input.value.slice(start, end), completed: false };
  }
  wrap(prefix, suffix = ')') {
    const target = this.target();
    const text = prefix + target.text + suffix;
    const caret = target.text ? target.start + text.length : target.start + prefix.length;
    return {
      applied: this.replace(
        target.start,
        target.end,
        text,
        caret,
        !target.text && suffix.endsWith(')'),
      ),
      completed: target.completed,
    };
  }
}
