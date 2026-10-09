// ---------- formatting ----------
const nf = (x, d = 2) => (x === undefined || x === null || !isFinite(x)) ? 'n/a' : x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 0) => isFinite(x) ? nf(100 * x, d) + '%' : 'n/a';
const eur = (x, d = 0) => isFinite(x) ? nf(x, d) + ' €' : 'n/a';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- SVG plotting ----------
function niceTicks(a, b, n = 5) {
  const span = b - a; if (!(span > 0)) return [a];
  const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out = []; for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-6; v += step) out.push(+v.toFixed(10));
  return out;
}
let plotId = 0;
function Plot(el, o) {
  // square: equal units on both axes (pass equal x and y ranges), so a 45-degree line is drawn at 45 degrees
  const W = 600, m = { l: 62, r: 20, t: 18, b: 50 }, H = o.square ? (W - m.l - m.r) + m.t + m.b : (o.h || 370);
  const pw = W - m.l - m.r, ph = H - m.t - m.b, id = 'clip' + (++plotId);
  const sx = x => m.l + (x - o.x0) / (o.x1 - o.x0) * pw;
  const sy = y => m.t + ph - (y - o.y0) / (o.y1 - o.y0) * ph;
  const back = [], front = [], labels = [];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const xt = o.xticks || niceTicks(o.x0, o.x1, 6), yt = o.yticks || niceTicks(o.y0, o.y1, 5);
  const xf = o.xfmt || (v => nf(v, Math.abs(o.x1 - o.x0) < 3 ? (Math.abs(o.x1 - o.x0) < 0.3 ? 3 : 2) : (Math.abs(o.x1 - o.x0) < 30 ? 1 : 0)).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
  const yf = o.yfmt || (v => nf(v, Math.abs(o.y1 - o.y0) < 3 ? (Math.abs(o.y1 - o.y0) < 0.3 ? 3 : 2) : (Math.abs(o.y1 - o.y0) < 30 ? 1 : 0)).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'));
  const axis = [];
  if (!o.noYTicks) yt.forEach(v => { if (v < o.y0 - 1e-9 || v > o.y1 + 1e-9) return; axis.push(`<line class="grid" x1="${m.l}" x2="${m.l + pw}" y1="${sy(v)}" y2="${sy(v)}"/><text class="tick" x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${esc(yf(v))}</text>`); });
  xt.forEach(v => { if (v < o.x0 - 1e-9 || v > o.x1 + 1e-9) return; axis.push(`<line class="gridx" x1="${sx(v)}" x2="${sx(v)}" y1="${m.t}" y2="${m.t + ph}"/><text class="tick" x="${sx(v)}" y="${m.t + ph + 18}" text-anchor="middle">${esc(xf(v))}</text>`); });
  axis.push(`<line class="axis" x1="${m.l}" x2="${m.l + pw}" y1="${m.t + ph}" y2="${m.t + ph}"/><line class="axis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + ph}"/>`);
  if (o.xlabel) axis.push(`<text class="alabel" x="${m.l + pw / 2}" y="${H - 8}" text-anchor="middle">${esc(o.xlabel)}</text>`);
  if (o.ylabel) axis.push(`<text class="alabel" transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.ylabel)}</text>`);
  const pathOf = pts => { let d = '', pen = false; pts.forEach(([x, y]) => { if (!isFinite(x) || !isFinite(y)) { pen = false; return; } const yy = clamp(sy(y), -2000, 4000); d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + yy.toFixed(1); pen = true; }); return d; };
  const P = {
    sx, sy,
    fn(f, cls, a = o.x0, b = o.x1, n = 160) { const pts = []; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push([x, f(x)]); } return P.path(pts, cls); },
    path(pts, cls) { (cls.includes('ghost') ? back : front).push(`<path class="${cls}" d="${pathOf(pts)}"/>`); return P; },
    area(pts, cls) { back.push(`<path class="${cls}" d="${pathOf(pts)}Z"/>`); return P; },
    rect(x0, x1, cls) { back.push(`<rect class="${cls}" x="${Math.min(sx(x0), sx(x1))}" y="${m.t}" width="${Math.abs(sx(x1) - sx(x0))}" height="${ph}"/>`); return P; },
    hline(y, cls, lab, pos = 'end') { if (y < o.y0 || y > o.y1) return P; front.push(`<line class="${cls}" x1="${m.l}" x2="${m.l + pw}" y1="${sy(y)}" y2="${sy(y)}"/>`); if (lab) labels.push(`<text class="lab ${cls}" x="${pos === 'end' ? m.l + pw - 4 : m.l + 6}" y="${sy(y) - 6}" text-anchor="${pos}">${esc(lab)}</text>`); return P; },
    vline(x, cls, lab) { if (x < o.x0 || x > o.x1) return P; front.push(`<line class="${cls}" x1="${sx(x)}" x2="${sx(x)}" y1="${m.t}" y2="${m.t + ph}"/>`); if (lab) labels.push(`<text class="lab ${cls}" x="${sx(x) + 5}" y="${m.t + 12}">${esc(lab)}</text>`); return P; },
    seg(x0, y0, x1, y1, cls) { front.push(`<line class="${cls}" x1="${sx(x0)}" y1="${sy(y0)}" x2="${sx(x1)}" y2="${sy(y1)}"/>`); return P; },
    pt(x, y, cls, lab, dx = 8, dy = -8, anchor = 'start') { if (!isFinite(x) || !isFinite(y)) return P; if (x < o.x0 || x > o.x1 || y < o.y0 || y > o.y1) return P; front.push(`<circle class="${cls}" cx="${sx(x)}" cy="${sy(y)}" r="${cls.includes('small') ? 2.6 : 5}"/>`); if (lab) labels.push(`<text class="lab ${cls}" x="${sx(x) + dx}" y="${sy(y) + dy}" text-anchor="${anchor}">${esc(lab)}</text>`); return P; },
    text(x, y, s, cls = '', anchor = 'start') { labels.push(`<text class="lab ${cls}" x="${sx(x)}" y="${sy(y)}" text-anchor="${anchor}">${esc(s)}</text>`); return P; },
    raw(s) { front.push(s); return P; },
    draw() {
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"${o.square ? ' class="square"' : ''} role="img" aria-label="${esc(o.aria || 'Chart')}"><defs><clipPath id="${id}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>${axis.join('')}<g clip-path="url(#${id})">${back.join('')}${front.join('')}</g>${labels.join('')}</svg>`;
    }
  };
  return P;
}

// ---------- the examples ----------
// Each example: id, ch, title, ref, intro, eq (TeX), params, toggles, presets, compute(S), outputs(S,R,B), verdict(S,R), chart(el,S,R,B), notice, challenges
const EX = [];


// CHAPTERS (number, title, ready) is generated by build.py from the LaTeX sources.

