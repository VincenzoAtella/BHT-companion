// ===== BHT Chapter 4: Socioeconomic disparities in health =====
// solvers for this chapter: M.b04_*
const b04n = (x, d = 2) => nf(x, d).replace(/^-/, '−');   // signed numbers with a true minus sign
const b04pp = (x, d = 1) => b04n(x, d) + ' pp';

// 1. Grossman channels. MEC_j(H) = Theta * A_j / H (curvature 1), optimum MEC_j = r + delta_j.
// A_R = 1 (high SES); A_P = eff * inc * pat / price (low SES). Theta chosen so that H_R* = 100.
M.b04_channels = function ({ eff, inc, pat, price, dP }) {
  const r = 0.03, dR = 0.05, Theta = 100 * (r + dR);
  const AR = 1, AP = eff * inc * pat / price;
  const HR = Theta * AR / (r + dR), HP = Theta * AP / (r + dP);
  const parts = {
    eff: Math.log(1 / eff), inc: Math.log(1 / inc), pat: Math.log(1 / pat),
    price: Math.log(price), stress: Math.log((r + dP) / (r + dR))
  };
  const gap = Math.log(HR / HP);   // equals the sum of the parts
  const share = k => Math.abs(gap) > 1e-9 ? parts[k] / gap : NaN;
  return { r, dR, dP, HR, HP, ratio: HP / HR, gap, parts, share,
    mecR: H => Theta * AR / H, mecP: H => Theta * AP / H };
};

EX.push({
  id: 'b04-channels', ch: 4, title: 'Disparities in the MEC diagram',
  ref: 'BHT Sections 4.2–4.6 and 4.8, Figures 4.8, 4.9, 4.10 and 4.13',
  anchors: [],
  intro: 'A high-SES person R and a low-SES person P choose health capital where the marginal efficiency of capital equals r + δ. Each causal theory of the chapter changes one ingredient for P: lower efficiency in producing health (efficient producer and thrifty phenotype), fewer resources (direct income), less patience (Fuchs), a higher price of care (access), or faster depreciation from stress (allostatic load). The MEC is stylized as Θ·A/H with R’s index A = 1, r = 0.03 and δ_R = 0.05; all values are illustrative, chosen so that R’s optimum is H* = 100. With this form the log gap ln(H*_R/H*_P) splits exactly into one term per channel.',
  eq: String.raw`MEC_j(H)=\frac{\Theta A_j}{H}=r+\delta_j\;\Rightarrow\;H_j^*=\frac{\Theta A_j}{r+\delta_j},\quad A_P=\frac{e\cdot y\cdot \pi}{p},\qquad \ln\frac{H_R^*}{H_P^*}=\ln\tfrac1e+\ln\tfrac1y+\ln\tfrac1\pi+\ln p+\ln\frac{r+\delta_P}{r+\delta_R}`,
  params: [
    { id: 'eff', label: 'Efficiency of P in producing health, e (R = 1)', min: 0.5, max: 1.2, step: 0.01, book: 0.9, d: 2 },
    { id: 'inc', label: 'Resources of P, y (R = 1)', min: 0.4, max: 1.2, step: 0.01, book: 0.85, d: 2 },
    { id: 'pat', label: 'Patience shifter of P, π (R = 1)', min: 0.6, max: 1.2, step: 0.01, book: 0.95, d: 2 },
    { id: 'price', label: 'Price of care faced by P, p (R = 1)', min: 0.8, max: 1.6, step: 0.01, book: 1.05, d: 2 },
    { id: 'dP', label: 'Depreciation rate of P, δ_P (δ_R = 0.05)', min: 0.02, max: 0.15, step: 0.005, book: 0.06, d: 3 }
  ],
  presets: [
    { label: 'Universal coverage, p = 1', values: { price: 1 } },
    { label: 'Only stress differs', values: { eff: 1, inc: 1, pat: 1, price: 1, dP: 0.08 } }
  ],
  compute: S => M.b04_channels(S),
  outputs: (S, R, B) => [
    { label: 'Optimal health of R, H*_R', v: nf(R.HR, 1), b: nf(B.HR, 1) },
    { label: 'Optimal health of P, H*_P', v: nf(R.HP, 1), b: nf(B.HP, 1) },
    { label: 'Ratio H*_P / H*_R', v: nf(R.ratio, 3), b: nf(B.ratio, 3), key: true },
    { label: 'Log gap ln(H*_R / H*_P)', v: b04n(R.gap, 3), b: b04n(B.gap, 3), key: true },
    { label: 'Share: efficiency', v: pct(R.share('eff'), 1), b: pct(B.share('eff'), 1) },
    { label: 'Share: resources', v: pct(R.share('inc'), 1), b: pct(B.share('inc'), 1) },
    { label: 'Share: patience', v: pct(R.share('pat'), 1), b: pct(B.share('pat'), 1) },
    { label: 'Share: access (price of care)', v: pct(R.share('price'), 1), b: pct(B.share('price'), 1) },
    { label: 'Share: stress (depreciation)', v: pct(R.share('stress'), 1), b: pct(B.share('stress'), 1) }
  ],
  verdict: (S, R) => Math.abs(R.gap) < 0.005 ? { tone: 'ok', text: 'The channels offset each other: both people choose the same health stock.' }
    : R.gap > 0 ? { tone: 'warn', text: `P chooses ${nf(R.HP, 1)} units of health against ${nf(R.HR, 1)} for R, a gap of ${pct(1 - R.ratio, 0)}. The largest single channel is ${['efficiency', 'resources', 'patience', 'access', 'stress'][['eff', 'inc', 'pat', 'price', 'stress'].reduce((m, k, i, a) => R.parts[k] > R.parts[a[m]] ? i : m, 0)]}.` }
    : { tone: 'neutral', text: `The gradient is reversed: P chooses ${nf(R.HP, 1)} units of health, more than R.` },
  chart(el, S, R, B) {
    const x1 = Math.min(600, Math.max(160, Math.ceil(1.2 * Math.max(R.HR, R.HP) / 20) * 20));
    const P = Plot(el, { x0: 0, x1, y0: 0, y1: 0.24, xlabel: 'Health capital H', ylabel: 'Rate of return', aria: 'Two MEC curves and the cost of capital' });
    P.fn(B.mecP, 'ghost', 10, x1);
    P.fn(R.mecR, 's-pri thick', 10, x1);
    P.fn(R.mecP, 's-sec thick', 10, x1);
    P.hline(R.r + R.dR, 's-pri dash', 'r + δ_R', 'end');
    P.hline(R.r + R.dP, 's-sec dash', 'r + δ_P', 'start');
    P.vline(R.HR, 's-pri dot'); P.vline(R.HP, 's-sec dot');
    P.pt(R.HR, R.r + R.dR, 'p-pri', 'H*_R = ' + nf(R.HR, 0), 8, 18);
    P.pt(R.HP, R.r + R.dP, 'p-sec', 'H*_P = ' + nf(R.HP, 0), -8, -10, 'end');
    P.text(R.HR * (R.r + R.dR) / 0.19 + 3, 0.19, 'MEC_R', 's-pri');
    P.text(0.94 * x1, R.mecP(0.94 * x1) + 0.01, 'MEC_P', 's-sec', 'end');
    P.draw();
  },
  notice: 'Efficiency, resources, patience and access move P’s MEC curve down (Figures 4.8, 4.9 and 4.13); stress leaves the curve alone and raises the horizontal line r + δ (Figure 4.10). Because several channels multiply, removing one of them closes only its own share of the log gap: equal access to care, as in the Whitehall civil service, leaves most of the disparity in place.',
  challenges: [
    { q: 'Give P the same price of care as R (p = 1), as universal coverage would. The share of the log gap that disappears is…', change: { price: 1 }, options: ['about a tenth', 'about half', 'all of it'],
      judge: (b, a) => { const f = 1 - a.gap / b.gap; return f < 0.25 ? 0 : f < 0.75 ? 1 : 2; },
      why: (b, a) => `The log gap falls from ${nf(b.gap, 3)} to ${nf(a.gap, 3)}, so ${pct(1 - a.gap / b.gap, 0)} of it closes and H*_P/H*_R rises only from ${nf(b.ratio, 3)} to ${nf(a.ratio, 3)}. The other channels still lower P’s MEC or raise her cost of capital, which is why disparities persist where access is equal (BHT Section 4.6).` },
    { q: 'Stress doubles P’s depreciation rate, from δ_P = 0.06 to 0.12. P’s optimal health falls by…', change: { dP: 0.12 }, options: ['less than half', 'exactly half', 'more than half'],
      judge: (b, a) => { const f = 1 - a.HP / b.HP; return f < 0.49 ? 0 : f <= 0.51 ? 1 : 2; },
      why: (b, a) => `H*_P falls from ${nf(b.HP, 1)} to ${nf(a.HP, 1)}, by ${pct(1 - a.HP / b.HP, 0)}. The cost of holding health is r + δ, which rises from 0.09 to 0.15, not double, because the interest rate does not change.` },
    { q: 'Close both the efficiency and the resource gaps (e = 1 and y = 1). The ratio H*_P/H*_R becomes…', change: { eff: 1, inc: 1 }, options: ['still below 0.85', 'between 0.85 and 0.95', 'about one'],
      judge: (b, a) => a.ratio < 0.85 ? 0 : a.ratio < 0.95 ? 1 : 2,
      why: (b, a) => `The ratio rises from ${nf(b.ratio, 3)} to ${nf(a.ratio, 3)}. The two largest channels explain ${pct(b.share('eff') + b.share('inc'), 0)} of the log gap, but patience, access and stress still multiply P’s optimum by ${nf(a.ratio, 3)}: no single theory needs to explain the whole gradient.` }
  ]
});

// 2. Reverse causality and a confounder, deterministic population.
// u (health endowment), v (earning ability), z (patience) on a 7x7x7 grid of standardized normal quantiles.
// h = beta*y + c*z + u ; y = lam*h + c*z + v + L (L = lottery prize, 0 for non-winners)
M.b04_qgrid = (() => {
  const K = 7, inv = p => {   // inverse normal by bisection on erf
    return M.bisect(x => 0.5 * (1 + M.erf(x / Math.SQRT2)) - p, -6, 6);
  };
  const q = []; for (let k = 0; k < K; k++) q.push(inv((k + 0.5) / K));
  const sd = Math.sqrt(q.reduce((s, x) => s + x * x, 0) / K);
  return q.map(x => x / sd);   // mean 0, variance exactly 1
})();
M.b04_reverse = function ({ beta, lam, c }) {
  const D = 1 - beta * lam, g = M.b04_qgrid, pts = [];
  const solve = (u, v, z, L) => { const y = (lam * (c * z + u) + c * z + v + L) / D; return [y, beta * y + c * z + u]; };
  for (const u of g) for (const v of g) for (const z of g) pts.push(solve(u, v, z, 0));
  const n = pts.length, my = pts.reduce((s, p) => s + p[0], 0) / n, mh = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, shh = 0; pts.forEach(([y, h]) => { sxy += (y - my) * (h - mh); sxx += (y - my) ** 2; shh += (h - mh) ** 2; });
  const ols = sxy / sxx, corr = sxy / Math.sqrt(sxx * shh);
  const olsAt = (b, l, cc) => (b + l + (1 + b) * (1 + l) * cc * cc) / (1 + l * l + (1 + l) ** 2 * cc * cc);
  const prize = 2, dy = prize / D, dh = beta * prize / D;   // effect of the lottery on mean income and health
  return { pts, ols, corr, beta, wald: dh / dy, dy, dh, D, noConf: olsAt(beta, lam, 0), noRev: olsAt(beta, 0, c), olsAt };
};

EX.push({
  id: 'b04-reverse', ch: 4, title: 'One gradient, three causal paths',
  ref: 'BHT Sections 4.5, 4.7 and 4.8, Figures 4.1 and 4.14',
  anchors: [],
  intro: 'A deterministic population of 343 people differs in health endowment, earning ability and patience (a 7 × 7 × 7 grid of standardized values). Log income raises health with the causal effect β (direct income), health raises log income through productive time with strength λ, and patience raises both with loading c (Fuchs). The observed slope of health on income mixes the three paths. A lottery that gives some people extra income, as in Lindahl’s Swedish study, moves income for reasons unrelated to health or patience. All values are illustrative.',
  eq: String.raw`h=\beta y+c\,z+u,\quad y=\lambda h+c\,z+v+L;\qquad \hat b_{OLS}=\frac{\beta+\lambda+(1+\beta)(1+\lambda)c^2}{1+\lambda^2+(1+\lambda)^2c^2},\qquad \frac{\Delta h}{\Delta y}\Big|_{L}=\beta`,
  params: [
    { id: 'beta', label: 'Causal effect of income on health, β', min: -0.2, max: 0.6, step: 0.01, book: 0.2, d: 2 },
    { id: 'lam', label: 'Effect of health on income, λ (productive time)', min: 0, max: 0.8, step: 0.01, book: 0.3, d: 2 },
    { id: 'c', label: 'Loading of patience on both, c (Fuchs)', min: 0, max: 1.2, step: 0.01, book: 0.5, d: 2 }
  ],
  presets: [
    { label: 'Only reverse causality', values: { beta: 0, c: 0 } },
    { label: 'Only a confounder', values: { beta: 0, lam: 0 } }
  ],
  compute: S => M.b04_reverse(S),
  outputs: (S, R, B) => [
    { label: 'Observed gradient (OLS slope of h on y)', v: b04n(R.ols, 3), b: b04n(B.ols, 3), key: true },
    { label: 'Causal effect of income on health, β', v: b04n(R.beta, 3), b: b04n(B.beta, 3) },
    { label: 'Lottery estimate Δh/Δy', v: b04n(R.wald, 3), b: b04n(B.wald, 3), key: true },
    { label: 'Gradient without the confounder (c = 0)', v: b04n(R.noConf, 3), b: b04n(B.noConf, 3) },
    { label: 'Gradient without reverse causality (λ = 0)', v: b04n(R.noRev, 3), b: b04n(B.noRev, 3) },
    { label: 'Correlation of health and income', v: b04n(R.corr, 3), b: b04n(B.corr, 3) }
  ],
  verdict: (S, R) => Math.abs(R.ols - R.beta) < 0.01 ? { tone: 'ok', text: 'With no reverse path and no confounder, the gradient measures the causal effect of income.' }
    : { tone: 'warn', text: `The observed gradient is ${b04n(R.ols, 3)}, but only ${b04n(R.beta, 3)} of it is the effect of income on health. The lottery recovers ${b04n(R.wald, 3)}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: -4, x1: 4, y0: -4, y1: 4, xlabel: 'Log income (standardized deviation)', ylabel: 'Health index', aria: 'Health against income in a simulated population' });
    R.pts.forEach(([y, h]) => P.pt(y, h, 'p-gray small'));
    P.fn(x => B.ols * x, 'ghost');
    P.fn(x => R.ols * x, 's-sec thick');
    P.fn(x => R.beta * x, 's-pri dash');
    P.seg(0, 0, R.dy, R.dh, 's-grn thick');
    P.pt(0, 0, 'p-ink', 'non-winners', 8, 18);
    P.pt(R.dy, R.dh, 'p-grn', 'lottery winners', -8, -10, 'end');
    P.text(3.9, R.ols * 3.9 + (R.ols > R.beta ? 0.25 : -0.4), 'observed gradient', 's-sec', 'end');
    P.text(3.9, R.beta * 3.9 + (R.ols > R.beta ? -0.4 : 0.25), 'causal effect β', 's-pri', 'end');
    P.draw();
  },
  notice: 'Every gray dot is a person. The red line fits the cloud; the dashed blue line has the causal slope β. The green segment joins average income and health of non-winners and of winners of a prize worth 2 units of log income: the prize also raises health, which raises income again, yet the ratio of the two changes is exactly β.',
  challenges: [
    { q: 'Suppose income has no effect on health at all: set β = 0. The observed gradient…', change: { beta: 0 }, options: ['falls to zero', 'stays clearly positive', 'turns negative'],
      judge: (b, a) => a.ols > 0.05 ? 1 : a.ols < -0.05 ? 2 : 0,
      why: (b, a) => `The slope falls from ${b04n(b.ols, 3)} to ${b04n(a.ols, 3)}, not to zero. Healthier people earn more (productive time hypothesis, BHT Section 4.7) and patient people invest in both (BHT Section 4.8), so a gradient appears even when money buys no health.` },
    { q: 'Make the reverse path stronger: raise λ from 0.3 to 0.6. The lottery estimate…', change: { lam: 0.6 }, options: ['rises', 'does not change', 'falls'],
      judge: (b, a) => a.wald > b.wald + 1e-6 ? 0 : a.wald < b.wald - 1e-6 ? 2 : 1,
      why: (b, a) => `The observed gradient moves from ${b04n(b.ols, 3)} to ${b04n(a.ols, 3)}, while the lottery estimate stays at ${b04n(a.wald, 3)}. The prize is assigned by chance, so the feedback from health to income scales both the income and the health response by the same factor 1/(1 − βλ).` },
    { q: 'Remove the confounder (c = 0), as if patience were perfectly controlled for. The part of the observed gradient in excess of β…', change: { c: 0 }, options: ['disappears entirely', 'shrinks by about a third', 'does not change'],
      judge: (b, a) => { const f = 1 - (a.ols - a.beta) / (b.ols - b.beta); return f > 0.9 ? 0 : f > 0.1 ? 1 : 2; },
      why: (b, a) => `The excess falls from ${b04n(b.ols - b.beta, 3)} to ${b04n(a.ols - a.beta, 3)}. Controlling for time preference cannot remove the bias from reverse causality; this is one reason why adding proxies for patience, as Cutler and Lleras-Muney did, does not settle the direction of causation.` }
  ]
});

// 3. Natural experiment: Dutch famine. Two SES groups (share sP = 0.5 poor).
// Adult diabetes rate (%) = b + x*poor + tau*deprived. Background deprivation dP, dR; a famine cohort is fully deprived.
M.b04_famine = function ({ tau, x, dP, dR }) {
  const sP = 0.5, b = 9.5;
  const dbar = sP * dP + (1 - sP) * dR;
  const poorDep = sP * dP / dbar, poorNon = sP * (1 - dP) / (1 - dbar);   // Pr(poor | deprived), Pr(poor | not deprived)
  const bar = (poorShare, depShare) => ({ base: b, ses: x * poorShare, dep: tau * depShare, tot: b + x * poorShare + tau * depShare });
  const nonDep = bar(poorNon, 0), dep = bar(poorDep, 1), after = bar(sP, dbar), utero = bar(sP, 1);
  const obsGap = dep.tot - nonDep.tot, bias = x * (poorDep - poorNon), famGap = utero.tot - after.tot;
  return { tau, x, dbar, poorDep, poorNon, nonDep, dep, after, utero, obsGap, bias, famGap, wald: famGap / (1 - dbar) };
};

EX.push({
  id: 'b04-famine', ch: 4, title: 'Selection bias and the Dutch famine',
  ref: 'BHT Section 4.4, Definition 4.3, Table 4.3',
  anchors: [[4, 'Type 2 diabetes 21% 16% 15%']],
  intro: 'Half of the families are poor. Adult diabetes risk is 9.5% plus x points for growing up poor plus τ points for deprivation in utero. In an ordinary cohort, poor mothers are more often deprived (d_P against d_R), so comparing deprived and non-deprived babies mixes the effect of deprivation with the effect of poverty. A famine deprives every baby in gestation, rich or poor. The baseline reproduces Table 4.3 of BHT, 21% diabetes for late-gestation exposure and 15% for those conceived after the famine; the split of the 6-point difference into τ, x and the background deprivation rates is illustrative.',
  eq: String.raw`\text{Observational gap}=\tau+x\,[\Pr(\text{poor}\mid D=1)-\Pr(\text{poor}\mid D=0)],\qquad \text{Famine gap}=\tau\,(1-\bar d),\quad \hat\tau=\frac{\text{Famine gap}}{1-\bar d}`,
  params: [
    { id: 'tau', label: 'Effect of deprivation in utero, τ (points)', min: 0, max: 15, step: 0.5, book: 7.5, d: 1 },
    { id: 'x', label: 'Effect of growing up poor, x (points)', min: 0, max: 20, step: 0.5, book: 8, d: 1 },
    { id: 'dP', label: 'Deprivation rate among the poor, d_P', min: 0.02, max: 0.9, step: 0.01, book: 0.3, d: 2 },
    { id: 'dR', label: 'Deprivation rate among the rich, d_R', min: 0.02, max: 0.9, step: 0.01, book: 0.1, d: 2 }
  ],
  presets: [{ label: 'No thrifty phenotype, τ = 0', values: { tau: 0 } }, { label: 'Deprivation unrelated to SES', values: { dP: 0.2, dR: 0.2 } }],
  compute: S => M.b04_famine(S),
  outputs: (S, R, B) => [
    { label: 'Diabetes, deprived minus not deprived (ordinary cohort)', v: b04pp(R.obsGap), b: b04pp(B.obsGap), key: true },
    { label: 'of which selection bias from poverty', v: b04pp(R.bias), b: b04pp(B.bias) },
    { label: 'Diabetes, exposed in utero', v: nf(R.utero.tot, 1) + '%', b: nf(B.utero.tot, 1) + '%' },
    { label: 'Diabetes, conceived after the famine', v: nf(R.after.tot, 1) + '%', b: nf(B.after.tot, 1) + '%' },
    { label: 'Famine gap (exposed minus after)', v: b04pp(R.famGap), b: b04pp(B.famGap) },
    { label: 'Famine estimate of τ, gap/(1 − d̄)', v: b04pp(R.wald), b: b04pp(B.wald), key: true },
    { label: 'Background deprivation d̄', v: pct(R.dbar, 0), b: pct(B.dbar, 0) }
  ],
  verdict: (S, R) => Math.abs(R.bias) < 0.05 ? { tone: 'ok', text: 'Deprivation is unrelated to SES here, so even the ordinary comparison measures τ.' }
    : { tone: 'warn', text: `The ordinary comparison gives ${b04pp(R.obsGap)}, of which ${b04pp(R.bias)} is poverty, not deprivation. The famine comparison recovers τ = ${b04pp(R.wald)}.` },
  chart(el, S, R, B) {
    const names = { 1: 'Not deprived', 2: 'Deprived', 4: 'After famine', 5: 'In utero' };
    const y1 = Math.max(40, 5 * Math.ceil((Math.max(R.dep.tot, R.utero.tot) + 4) / 5));
    const P = Plot(el, { x0: 0.3, x1: 5.7, y0: 0, y1, xticks: [1, 2, 4, 5], xfmt: v => names[v] || '', xlabel: 'Ordinary cohort  |  Famine natural experiment', ylabel: 'Adult type 2 diabetes (%)', aria: 'Stacked bars of diabetes rates' });
    const w = 0.32;
    const bar = (xc, s, g) => {
      const box = (y0, y1, cls) => P.area([[xc - w, y0], [xc + w, y0], [xc + w, y1], [xc - w, y1]], cls);
      box(0, s.base, 'd-out'); box(s.base, s.base + s.ses, 'f-sec'); box(s.base + s.ses, s.tot, 'd-in');
      P.seg(xc - w, g.tot, xc + w, g.tot, 'ghost');
      P.text(xc, s.tot + 1.2, nf(s.tot, 1) + '%', '', 'middle');
    };
    bar(1, R.nonDep, B.nonDep); bar(2, R.dep, B.dep); bar(4, R.after, B.after); bar(5, R.utero, B.utero);
    P.text(0.4, 0.93 * y1, 'blue: deprivation (τ)', 's-pri'); P.text(0.4, 0.85 * y1, 'red: poverty (x × share poor)', 's-sec'); P.text(0.4, 0.77 * y1, 'outline: baseline risk 9.5%', 's-gray');
    P.draw();
  },
  notice: 'In the ordinary cohort the deprived bar carries more red than the non-deprived one, because deprived babies are mostly poor: that difference is selection bias. In the famine comparison the red parts are equal, since the famine struck rich and poor alike, and only the blue part differs. The famine gap understates τ when some babies conceived after the famine are also deprived, so it is scaled by 1 − d̄.',
  challenges: [
    { q: 'Suppose deprivation in utero has no effect, τ = 0. The diabetes gap between deprived and non-deprived babies in the ordinary cohort…', change: { tau: 0 }, options: ['falls to zero', 'stays positive', 'turns negative'],
      judge: (b, a) => a.obsGap > 0.05 ? 1 : a.obsGap < -0.05 ? 2 : 0,
      why: (b, a) => `It falls from ${b04pp(b.obsGap)} to ${b04pp(a.obsGap)}, while the famine gap falls to ${b04pp(a.famGap)}. Deprived babies are ${pct(a.poorDep, 0)} poor against ${pct(a.poorNon, 0)} of the others, so poverty alone produces the correlation that cohort studies such as the 1946 British cohort report.` },
    { q: 'Double the effect of growing up poor, x from 8 to 16 points. The famine estimate of τ…', change: { x: 16 }, options: ['rises', 'does not change', 'falls'],
      judge: (b, a) => a.wald > b.wald + 1e-6 ? 0 : a.wald < b.wald - 1e-6 ? 2 : 1,
      why: (b, a) => `It stays at ${b04pp(a.wald)}, while the ordinary comparison rises from ${b04pp(b.obsGap)} to ${b04pp(a.obsGap)}. Exposure to the famine does not depend on SES, so poverty adds the same amount to both cohorts and cancels out.` },
    { q: 'Background deprivation among the poor rises from d_P = 0.3 to 0.7, also in the cohort conceived after the famine. The raw famine gap (exposed minus after)…', change: { dP: 0.7 }, options: ['rises', 'does not change', 'falls'],
      judge: (b, a) => a.famGap > b.famGap + 1e-6 ? 0 : a.famGap < b.famGap - 1e-6 ? 2 : 1,
      why: (b, a) => `It falls from ${b04pp(b.famGap)} to ${b04pp(a.famGap)}, because ${pct(a.dbar, 0)} of the comparison cohort is now deprived too. The effect τ is unchanged; dividing by 1 − d̄ recovers ${b04pp(a.wald)}. A control group that is partly treated shrinks the raw contrast.` },
    { q: 'Make deprivation equally common among rich and poor (d_P = d_R = 0.2). The ordinary-cohort gap…', change: { dP: 0.2, dR: 0.2 }, options: ['equals τ', 'still exceeds τ', 'falls below τ'],
      judge: (b, a) => Math.abs(a.obsGap - a.tau) < 1e-6 ? 0 : a.obsGap > a.tau ? 1 : 2,
      why: (b, a) => `It becomes ${b04pp(a.obsGap)}, equal to τ = ${b04pp(a.tau)}. Selection bias needs deprivation to be correlated with another cause of disease; when it is not, the simple comparison works as well as a natural experiment.` }
  ]
});
