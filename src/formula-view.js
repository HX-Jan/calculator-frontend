import katex from 'katex';
import 'katex/dist/katex.min.css';
import { formulaNotation } from './formula-notation.js';

export function renderFormula(container, expression) {
  container.replaceChildren();
  container.removeAttribute('aria-label');
  container.hidden = !expression.trim();
  if (container.hidden) {
    container.removeAttribute('tabindex');
    return;
  }
  container.tabIndex = 0;
  container.title = expression;
  const notation = formulaNotation(expression);
  if (notation !== null) {
    try {
      katex.render(notation, container, {
        displayMode: false,
        output: 'htmlAndMathml',
        throwOnError: true,
        trust: false,
        strict: 'error',
        maxExpand: 200,
        maxSize: 10,
      });
      return;
    } catch {
      // An unfinished edit remains readable and never blocks saving or calculation.
    }
  }
  container.textContent = expression.replaceAll('*', '×').replaceAll('/', '÷');
}
