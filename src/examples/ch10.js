// ===== BHT Chapter 10: Adverse selection in real markets =====
// solvers for this chapter: M.b10_<name>

M.b10_usd = x => !isFinite(x) || x > 99999 ? 'over $100,000' : (x < 0 ? '−$' : '$') + nf(Math.abs(x), 0);
M.b10_pts = x => (x < -0.0005 ? '−' : x > 0.0005 ? '+' : '') + nf(Math.abs(100 * x), 0) + ' pts';
M.b10_sgn = x => (Math.abs(x) < 0.5 ? '' : x < 0 ? '−' : '+') + '$' + nf(Math.abs(x), 0);

// Harvard, 1994-2001: two plans, employees pay a share (1 - sig) of the gap between the PPO and HMO premiums.
// Demand for the PPO: q(p) = q0 exp(-p / lam), through BHT's points (361, 18%) and (731, 14%).
// The premium gap set for year t reflects the year t-1 pool: D = 731 [1 + (1 - rho) ((q / 0.18)^(-eta) - 1)].
M.b10_harvard = function ({ sig, eta, rho, years = 8 }) {
  const lam = 370 / Math.log(18 / 14), q0 = 0.18 * Math.exp(361 / lam);
  const q = p => Math.min(1, q0 * Math.exp(-Math.min(p, 1e6) / lam));
  const D = n => 731 * (1 + (1 - rho) * (Math.pow(Math.max(n, 1e-12) / 0.18, -eta) - 1));
  const next = p => Math.min((1 - sig) * D(q(p)), 1e6);
  const path = [{ t: 1994, p: 361, n: q(361) }];
  for (let i = 1; i < years; i++) { const p = next(path[i - 1].p); path.push({ t: 1994 + i, p, n: q(p) }); }
  let p = 361, collapse = null, yr = 1994;
  for (let i = 1; i <= 400; i++) { p = next(p); yr = 1994 + i; if (q(p) < 0.01 && collapse === null) collapse = yr; if (q(p) < 1e-4) break; }
  const nlong = q(p);
  return { lam, q0, q, D, path, collapse, nlong, plong: p, survives: collapse === null };
};

EX.push({
  id: 'b10-harvard', ch: 10, title: 'The Harvard death spiral',
  ref: 'BHT Section 10.2, Figure 10.2',
  anchors: [[10, '$361 more than the HMO in 1994'], [10, '$731 more in 1995'], [10, 'pay $1,414 to enroll in the PPO']],
  intro: 'Employees choose between the HMO and the more generous PPO and pay a share 1 − σ of the gap between the two plans’ premiums; the insurer sets next year’s gap from this year’s enrollees, and the gap widens with elasticity η as the PPO pool shrinks to its sickest members. The 1994–1996 prices and enrollment shares are BHT’s (Figure 10.2). The demand curve through BHT’s 1994 and 1995 points, the reading of the subsidy cut as a move from an employer share of 51% in 1994 to σ = 0 from 1995, and η = 2.63, which makes the model hit BHT’s 1996 price, are a stylized calibration; the risk-adjustment share ρ is an illustrative extension.',
  eq: String.raw`q(p)=0.230\,e^{-p/1472},\qquad p_t=(1-\sigma)\,D_t,\qquad D_t=731\Big[1+(1-\rho)\Big(\big(\tfrac{q(p_{t-1})}{0.18}\big)^{-\eta}-1\Big)\Big]`,
  params: [
    { id: 'sig', label: 'Employer share of the premium gap from 1995, σ', min: 0, max: 0.8, step: 0.01, book: 0, d: 2 },
    { id: 'eta', label: 'Selection: elasticity of the premium gap to PPO share, η', min: 0, max: 4, step: 0.05, book: Math.log(1414 / 731) / Math.log(18 / 14), d: 2 },
    { id: 'rho', label: 'Risk adjustment: share of the pool’s worsening paid to the PPO, ρ', min: 0, max: 1, step: 0.05, book: 0, d: 2 }
  ],
  presets: [{ label: 'Keep the 1994 subsidy (σ = 0.51)', values: { sig: 1 - 361 / 731 } }, { label: 'Full risk adjustment (ρ = 1)', values: { rho: 1 } }],
  compute: S => M.b10_harvard(S),
  outputs: (S, R, B) => {
    const y = (r, k) => r.path[k];
    const lr = r => r.survives ? pct(r.nlong, 0) : 'below 1% by ' + r.collapse;
    return [
      { label: '1995: employee price of the PPO', v: M.b10_usd(y(R, 1).p), b: M.b10_usd(y(B, 1).p) },
      { label: '1995: PPO share', v: pct(y(R, 1).n, 0), b: pct(y(B, 1).n, 0) },
      { label: '1996: employee price of the PPO', v: M.b10_usd(y(R, 2).p), b: M.b10_usd(y(B, 2).p), key: true },
      { label: '1996: PPO share', v: pct(y(R, 2).n, 0), b: pct(y(B, 2).n, 0) },
      { label: '1997: PPO share', v: pct(y(R, 3).n, 1), b: pct(y(B, 3).n, 1) },
      { label: 'Long run: PPO share', v: lr(R), b: lr(B), key: true }
    ];
  },
  verdict: (S, R) => !R.survives
    ? { tone: 'bad', text: `Death spiral: each repricing drives out the healthiest PPO enrollees, and the PPO share falls below 1% by ${R.collapse}.` }
    : R.nlong >= 0.18 - 1e-6 ? { tone: 'ok', text: `The PPO keeps ${pct(R.nlong, 0)} of employees at an employee price of ${M.b10_usd(R.plong)}.` }
    : { tone: 'warn', text: `The PPO shrinks but survives: its share settles at ${pct(R.nlong, 0)} with an employee price of ${M.b10_usd(R.plong)}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 1993.6, x1: 2001.4, y0: 0, y1: 0.25, xticks: [1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001], xfmt: v => String(Math.round(v)), yfmt: v => nf(100 * v, 0) + '%', xlabel: 'Year', ylabel: 'Share of employees in the PPO', aria: 'PPO enrollment at Harvard by year' });
    P.path(B.path.map(y => [y.t, y.n]), 'ghost');
    P.path(R.path.map(y => [y.t, y.n]), 's-pri thick');
    R.path.forEach((y, i) => P.pt(y.t, y.n, 'p-pri small', i < 5 && y.p < 1e5 ? M.b10_usd(y.p) : '', 6, -8));
    [[1994, 0.18], [1995, 0.14], [1996, 0.09]].forEach(([t, n], i) => P.pt(t, n, 'p-hollow', i === 0 ? 'BHT data' : '', -8, 16, 'end'));
    P.draw();
  },
  notice: 'Labels give the employee price each year; hollow circles are BHT’s enrollment shares. Once employees pay the whole premium gap, each repricing loads the cost of a sicker pool onto fewer people, so in 1996 a fall in enrollment from 18% to 14% almost doubles the price.',
  challenges: [
    { q: 'Instead of cutting the subsidy to zero, Harvard keeps paying 30% of the premium gap from 1995 (σ = 0.30). Does the PPO survive in the long run?', change: { sig: 0.3 }, options: ['Yes, with about 16% of employees', 'Yes, with about 9%', 'No, it still collapses'], judge: (b, a) => !a.survives ? 2 : a.nlong > 0.125 ? 0 : 1,
      why: (b, a) => `It still collapses, only later: the share falls below 1% by ${a.collapse} instead of ${b.collapse}, and the 1996 price is ${M.b10_usd(a.path[2].p)}. With strong selection, a partial subsidy slows each round of repricing but cannot stop it; in this model the employer must pay about 47% of the gap for a stable pool to exist.` },
    { q: 'Keep σ = 0 but add full risk adjustment (ρ = 1), so the PPO is compensated for any worsening of its pool after 1994. The PPO share in 1997 is…', change: { rho: 1 }, options: ['18%, as in 1994', '14%, as in 1995', 'below 9%'], judge: (b, a) => a.path[3].n > 0.16 ? 0 : a.path[3].n > 0.1 ? 1 : 2,
      why: (b, a) => `It stays at ${pct(a.path[3].n, 0)}: the employee price jumps once to ${M.b10_usd(a.path[1].p)} because the subsidy is gone, but the premium gap no longer rises as healthy enrollees leave, so the spiral never starts. Risk adjustment removes the feedback from pool composition to price, not the price increase itself.` },
    { q: 'Risk adjustment is only partial (ρ = 0.5) and σ = 0. In the long run, the PPO…', change: { rho: 0.5 }, options: ['survives with about 11% of employees', 'collapses, but later than without risk adjustment', 'keeps 14% of employees'], judge: (b, a) => a.survives ? (a.nlong > 0.125 ? 2 : 0) : 1,
      why: (b, a) => `It collapses by ${a.collapse} instead of ${b.collapse}; the 1996 price is ${M.b10_usd(a.path[2].p)} rather than ${M.b10_usd(b.path[2].p)}. The PPO still passes half of each worsening of its pool on to the price, and with selection this strong that is enough to keep the healthiest remaining enrollees leaving.` }
  ]
});

// The positive correlation test. Half of the population is high-risk (ex ante spending xH), half low-risk (xL).
// A person buys with probability p0 + a [high risk] + b [cautious]; the cautious share is 0.5 - d/2 among
// high risks and 0.5 + d/2 among low risks. The insured spend (1 + m) times their ex ante risk (moral hazard).
M.b10_corr = function ({ a, d, m, p0 = 0.1, b = 0.4, xH = 8000, xL = 2000 }) {
  const at = dd => {
    const bH = p0 + a + b * (0.5 - dd / 2), bL = p0 + b * (0.5 + dd / 2), ins = 0.5 * (bH + bL);
    const exI = (bH * xH + bL * xL) / (bH + bL), exU = ((1 - bH) * xH + (1 - bL) * xL) / (2 - bH - bL);
    return { bH, bL, ins, exI, exU, gap: exI - exU, clI: (1 + m) * exI, cgap: (1 + m) * exI - exU, mh: m * exI };
  };
  return Object.assign(at(d), { a, d, m, at });
};

EX.push({
  id: 'b10-correlation', ch: 10, title: 'The positive correlation test',
  ref: 'BHT Sections 10.1, 10.2 and 10.4, Definitions 10.1 and 10.3',
  anchors: [],
  bookLabel: 'Baseline',
  ghost: 'Dashed gray: claims gap at the baseline',
  intro: 'Half of the people are high-risk (expected spending $8,000) and half low-risk ($2,000). Everyone buys insurance with probability 0.1, the cautious with 0.4 more, and high risks who act on their private information with a more. Caution can be more common among low risks (gap δ), and the insured spend a share m more than their ex ante risk. A researcher compares the claims of the insured and the uninsured. All values are illustrative; BHT discuss these forces without a numerical model.',
  eq: String.raw`\Pr[\text{buy}]=0.1+a\,\mathbf 1[\text{high risk}]+0.4\,\mathbf 1[\text{cautious}],\qquad \underbrace{(1+m)\bar x_I-\bar x_U}_{\text{claims gap}}=\underbrace{\bar x_I-\bar x_U}_{\text{selection}}+\underbrace{m\,\bar x_I}_{\text{moral hazard}}`,
  params: [
    { id: 'a', label: 'High risks act on private information: extra take-up a', min: 0, max: 0.5, step: 0.01, book: 0.3, d: 2 },
    { id: 'd', label: 'Caution gap δ (cautious share, low minus high risks)', min: 0, max: 1, step: 0.05, book: 0, d: 2 },
    { id: 'm', label: 'Moral hazard: extra spending when insured m', min: 0, max: 1, step: 0.05, book: 0.25, d: 2 }
  ],
  presets: [{ label: 'No private information (a = 0)', values: { a: 0 } }, { label: 'Healthy buy more (a = 0.1, δ = 0.8)', values: { a: 0.1, d: 0.8 } }],
  compute: S => M.b10_corr(S),
  outputs: (S, R, B) => [
    { label: 'Share insured', v: pct(R.ins, 0), b: pct(B.ins, 0) },
    { label: 'Take-up: high risks / low risks', v: pct(R.bH, 0) + ' / ' + pct(R.bL, 0), b: pct(B.bH, 0) + ' / ' + pct(B.bL, 0) },
    { label: 'Ex ante risk: insured / uninsured', v: M.b10_usd(R.exI) + ' / ' + M.b10_usd(R.exU), b: M.b10_usd(B.exI) + ' / ' + M.b10_usd(B.exU) },
    { label: 'Selection gap in ex ante risk', v: M.b10_sgn(R.gap), b: M.b10_sgn(B.gap), key: true },
    { label: 'Moral hazard: extra claims of the insured', v: M.b10_sgn(R.mh), b: M.b10_sgn(B.mh) },
    { label: 'Claims gap the researcher sees', v: M.b10_sgn(R.cgap), b: M.b10_sgn(B.cgap), key: true }
  ],
  verdict: (S, R) => Math.abs(R.cgap) < 0.5 ? { tone: 'neutral', text: 'Claims of the insured and the uninsured are equal: the test finds no correlation between risk and coverage.' }
    : R.gap > 0.5 ? { tone: 'warn', text: `The insured claim ${M.b10_usd(R.cgap)} more; ${M.b10_usd(R.gap)} of it is adverse selection and ${M.b10_usd(R.mh)} is moral hazard, which the claims alone cannot separate.` }
    : R.gap < -0.5 ? { tone: R.cgap > 0 ? 'bad' : 'ok', text: R.cgap > 0 ? `Selection is advantageous (the insured are ${M.b10_usd(-R.gap)} less risky), yet moral hazard makes them claim ${M.b10_usd(R.cgap)} more.` : `Advantageous selection: the insured claim ${M.b10_usd(-R.cgap)} less than the uninsured.` }
    : { tone: R.cgap > 0 ? 'warn' : 'ok', text: `There is no selection on risk; the claims gap of ${M.b10_sgn(R.cgap)} is moral hazard only.` },
  chart(el, S, R, B) {
    const k = 1000, ds = [], N = 50;
    for (let i = 0; i <= N; i++) ds.push(i / N);
    const ys = ds.map(x => R.at(x)).concat(ds.map(x => B.at(x)));
    const lo = Math.min(-1, ...ys.map(r => Math.min(r.gap, r.cgap) / k)), hi = Math.max(2, ...ys.map(r => Math.max(r.gap, r.cgap) / k));
    const P = Plot(el, { x0: 0, x1: 1, y0: Math.floor(lo), y1: Math.ceil(hi * 1.1), xlabel: 'Caution gap δ (preference-based selection)', ylabel: 'Insured minus uninsured ($ thousand)', aria: 'Risk-coverage correlation against the caution gap' });
    P.hline(0, 's-gray');
    P.fn(x => B.at(x).cgap / k, 'ghost');
    P.fn(x => R.at(x).gap / k, 's-pri thick');
    P.fn(x => R.at(x).cgap / k, 's-sec thick');
    P.vline(S.d, 's-ink dot');
    P.pt(S.d, R.gap / k, 'p-pri', 'ex ante risk', 8, 16);
    P.pt(S.d, R.cgap / k, 'p-sec', 'claims', 8, -8);
    P.draw();
  },
  notice: 'Blue is the true selection on risk, red what a researcher sees in claims; the vertical distance between them is moral hazard. Moving right, caution, which drives people to buy, is concentrated among low risks, and the blue line crosses zero where the two kinds of selection cancel.',
  challenges: [
    { q: 'Suppose no one acts on private information about risk (a = 0). The researcher’s claims gap…', change: { a: 0 }, options: ['is positive', 'is zero', 'is negative'], judge: (b, a) => a.cgap > 0.5 ? 0 : a.cgap < -0.5 ? 2 : 1,
      why: (b, a) => `It is ${M.b10_sgn(a.cgap)}, with a selection gap of ${M.b10_sgn(a.gap)}. The insured are no riskier ex ante, but coverage makes them spend ${pct(a.m, 0)} more, so a positive correlation between claims and coverage is not proof of adverse selection.` },
    { q: 'Without moral hazard (m = 0), raise the caution gap δ from 0 to 0.75 while high risks still act on their information (a = 0.3). The selection gap in ex ante risk…', base: { m: 0 }, change: { m: 0, d: 0.75 }, options: ['stays positive but smaller', 'falls to zero', 'turns negative'], judge: (b, a) => a.gap > 0.5 ? 0 : a.gap < -0.5 ? 2 : 1,
      why: (b, a) => `It falls from ${M.b10_sgn(b.gap)} to ${M.b10_sgn(a.gap)}. High risks now buy with probability ${pct(a.bH, 0)} and low risks too with ${pct(a.bL, 0)}: the extra caution of low risks exactly offsets the private information of high risks, so the test finds nothing although asymmetric information is there.` },
    { q: 'Keep a = 0.3 and m = 0.25 and set δ = 1, so all low risks and no high risks are cautious. The insured claim…', change: { d: 1 }, options: ['more than the uninsured', 'less than the uninsured', 'the same as the uninsured'], judge: (b, a) => a.cgap > 0.5 ? 0 : a.cgap < -0.5 ? 1 : 2,
      why: (b, a) => `More: ${M.b10_sgn(a.cgap)}, although they are ${M.b10_usd(-a.gap)} less risky ex ante. Selection is advantageous, but moral hazard adds ${M.b10_usd(a.mh)} to their claims and reverses the sign of what the researcher sees.` }
  ]
});

// He (2009): left censoring in life insurance data. A share fI of the insured is frail (annual mortality dF),
// everyone else is robust (dR); the uninsured are all robust, as in BHT Figure 10.3. A study opens s years after
// purchase and records deaths over T years among those still alive.
M.b10_cens = function ({ fI, dF, dR, s, T }) {
  const mort = (f, s0) => {
    const aF = f * Math.pow(1 - dF, s0), aR = (1 - f) * Math.pow(1 - dR, s0), alive = aF + aR;
    return { alive, m: alive > 1e-12 ? (aF * (1 - Math.pow(1 - dF, T)) + aR * (1 - Math.pow(1 - dR, T))) / alive : 0, frail: alive > 1e-12 ? aF / alive : 0 };
  };
  const tI = mort(fI, 0).m, tU = mort(0, 0).m, mI = mort(fI, s), mU = mort(0, s).m;
  return { tI, tU, mI: mI.m, mU, gapT: tI - tU, gapM: mI.m - mU, lost: 1 - mI.alive, frailLeft: mI.frail, curve: s0 => [mort(fI, s0).m, mort(0, s0).m] };
};

EX.push({
  id: 'b10-censoring', ch: 10, title: 'Missing early deaths in life insurance data',
  ref: 'BHT Section 10.3, Figure 10.3',
  anchors: [[10, '50% for both uninsured and insured groups'], [10, 'the mortality risk among the insured is actually 67%']],
  ghost: 'Dashed gray: insured, BHT’s case',
  intro: 'A share of the people who buy life insurance is frail; the others, and all the uninsured, are robust. A study opens s years after purchase and measures mortality over the next T years among those still alive. The baseline reproduces BHT’s Figure 10.3: a third of the insured are frail and die in the first year (annual mortality 1), robust people have a 50% chance of dying within five years, and the study opens at t = 2. Annual mortality rates other than these are illustrative.',
  eq: String.raw`\text{measured}=\frac{\sum_k f_k(1-d_k)^{s}\big[1-(1-d_k)^{T}\big]}{\sum_k f_k(1-d_k)^{s}},\qquad \text{true: } s=0`,
  params: [
    { id: 'fI', label: 'Share of frail people among the insured', min: 0, max: 1, step: 0.01, book: 1 / 3, d: 2 },
    { id: 'dF', label: 'Annual mortality of the frail', min: 0.05, max: 1, step: 0.01, book: 1, d: 2 },
    { id: 'dR', label: 'Annual mortality of the robust', min: 0.01, max: 0.3, step: 0.001, book: 1 - Math.pow(0.5, 0.2), d: 3 },
    { id: 's', label: 'Years from purchase to the start of the study s', min: 0, max: 10, step: 1, book: 2, d: 0 },
    { id: 'T', label: 'Length of the study window T (years)', min: 1, max: 12, step: 1, book: 5, d: 0 }
  ],
  presets: [{ label: 'Frail die more slowly (annual 0.3)', values: { dF: 0.3 } }],
  compute: S => M.b10_cens(S),
  outputs: (S, R, B) => [
    { label: 'True T-year mortality: insured / uninsured', v: pct(R.tI, 0) + ' / ' + pct(R.tU, 0), b: pct(B.tI, 0) + ' / ' + pct(B.tU, 0) },
    { label: 'True excess mortality of the insured', v: M.b10_pts(R.gapT), b: M.b10_pts(B.gapT), key: true },
    { label: 'Insured who die before the study opens', v: pct(R.lost, 0), b: pct(B.lost, 0) },
    { label: 'Measured mortality: insured / uninsured', v: pct(R.mI, 0) + ' / ' + pct(R.mU, 0), b: pct(B.mI, 0) + ' / ' + pct(B.mU, 0) },
    { label: 'Measured excess mortality of the insured', v: M.b10_pts(R.gapM), b: M.b10_pts(B.gapM), key: true }
  ],
  verdict: (S, R) => R.gapT < 0.005 ? { tone: 'neutral', text: 'The insured are no riskier than the uninsured, so there is no adverse selection to detect.' }
    : R.gapM < 0.005 ? { tone: 'bad', text: `The study sees no excess mortality, although the insured are ${nf(100 * R.gapT, 0)} points more likely to die: all the frail died before it opened.` }
    : R.gapM < R.gapT - 0.005 ? { tone: 'warn', text: `The study sees ${nf(100 * R.gapM, 0)} of the ${nf(100 * R.gapT, 0)} points of excess mortality: it misses the frail who died before it opened.` }
    : { tone: 'ok', text: `The study opens at purchase and sees the full ${nf(100 * R.gapT, 0)} points of excess mortality.` },
  chart(el, S, R, B) {
    const ss = []; for (let i = 0; i <= 10; i++) ss.push(i);
    const P = Plot(el, { x0: 0, x1: 10, y0: 0, y1: 1, yfmt: v => nf(100 * v, 0) + '%', xlabel: 'Years from purchase to the start of the study, s', ylabel: 'Measured mortality over T years', aria: 'Measured mortality by start of the study' });
    P.path(ss.map(x => [x, B.curve(x)[0]]), 'ghost');
    P.path(ss.map(x => [x, R.curve(x)[1]]), 's-pri thick');
    P.path(ss.map(x => [x, R.curve(x)[0]]), 's-sec thick');
    P.vline(S.s, 's-ink dot');
    P.pt(S.s, R.mI, 'p-sec', 'insured ' + pct(R.mI, 0), 8, -10);
    P.pt(S.s, R.mU, 'p-pri', 'uninsured ' + pct(R.mU, 0), 8, 18);
    P.draw();
  },
  notice: 'At s = 0 the gap between red and blue is the true excess mortality of the insured. The later the study opens, the more of the frail it never sees, and the insured who remain look like the uninsured.',
  challenges: [
    { q: 'Open the study at the time of purchase (s = 0), as He does by following new customers. Measured mortality of the insured becomes…', change: { s: 0 }, options: ['50%', '67%', '83%'], judge: (b, a) => a.mI < 0.58 ? 0 : a.mI < 0.75 ? 1 : 2,
      why: (b, a) => `It is ${pct(a.mI, 0)} against ${pct(a.mU, 0)} for the uninsured. The frail third who die in the first year are now counted, so the excess mortality of ${M.b10_pts(a.gapM)} that the late study missed reappears.` },
    { q: 'The frail die more slowly: their annual mortality falls from 1 to 0.3, the study still opens at s = 2. The measured excess mortality of the insured…', change: { dF: 0.3 }, options: ['rises', 'falls', 'stays at zero'], judge: (b, a) => a.gapM > b.gapM + 0.005 ? 0 : a.gapM < b.gapM - 0.005 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b10_pts(b.gapM)} to ${M.b10_pts(a.gapM)}, although the true excess falls from ${M.b10_pts(b.gapT)} to ${M.b10_pts(a.gapT)}. When the frail die slowly, ${pct(a.frailLeft, 0)} of the insured still alive at s = 2 are frail, so the study sees part of the selection.` },
    { q: 'With the frail dying at annual rate 0.3, the study opens 8 years after purchase instead of 2. The measured excess mortality…', base: { dF: 0.3 }, change: { dF: 0.3, s: 8 }, options: ['rises', 'falls but stays positive', 'falls to zero'], judge: (b, a) => a.gapM > b.gapM + 0.005 ? 0 : a.gapM > 0.005 ? 1 : 2,
      why: (b, a) => `It falls from ${M.b10_pts(b.gapM)} to ${M.b10_pts(a.gapM)}: by year 8 only ${pct(a.frailLeft, 0)} of the surviving insured are frail. A short window opened long after purchase understates adverse selection, which is why He follows new buyers over 12 years.` }
  ]
});
