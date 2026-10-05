import { initFormulaLibrary } from './formula-library.js';
import { renderSteps } from './steps-view.js';
import { renderFormula } from './formula-view.js';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { request } from './api.js';
import { localDateKey, dateHeading, historyCsv, historyExpression } from './history-utils.js';
import { ExpressionEditor } from './expression-editor.js';
import { ResultView, reusable, scientific } from './result-view.js';

const byId = (id) => document.getElementById(id);
const input = byId('expression');
const result = byId('result');
const status = byId('calculation-status');
const state = {
  busy: false,
  page: 1,
  total: 0,
  query: '',
  historyVersion: 0,
  deleteId: null,
  mode: 'basic',
  angle: 'deg',
};
const pageSize = 20;
let historyPage = [];
const resultView = new ResultView(result, byId('copy-result'), byId('result-format'));
const editor = new ExpressionEditor(input, invalidateResult, setStatus);
let lastSubmitted = null;
function updateUndoControls() {
  byId('undo-edit').disabled = state.busy || editor.undoStack.length === 0;
  byId('redo-edit').disabled = state.busy || editor.redoStack.length === 0;
}
editor.onHistoryChange = updateUndoControls;
byId('undo-edit').addEventListener('click', () => editor.history());
byId('redo-edit').addEventListener('click', () => editor.history(true));
document.addEventListener('keydown', (event) => {
  if (
    document.querySelector('dialog[open]') ||
    (event.target.closest('input') && event.target !== input)
  )
    return;
  if (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    ['z', 'y'].includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
    editor.history(event.key.toLowerCase() === 'y' || event.shiftKey);
  }
});
byId('copy-result').addEventListener('click', async () => {
  if (resultView.raw === null) return;
  try {
    await navigator.clipboard.writeText(resultView.raw);
    setStatus('已复制');
  } catch {
    setStatus('复制失败，请选择结果手动复制。', true);
  }
});
byId('result-format').addEventListener('click', () => {
  resultView.exponential = !resultView.exponential;
  resultView.render();
});
let parameterTarget = null;
const parameterDefinitions = {
  root: ['任意次方根', '被开方数 x', '次数 n'],
  logbase: ['任意底对数', '真数 x', '底数 b'],
  perm: ['排列', '总数 n', '选取数 r'],
  comb: ['组合', '总数 n', '选取数 r'],
  mod: ['取余', '被除数 x', '除数 y'],
};
function openParameters(name) {
  parameterTarget = { ...editor.target(), name };
  const [title, first, second] = parameterDefinitions[name];
  byId('parameter-title').textContent = title;
  byId('parameter-first-label').textContent = first;
  byId('parameter-second-label').textContent = second;
  byId('parameter-first').value = parameterTarget.text;
  byId('parameter-second').value = '';
  byId('parameter-error').textContent = '';
  byId('parameter-dialog').showModal();
  byId(parameterTarget.text ? 'parameter-second' : 'parameter-first').focus();
}
byId('parameter-dialog').addEventListener('close', () => input.focus());
byId('parameter-cancel').addEventListener('click', () => byId('parameter-dialog').close());
byId('parameter-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const first = byId('parameter-first').value.trim(),
    second = byId('parameter-second').value.trim();
  if (!first || !second) return;
  const value = `${parameterTarget.name}((${first}),(${second}))`;
  if (input.value.length - (parameterTarget.end - parameterTarget.start) + value.length > 500) {
    byId('parameter-error').textContent = '表达式不能超过 500 个字符。';
    return;
  }
  byId('parameter-dialog').close();
  editor.replace(parameterTarget.start, parameterTarget.end, value);
});

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Optional storage. */
  }
}
function setMode(mode) {
  state.mode = mode;
  byId('science-keys').hidden = mode !== 'scientific';
  byId('angle-switch').hidden = mode !== 'scientific';
  document
    .querySelectorAll('[data-mode]')
    .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  savePreference('calculator-mode', mode);
}
function setAngle(angle) {
  if (state.angle !== angle) {
    editor.phase = 'editing';
    invalidateResult();
  }
  state.angle = angle;
  document
    .querySelectorAll('[data-angle]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.angle === angle)),
    );
  savePreference('calculator-angle', angle);
}
document.querySelectorAll('[data-mode]').forEach((button) =>
  button.addEventListener('click', () => {
    if (!state.busy) setMode(button.dataset.mode);
  }),
);
document.querySelectorAll('[data-angle]').forEach((button) =>
  button.addEventListener('click', () => {
    if (!state.busy) setAngle(button.dataset.angle);
  }),
);
try {
  setMode(localStorage.getItem('calculator-mode') === 'scientific' ? 'scientific' : 'basic');
  setAngle(localStorage.getItem('calculator-angle') === 'rad' ? 'rad' : 'deg');
} catch {
  /* Defaults work without storage. */
}
let lastAnswer = null;
let memory = null;
let secondFunction = false;
const scientificPages = [
  [
    ['x²', 'value', '^2', '平方'],
    ['xʸ', 'value', '^', '乘方'],
    ['√', 'function', 'sqrt', '开平方'],
    ['1/x', 'function', 'reciprocal', '倒数'],
    ['sin', 'function', 'sin'],
    ['cos', 'function', 'cos'],
    ['tan', 'function', 'tan'],
    ['x!', 'value', '!', '阶乘'],
    ['ln', 'function', 'ln'],
    ['log', 'function', 'log'],
    ['π', 'value', 'π', '圆周率'],
    ['e', 'value', 'e', '自然常数'],
    ['|x|', 'function', 'abs', '绝对值'],
    ['%', 'value', '%', '百分比'],
    ['EXP', 'value', 'E', '科学计数法'],
    ['Ans', 'answer', '', '上次结果'],
    ['x³', 'value', '^3', '立方'],
    ['∛', 'function', 'cbrt', '立方根'],
    ['eˣ', 'function', 'exp', '自然指数'],
    ['10ˣ', 'prefix', '10^(', '十的乘方'],
  ],
  [
    ['asin', 'function', 'asin', '反正弦'],
    ['acos', 'function', 'acos', '反余弦'],
    ['atan', 'function', 'atan', '反正切'],
    ['ⁿ√x', 'binary', 'root', '任意次方根'],
    ['sinh', 'function', 'sinh'],
    ['cosh', 'function', 'cosh'],
    ['tanh', 'function', 'tanh'],
    ['logₐ', 'binary', 'logbase', '任意底对数'],
    ['asinh', 'function', 'asinh'],
    ['acosh', 'function', 'acosh'],
    ['atanh', 'function', 'atanh'],
    ['mod', 'binary', 'mod', '取余'],
    ['nPr', 'binary', 'perm', '排列'],
    ['nCr', 'binary', 'comb', '组合'],
    ['⌊x⌋', 'function', 'floor', '向下取整'],
    ['⌈x⌉', 'function', 'ceil', '向上取整'],
    [',', 'value', ',', '参数分隔符'],
    ['±', 'prefix', '-(', '正负号'],
    ['EXP', 'value', 'E', '科学计数法'],
    ['Ans', 'answer', '', '上次结果'],
  ],
];
function renderScienceKeys() {
  byId('science-page').replaceChildren(
    ...scientificPages[Number(secondFunction)].map(([label, action, value, title]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset[action] = value;
      if (title) {
        button.title = title;
        button.setAttribute('aria-label', title);
      }
      return button;
    }),
  );
  byId('second-function').setAttribute('aria-pressed', String(secondFunction));
}
renderScienceKeys();
byId('science-keys').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || state.busy) return;
  if (button.id === 'second-function') {
    secondFunction = !secondFunction;
    renderScienceKeys();
    return;
  }
  if (button.dataset.memory) {
    if (button.dataset.memory === 'clear') memory = null;
    if (button.dataset.memory === 'store') {
      if (resultView.raw === null) return setStatus('请先计算。');
      memory = resultView.raw;
    }
    if (button.dataset.memory === 'recall') {
      if (memory === null) return setStatus('暂无存储数值。');
      insert(`(${reusable(memory)})`);
    }
    document
      .querySelector('[data-memory="recall"]')
      .classList.toggle('has-memory', memory !== null);
    return;
  }
  if ('answer' in button.dataset) {
    if (lastAnswer === null) return setStatus('暂无上次结果。');
    return insert(`(${reusable(lastAnswer)})`);
  }
  if (button.dataset.binary) return openParameters(button.dataset.binary);
  if (button.dataset.value && !['^2', '^3'].includes(button.dataset.value))
    return insert(button.dataset.value);
  const suffix = ['^2', '^3'].includes(button.dataset.value) ? ')' + button.dataset.value : ')';
  const prefix = ['^2', '^3'].includes(button.dataset.value)
    ? '('
    : button.dataset.prefix ||
      (button.dataset.function === 'reciprocal' ? '1/(' : `${button.dataset.function}(`);
  const operation = editor.wrap(prefix, suffix);
  if (operation.applied && operation.completed) byId('calculation-form').requestSubmit();
});

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function invalidateResult() {
  input.removeAttribute('aria-invalid');
  resultView.set(null);
  byId('result-label').textContent = '等待计算';
  byId('steps-list').replaceChildren();
  byId('steps-note').hidden = true;
  byId('step-count').textContent = '';
  setStatus('');
}

function setExpression(value) {
  editor.set(value);
}
function insert(value) {
  if (!state.busy) editor.insert(value);
}

document.querySelector('.keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || state.busy) return;
  if (button.dataset.value) insert(button.dataset.value);
  if (button.dataset.action === 'clear') setExpression('');
  if (button.dataset.action === 'backspace') editor.backspace();
});

document.addEventListener('keydown', (event) => {
  if (
    document.querySelector('dialog[open]') ||
    state.busy ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing
  )
    return;
  if (event.target.closest('input') && event.target !== input) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setExpression('');
  } else if (event.key === 'Enter' && (event.target === input || event.target === document.body)) {
    event.preventDefault();
    byId('calculation-form').requestSubmit();
  } else if (event.target === document.body && /^[0-9.eEπ+\-*/()^!%,]$/.test(event.key)) {
    event.preventDefault();
    insert(event.key);
  }
});

byId('calculation-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy) return;
  const signature = JSON.stringify([input.value, state.angle]);
  if (signature === lastSubmitted && resultView.raw !== null) return;
  const caret = [input.selectionStart, input.selectionEnd];
  state.busy = true;
  updateUndoControls();
  editor.phase = 'requesting';
  invalidateResult();
  input.readOnly = true;
  document
    .querySelectorAll(
      '.keypad button, .science-keys button, [data-mode], [data-angle], [data-example], .reuse',
    )
    .forEach((button) => {
      button.disabled = true;
    });
  setStatus('计算中…');
  const slowMessage = setTimeout(() => setStatus('服务启动中…'), 6000);
  try {
    const data = await request('/api/calculate', {
      method: 'POST',
      body: JSON.stringify({ expression: input.value, angle_mode: state.angle }),
    });
    clearTimeout(slowMessage);
    resultView.set(data.result);
    editor.answer = data.result;
    editor.phase = 'completed';
    lastSubmitted = signature;
    input.focus();
    lastAnswer = data.result;
    byId('result-label').textContent = '计算结果';
    byId('step-count').textContent = `${data.steps.length} 步`;
    renderSteps(byId('steps-list'), data.steps, data.result);
    byId('steps-note').hidden = false;
    setStatus('');
    setConnection(true);
    state.page = 1;
    state.query = '';
    byId('search').value = '';
    byId('clear-search').hidden = true;
    await loadHistory();
  } catch (error) {
    invalidateResult();
    editor.phase = 'error';
    if (Number.isInteger(error.position) && Number.isInteger(error.endPosition)) {
      const start = Math.max(0, Math.min(input.value.length, error.position));
      const end = Math.max(start, Math.min(input.value.length, error.endPosition));
      input.focus();
      input.setSelectionRange(start, end);
      input.setAttribute('aria-invalid', 'true');
      setStatus(
        `${error.message}（${start === input.value.length ? '算式末尾' : `第 ${start + 1} 位`}）`,
        true,
      );
    } else {
      input.setSelectionRange(...caret);
      setStatus(error.message, true);
    }
    void checkHealth();
  } finally {
    clearTimeout(slowMessage);
    state.busy = false;
    updateUndoControls();
    input.readOnly = false;
    document
      .querySelectorAll(
        '.keypad button, .science-keys button, [data-mode], [data-angle], [data-example], .reuse',
      )
      .forEach((button) => {
        button.disabled = false;
      });
  }
});

function setConnection(connected) {
  byId('connection').textContent = connected ? '' : '服务未连接';
  byId('connection').classList.toggle('connected', connected);
}

async function checkHealth() {
  try {
    await request('/api/health');
    setConnection(true);
  } catch {
    setConnection(false);
  }
}

function renderRecord(record) {
  const article = document.createElement('article');
  article.className = 'history-record';
  const expression = document.createElement('p');
  expression.className = 'record-expression';
  renderFormula(expression, record.expression);
  if (/\b(sin|cos|tan|asin|acos|atan)\s*\(/.test(record.expression)) {
    const unit = document.createElement('span');
    unit.className = 'angle-label';
    unit.textContent = (record.angle_mode || 'deg').toUpperCase();
    expression.append(' ', unit);
  }
  const answer = document.createElement('p');
  answer.className = 'record-result';
  answer.textContent = `= ${record.result.length > 24 ? scientific(record.result) : record.result}`;
  answer.title = record.result;
  const bottom = document.createElement('div');
  bottom.className = 'record-bottom';
  const time = document.createElement('time');
  time.dateTime = record.created_at;
  time.textContent = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(record.created_at));
  const actions = document.createElement('div');
  const reuse = document.createElement('button');
  reuse.type = 'button';
  reuse.className = 'text-button reuse';
  reuse.textContent = '复用';
  reuse.disabled = state.busy;
  reuse.addEventListener('click', () => {
    if (!state.busy) {
      if (/[a-zπ^!]/i.test(record.expression)) setMode('scientific');
      setAngle(record.angle_mode === 'rad' ? 'rad' : 'deg');
      setExpression(historyExpression(record.expression));
    }
  });
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button delete';
  remove.textContent = '删除';
  remove.setAttribute('aria-label', `删除记录 ${historyExpression(record.expression)}`);
  remove.addEventListener('click', () => {
    state.deleteId = record.id;
    const formula = document.createElement('span');
    renderFormula(formula, record.expression);
    byId('delete-expression').replaceChildren(
      formula,
      document.createTextNode(` = ${record.result}`),
    );
    byId('delete-dialog').showModal();
  });
  for (const [label, value] of [
    ['复制算式', record.expression],
    ['复制结果', record.result],
  ]) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'text-button';
    copy.textContent = label;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(value);
        byId('history-status').textContent = '已复制';
      } catch {
        byId('history-status').textContent = '复制失败，请手动选择文字复制。';
      }
    });
    actions.append(copy);
  }
  actions.append(reuse, remove);
  bottom.append(time, actions);
  article.append(expression, answer, bottom);
  return article;
}

async function loadHistory() {
  const version = ++state.historyVersion;
  byId('history-status').textContent = '正在读取历史…';
  byId('export-history').disabled = true;
  byId('history-list').setAttribute('aria-busy', 'true');
  try {
    const params = new URLSearchParams({ q: state.query, page: state.page, page_size: pageSize });
    const data = await request(`/api/history?${params}`);
    if (version !== state.historyVersion) return;
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
    if (state.page > lastPage) {
      state.page = lastPage;
      return loadHistory();
    }
    state.total = data.total;
    byId('history-count').textContent = data.total;
    historyPage = data.items;
    const rows = [];
    let previousDate = null;
    for (const record of data.items) {
      const key = localDateKey(record.created_at);
      if (key !== previousDate) {
        const heading = document.createElement('h3');
        heading.className = 'history-date';
        heading.textContent = dateHeading(record.created_at);
        rows.push(heading);
        previousDate = key;
      }
      rows.push(renderRecord(record));
    }
    byId('history-list').replaceChildren(...rows);
    byId('export-history').disabled = !data.items.length;
    if (!data.items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const symbol = document.createElement('span');
      symbol.textContent = '↺';
      const title = document.createElement('strong');
      title.textContent = state.query ? '没有找到匹配记录' : '还没有计算记录';
      const hint = document.createElement('p');
      hint.textContent = state.query
        ? '换个关键词，再试一次。'
        : '输入一个算式，结果会自动保存在这里。';
      empty.append(title);
      byId('history-list').append(empty);
    }
    byId('page-info').textContent = `第 ${state.page} / ${lastPage} 页`;
    byId('previous').disabled = state.page <= 1;
    byId('next').disabled = state.page >= lastPage;
    byId('history-status').textContent = '';
    setConnection(true);
  } catch (error) {
    if (version === state.historyVersion) {
      byId('history-status').textContent = `${error.message} 历史显示可能不是最新状态。`;
      setConnection(false);
    }
  } finally {
    if (version === state.historyVersion) byId('history-list').removeAttribute('aria-busy');
  }
}

byId('export-history').addEventListener('click', () => {
  if (!historyPage.length || byId('export-history').disabled) return;
  const url = URL.createObjectURL(
    new Blob([historyCsv(historyPage)], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `计算记录-${localDateKey(new Date())}-第${state.page}页.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
byId('search').addEventListener('input', () => {
  byId('clear-search').hidden = !byId('search').value;
});
function clearSearch() {
  byId('search').value = '';
  byId('clear-search').hidden = true;
  state.query = '';
  state.page = 1;
  void loadHistory();
  byId('search').focus();
}
byId('clear-search').addEventListener('click', clearSearch);
byId('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = byId('search').value.trim();
  state.page = 1;
  void loadHistory();
});
byId('search').addEventListener('search', () => {
  if (!byId('search').value) {
    clearSearch();
  }
});
byId('refresh').addEventListener('click', () => {
  void loadHistory();
  void checkHealth();
});
byId('previous').addEventListener('click', () => {
  if (state.page > 1) {
    state.page--;
    void loadHistory();
  }
});
byId('next').addEventListener('click', () => {
  if (state.page * pageSize < state.total) {
    state.page++;
    void loadHistory();
  }
});
byId('cancel-delete').addEventListener('click', () => byId('delete-dialog').close());
byId('confirm-delete').addEventListener('click', async () => {
  byId('confirm-delete').disabled = true;
  try {
    await request(`/api/history/${state.deleteId}`, { method: 'DELETE' });
    byId('delete-dialog').close();
    await loadHistory();
  } catch (error) {
    byId('delete-dialog').close();
    byId('history-status').textContent = error.message;
  } finally {
    byId('confirm-delete').disabled = false;
  }
});
document.querySelectorAll('[data-example]').forEach((button) =>
  button.addEventListener('click', () => {
    if (!state.busy) setExpression(button.dataset.example);
  }),
);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  byId('theme').setAttribute('aria-label', `切换至${theme === 'dark' ? '浅' : '深'}色主题`);
}
let savedTheme;
try {
  savedTheme = localStorage.getItem('clarity-theme-v3');
} catch {
  /* Storage can be disabled. */
}
applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
byId('theme').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem('clarity-theme-v3', theme);
  } catch {
    /* Theme still works for this visit. */
  }
});
void checkHealth();
void loadHistory();

initFormulaLibrary({
  isBusy: () => state.busy,
  onResult: async (data, angle) => {
    setMode('scientific');
    setAngle(angle);
    setExpression(data.expression);
    resultView.set(data.result);
    editor.answer = data.result;
    editor.phase = 'completed';
    lastAnswer = data.result;
    lastSubmitted = JSON.stringify([input.value, state.angle]);
    byId('result-label').textContent = '计算结果';
    byId('step-count').textContent = `${data.steps.length} 步`;
    renderSteps(byId('steps-list'), data.steps, data.result);
    byId('steps-note').hidden = false;
    setStatus('');
    setConnection(true);
    state.page = 1;
    state.query = '';
    byId('search').value = '';
    byId('clear-search').hidden = true;
    input.focus();
    await loadHistory();
  },
});
