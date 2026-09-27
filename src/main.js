import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { request } from './api.js';

const byId = (id) => document.getElementById(id);
const input = byId('expression');
const result = byId('result');
const status = byId('calculation-status');
const state = { busy: false, page: 1, total: 0, query: '', historyVersion: 0, deleteId: null };
const pageSize = 20;

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function invalidateResult() {
  result.textContent = '—';
  byId('result-label').textContent = '等待计算';
  byId('steps-list').replaceChildren();
  byId('step-count').textContent = '等待计算';
  setStatus('按 Enter 或 =，获取新的计算结果。');
}

function setExpression(value) {
  input.value = value;
  invalidateResult();
  input.focus();
  input.setSelectionRange(value.length, value.length);
}

function insert(value) {
  if (state.busy) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (input.value.length - (end - start) + value.length > 500) return;
  input.setRangeText(value, start, end, 'end');
  invalidateResult();
  input.focus();
}

document.querySelector('.keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || state.busy) return;
  if (button.dataset.value) insert(button.dataset.value);
  if (button.dataset.action === 'clear') setExpression('');
  if (button.dataset.action === 'backspace') {
    const end = input.selectionEnd ?? input.value.length;
    const start = input.selectionStart ?? end;
    input.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end');
    invalidateResult();
    input.focus();
  }
});
input.addEventListener('input', invalidateResult);

document.addEventListener('keydown', (event) => {
  if (byId('delete-dialog').open || state.busy || event.ctrlKey || event.metaKey || event.altKey)
    return;
  if (event.target.closest('input') && event.target !== input) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setExpression('');
  } else if (event.key === 'Enter' && (event.target === input || event.target === document.body)) {
    event.preventDefault();
    byId('calculation-form').requestSubmit();
  } else if (event.target === document.body && /^[0-9.+\-*/()]$/.test(event.key)) {
    event.preventDefault();
    insert(event.key);
  }
});

byId('calculation-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy) return;
  state.busy = true;
  invalidateResult();
  input.readOnly = true;
  document.querySelectorAll('.keypad button, [data-example], .reuse').forEach((button) => {
    button.disabled = true;
  });
  setStatus('正在计算并保存，请稍候…');
  const slowMessage = setTimeout(() => setStatus('服务可能正在启动，请稍候；无需重复提交。'), 6000);
  try {
    const data = await request('/api/calculate', {
      method: 'POST',
      body: JSON.stringify({ expression: input.value }),
    });
    clearTimeout(slowMessage);
    result.textContent = data.result;
    byId('result-label').textContent = '计算结果';
    byId('step-count').textContent = `${data.steps.length} 步`;
    const steps = data.steps.map((step) => {
      const item = document.createElement('li');
      item.textContent = `${step.operation} = ${step.result}`;
      return item;
    });
    if (!steps.length) {
      const item = document.createElement('li');
      item.textContent = `直接读取数值：${data.result}`;
      steps.push(item);
    }
    byId('steps-list').replaceChildren(...steps);
    setStatus('已完成计算，并保存至历史。');
    setConnection(true);
    state.page = 1;
    state.query = '';
    byId('search').value = '';
    await loadHistory();
  } catch (error) {
    setStatus(error.message, true);
    void checkHealth();
  } finally {
    clearTimeout(slowMessage);
    state.busy = false;
    input.readOnly = false;
    document.querySelectorAll('.keypad button, [data-example], .reuse').forEach((button) => {
      button.disabled = false;
    });
  }
});

function setConnection(connected) {
  byId('connection').textContent = connected ? '服务已连接' : '服务未连接';
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
  expression.textContent = record.expression.replaceAll('*', '×').replaceAll('/', '÷');
  const answer = document.createElement('p');
  answer.className = 'record-result';
  answer.textContent = `= ${record.result}`;
  const bottom = document.createElement('div');
  bottom.className = 'record-bottom';
  const time = document.createElement('time');
  time.dateTime = record.created_at;
  time.textContent = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(record.created_at));
  const actions = document.createElement('div');
  const reuse = document.createElement('button');
  reuse.type = 'button';
  reuse.className = 'text-button reuse';
  reuse.textContent = '复用';
  reuse.disabled = state.busy;
  reuse.addEventListener('click', () => {
    if (!state.busy) setExpression(record.expression);
  });
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button delete';
  remove.textContent = '删除';
  remove.setAttribute('aria-label', `删除记录 ${record.expression}`);
  remove.addEventListener('click', () => {
    state.deleteId = record.id;
    byId('delete-expression').textContent = `${record.expression} = ${record.result}`;
    byId('delete-dialog').showModal();
  });
  actions.append(reuse, remove);
  bottom.append(time, actions);
  article.append(expression, answer, bottom);
  return article;
}

async function loadHistory() {
  const version = ++state.historyVersion;
  byId('history-status').textContent = '正在读取历史…';
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
    byId('history-list').replaceChildren(...data.items.map(renderRecord));
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
      empty.append(symbol, title, hint);
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

byId('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = byId('search').value.trim();
  state.page = 1;
  void loadHistory();
});
byId('search').addEventListener('search', () => {
  if (!byId('search').value) {
    state.query = '';
    state.page = 1;
    void loadHistory();
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
