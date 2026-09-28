export function renderSteps(list, steps, result) {
  const rows = steps.map((step) => {
    const item = document.createElement('li');
    if (typeof step.before !== 'string' || typeof step.after !== 'string') {
      item.textContent = `${step.operation} = ${step.result}`;
      return item;
    }
    const label = document.createElement('div');
    label.className = 'step-label';
    label.textContent = step.label;
    const before = document.createElement('div');
    before.className = 'step-expression';
    before.tabIndex = 0;
    before.setAttribute('aria-label', '运算前');
    const mark = document.createElement('mark');
    mark.textContent = step.before.slice(step.highlight_start, step.highlight_end);
    before.append(
      document.createTextNode(step.before.slice(0, step.highlight_start)),
      mark,
      document.createTextNode(step.before.slice(step.highlight_end)),
    );
    const after = document.createElement('div');
    after.className = 'step-expression step-after';
    after.tabIndex = 0;
    after.setAttribute('aria-label', '运算后');
    after.textContent = `→ ${step.after}`;
    item.append(label, before, after);
    return item;
  });
  if (!rows.length) {
    const item = document.createElement('li');
    item.textContent = `直接读取数值：${result}`;
    rows.push(item);
  }
  list.replaceChildren(...rows);
}
