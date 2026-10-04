import { request } from './api.js';
import { renderFormula } from './formula-view.js';
const byId = (id) => document.getElementById(id);

export function initFormulaLibrary({ isBusy, onResult }) {
  let editing = null,
    using = null,
    deleting = null,
    pending = false,
    version = 0;
  const labels = () =>
    Object.fromEntries(
      [...byId('formula-labels').querySelectorAll('input')].map((input) => [
        input.dataset.parameter,
        input.value,
      ]),
    );
  function fields(container, parameters, values, parameterLabels, valuesMode) {
    container.replaceChildren();
    for (const key of parameters) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.id = `${valuesMode ? 'formula-value' : 'formula-label'}-${key}`;
      input.dataset.parameter = key;
      label.htmlFor = input.id;
      label.textContent = valuesMode ? `${parameterLabels[key] || key} (${key})` : `${key} 的名称`;
      input.value = values[key] || '';
      input.maxLength = valuesMode ? 500 : 40;
      input.autocomplete = 'off';
      input.required = valuesMode;
      input.disabled = pending;
      container.append(label, input);
      if (valuesMode) {
        const error = document.createElement('p');
        error.id = `formula-value-error-${key}`;
        error.className = 'formula-error';
        error.setAttribute('role', 'status');
        input.setAttribute('aria-describedby', error.id);
        input.addEventListener('input', () => {
          error.textContent = '';
          byId('formula-use-error').textContent = '';
          input.removeAttribute('aria-invalid');
        });
        container.append(error);
      }
    }
  }
  function switchPane(formulas) {
    byId('history-pane').hidden = formulas;
    byId('formulas-pane').hidden = !formulas;
    byId('history-tab').setAttribute('aria-pressed', String(!formulas));
    byId('formulas-tab').setAttribute('aria-pressed', String(formulas));
    if (formulas) void load();
  }
  async function load() {
    const ticket = ++version;
    byId('formula-status').textContent = '正在读取…';
    byId('formula-list').setAttribute('aria-busy', 'true');
    try {
      const data = await request(
        `/api/formulas?q=${encodeURIComponent(byId('formula-search').value.trim())}`,
      );
      if (ticket !== version) return;
      byId('formula-list').replaceChildren(...data.items.map(render));
      byId('formula-status').textContent = data.items.length ? '' : '没有找到公式。';
    } catch (error) {
      if (ticket !== version) return;
      byId('formula-list').replaceChildren();
      byId('formula-status').textContent = error.message;
    } finally {
      if (ticket === version) byId('formula-list').setAttribute('aria-busy', 'false');
    }
  }
  function button(label, action) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'text-button';
    node.textContent = label;
    node.addEventListener('click', () => {
      if (!pending && !isBusy()) action();
    });
    return node;
  }
  function render(item) {
    const article = document.createElement('article');
    article.className = 'formula-record';
    const name = document.createElement('h3');
    name.textContent = item.name;
    const expression = document.createElement('p');
    expression.className = 'formula-expression';
    renderFormula(expression, item.expression);
    const actions = document.createElement('div');
    actions.className = 'formula-actions';
    actions.append(
      button('使用', () => openUse(item)),
      button(item.builtin ? '另存为' : '编辑', () => openEditor(item, item.builtin)),
    );
    if (!item.builtin)
      actions.append(
        button('删除', () => {
          deleting = item;
          byId('formula-delete-name').textContent = item.name;
          byId('formula-delete-error').textContent = '';
          byId('formula-delete').showModal();
        }),
      );
    article.append(name, expression, actions);
    return article;
  }
  function openEditor(item = null, copy = false) {
    editing = copy ? null : item;
    byId('formula-editor-title').textContent = editing ? '编辑公式' : '新增公式';
    byId('formula-name').value = item?.name || '';
    byId('formula-expression').value = item?.expression || '';
    renderFormula(byId('formula-editor-preview'), item?.expression || '');
    byId('formula-default-angle').value = item?.angle_mode || 'deg';
    byId('formula-editor-error').textContent = '';
    fields(byId('formula-labels'), item?.parameters || [], item?.parameter_labels || {}, {}, false);
    byId('formula-editor').showModal();
    byId('formula-name').focus();
  }
  function openUse(item) {
    using = item;
    byId('formula-use-title').textContent = item.name;
    renderFormula(byId('formula-use-expression'), item.expression);
    byId('formula-use-angle').value = item.angle_mode;
    byId('formula-use-error').textContent = '';
    fields(byId('formula-inputs'), item.parameters, {}, item.parameter_labels, true);
    byId('formula-use').showModal();
  }
  async function busy(dialogId, errorId, action) {
    if (pending || isBusy()) return;
    const dialog = byId(dialogId);
    pending = true;
    dialog.setAttribute('aria-busy', 'true');
    const controls = [...dialog.querySelectorAll('input, select, button')];
    controls.forEach((node) => (node.disabled = true));
    byId(errorId).textContent = '';
    try {
      await action();
    } catch (error) {
      const field = error.parameter && byId(`formula-value-${error.parameter}`);
      if (dialogId === 'formula-use' && field) {
        byId(`formula-value-error-${error.parameter}`).textContent = error.message;
        field.setAttribute('aria-invalid', 'true');
        controls.forEach((node) => (node.disabled = false));
        field.focus();
      } else byId(errorId).textContent = error.message;
    } finally {
      dialog.querySelectorAll('input, select, button').forEach((node) => (node.disabled = false));
      pending = false;
      dialog.setAttribute('aria-busy', 'false');
    }
  }
  async function identify() {
    const data = await request('/api/formulas/validate', {
      method: 'POST',
      body: JSON.stringify({ expression: byId('formula-expression').value }),
    });
    fields(byId('formula-labels'), data.parameters, labels(), {}, false);
    return data.parameters;
  }
  byId('formula-use-angle').addEventListener('change', () => {
    byId('formula-use-error').textContent = '';
    byId('formula-inputs')
      .querySelectorAll('.formula-error')
      .forEach((node) => (node.textContent = ''));
    byId('formula-inputs')
      .querySelectorAll('input')
      .forEach((node) => node.removeAttribute('aria-invalid'));
  });
  byId('history-tab').addEventListener('click', () => switchPane(false));
  byId('formulas-tab').addEventListener('click', () => switchPane(true));
  byId('formula-refresh').addEventListener('click', load);
  byId('formula-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void load();
  });
  byId('formula-search').addEventListener('search', load);
  byId('formula-new').addEventListener('click', () => {
    if (!isBusy() && !pending) openEditor();
  });
  byId('formula-expression').addEventListener('input', (event) => {
    renderFormula(byId('formula-editor-preview'), event.target.value);
  });
  byId('formula-identify').addEventListener('click', () =>
    busy('formula-editor', 'formula-editor-error', identify),
  );
  byId('formula-editor-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void busy('formula-editor', 'formula-editor-error', async () => {
      await identify();
      await request(editing ? `/api/formulas/${editing.id}` : '/api/formulas', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: byId('formula-name').value,
          expression: byId('formula-expression').value,
          parameter_labels: labels(),
          angle_mode: byId('formula-default-angle').value,
          updated_at: editing?.updated_at || null,
        }),
      });
      byId('formula-editor').close();
      await load();
    });
  });
  byId('formula-use-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void busy('formula-use', 'formula-use-error', async () => {
      byId('formula-inputs')
        .querySelectorAll('.formula-error')
        .forEach((node) => (node.textContent = ''));
      const parameters = Object.fromEntries(
        [...byId('formula-inputs').querySelectorAll('input')].map((input) => [
          input.dataset.parameter,
          input.value,
        ]),
      );
      const angle = byId('formula-use-angle').value;
      const data = await request(`/api/formulas/${using.id}/calculate`, {
        method: 'POST',
        body: JSON.stringify({ parameters, angle_mode: angle, updated_at: using.updated_at }),
      });
      byId('formula-use').close();
      await onResult(data, angle);
    });
  });
  byId('formula-delete-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void busy('formula-delete', 'formula-delete-error', async () => {
      await request(
        `/api/formulas/${deleting.id}?updated_at=${encodeURIComponent(deleting.updated_at)}`,
        { method: 'DELETE' },
      );
      byId('formula-delete').close();
      await load();
    });
  });
  document.querySelectorAll('[data-close-formula]').forEach((button) =>
    button.addEventListener('click', () => {
      if (!pending) byId(button.dataset.closeFormula).close();
    }),
  );
  document.querySelectorAll('.formula-dialog').forEach((dialog) =>
    dialog.addEventListener('cancel', (event) => {
      if (pending) event.preventDefault();
    }),
  );
}
