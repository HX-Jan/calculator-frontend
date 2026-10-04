// Convert calculator syntax to notation for display only; never evaluate values.
const functions = new Map([
  ...[
    'sqrt',
    'sin',
    'cos',
    'tan',
    'ln',
    'log',
    'asin',
    'acos',
    'atan',
    'sinh',
    'cosh',
    'tanh',
    'asinh',
    'acosh',
    'atanh',
    'abs',
    'exp',
    'cbrt',
    'floor',
    'ceil',
  ].map((name) => [name, 1]),
  ...['root', 'logbase', 'mod', 'perm', 'comb'].map((name) => [name, 2]),
]);
const tokenPattern = /(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|[a-z]+|[(),%^!+*/-]/y;

export function formulaNotation(expression) {
  if (typeof expression !== 'string' || !expression.trim() || expression.length > 500) return null;
  const source = expression.replaceAll('π', 'pi').replaceAll('×', '*').replaceAll('÷', '/');
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    if (/\s/.test(source[offset])) {
      offset++;
      continue;
    }
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(source);
    if (!match) return null;
    tokens.push(match[0]);
    offset = tokenPattern.lastIndex;
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = (expected) => {
    const token = tokens[index++];
    if (!token || (expected && token !== expected)) throw new Error('Incomplete notation');
    return token;
  };
  function sum(depth) {
    let node = term(depth);
    while (peek() === '+' || peek() === '-')
      node = { kind: 'binary', op: take(), left: node, right: term(depth) };
    return node;
  }
  function term(depth) {
    let node = unary(depth);
    while (peek() === '*' || peek() === '/')
      node = { kind: 'binary', op: take(), left: node, right: unary(depth) };
    return node;
  }
  function unary(depth) {
    if (depth > 64) throw new Error('Notation too deep');
    if (peek() === '+' || peek() === '-')
      return { kind: 'unary', op: take(), value: unary(depth + 1) };
    let node = primary(depth);
    while (peek() === '!' || peek() === '%') node = { kind: 'postfix', op: take(), value: node };
    if (peek() === '^') {
      take('^');
      node = { kind: 'binary', op: '^', left: node, right: unary(depth + 1) };
    }
    return node;
  }
  function primary(depth) {
    const value = take();
    if (value === '(') {
      const node = sum(depth + 1);
      take(')');
      return { kind: 'group', value: node };
    }
    if (functions.has(value)) {
      take('(');
      const args = [sum(depth + 1)];
      if (functions.get(value) === 2) {
        take(',');
        args.push(sum(depth + 1));
      }
      take(')');
      return { kind: 'call', name: value, args };
    }
    if (value === 'pi' || /^[a-z]$/.test(value) || /^[0-9.]/.test(value))
      return { kind: 'atom', value };
    throw new Error('Unsupported notation');
  }
  try {
    const node = sum(0);
    return index === tokens.length ? typeset(node) : null;
  } catch {
    return null;
  }
}

const parentheses = (text) => `\\left(${text}\\right)`;
function typeset(node) {
  if (node.kind === 'atom') {
    if (node.value === 'pi') return '\\pi';
    if (node.value === 'e') return '\\mathrm{e}';
    const scientific = node.value.match(/^(.+)[eE]([+-]?[0-9]+)$/);
    if (scientific) return `${scientific[1]}\\times 10^{${scientific[2]}}`;
    return node.value;
  }
  if (node.kind === 'group') return parentheses(typeset(node.value));
  if (node.kind === 'unary') return node.op + typeset(node.value);
  if (node.kind === 'postfix') {
    const value = typeset(node.value);
    return (
      (node.value.kind === 'postfix' ||
      (node.value.kind === 'atom' && /^[0-9.]+[eE]/.test(node.value.value))
        ? parentheses(value)
        : value) + (node.op === '%' ? '\\%' : '!')
    );
  }
  if (node.kind === 'binary') {
    const left = typeset(node.left),
      right = typeset(node.right);
    if (node.op === '/') return `\\frac{${left}}{${right}}`;
    if (node.op === '^') {
      const base =
        node.left.kind === 'atom' && /[eE]/.test(node.left.value) && node.left.value !== 'e'
          ? parentheses(left)
          : left;
      return `${base}^{${right}}`;
    }
    if (node.op === '*') {
      // Juxtapose symbolic factors; retain × before numbers or unary signs.
      const symbolic = node.right.kind === 'atom' && /^(pi|[a-z])$/.test(node.right.value);
      const power =
        node.right.kind === 'binary' &&
        node.right.op === '^' &&
        node.right.left.kind === 'atom' &&
        /^[a-z]$/.test(node.right.left.value);
      return `${left}${symbolic || power || node.right.kind === 'group' || node.right.kind === 'call' ? '\\,' : '\\times '}${right}`;
    }
    return `${left}${node.op}${right}`;
  }
  const args = node.args.map(typeset),
    [x, y] = args;
  const call = (name) => `${name}${parentheses(x)}`;
  if (node.name === 'sqrt') return `\\sqrt{${x}}`;
  if (node.name === 'cbrt') return `\\sqrt[3]{${x}}`;
  if (node.name === 'root') return `\\sqrt[${y}]{${x}}`;
  if (node.name === 'logbase') return `\\log_{${y}}${parentheses(x)}`;
  if (node.name === 'log') return call('\\log_{10}');
  if (node.name === 'abs') return `\\left|${x}\\right|`;
  if (node.name === 'floor') return `\\left\\lfloor ${x}\\right\\rfloor`;
  if (node.name === 'ceil') return `\\left\\lceil ${x}\\right\\rceil`;
  if (node.name === 'exp') return `\\mathrm{e}^{${x}}`;
  if (node.name === 'perm' || node.name === 'comb')
    return `${node.name === 'perm' ? 'A' : 'C'}_{${x}}^{${y}}`;
  if (node.name === 'mod') return `\\operatorname{mod}\\left(${x},${y}\\right)`;
  const name = { asin: 'arcsin', acos: 'arccos', atan: 'arctan' }[node.name] || node.name;
  return call(`\\operatorname{${name}}`);
}
