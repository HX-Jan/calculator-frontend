// Decimal representation only: never convert a calculation result to Number.
export function scientific(value) {
  const sign = value.startsWith('-') ? '-' : '';
  const unsigned = value.replace(/^[+-]/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = integer + fraction;
  const first = digits.search(/[1-9]/);
  if (first < 0) return '0';
  const significant = digits.slice(first).replace(/0+$/, '');
  const exponent = integer.length - first - 1;
  return `${sign}${significant[0]}${significant.length > 1 ? '.' + significant.slice(1) : ''}E${exponent}`;
}
export function reusable(value) {
  const compact = scientific(value);
  return compact.length < value.length ? compact : value;
}
export class ResultView {
  constructor(output, copy, toggle) {
    this.output = output;
    this.copy = copy;
    this.toggle = toggle;
    this.raw = null;
    this.exponential = false;
    this.render();
  }
  set(value) {
    this.raw = value;
    this.render();
  }
  render() {
    this.output.textContent =
      this.raw === null ? '—' : this.exponential ? scientific(this.raw) : this.raw;
    this.copy.disabled = this.raw === null;
    this.toggle.disabled = this.raw === null;
    this.toggle.textContent = this.exponential ? '普通显示' : '科学计数';
    this.toggle.setAttribute('aria-pressed', String(this.exponential));
  }
}
