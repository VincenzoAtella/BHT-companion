// ===== BHT Chapter 16: The Beveridge model: nationalized health care =====
// solvers for this chapter: M.b16_<name>

M.b16_n = (x, d = 0) => nf(x, d).replace(/^-/, '−');
M.b16_gbp = (x, d = 0) => isFinite(x) ? (x < 0 ? '−£' : '£') + nf(Math.abs(x), d) : 'n/a';
M.b16_m = (x, d = 1) => isFinite(x) ? (x < 0 ? '−£' : '£') + nf(Math.abs(x) / 1e6, d) + 'm' : 'n/a';

// 1. Waiting list as the rationing device (Section 16.3, Figures 16.1-16.3).
// N referrals a month; the benefit B of surgery over the cheaper alternative is uniform on [0, Bmax];
// surgery costs the NHS c more than the alternative, so patients with B < c are W-patients.
// A GP refers every U-patient (B >= c) and a W-patient with probability 1 - g.
// A patient joins the list if B - (fee burden) >= delta * t; a share phi is poor and feels each pound of the fee as lam pounds.
// Steady state: joiners per month A(t) = capacity K, or t = 0 if A(0) <= K.
M.b16_queue = function ({ K, g, theta, delta, N = 100, Bmax = 3000, c = 1500, phi = 0.3, lam = 3 }) {
  // count and sum of B of referred patients with B >= x, per unit mass, for one group
  const piece = (lo, hi, w) => { lo = Math.max(lo, 0); hi = Math.min(hi, Bmax); return hi > lo ? { n: w * (hi - lo) / Bmax, s: w * (hi * hi - lo * lo) / 2 / Bmax } : { n: 0, s: 0 }; };
  const join = x => { const u = piece(Math.max(x, c), Bmax, 1), w = piece(x, c, 1 - g); return { nU: u.n, sU: u.s, nW: w.n, sW: w.s }; };
  const groups = t => {
    const r = join(theta + delta * t), p = join(lam * theta + delta * t);
    return { r, p, A: N * ((1 - phi) * (r.nU + r.nW) + phi * (p.nU + p.nW)) };
  };
  const A = t => groups(t).A;
  const AU = t => { const G = groups(t); return N * ((1 - phi) * G.r.nU + phi * G.p.nU); };
  const A0 = A(0), tmax = Bmax / delta;
  const t = A0 <= K ? 0 : M.bisect(x => A(x) - K, 0, tmax);
  const G = groups(t);
  const nUr = N * (1 - phi) * G.r.nU, nUp = N * phi * G.p.nU, nW = N * ((1 - phi) * G.r.nW + phi * G.p.nW);
  const treated = nUr + nUp + nW;
  const sumB = N * ((1 - phi) * (G.r.sU + G.r.sW) + phi * (G.p.sU + G.p.sW));
  const needR = N * (1 - phi) * (Bmax - c) / Bmax, needP = N * phi * (Bmax - c) / Bmax;   // U-patients referred
  const netCare = sumB - c * treated, waitCost = delta * t * treated;
  return { K, t, list: treated * t, A, AU, A0, treated, idle: Math.max(0, K - treated), nW, nUr, nUp,
    wShare: treated > 0 ? nW / treated : 0, accR: nUr / needR, accP: nUp / needP,
    wasted: N * ((1 - phi) * (c * G.r.nW - G.r.sW) + phi * (c * G.p.nW - G.p.sW)),
    netCare, waitCost, net: netCare - waitCost, fees: theta * treated };
};

EX.push({
  id: 'b16-queue', ch: 16, title: 'Rationing knee replacements by waiting',
  ref: 'BHT Section 16.3, Figures 16.1–16.3',
  anchors: [],
  intro: 'A public orthopedic department does K knee replacements a month. Each month 100 patients see a GP; the benefit B of surgery over cheaper therapy is spread evenly between £0 and £3,000, and surgery costs the NHS £1,500 more, so patients with B below £1,500 are W-patients and the others U-patients. The GP refers every U-patient and lets a W-patient through with probability 1 − g. A patient stays on the list if B, minus any fee θ, exceeds the cost of waiting, δ per month; the 30% who are poor (the Up-patients) feel each pound of the fee as three. The waiting time t adjusts until the list takes in exactly K patients a month. All values are illustrative; δ = £100 a month is in the range of the waiting-time valuations BHT reports (£50 to £115 a month).',
  eq: String.raw`\text{join if } B-\theta\ (\text{poor: } B-3\theta)\ \ge\ \delta t,\qquad A(t^*)=K\ \text{ or }\ t^*=0\text{ if }A(0)\le K,\qquad \text{list}=K\,t^*`,
  params: [
    { id: 'K', label: 'Operations the surgeon can do per month K', min: 30, max: 100, step: 1, book: 65, d: 0 },
    { id: 'g', label: 'Gatekeeping: share of W-patients the GP screens out g', min: 0, max: 1, step: 0.05, book: 0.5, d: 2 },
    { id: 'theta', label: 'Fee per operation θ (£)', min: 0, max: 1000, step: 25, book: 0, d: 0 },
    { id: 'delta', label: 'Cost of waiting per month δ (£)', min: 25, max: 300, step: 5, book: 100, d: 0 }
  ],
  presets: [
    { label: 'Perfect gatekeeping (Figure 16.3)', values: { g: 1 } },
    { label: 'Fee of £600 (Figure 16.2)', values: { theta: 600 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b16_queue(S),
  outputs: (S, R, B) => [
    { label: 'Waiting time t* (months)', v: nf(R.t, 1), b: nf(B.t, 1), key: true },
    { label: 'Patients on the waiting list', v: nf(R.list, 0), b: nf(B.list, 0) },
    { label: 'Operations per month (idle slots)', v: nf(R.treated, 1) + ' (' + nf(R.idle, 1) + ')', b: nf(B.treated, 1) + ' (' + nf(B.idle, 1) + ')' },
    { label: 'Share of operations on W-patients', v: pct(R.wShare, 1), b: pct(B.wShare, 1), key: true },
    { label: 'U-patients who get surgery: better-off, poor', v: pct(R.accR, 0) + ', ' + pct(R.accP, 0), b: pct(B.accR, 0) + ', ' + pct(B.accP, 0) },
    { label: 'Money wasted on W-patients per month (c − B)', v: M.b16_gbp(R.wasted), b: M.b16_gbp(B.wasted) },
    { label: 'Cost of waiting borne by patients per month', v: M.b16_gbp(R.waitCost), b: M.b16_gbp(B.waitCost) },
    { label: 'Net social value per month (benefit − cost − waiting)', v: M.b16_gbp(R.net), b: M.b16_gbp(B.net) }
  ],
  verdict: (S, R) => R.accP < R.accR - 0.005
    ? { tone: 'bad', text: `${R.t < 1e-6 ? 'The fee removes the queue' : `The fee shortens the wait to ${nf(R.t, 1)} months`}, but only ${pct(R.accP, 0)} of poor U-patients get surgery against ${pct(R.accR, 0)} of the better-off.` }
    : R.t < 1e-6
      ? { tone: R.wShare < 1e-6 ? 'ok' : 'warn', text: `No queue: only ${nf(R.treated, 1)} patients a month ask for surgery, ${nf(R.idle, 1)} slots stay idle${R.wShare > 1e-6 ? `, and ${pct(R.wShare, 0)} of operations still go to W-patients` : ''}.` }
      : { tone: 'neutral', text: `Patients wait ${nf(R.t, 1)} months; the wait deters the patients who gain least, yet ${pct(R.wShare, 0)} of operations still go to W-patients.` },
  chart(el, S, R, B) {
    const x1 = 24;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1: 105, xlabel: 'Waiting time t (months)', ylabel: 'Patients joining the list per month', aria: 'Demand for surgery as a function of the waiting time, against capacity' });
    P.fn(B.A, 'ghost', 0, x1);
    P.fn(R.AU, 's-grn', 0, x1);
    P.fn(R.A, 's-pri thick', 0, x1);
    P.hline(S.K, 's-sec', 'capacity K = ' + nf(S.K, 0), 'end');
    P.text(x1 * 0.98, R.AU(x1 * 0.98) - 5, 'U-patients only', 's-grn', 'end');
    if (R.t > 1e-6) { P.seg(R.t, 0, R.t, S.K, 's-ink dot'); P.pt(R.t, S.K, 'p-ink', 't* = ' + nf(R.t, 1), 8, -10); }
    else P.pt(0, R.A0, 'p-ink', 'no queue', 8, -10);
    P.draw();
  },
  notice: 'The blue curve is the demand for surgery at each waiting time; the gap between it and the green curve is the W-patients. The wait acts as a price paid in time: it settles where demand meets capacity, and it deters the patients with the smallest benefit, but it is a blunt screen because every patient pays it, U-patients included.',
  challenges: [
    { q: 'The NHS hires more surgeons: capacity rises from 65 to 70 operations a month. The number of operations on W-patients each month…', change: { K: 70 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.nW > b.nW + 1e-6 ? 0 : a.nW < b.nW - 1e-6 ? 1 : 2,
      why: (b, a) => `It rises from ${nf(b.nW, 1)} to ${nf(a.nW, 1)} while the wait falls from ${nf(b.t, 1)} to ${nf(a.t, 1)} months. Every U-patient was already on the list, so all the extra slots go to W-patients whom the shorter wait no longer deters: shorter queues buy faster access at the cost of more wasteful operations.` },
    { q: 'Patients become more impatient: the cost of waiting doubles from £100 to £200 a month. The cost of waiting borne by each treated patient (δ·t*)…', change: { delta: 200 }, options: ['roughly doubles', 'stays the same', 'halves'],
      judge: (b, a) => { const r = (a.waitCost / a.treated) / (b.waitCost / b.treated); return r > 1.5 ? 0 : r > 0.75 ? 1 : 2; },
      why: (b, a) => `It stays at ${M.b16_gbp(a.waitCost / a.treated)}: the wait halves from ${nf(b.t, 1)} to ${nf(a.t, 1)} months. The list must deter the same patients to match the same capacity, so the time price in pounds is pinned down by capacity, not by impatience.` },
    { q: 'Introduce a fee of £600 per operation, about 40% of the extra cost of surgery. What happens?', change: { theta: 600 }, options: ['the queue disappears and every U-patient still gets surgery', 'the queue disappears, but some poor U-patients give up surgery', 'a shorter queue remains and nobody with B ≥ c gives up'],
      judge: (b, a) => a.t > 1e-6 ? 2 : a.accP < 0.995 || a.accR < 0.995 ? 1 : 0,
      why: (b, a) => `The wait falls from ${nf(b.t, 1)} months to zero and the W-share from ${pct(b.wShare, 1)} to ${pct(a.wShare, 1)}, but only ${pct(a.accP, 0)} of poor U-patients now get surgery, against ${pct(a.accR, 0)} of the better-off, and ${nf(a.idle, 1)} slots a month go unused. The fee screens by willingness to pay, which mixes the benefit of surgery with the ability to pay.` },
    { q: 'With perfect gatekeeping (g = 1), what happens to the waiting list?', change: { g: 1 }, options: ['it disappears and some capacity is idle', 'it shrinks but a queue remains', 'it does not change'],
      judge: (b, a) => a.t < 1e-6 ? 0 : a.t < b.t - 1e-6 ? 1 : 2,
      why: (b, a) => `Only the ${nf(a.treated, 0)} U-patients a month are referred, below the capacity of ${nf(a.K, 0)}, so the wait falls from ${nf(b.t, 1)} months to ${nf(a.t, 1)}. With perfect screening a persistent queue would signal too little capacity; here it signals instead that the department is slightly too large.` }
  ]
});

// 2. Global budget against payment by results (Section 16.6, "Moving away from global budgets").
// A hospital receives D referrals a year for one procedure. Unit cost is c0 - e, where e is cost-reducing
// effort with private cost k e^2 / 2 to the managers. Under a global budget G the hospital keeps no savings
// (next year's budget follows this year's costs), so e = 0 and it treats Q = min(D, G / c0).
// Under payment by results it receives the HRG price p per case and keeps the margin (reinvested in the hospital):
// it treats all D cases with e* = min(D / k, emax) if (p - c0 + e*) D - k e*^2 / 2 >= 0, and drops the service otherwise.
M.b16_pay = function ({ pay, G, p, D, c0 = 5000, k = 15, emax = 1000 }) {
  const e1 = Math.min(D / k, emax), m1 = (p - c0 + e1) * D - k * e1 * e1 / 2;
  const pmin = c0 - e1 + k * e1 * e1 / 2 / D;                  // lowest price at which the hospital keeps the service
  const gb = () => { const Q = Math.min(D, G / c0); return { Q, e: 0, unit: c0, spend: G, margin: 0, per: Q > 0 ? G / Q : NaN }; };
  const pbr = () => m1 >= -1e-6 ? { Q: D, e: e1, unit: c0 - e1, spend: p * D, margin: m1, per: p } : { Q: 0, e: 0, unit: c0, spend: 0, margin: 0, per: NaN };
  const R = pay === 'gb' ? gb() : pbr();
  return { ...R, pay, G, p, D, c0, k, e1, pmin, unmet: D - R.Q, QGB: Math.min(D, G / c0) };
};

EX.push({
  id: 'b16-pbr', ch: 16, title: 'Global budget or payment by results?',
  ref: 'BHT Sections 16.3 and 16.6',
  anchors: [],
  intro: 'A public hospital receives D referrals a year for one procedure, which costs c₀ = £5,000 a case unless managers work to cut costs: an effort that saves e per case costs them 15·e²/2. Under a global budget G the hospital spends its budget and keeps none of what it saves, because next year’s budget follows this year’s costs; under payment by results it gets the HRG price p for each case and can reinvest the margin. All values are illustrative.',
  eq: String.raw`\text{global budget: } e=0,\ Q=\min\!\left(D,\tfrac{G}{c_0}\right);\qquad \text{PbR: } \max_{Q\le D,\,e}\ (p-c_0+e)\,Q-\tfrac{k}{2}e^2\ \Rightarrow\ e^*=\tfrac{D}{k},\ Q=D \text{ iff } p\ge c_0-\tfrac{D}{2k}`,
  params: [
    { id: 'G', label: 'Global budget G (£ million)', min: 10, max: 40, step: 0.5, book: 25, d: 1, show: S => S.pay === 'gb' },
    { id: 'p', label: 'HRG price per case p (£)', min: 4000, max: 6000, step: 25, book: 4900, d: 0, show: S => S.pay === 'pbr' },
    { id: 'D', label: 'Referrals per year D', min: 2000, max: 10000, step: 100, book: 6000, d: 0 }
  ],
  toggles: [{ id: 'pay', label: 'Hospital funding', options: [['gb', 'Global budget'], ['pbr', 'Payment by results']], book: 'gb' }],
  presets: [{ label: 'Payment by results at £4,900', values: { pay: 'pbr' } }],
  bookLabel: 'Baseline',
  compute: S => M.b16_pay({ ...S, G: S.G * 1e6 }),
  outputs: (S, R, B) => [
    { label: 'Patients treated per year', v: nf(R.Q, 0), b: nf(B.Q, 0), key: true },
    { label: 'Referrals left waiting per year', v: nf(R.unmet, 0), b: nf(B.unmet, 0) },
    { label: 'Hospital’s cost per case', v: M.b16_gbp(R.unit), b: M.b16_gbp(B.unit) },
    { label: 'Government spending per year', v: M.b16_m(R.spend), b: M.b16_m(B.spend), key: true },
    { label: 'Government spending per patient treated', v: M.b16_gbp(R.per), b: M.b16_gbp(B.per) },
    { label: 'Hospital margin after effort (reinvested)', v: M.b16_m(R.margin, 2), b: M.b16_m(B.margin, 2) },
    { label: 'Lowest HRG price that keeps the service', v: M.b16_gbp(R.pmin), b: M.b16_gbp(B.pmin) }
  ],
  verdict: (S, R) => S.pay === 'gb'
    ? (R.unmet > 0.5 ? { tone: 'warn', text: `Spending is capped at ${M.b16_m(R.spend)}, but the hospital has no reason to cut its £5,000 cost, so ${nf(R.unmet, 0)} referrals a year are left waiting.` }
      : { tone: 'neutral', text: `The budget covers every referral at £5,000 a case; ${M.b16_m(S.G * 1e6 - R.Q * R.c0)} is unspent and, under budgets based on past costs, will be cut next year.` })
    : (R.Q > 0 ? { tone: 'ok', text: `Paid per case, the hospital treats all ${nf(R.Q, 0)} referrals and cuts its cost to ${M.b16_gbp(R.unit)}, but spending is now ${M.b16_m(R.spend)} and rises with every referral.` }
      : { tone: 'bad', text: `At ${M.b16_gbp(S.p)} the procedure loses money even with the best effort (it needs at least ${M.b16_gbp(R.pmin)}), so the hospital stops offering it.` }),
  chart(el, S, R, B) {
    const x1 = 10500;
    const P = Plot(el, { x0: 0, x1, y0: 3000, y1: 7000, xlabel: 'Patients treated per year Q', ylabel: '£ per case', aria: 'Budget per case, price and unit cost against patients treated' });
    P.fn(q => S.G * 1e6 / q, S.pay === 'gb' ? 's-pri thick' : 's-gray', 2500, x1);
    P.text(S.G * 1e6 / 6600 + 200, 6600, 'G / Q', S.pay === 'gb' ? 's-pri' : 'muted', 'start');
    P.hline(R.c0, 's-gray dash', 'cost without effort c₀', 'start');
    if (S.pay === 'pbr') {
      const lo = R.c0 - R.e1;
      if (R.Q > 0) P.area([[0, lo], [R.D, lo], [R.D, S.p], [0, S.p]], S.p >= lo ? 'f-band' : 'f-sec');
      P.hline(S.p, 's-pri thick', 'price p', 'end');
      P.hline(lo, 's-grn', 'cost with effort', 'start');
    }
    P.vline(S.D, 's-ink dot', 'referrals D');
    if (R.Q > 0) P.pt(R.Q, S.pay === 'gb' ? R.c0 : S.p, 'p-ink', nf(R.Q, 0) + ' treated', -8, -10, 'end');
    P.draw();
  },
  notice: 'Under a global budget the money per case falls along G/Q, so the hospital stops where it meets the unchanged cost c₀ and the rest of the referrals wait. Under payment by results the green rectangle is the margin from treating everyone at the lower cost: it pays for the managers’ effort, and if the price leaves no margin the service is dropped.',
  challenges: [
    { q: 'Under payment by results, the NHS cuts the HRG price from £4,900 to £4,850, below the £5,000 the hospital spends today. Patients treated…', base: { pay: 'pbr' }, change: { pay: 'pbr', p: 4850 }, options: ['stay at 6,000', 'fall a little', 'fall to zero'],
      judge: (b, a) => Math.abs(a.Q - b.Q) < 0.5 ? 0 : a.Q > 0.5 ? 1 : 2,
      why: (b, a) => `They stay at ${nf(a.Q, 0)}. A price below today’s cost is not below the cost the hospital can reach: with effort it treats each case for ${M.b16_gbp(a.unit)}, and its margin falls from ${M.b16_m(b.margin, 2)} to ${M.b16_m(a.margin, 2)} but stays positive.` },
    { q: 'Cut the HRG price further, to £4,750. Patients treated…', base: { pay: 'pbr' }, change: { pay: 'pbr', p: 4750 }, options: ['stay at 6,000', 'fall a little', 'fall to zero'],
      judge: (b, a) => Math.abs(a.Q - b.Q) < 0.5 ? 0 : a.Q > 0.5 ? 1 : 2,
      why: (b, a) => `They fall to ${nf(a.Q, 0)}: below ${M.b16_gbp(a.pmin)} the procedure loses money even after the best cost cut, so the hospital avoids it. An HRG price set too low does not squeeze costs; it removes the service.` },
    { q: 'Under payment by results at £4,900, referrals rise from 6,000 to 8,000 a year. The hospital’s cost per case…', base: { pay: 'pbr' }, change: { pay: 'pbr', D: 8000 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.unit > b.unit + 0.5 ? 0 : a.unit < b.unit - 0.5 ? 1 : 2,
      why: (b, a) => `It falls from ${M.b16_gbp(b.unit)} to ${M.b16_gbp(a.unit)}, while government spending rises from ${M.b16_m(b.spend)} to ${M.b16_m(a.spend)}. A saving per case is worth more when it applies to more cases; the flip side is that the government no longer controls total spending.` },
    { q: 'Keep the global budget and raise it from £25m to £30m. Does the hospital cut its cost per case?', change: { G: 30 }, options: ['Yes', 'No'],
      judge: (b, a) => a.unit < b.unit - 0.5 ? 0 : 1,
      why: (b, a) => `No: it stays at ${M.b16_gbp(a.unit)}. The extra money clears the list (${nf(a.Q, 0)} treated), but under a global budget the hospital keeps nothing it saves, so a larger budget buys volume, not efficiency.` }
  ]
});

// 3. Cost-effectiveness rationing under a fixed budget (Section 16.4), with private top-ups (Section 16.5).
// Eight new technologies: patients per year n, extra cost per patient c, QALYs gained per patient q.
// The cancer drug follows BHT's Avastin case: £20,800 per course, about six weeks of life (0.115 years, counted as QALYs).
M.b16_techs = [
  { k: 'A', name: 'statins, high-risk group', n: 40000, c: 300, q: 0.05 },
  { k: 'B', name: 'more hip replacements', n: 5000, c: 6000, q: 0.6 },
  { k: 'C', name: 'smoking cessation', n: 20000, c: 500, q: 0.04 },
  { k: 'D', name: 'diabetes drug', n: 10000, c: 1800, q: 0.1 },
  { k: 'E', name: 'arthritis biologic', n: 3000, c: 9000, q: 0.36 },
  { k: 'F', name: 'robotic surgery', n: 2000, c: 8000, q: 0.2 },
  { k: 'G', name: 'multiple sclerosis drug', n: 1500, c: 20000, q: 0.25 },
  { k: 'H', name: 'cancer drug (Avastin)', n: 2000, c: 20800, q: 6 / 52 }
];
M.b16_hta = function ({ rule, H, lam, pi }) {
  const T = M.b16_techs.map(t => ({ ...t, cost: t.n * t.c, qaly: t.n * t.q, icer: t.c / t.q }));
  const byIcer = [...T].sort((a, b) => a.icer - b.icer);
  const arrival = ['E', 'G', 'B', 'H', 'A', 'F', 'D', 'C'].map(k => T.find(t => t.k === k));
  const fund = new Set();
  let left = H;
  const greedy = list => list.forEach(t => { if (!fund.has(t.k) && t.cost <= left + 1e-6) { fund.add(t.k); left -= t.cost; } });
  if (rule === 'threshold') T.forEach(t => { if (t.icer <= lam) fund.add(t.k); });
  else if (rule === 'arrival') greedy(arrival);
  else { if (rule === 'mandate') { fund.add('H'); left -= T.find(t => t.k === 'H').cost; } greedy(byIcer); }
  const F = T.filter(t => fund.has(t.k)), U = T.filter(t => !fund.has(t.k));
  const spend = F.reduce((s, t) => s + t.cost, 0), qaly = F.reduce((s, t) => s + t.qaly, 0);
  const maxIcer = F.length ? Math.max(...F.map(t => t.icer)) : NaN;
  const nextIcer = U.length ? Math.min(...U.map(t => t.icer)) : NaN;
  // private top-ups: a share pi of patients in each unfunded group buy the technology themselves
  const privQ = pi * U.reduce((s, t) => s + t.qaly, 0), privS = pi * U.reduce((s, t) => s + t.cost, 0);
  const deniedN = U.reduce((s, t) => s + t.n, 0);
  // QALY frontier: cumulative cost and QALYs in ICER order
  const front = [[0, 0]]; let cc = 0, cq = 0; byIcer.forEach(t => { cc += t.cost; cq += t.qaly; front.push([cc, cq]); });
  return { T, byIcer, fund, F, U, spend, qaly, left: H - spend, maxIcer, nextIcer, privQ, privS, deniedN, front,
    funded: byIcer.filter(t => fund.has(t.k)).map(t => t.k).join(', ') || 'none', avastin: fund.has('H') };
};

EX.push({
  id: 'b16-hta', ghost: '', ch: 16, title: 'Cost-effectiveness rationing on a fixed budget',
  ref: 'BHT Sections 16.4–16.5, Definition 16.1',
  anchors: [[16, 'each course of treatment cost £20,800'], [16, 'prolong life by an average of six weeks'], [16, 'less than £20,000']],
  intro: 'A national health service has a budget H for eight new technologies. The cancer drug follows BHT’s Avastin case: a course costs £20,800 and adds about six weeks of life, counted here as 0.115 QALYs; the other seven technologies, the patient numbers and the budget are illustrative. Compare an HTA agency that funds technologies in order of their ICER, a fixed threshold λ like NICE’s £20,000–£30,000 per QALY, funding in order of arrival without assessment, and a mandate to fund the cancer drug first. A share π of patients denied a technology buy it privately.',
  eq: String.raw`ICER_i=\frac{c_i}{q_i},\qquad \max \sum_{i\in F} n_i q_i\ \text{ s.t. }\ \sum_{i\in F} n_i c_i\le H\ \Rightarrow\ \text{fund in rising order of } ICER_i`,
  params: [
    { id: 'H', label: 'Budget for new technologies H (£ million)', min: 10, max: 200, step: 1, book: 100, d: 0, show: S => S.rule !== 'threshold' },
    { id: 'lam', label: 'Threshold λ (£ per QALY)', min: 5000, max: 200000, step: 1000, book: 30000, d: 0, show: S => S.rule === 'threshold' },
    { id: 'pi', label: 'Share of denied patients who pay privately π', min: 0, max: 0.5, step: 0.01, book: 0.15, d: 2 }
  ],
  toggles: [{ id: 'rule', label: 'Coverage rule', options: [['icer', 'Rank by ICER'], ['threshold', 'Fixed threshold'], ['arrival', 'Order of arrival'], ['mandate', 'Cancer drug mandated']], book: 'icer' }],
  presets: [{ label: 'NICE threshold £20,000', values: { rule: 'threshold', lam: 20000 } }, { label: 'NICE upper bound £30,000', values: { rule: 'threshold', lam: 30000 } }],
  bookLabel: 'Baseline',
  compute: S => M.b16_hta({ ...S, H: S.H * 1e6 }),
  outputs: (S, R, B) => [
    { label: 'Technologies funded (ICER order)', v: R.funded, b: B.funded },
    { label: 'Public spending', v: M.b16_m(R.spend), b: M.b16_m(B.spend) },
    { label: 'QALYs gained per year', v: nf(R.qaly, 0), b: nf(B.qaly, 0), key: true },
    { label: 'Highest ICER funded / lowest ICER refused', v: M.b16_gbp(R.maxIcer) + ' / ' + M.b16_gbp(R.nextIcer), b: M.b16_gbp(B.maxIcer) + ' / ' + M.b16_gbp(B.nextIcer), key: true },
    { label: 'Cancer drug ICER (£ per QALY)', v: M.b16_gbp(R.T[7].icer), b: M.b16_gbp(B.T[7].icer) },
    { label: 'Patients denied a technology', v: nf(R.deniedN, 0), b: nf(B.deniedN, 0) },
    { label: 'Private top-ups: spending, QALYs', v: M.b16_m(R.privS) + ', ' + nf(R.privQ, 0), b: M.b16_m(B.privS) + ', ' + nf(B.privQ, 0) }
  ],
  verdict: (S, R) => {
    const best = M.b16_hta({ rule: 'icer', H: R.spend, lam: 0, pi: S.pi });
    if (S.rule === 'icer') return { tone: 'ok', text: `The budget buys ${nf(R.qaly, 0)} QALYs; the implied threshold lies between ${M.b16_gbp(R.maxIcer)} and ${M.b16_gbp(R.nextIcer)} per QALY.` };
    if (R.qaly < best.qaly - 0.5) return { tone: 'bad', text: `The same ${M.b16_m(R.spend)} spent in ICER order would buy ${nf(best.qaly, 0)} QALYs, not ${nf(R.qaly, 0)}.` };
    return { tone: 'neutral', text: `All technologies with an ICER below ${M.b16_gbp(S.lam)} are funded, at a cost of ${M.b16_m(R.spend)}: a threshold fixes the price of health and lets spending follow.` };
  },
  chart(el, S, R, B) {
    const tot = R.front[R.front.length - 1];
    const P = Plot(el, { x0: 0, x1: 200, y0: 0, y1: 9500, xlabel: 'Spending on new technologies (£ million)', ylabel: 'QALYs gained per year', aria: 'Cost-QALY frontier of technologies ranked by ICER, with the chosen package' });
    R.byIcer.forEach((t, i) => {
      const [x0, y0] = R.front[i], [x1, y1] = R.front[i + 1];
      P.seg(x0 / 1e6, y0, x1 / 1e6, y1, R.fund.has(t.k) && S.rule !== 'arrival' && S.rule !== 'mandate' ? 's-pri thick' : 's-gray');
      P.text((x0 + x1) / 2e6, (y0 + y1) / 2 + 300, t.k, 'muted', 'end');
    });
    if (S.rule !== 'threshold') P.vline(S.H, 's-sec dash', 'budget H');
    P.pt(R.spend / 1e6, R.qaly, 'p-sec', 'chosen package', 8, 16);
    P.text(tot[0] / 1e6 - 2, tot[1] + 400, 'all eight', 'muted', 'end');
    P.draw();
  },
  notice: 'The frontier stacks the technologies from the lowest to the highest ICER, so its slope, QALYs per pound, keeps falling: the last segment is the cancer drug. Any package that is not a run from the start of the frontier lies below it and buys fewer QALYs for the same money.',
  challenges: [
    { q: 'Mandate the cancer drug first and fund the rest of the £100m in ICER order. QALYs gained per year…', change: { rule: 'mandate' }, options: ['rise slightly', 'fall by about 5%', 'fall by about 25%'],
      judge: (b, a) => a.qaly > b.qaly ? 0 : a.qaly > 0.9 * b.qaly ? 1 : 2,
      why: (b, a) => `They fall from ${nf(b.qaly, 0)} to ${nf(a.qaly, 0)}. The drug adds ${nf(a.T[7].qaly, 0)} QALYs for ${M.b16_m(a.T[7].cost)}, at ${M.b16_gbp(a.T[7].icer)} per QALY, and displaces ${b.F.filter(t => !a.fund.has(t.k)).map(t => t.k + ' (' + M.b16_gbp(t.icer) + ' per QALY)').join(' and ')}: with a fixed budget, the opportunity cost of a drug is the health it pushes out.` },
    { q: 'Raise the budget from £100m to £120m, still funding in ICER order. Is the cancer drug funded?', change: { H: 120 }, options: ['Yes', 'No'],
      judge: (b, a) => a.avastin ? 0 : 1,
      why: (b, a) => `No: the extra money funds ${a.funded.split(', ').filter(k => !b.funded.includes(k)).join(', ') || 'nothing new'}, and the QALYs gained rise from ${nf(b.qaly, 0)} to ${nf(a.qaly, 0)}, about ${nf((a.qaly - b.qaly) / ((a.spend - b.spend) / 1e6), 0)} per extra £1m against ${nf(b.qaly / (b.spend / 1e6), 0)} for the first £100m. The cancer drug would need a budget of ${M.b16_m(a.front[8][0])}.` },
    { q: 'Fund the same £100m in order of arrival, without any assessment. QALYs gained…', change: { rule: 'arrival' }, options: ['do not change', 'fall by less than 10%', 'fall by more than 10%'],
      judge: (b, a) => Math.abs(a.qaly - b.qaly) < 0.5 ? 0 : a.qaly > 0.9 * b.qaly ? 1 : 2,
      why: (b, a) => `They fall from ${nf(b.qaly, 0)} to ${nf(a.qaly, 0)}, by ${pct(1 - a.qaly / b.qaly, 0)}, for about the same spending (${M.b16_m(a.spend)}). Funding whatever comes first spends money on poor-value technologies and runs out before cheap, effective ones: this is the waste that centralized HTA was set up to avoid.` },
    { q: 'More patients take out private cover: π rises from 0.15 to 0.30. The QALYs produced by the public budget…', change: { pi: 0.3 }, options: ['rise', 'fall', 'do not change'],
      judge: (b, a) => a.qaly > b.qaly + 0.5 ? 0 : a.qaly < b.qaly - 0.5 ? 1 : 2,
      why: (b, a) => `They stay at ${nf(a.qaly, 0)}; private top-ups add ${nf(a.privQ, 0)} QALYs instead of ${nf(b.privQ, 0)}, all for patients who can pay. Top-ups leave the public package unchanged, so the gain goes entirely to the better-off, the equity concern BHT raises about care bought outside the NHS.` }
  ]
});
