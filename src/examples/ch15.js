// ===== BHT Chapter 15: The health policy conundrum =====
// solvers for this chapter: M.b15_<name>

M.b15_nf = (x, d) => nf(x, d).replace(/^-/, '−');
M.b15_usd = x => isFinite(x) ? (x < -0.5 ? '−' : '') + '$' + nf(Math.abs(x), 0) : 'n/a';

// Section 15.4, Figure 15.3: how full should a public plan be when insurance causes moral hazard?
// Illness with probability pi; a sick person needs care costing L. With fullness f (the plan pays a share f,
// the patient a coinsurance 1 − f), the marginal value of extra care is 1 − x/(kL), so the sick buy x = kLf of
// extra care and spend m = L(1 + kf). The premium is actuarially fair. As in the usual welfare calculation of
// cost-sharing, the cost of a plan beyond the expected cost of necessary care is the moral-hazard triangle plus
// the risk premium (absolute risk aversion r, mean-variance) on out-of-pocket spending (1 − f) m:
//   DWL = pi k L f^2 / 2,  RP = (r/2) pi (1 − pi) [(1 − f) L (1 + k f)]^2.
M.b15_mh = function ({ f, k, pi, rk, L = 10000 }) {
  const r = rk / 1000;                                         // slider is per $1,000
  const dwl = g => pi * k * L * g * g / 2;                     // value lost on care worth less than it costs
  const oop = g => (1 - g) * L * (1 + k * g);                 // out-of-pocket spending of a sick person
  const rp = g => r / 2 * pi * (1 - pi) * oop(g) * oop(g);     // cost of bearing the out-of-pocket risk
  const cost = g => dwl(g) + rp(g);
  const prem = g => pi * g * L * (1 + k * g);                  // fair premium (or tax) per person
  const ppu = g => pi * L * (1 + k * g);                       // premium per unit of coverage, prem / g
  const fs = M.argmaxGrid(g => -cost(g), 0, 1, 400).x;
  const at = g => ({ f: g, m: L * (1 + k * g), prem: prem(g), dwl: dwl(g), rp: rp(g), cost: cost(g) });
  return { L, k, pi, r, dwl, rp, cost, prem, ppu, fs, plan: at(f), beta: at(fs), alpha: at(1), none: at(0), gain: cost(f) - cost(fs) };
};

EX.push({
  id: 'b15-moralhazard', ch: 15, title: 'How full should public insurance be?',
  ref: 'BHT Section 15.4, Figure 15.3',
  anchors: [],
  intro: 'A government insures everyone against an illness that strikes with probability π and needs care costing L. With fullness f the plan pays the share f of every bill and the patient the rest; the more the plan pays, the more extra care of low value the sick consume (moral hazard, strength k). Citizens are risk-averse and the plan is financed by a fair premium or tax. All values are illustrative, since BHT draws Figure 15.3 without numbers: the plan starts at α, full insurance.',
  eq: String.raw`m(f)=L(1+kf),\quad \text{Premium}=\pi f L(1+kf),\quad \text{Cost}(f)=\underbrace{\tfrac12\pi kLf^2}_{\text{moral hazard}}+\underbrace{\tfrac r2\pi(1-\pi)\big[(1-f)L(1+kf)\big]^2}_{\text{out-of-pocket risk}}`,
  params: [
    { id: 'f', label: 'Fullness of the public plan f (share of bills paid)', min: 0, max: 1, step: 0.01, book: 1, d: 2 },
    { id: 'k', label: 'Moral hazard k (extra care at full insurance, share of L)', min: 0, max: 1.5, step: 0.05, book: 0.5, d: 2 },
    { id: 'pi', label: 'Probability of illness π', min: 0.02, max: 0.9, step: 0.01, book: 0.2, d: 2 },
    { id: 'rk', label: 'Risk aversion r (per $1,000)', min: 0, max: 1, step: 0.01, book: 0.2, d: 2 }
  ],
  presets: [{ label: 'No moral hazard (k = 0)', values: { k: 0 } }, { label: 'Plan near β (f = 0.86)', values: { f: 0.86 } }],
  compute: S => M.b15_mh(S),
  outputs: (S, R, B) => [
    { label: 'Spending per sick person', v: M.b15_usd(R.plan.m), b: M.b15_usd(B.plan.m) },
    { label: 'Premium or tax per person', v: M.b15_usd(R.plan.prem), b: M.b15_usd(B.plan.prem) },
    { label: 'Loss from low-value care', v: M.b15_usd(R.plan.dwl), b: M.b15_usd(B.plan.dwl) },
    { label: 'Cost of the out-of-pocket risk', v: M.b15_usd(R.plan.rp), b: M.b15_usd(B.plan.rp) },
    { label: 'Best fullness f* (point β)', v: nf(R.fs, 2), b: nf(B.fs, 2), key: true },
    { label: 'Premium at β', v: M.b15_usd(R.beta.prem), b: M.b15_usd(B.beta.prem) },
    { label: 'Welfare gain from moving the plan to β, per person', v: M.b15_usd(R.gain), b: M.b15_usd(B.gain), key: true }
  ],
  verdict: (S, R) => R.gain < 1
    ? { tone: 'ok', text: `The plan is at its best fullness: paying ${pct(R.fs, 0)} of each bill balances the loss from low-value care against the cost of the risk left to patients.` }
    : S.f > R.fs ? { tone: 'warn', text: `The plan is too generous: cutting fullness from ${nf(S.f, 2)} to ${nf(R.fs, 2)} lowers the premium from ${M.b15_usd(R.plan.prem)} to ${M.b15_usd(R.beta.prem)} and is worth ${M.b15_usd(R.gain)} per person, after counting the extra risk.` }
    : { tone: 'warn', text: `The plan is too thin: raising fullness from ${nf(S.f, 2)} to ${nf(R.fs, 2)} removes risk worth more than the extra low-value care it induces, a gain of ${M.b15_usd(R.gain)} per person.` },
  chart(el, S, R, B) {
    const top = Math.max(200, R.cost(0), R.cost(1), B.cost(0), B.cost(1)) * 1.12;
    const P = Plot(el, { x0: 0, x1: 1, y0: 0, y1: top, xlabel: 'Fullness of the plan f', ylabel: 'Cost per person ($)', aria: 'Moral hazard and the fullness of public insurance' });
    P.fn(B.cost, 'ghost');
    P.fn(R.dwl, 's-sec');
    P.fn(R.rp, 's-gray');
    P.fn(R.cost, 's-pri thick');
    P.text(0.02, Math.min(R.rp(0.02), top * 0.93) + top * 0.03, 'out-of-pocket risk', 'muted');
    P.text(0.7, Math.min(R.dwl(0.7), top * 0.9) + top * 0.04, 'moral hazard', 's-sec', 'end');
    P.vline(S.f, 's-ink dot'); P.text(S.f - 0.01, top * 0.95, 'plan', 'muted', 'end');
    P.pt(1, R.cost(1), 'p-sec', 'α', -10, -8, 'end');
    P.pt(R.fs, R.cost(R.fs), 'p-grn', 'β', 0, 20, 'middle');
    if (Math.abs(S.f - 1) > 1e-9 && Math.abs(S.f - R.fs) > 0.01) P.pt(S.f, R.cost(S.f), 'p-pri small');
    P.draw();
  },
  notice: 'Moving away from full insurance (α) first costs almost nothing in extra risk, because the gray risk curve is flat near full coverage, while the red moral-hazard loss falls quickly. That is why the best plan (β) leaves some cost to patients whenever k > 0, and why it is full only when moral hazard is absent.',
  challenges: [
    { q: 'Suppose demand for care does not respond to its price at all (k = 0). The best fullness becomes…', change: { k: 0 }, options: ['1, full insurance', 'about 0.8', 'about 0.5'], judge: (b, a) => a.fs > 0.99 ? 0 : a.fs > 0.65 ? 1 : 2,
      why: (b, a) => `It moves from ${nf(b.fs, 2)} to ${nf(a.fs, 2)}. Without moral hazard, coverage costs only its fair premium and removes risk, so a risk-averse population wants the full contract α; cost-sharing is useful only to curb low-value care.` },
    { q: 'The illness becomes more common: raise π from 0.2 to 0.5, other values as at baseline. The best fullness…', change: { pi: 0.5 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.fs > b.fs + 1e-4 ? 0 : a.fs < b.fs - 1e-4 ? 1 : 2,
      why: (b, a) => `It falls from ${nf(b.fs, 2)} to ${nf(a.fs, 2)}. The moral-hazard loss grows in proportion to π, but the risk to insure grows only with π(1 − π): a common illness is more a predictable expense than a risk, so it pays to insure less of it.` },
    { q: 'Citizens become much more risk-averse: raise r from 0.2 to 0.8 per $1,000. The welfare gain from moving the full plan α to the best plan β…', change: { rk: 0.8 }, options: ['rises', 'falls'], judge: (b, a) => a.gain > b.gain ? 0 : 1,
      why: (b, a) => `It falls from ${M.b15_usd(b.gain)} to ${M.b15_usd(a.gain)} per person, and β moves up from ${nf(b.fs, 2)} to ${nf(a.fs, 2)}. When risk is costly, the coinsurance needed to curb moral hazard takes away more of the protection people value, so full public coverage is a smaller mistake.` },
    { q: 'Move the plan from α to a 10% coinsurance (f = 0.9). The premium per person falls by about…', change: { f: 0.9 }, options: ['10%, since the plan pays 10% less of each bill', '13%', '25%'], judge: (b, a) => { const d = 1 - a.plan.prem / b.plan.prem; return d < 0.115 ? 0 : d < 0.19 ? 1 : 2; },
      why: (b, a) => `It falls from ${M.b15_usd(b.plan.prem)} to ${M.b15_usd(a.plan.prem)}, by ${pct(1 - a.plan.prem / b.plan.prem, 0)}. The plan pays a smaller share of a smaller bill: with a copay the sick spend ${M.b15_usd(a.plan.m)} instead of ${M.b15_usd(b.plan.m)}, so the premium per unit of coverage falls too, as along the curve of BHT Figure 15.3.` }
  ]
});

// Section 15.4 (gatekeeping and queuing) and Section 15.5: rationing a fixed capacity by copays or by waiting.
// Two equal groups (per 1,000 residents, 500 each) demand an elective procedure; group i's demand per 1,000
// residents is q_i = 10 (1 − e_i / a_i), where e_i = p + v_i w is the copay plus the money value of waiting w months.
// The budget buys K procedures per 1,000 residents; the queue grows until demand equals K.
M.b15_queue = function ({ p, K, vP, vR, aP = 8000, aR = 16000, n = 10 }) {
  const q = (a, e) => n * Math.max(0, 1 - e / a);
  const D = w => q(aP, p + vP * w) + q(aR, p + vR * w);
  let w = 0;
  if (D(0) > K + 1e-12) w = M.bisect(x => D(x) - K, 0, 1e4);
  const eP = p + vP * w, eR = p + vR * w, qP = q(aP, eP), qR = q(aR, eR), tot = qP + qR;
  const ben = (a, x) => a * x - a * x * x / (2 * n);              // area under the inverse demand a (1 − x / n)
  const wait = (vP * qP + vR * qR) * w, rev = p * tot;
  const csP = ben(aP, qP) - eP * qP, csR = ben(aR, qR) - eR * qR;
  return { p, K, vP, vR, aP, aR, n, w, eP, eR, qP, qR, tot, idle: K - tot, sharePoor: tot > 0 ? qP / tot : NaN,
    wait, rev, value: ben(aP, qP) + ben(aR, qR) - wait, csP, csR };
};

EX.push({
  id: 'b15-queue', ch: 15, title: 'Rationing care by price or by queue', ghost: 'Dashed gray: baseline effective prices',
  ref: 'BHT Sections 15.4 and 15.5',
  anchors: [],
  intro: 'A tax-funded system can afford K elective procedures per 1,000 residents. Half of the residents are poorer: they would pay at most $8,000 for the procedure and value a month of waiting at $400; the richer half would pay up to $16,000 and value a month at $1,200. Demand that exceeds capacity at the copay p is rationed by a queue, which grows until it deters enough patients. All values are illustrative; at baseline care is free at the point of service, as in the UK and Canada.',
  eq: String.raw`e_i=p+v_i\,w,\qquad q_i=10\Big(1-\frac{e_i}{a_i}\Big),\qquad q_{\text{poor}}+q_{\text{rich}}=K\ \text{(if } w>0)`,
  params: [
    { id: 'p', label: 'Copay p ($ per procedure)', min: 0, max: 8000, step: 100, book: 0, d: 0 },
    { id: 'K', label: 'Capacity K (procedures per 1,000 residents)', min: 4, max: 20, step: 0.5, book: 12.5, d: 1 },
    { id: 'vP', label: 'Value of a month of waiting, poorer ($)', min: 50, max: 2000, step: 50, book: 400, d: 0 },
    { id: 'vR', label: 'Value of a month of waiting, richer ($)', min: 50, max: 3000, step: 50, book: 1200, d: 0 }
  ],
  presets: [{ label: 'Ration by price only (p = $4,000)', values: { p: 4000 } }, { label: 'Larger budget (K = 16)', values: { K: 16 } }],
  compute: S => M.b15_queue(S),
  outputs: (S, R, B) => [
    { label: 'Waiting time (months)', v: nf(R.w, 1), b: nf(B.w, 1), key: true },
    { label: 'Procedures per 1,000: poorer / richer', v: `${nf(R.qP, 1)} / ${nf(R.qR, 1)}`, b: `${nf(B.qP, 1)} / ${nf(B.qR, 1)}` },
    { label: 'Poorer half’s share of procedures', v: pct(R.sharePoor, 1), b: pct(B.sharePoor, 1), key: true },
    { label: 'Unused capacity per 1,000', v: nf(Math.max(R.idle, 0), 1), b: nf(Math.max(B.idle, 0), 1) },
    { label: 'Copay revenue per 1,000 residents', v: M.b15_usd(R.rev), b: M.b15_usd(B.rev) },
    { label: 'Time lost in queues per 1,000 residents', v: M.b15_usd(R.wait), b: M.b15_usd(B.wait) },
    { label: 'Net value of care per 1,000 (value minus waiting)', v: M.b15_usd(R.value), b: M.b15_usd(B.value) }
  ],
  verdict: (S, R) => R.idle > 1e-6
    ? { tone: 'bad', text: `At a copay of ${M.b15_usd(S.p)} only ${nf(R.tot, 1)} of the ${nf(S.K, 1)} procedures per 1,000 are wanted: the price leaves capacity idle.` }
    : R.w < 0.05 ? { tone: 'neutral', text: `Price alone clears the market: no queue, ${M.b15_usd(R.rev)} of copays per 1,000 residents, and the poorer half gets only ${pct(R.sharePoor, 0)} of the procedures.` }
    : { tone: 'warn', text: `A ${nf(R.w, 1)}-month queue clears the market: the poorer half gets ${pct(R.sharePoor, 0)} of the procedures, but waiting burns ${M.b15_usd(R.wait)} of time per 1,000 residents that no one collects.` },
  chart(el, S, R, B) {
    const k = 1000;
    const P = Plot(el, { x0: 0, x1: 10, y0: 0, y1: 17, xlabel: 'Procedures per 1,000 residents, within each group', ylabel: 'Copay + value of waiting ($ thousand)', aria: 'Rationing by price or by queue' });
    [[R.qP, R.eP], [R.qR, R.eR]].forEach(([qq, e]) => { if (qq > 1e-9 && e > S.p + 1e-6) P.area([[0, S.p / k], [qq, S.p / k], [qq, e / k], [0, e / k]], 'f-sec'); });
    P.seg(0, B.eP / k, B.qP, B.eP / k, 'ghost'); P.seg(0, B.eR / k, B.qR, B.eR / k, 'ghost');
    P.fn(x => R.aP * (1 - x / R.n) / k, 's-sec thick');
    P.fn(x => R.aR * (1 - x / R.n) / k, 's-pri thick');
    P.text(0.15, R.aP / k + 0.4, 'poorer demand', 's-sec');
    P.text(0.15, R.aR / k - 0.9, 'richer demand', 's-pri');
    if (S.p > 0) P.hline(S.p / k, 's-gray dash', 'copay', 'end');
    P.pt(R.qP, R.eP / k, 'p-sec', 'poorer', 8, -8);
    P.pt(R.qR, R.eR / k, 'p-pri', 'richer', 8, -8);
    P.draw();
  },
  notice: 'The red rectangles are the time patients spend waiting: a cost paid in a currency no one receives. Because the richer half values its time more, the same queue is a higher price for them, so a queue shifts care toward the poorer half, while a copay shifts it toward those willing to pay more money.',
  challenges: [
    { q: 'The budget grows from 12.5 to 16 procedures per 1,000 residents, still with no copay. The poorer half’s share of procedures…', change: { K: 16 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.sharePoor > b.sharePoor + 1e-6 ? 0 : a.sharePoor < b.sharePoor - 1e-6 ? 1 : 2,
      why: (b, a) => `It falls from ${pct(b.sharePoor, 1)} to ${pct(a.sharePoor, 1)}, although the poorer half gets more procedures (${nf(b.qP, 1)} to ${nf(a.qP, 1)}). The queue shrinks from ${nf(b.w, 1)} to ${nf(a.w, 1)} months, and a shorter queue deters the richer patients, who value time more, less than before.` },
    { q: 'With capacity at 12.5, the government introduces a copay of $1,000. What happens to the queue?', change: { p: 1000 }, options: ['it shortens by less than two months', 'it disappears', 'it gets longer'], judge: (b, a) => a.w < 0.05 ? 1 : a.w > b.w ? 2 : 0,
      why: (b, a) => `It shortens from ${nf(b.w, 1)} to ${nf(a.w, 1)} months, and the time lost falls from ${M.b15_usd(b.wait)} to ${M.b15_usd(a.wait)} per 1,000 residents while the copay raises ${M.b15_usd(a.rev)}. With capacity fixed, the copay replaces part of the queue as the rationing device rather than adding to it.` },
    { q: 'Ration by price only: set the copay at $4,000 with capacity at 12.5. Compared with free care and a queue, the net value of care (value minus time lost)…', change: { p: 4000 }, options: ['rises', 'falls'], judge: (b, a) => a.value > b.value ? 0 : 1,
      why: (b, a) => `It rises from ${M.b15_usd(b.value)} to ${M.b15_usd(a.value)} per 1,000 residents, because no time is burned, but the poorer half’s share drops from ${pct(b.sharePoor, 0)} to ${pct(a.sharePoor, 0)}. The money-based measure favors price rationing; the equity cost is what a queue-based system buys with the time it wastes.` }
  ]
});

// Section 15.6, Figures 15.5-15.7: average health and spending of a country made of two groups on a concave
// health production frontier H(s) = 21 + b ln(s/3) − δ (s in $ thousand per person; health = life expectancy at 65).
// The reference frontier (δ = 0) is shared with other countries; δ > 0 is a lifestyle penalty (Figure 15.6).
M.b15_hpf = function ({ sA, sB, th, b, del }) {
  const H1 = s => 21 + b * Math.log(s / 3);                   // reference frontier HPF1
  const H = s => H1(s) - del;                                 // the country's own frontier
  const sbar = th * sA + (1 - th) * sB, Hbar = th * H(sA) + (1 - th) * H(sB);
  const gm = Math.exp(th * Math.log(sA) + (1 - th) * Math.log(sB));     // spending at which the own frontier gives Hbar
  const sEq1 = gm * Math.exp(-del / b);                                 // same, on the reference frontier
  return { sA, sB, th, b, del, H1, H, sbar, Hbar, gm, sEq1, gapOwn: H(sbar) - Hbar, gapRef: H1(sbar) - Hbar,
    wasteOwn: sbar - gm, wasteRef: sbar - sEq1, HA: H(sA), HB: H(sB) };
};

EX.push({
  id: 'b15-hpf', ch: 15, title: 'Why a country can look inefficient', ghost: 'Dashed gray: the baseline country’s average point',
  ref: 'BHT Section 15.6, Figures 15.5, 15.6 and 15.7',
  anchors: [],
  intro: 'A country has a poorer group A (share θ) and a richer group B, each on the health production frontier H(s) = 21 + b ln(s/3) − δ, where s is spending per person in $ thousand and health is life expectancy at 65. The analyst sees only the country’s averages (point C) and compares them with the reference frontier shared with other countries (δ = 0). All values are illustrative, chosen to fall in the range of BHT Figure 15.4; δ is a lifestyle penalty that puts the country on a lower frontier, as in Figure 15.6.',
  eq: String.raw`\bar s=\theta s_A+(1-\theta)s_B,\qquad \bar H=\theta H(s_A)+(1-\theta)H(s_B)<H(\bar s),\qquad H^{-1}(\bar H)=s_A^{\theta}s_B^{1-\theta}\ (\delta=0)`,
  params: [
    { id: 'sA', label: 'Spending of group A, s_A ($ thousand)', min: 0.5, max: 14, step: 0.5, book: 3, d: 1 },
    { id: 'sB', label: 'Spending of group B, s_B ($ thousand)', min: 0.5, max: 14, step: 0.5, book: 9, d: 1 },
    { id: 'th', label: 'Share of group A, θ', min: 0, max: 1, step: 0.05, book: 0.5, d: 2 },
    { id: 'b', label: 'Curvature of the frontier b (years per log point)', min: 0.5, max: 5, step: 0.1, book: 2.5, d: 1 },
    { id: 'del', label: 'Lifestyle penalty δ (years)', min: 0, max: 3, step: 0.1, book: 0, d: 1 }
  ],
  presets: [{ label: 'Wide spread and a lifestyle penalty', values: { sA: 4, sB: 12, del: 1 } }, { label: 'Equal spending', values: { sA: 6, sB: 6 } }],
  compute: S => M.b15_hpf(S),
  outputs: (S, R, B) => [
    { label: 'Average spending s̄ ($ thousand)', v: nf(R.sbar, 2), b: nf(B.sbar, 2) },
    { label: 'Average health H̄ (years at 65)', v: nf(R.Hbar, 2), b: nf(B.Hbar, 2) },
    { label: 'Reference frontier at s̄', v: nf(R.H1(R.sbar), 2), b: nf(B.H1(B.sbar), 2) },
    { label: 'Measured health shortfall (years)', v: nf(R.gapRef, 2), b: nf(B.gapRef, 2), key: true },
    { label: '… of which from heterogeneity', v: nf(R.gapOwn, 2), b: nf(B.gapOwn, 2) },
    { label: '… of which from the lower frontier δ', v: nf(S.del, 2), b: nf(B.del, 2) },
    { label: 'Apparent waste: s̄ minus the spending that gives H̄ on the reference frontier ($)', v: M.b15_usd(1000 * R.wasteRef), b: M.b15_usd(1000 * B.wasteRef), key: true }
  ],
  verdict: (S, R) => R.gapRef < 1e-6
    ? { tone: 'ok', text: 'Point C lies on the reference frontier: with equal spending and no lifestyle penalty the averages show no inefficiency.' }
    : { tone: 'warn', text: `C lies ${nf(R.gapRef, 2)} years below the reference frontier, so the country seems to waste ${M.b15_usd(1000 * R.wasteRef)} per person, although both groups are on their own frontier${S.del > 0 ? ` and ${nf(S.del, 1)} of those years reflect lifestyle, not health care` : ''}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 0, x1: 15, y0: 14, y1: 27, xlabel: 'Health spending per person ($ thousand)', ylabel: 'Life expectancy at 65 (years)', aria: 'Health production frontier with two groups' });
    if (S.del > 0) P.fn(R.H1, 's-gray', 0.3, 15);
    P.fn(R.H, 's-pri thick', 0.3, 15);
    P.text(14.8, R.H1(14.8) + 0.4, S.del > 0 ? 'HPF₁' : 'HPF', 'muted', 'end');
    if (S.del > 0) P.text(14.8, R.H(14.8) - 0.9, 'HPF₂', 's-pri', 'end');
    P.pt(B.sbar, B.Hbar, 'p-gray small');
    P.seg(R.sA, R.HA, R.sB, R.HB, 's-ink dash');
    if (R.wasteRef > 1e-3) P.seg(R.sEq1, R.Hbar, R.sbar, R.Hbar, 's-sec thick');
    P.pt(R.sA, R.HA, 'p-pri', 'A', -8, -8, 'end');
    P.pt(R.sB, R.HB, 'p-pri', 'B', 8, 16);
    P.pt(R.sbar, R.H1(R.sbar), 'p-hollow');
    P.pt(R.sbar, R.Hbar, 'p-sec', 'C', 8, 16);
    P.draw();
  },
  notice: 'C sits on the chord between A and B, so it lies below the concave frontier even though A and B are on it. The red segment is the apparent waste: the extra spending C seems to need, compared with a country of equal groups that reaches the same average health on the reference frontier.',
  challenges: [
    { q: 'Make the frontier twice as curved: raise b from 2.5 to 5. The apparent waste in dollars…', change: { b: 5 }, options: ['doubles', 'roughly halves', 'does not change'], judge: (b, a) => Math.abs(a.wasteRef - b.wasteRef) < 1e-6 ? 2 : a.wasteRef > b.wasteRef ? 0 : 1,
      why: (b, a) => `It stays at ${M.b15_usd(1000 * a.wasteRef)}, while the health shortfall doubles from ${nf(b.gapRef, 2)} to ${nf(a.gapRef, 2)} years. With a log frontier the spending that gives the average health is the geometric mean of s_A and s_B, whatever b; a steeper frontier converts the same dollars into more years.` },
    { q: 'Shift spending from B to A, from 3 and 9 to 5 and 7, so average spending stays at 6. Average health H̄…', change: { sA: 5, sB: 7 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.Hbar > b.Hbar + 1e-6 ? 0 : a.Hbar < b.Hbar - 1e-6 ? 1 : 2,
      why: (b, a) => `It rises from ${nf(b.Hbar, 2)} to ${nf(a.Hbar, 2)} years, and the apparent waste falls from ${M.b15_usd(1000 * b.wasteRef)} to ${M.b15_usd(1000 * a.wasteRef)}. On a concave frontier a dollar adds more health where spending is low, so the same budget shared more equally produces more average health and moves C toward the frontier.` },
    { q: 'Add a lifestyle penalty of δ = 1 year with the baseline spending. By how much does the apparent waste per person rise?', change: { del: 1 }, options: ['by less than $1,000', 'by about $1,000', 'by more than $1,500'], judge: (b, a) => { const d = 1000 * (a.wasteRef - b.wasteRef); return d < 900 ? 0 : d <= 1500 ? 1 : 2; },
      why: (b, a) => `It rises from ${M.b15_usd(1000 * b.wasteRef)} to ${M.b15_usd(1000 * a.wasteRef)}. On the reference frontier the average health H̄ would cost only ${M.b15_usd(1000 * a.sEq1)} instead of ${M.b15_usd(1000 * b.sEq1)} per person (the geometric mean divided by exp(δ/b) ≈ 1.49), so a country that is efficient on its own lower frontier looks as if it wasted ${pct(a.wasteRef / a.sbar, 0)} of its spending.` }
  ]
});
