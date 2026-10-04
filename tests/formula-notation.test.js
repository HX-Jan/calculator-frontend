import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { formulaNotation } from '../src/formula-notation.js';

test('builtin formulas use familiar symbols, powers and square roots', () => {
  assert.equal(formulaNotation('pi*r^2'), '\\pi\\,r^{2}');
  assert.equal(formulaNotation('2*pi*r'), '2\\,\\pi\\,r');
  assert.equal(formulaNotation('sqrt(a^2+b^2)'), '\\sqrt{a^{2}+b^{2}}');
  assert.equal(formulaNotation('a*x^2+b*x+c'), 'a\\,x^{2}+b\\,x+c');
});

test('fractions and exponents preserve associativity and unary signs', () => {
  assert.equal(formulaNotation('a/b/c'), '\\frac{\\frac{a}{b}}{c}');
  assert.equal(formulaNotation('2^3^2'), '2^{3^{2}}');
  assert.equal(formulaNotation('-2^2'), '-2^{2}');
  assert.equal(formulaNotation('(-2)^2'), '\\left(-2\\right)^{2}');
  assert.equal(formulaNotation('2^-3'), '2^{-3}');
  assert.equal(formulaNotation('2*-x'), '2\\times -x');
  assert.equal(formulaNotation('5!!'), '\\left(5!\\right)!');
  assert.equal(formulaNotation('2E3!'), '\\left(2\\times 10^{3}\\right)!');
});

test('scientific notation preserves literal digits and distinguishes the e constant', () => {
  assert.equal(
    formulaNotation('1.234567890123456789012345678E-1000'),
    '1.234567890123456789012345678\\times 10^{-1000}',
  );
  assert.equal(formulaNotation('1.2e3^2'), '\\left(1.2\\times 10^{3}\\right)^{2}');
  assert.equal(formulaNotation('e^x'), '\\mathrm{e}^{x}');
  assert.equal(formulaNotation('π×r^2'), formulaNotation('pi*r^2'));
});

test('roots, logarithms and combinatorics use mathematical notation', () => {
  assert.equal(formulaNotation('root(x,n)'), '\\sqrt[n]{x}');
  assert.equal(formulaNotation('logbase(x,b)'), '\\log_{b}\\left(x\\right)');
  assert.equal(formulaNotation('log(x)'), '\\log_{10}\\left(x\\right)');
  assert.equal(formulaNotation('perm(n,r)'), 'A_{n}^{r}');
  assert.equal(formulaNotation('comb(n,r)'), 'C_{n}^{r}');
  assert.equal(formulaNotation('abs(x)'), '\\left|x\\right|');
});

test('incomplete or hostile expressions fall back without injecting TeX or HTML', () => {
  for (const value of [
    '',
    'sqrt(',
    'a+',
    'unknown(x)',
    'ab',
    '2x',
    '<img src=x onerror=alert(1)>',
    '\\href{https://example.com}{x}',
    'x'.repeat(501),
    '('.repeat(70) + 'x' + ')'.repeat(70),
  ]) {
    assert.equal(formulaNotation(value), null, value);
  }
});

test('all supported scientific names render as accessible math without external links', () => {
  const expressions = [
    'pi*r^2',
    '2*pi*r',
    'sqrt(a^2+b^2)',
    'a*x^2+b*x+c',
    'a/b/c',
    '2^3^2',
    'root(x,n)',
    'logbase(x,b)',
    'mod(x,y)',
    'perm(n,r)',
    'comb(n,r)',
    'cbrt(x)',
    'floor(x)',
    'ceil(x)',
    'exp(x)',
    'ln(x)',
    'log(x)',
    'abs(x)',
    'sin(x)',
    'cos(x)',
    'tan(x)',
    'asin(x)',
    'acos(x)',
    'atan(x)',
    'sinh(x)',
    'cosh(x)',
    'tanh(x)',
    'asinh(x)',
    'acosh(x)',
    'atanh(x)',
    'x%',
    '1.2E-3',
  ];
  for (const expression of expressions) {
    const html = katex.renderToString(formulaNotation(expression), {
      trust: false,
      strict: 'error',
      throwOnError: true,
      output: 'htmlAndMathml',
    });
    assert.match(html, /<math/);
    assert.doesNotMatch(html, /<script|<a\s|<img\s/);
  }
});
