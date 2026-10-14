// ===== BHT Chapter 1: Why health economics? =====
// solvers for this chapter: M.b01_<name>

M.b01_usd = x => isFinite(x) ? (x < 0 ? '−$' : '$') + nf(Math.abs(x), 0) : 'n/a';
M.b01_tr = x => isFinite(x) ? '$' + nf(x, 2) + ' trillion' : 'n/a';
M.b01_year = y => !isFinite(y) ? 'never' : y < 1960 ? 'before 1960' : nf(Math.round(y), 0).replace(/,/g, '');

// Sections 1.1 and 1.3: health spending H grows at g_Y + delta, GDP Y at g_Y (continuous rates),
// so the health share s(t) = H/Y = s0 exp(delta (t − 1960)), starting at s0 = 5% (one dollar in twenty) in 1960.
// GDP is $14 trillion in 2008; the government pays a share theta of health spending.
// Spending on everything else, Y(1 − s), stops growing when s reaches g_Y / (g_Y + delta).
M.b01_share = function ({ d, gY, theta, T }) {
  const s0 = 0.05, dl = d / 100, g = gY / 100, Y08 = 14;
  const s = t => s0 * Math.exp(dl * (t - 1960));
  const Y = t => Y08 * Math.exp(g * (t - 2008));
  const s08 = s(2008), sT = s(T);
  const sPeak = dl > 0 ? g / (g + dl) : 1;
  const peak = dl > 0 ? 1960 + Math.log(sPeak / s0) / dl : Infinity;
  const full = dl > 0 ? 1960 + Math.log(1 / s0) / dl : Infinity;
  const other = t => Y(t) * (1 - Math.min(s(t), 1));
  return { d, gY, theta, T, s, Y, s08, sT, H08: s08 * Y08, G08: theta * s08 * Y08, pub08: theta * s08, pubT: theta * Math.min(sT, 1),
    YT: Y(T), HT: Math.min(sT, 1) * Y(T), other08: other(2008), otherT: other(T), sPeak, peak, full, dbl: dl > 0 ? Math.log(2) / dl : Infinity };
};

EX.push({
  id: 'b01-share', ch: 1, title: 'The rising health share of GDP',
  ref: 'BHT Sections 1.1 and 1.3, Figure 1.1',
  anchors: [[1, 'just about $14 trillion'], [1, 'In 1960, barely one out of every twenty dollars'], [1, 'one out of every two of those dollars was spent by the government']],
  intro: 'If health spending grows faster than GDP by δ percentage points a year, the health share of GDP grows exponentially. The model starts from BHT’s 1960 share of one dollar in twenty, and the baseline δ = 2.51% is the rate that takes it to one dollar in six by 2008; GDP of $14 trillion in 2008 and a public share of one half are BHT’s numbers too. GDP growth g_Y = 3% and the projection year 2040 are illustrative. The projection is a mechanical extrapolation of the trend, not a forecast.',
  eq: String.raw`s(t)=\frac{H(t)}{Y(t)}=s_{1960}\,e^{\delta\,(t-1960)},\qquad \delta=g_H-g_Y,\qquad \frac{d}{dt}\big[Y(1-s)\big]=0\iff s=\frac{g_Y}{g_Y+\delta}`,
  params: [
    { id: 'd', label: 'Excess growth of health spending δ = g_H − g_Y (% a year)', min: 0, max: 5, step: 0.01, book: 2.51, d: 2 },
    { id: 'gY', label: 'GDP growth g_Y (% a year)', min: 0.5, max: 6, step: 0.1, book: 3, d: 1 },
    { id: 'theta', label: 'Public share of health spending θ', min: 0, max: 1, step: 0.05, book: 0.5, d: 2 },
    { id: 'T', label: 'Projection year T', min: 2010, max: 2100, step: 1, book: 2040, d: 0 }
  ],
  presets: [{ label: 'Health grows with GDP (δ = 0)', values: { d: 0 } }, { label: 'Mostly public, θ = 0.8', values: { theta: 0.8 } }],
  bookLabel: 'Baseline',
  compute: S => M.b01_share(S),
  outputs: (S, R, B) => [
    { label: 'Health share of GDP in 2008 (BHT: one dollar in six)', v: pct(R.s08, 1), b: pct(B.s08, 1), key: true },
    { label: 'Health spending in 2008: total, government', v: M.b01_tr(R.H08) + ', ' + M.b01_tr(R.G08), b: M.b01_tr(B.H08) + ', ' + M.b01_tr(B.G08) },
    { label: 'Public health spending, % of GDP: 2008, year T', v: pct(R.pub08, 1) + ', ' + pct(R.pubT, 1), b: pct(B.pub08, 1) + ', ' + pct(B.pubT, 1) },
    { label: 'Health share of GDP in year T', v: pct(Math.min(R.sT, 1), 1), b: pct(Math.min(B.sT, 1), 1), key: true },
    { label: 'Years for the share to double', v: isFinite(R.dbl) ? nf(R.dbl, 1) : 'never', b: nf(B.dbl, 1) },
    { label: 'Spending on everything else stops growing in', v: M.b01_year(R.peak), b: M.b01_year(B.peak) },
    { label: 'Year the trend would reach 100% of GDP', v: M.b01_year(R.full), b: M.b01_year(B.full) }
  ],
  verdict: (S, R) => S.d <= 0
    ? { tone: 'ok', text: 'With health spending growing as fast as GDP, the share stays at its 1960 level of 5% forever.' }
    : R.peak <= S.T
      ? { tone: 'bad', text: `By ${S.T} the health share is ${pct(Math.min(R.sT, 1), 0)}: spending on everything else has been shrinking since ${M.b01_year(R.peak)}, so the trend cannot go on.` }
      : { tone: 'warn', text: `By ${S.T} the health share is ${pct(R.sT, 0)} and public health spending alone is ${pct(R.pubT, 0)} of GDP; other spending still grows until ${M.b01_year(R.peak)}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 1960, x1: 2100, y0: 0, y1: 100, xlabel: 'Year', ylabel: 'Share of GDP (%)', xfmt: v => String(v), aria: 'Health share and public health share of GDP over time' });
    P.fn(t => 100 * Math.min(B.s(t), 1), 'ghost');
    if (isFinite(R.peak) && R.peak > 1960 && R.peak < 2100) P.rect(R.peak, 2100, 'f-sec');
    P.fn(t => 100 * Math.min(R.s(t), 1), 's-pri thick', 1960, 2100, 280);
    P.fn(t => 100 * S.theta * Math.min(R.s(t), 1), 's-sec dash', 1960, 2100, 280);
    P.vline(S.T, 's-ink dot', 'T');
    P.pt(1960, 5, 'p-ink', '1 in 20', 8, -8);
    P.pt(2008, 100 / 6, 'p-hollow', 'BHT 2008: 1 in 6', -10, -10, 'end');
    P.pt(2008, 100 * R.s08, 'p-pri small');
    P.pt(S.T, 100 * Math.min(R.sT, 1), 'p-pri', pct(Math.min(R.sT, 1), 0), 8, 16);
    P.pt(S.T, 100 * R.pubT, 'p-sec small', 'public', 8, 14);
    P.draw();
  },
  notice: 'The blue curve is the total health share, the dashed red one the part paid by government. An excess growth of 2.5 points a year looks modest but doubles the share every 28 years. In the red band, past the year when the share reaches g_Y/(g_Y + δ), each extra dollar of health spending comes out of a shrinking budget for everything else.',
  challenges: [
    { q: 'Raise GDP growth from 3% to 5% a year, keeping δ at 2.51%. The health share of GDP in 2040…', change: { gY: 5 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.sT > b.sT + 1e-9 ? 0 : a.sT < b.sT - 1e-9 ? 1 : 2, why: (b, a) => `It stays at ${pct(a.sT, 1)}, while GDP in 2040 rises from ${M.b01_tr(b.YT)} to ${M.b01_tr(a.YT)}. The share depends only on the gap between the two growth rates: faster growth makes the country richer but does not by itself slow the rise of the health share.` },
    { q: 'Halve the excess growth δ, from 2.51% to 1.25% a year. The health share in 2040 falls to…', change: { d: 1.25 }, options: ['about half of its baseline value', 'about a third of it', 'less than a fifth of it'], judge: (b, a) => { const r = a.sT / b.sT; return r > 0.42 ? 0 : r > 0.2 ? 1 : 2; }, why: (b, a) => `It falls from ${pct(b.sT, 1)} to ${pct(a.sT, 1)}, ${pct(a.sT / b.sT, 0)} of the baseline. The share grows exponentially, so halving the growth rate over 80 years divides the share by e^(0.0126 × 80) ≈ 2.7, more than 2.` },
    { q: 'Lower GDP growth from 3% to 1% a year, keeping δ at 2.51%. Spending on everything other than health stops growing…', change: { gY: 1 }, options: ['before 2040', 'between 2040 and 2060', 'after 2060'], judge: (b, a) => a.peak < 2040 ? 0 : a.peak <= 2060 ? 1 : 2, why: (b, a) => `In ${M.b01_year(a.peak)} instead of ${M.b01_year(b.peak)}, when the health share reaches ${pct(a.sPeak, 0)} rather than ${pct(b.sPeak, 0)}. With slow growth, each point of GDP taken by health care is no longer offset by a growing economy, so the crowding out of other spending starts much earlier.` }
  ]
});

// Section 1.2: illness costs L with probability p_L (a share 1 − lambda of people) or p_H (a share lambda).
// Uninsured, each person faces a large risk; in a pool of N independent members the cost per member
// has standard deviation L sqrt(pbar (1 − pbar) / N). If the insurer prices each customer at the risk
// the customer reports, a high-risk customer gains (p_H − p_L) L by posing as low-risk.
M.b01_pool = function ({ L, pL, pH, lam, N }) {
  N = Number(N); pH = Math.max(pH, pL);
  const pbar = lam * pH + (1 - lam) * pL, prem = pbar * L;
  const sd1 = L * Math.sqrt(pbar * (1 - pbar)), sdN = sd1 / Math.sqrt(N);
  return { L, pL, pH, lam, N, pbar, prem, cL: pL * L, cH: pH * L, sd1, sdN, cv1: sd1 / prem, cvN: sdN / prem,
    hide: (pH - pL) * L, subsidy: prem - pL * L, sd: n => sd1 / Math.sqrt(n) };
};

EX.push({
  id: 'b01-pool', ch: 1, title: 'Pooling health risk, and the incentive to hide it',
  ref: 'BHT Section 1.2',
  anchors: [],
  intro: 'An illness costing L strikes a low-risk person with probability p_L and a high-risk person with probability p_H; a share λ of people are high-risk. For one person the cost is very uncertain, but in a pool of N independent members the cost per member is close to its average. If the insurer cannot see who is high-risk, it charges everyone the pooled premium, and a high-risk customer who could be priced by what he reports gains by posing as low-risk. All values are illustrative; BHT’s chapter gives no numbers for this argument.',
  eq: String.raw`\bar p=\lambda p_H+(1-\lambda)p_L,\qquad \pi=\bar p\,L,\qquad \mathrm{SD}\Big(\tfrac{1}{N}\sum_{i=1}^{N} c_i\Big)=L\sqrt{\frac{\bar p(1-\bar p)}{N}},\qquad \text{gain from hiding}=(p_H-p_L)\,L`,
  params: [
    { id: 'L', label: 'Cost of the illness L ($)', min: 5000, max: 100000, step: 1000, book: 40000, d: 0 },
    { id: 'pL', label: 'Probability of illness, low risk p_L', min: 0.01, max: 0.5, step: 0.01, book: 0.05, d: 2 },
    { id: 'pH', label: 'Probability of illness, high risk p_H', min: 0.01, max: 0.9, step: 0.01, book: 0.2, d: 2 },
    { id: 'lam', label: 'Share of high-risk people λ', min: 0, max: 1, step: 0.05, book: 0.25, d: 2 }
  ],
  toggles: [{ id: 'N', label: 'Pool size N', options: [['1', '1'], ['10', '10'], ['100', '100'], ['1000', '1,000'], ['10000', '10,000']], book: '100' }],
  bookLabel: 'Baseline',
  compute: S => M.b01_pool(S),
  outputs: (S, R, B) => [
    { label: 'Expected cost: low risk, high risk', v: M.b01_usd(R.cL) + ', ' + M.b01_usd(R.cH), b: M.b01_usd(B.cL) + ', ' + M.b01_usd(B.cH) },
    { label: 'Pooled premium π (average expected cost)', v: M.b01_usd(R.prem), b: M.b01_usd(B.prem), key: true },
    { label: 'SD of cost: one person alone, per member of the pool', v: M.b01_usd(R.sd1) + ', ' + M.b01_usd(R.sdN), b: M.b01_usd(B.sd1) + ', ' + M.b01_usd(B.sdN), key: true },
    { label: 'SD as a share of π: one person, per member', v: pct(R.cv1, 0) + ', ' + pct(R.cvN, 0), b: pct(B.cv1, 0) + ', ' + pct(B.cvN, 0) },
    { label: 'High-risk customer’s gain from posing as low-risk', v: M.b01_usd(R.hide), b: M.b01_usd(B.hide) },
    { label: 'Low-risk customer pays above own expected cost', v: M.b01_usd(R.subsidy), b: M.b01_usd(B.subsidy) }
  ],
  verdict: (S, R) => R.N === 1
    ? { tone: 'bad', text: `Alone, a person faces a cost with mean ${M.b01_usd(R.prem)} but a standard deviation of ${M.b01_usd(R.sd1)}: there is nothing to pool.` }
    : R.cvN < 0.2
      ? { tone: 'ok', text: `In a pool of ${nf(R.N, 0)} the cost per member varies by about ${M.b01_usd(R.sdN)}, ${pct(R.cvN, 0)} of the premium, so the insurer can absorb individual risk; what it cannot see is who is high-risk, worth ${M.b01_usd(R.hide)} to those who hide it.` }
      : { tone: 'warn', text: `In a pool of ${nf(R.N, 0)} the cost per member still varies by ${M.b01_usd(R.sdN)}, ${pct(R.cvN, 0)} of the premium: the pool is too small to make average costs predictable.` },
  chart(el, S, R, B) {
    const y1 = Math.max(R.sd1, R.prem) * 1.12;
    const P = Plot(el, { x0: 0, x1: 4, y0: 0, y1, xlabel: 'Pool size N (log scale)', ylabel: 'Standard deviation of cost per member ($)', xticks: [0, 1, 2, 3, 4], xfmt: v => nf(Math.pow(10, v), 0), aria: 'Standard deviation of cost per member as the pool grows' });
    P.fn(x => B.sd(Math.pow(10, x)), 'ghost');
    P.fn(x => R.sd(Math.pow(10, x)), 's-pri thick');
    P.hline(R.prem, 's-sec dash', 'pooled premium π', 'end');
    P.pt(Math.log10(R.N), R.sdN, 'p-pri', M.b01_usd(R.sdN), 8, -10);
    P.draw();
  },
  notice: 'For one person the standard deviation of the cost is several times its mean: this is the uncertainty that makes risk-averse people demand insurance. Each tenfold increase in the pool divides the risk per member by √10 ≈ 3.2, so the insurer’s problem is not the risk itself but the hidden differences between customers.',
  challenges: [
    { q: 'Grow the pool from 100 to 10,000 members. The standard deviation of cost per member…', change: { N: '10000' }, options: ['falls by half', 'falls by 90 percent', 'falls by 99 percent'], judge: (b, a) => { const f = 1 - a.sdN / b.sdN; return f > 0.95 ? 2 : f > 0.7 ? 1 : 0; }, why: (b, a) => `It falls from ${M.b01_usd(b.sdN)} to ${M.b01_usd(a.sdN)}, by ${pct(1 - a.sdN / b.sdN, 0)}. Pooling divides the risk per member by the square root of the pool size, here √100 = 10, not by the pool size itself.` },
    { q: 'Double the share of high-risk people, from 0.25 to 0.5. What a high-risk customer gains by posing as low-risk…', change: { lam: 0.5 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.hide > b.hide + 0.5 ? 0 : a.hide < b.hide - 0.5 ? 1 : 2, why: (b, a) => `It stays at ${M.b01_usd(a.hide)}, the difference between the two risk-rated premiums, (p_H − p_L)L. The incentive to lie depends on how different the customers are, not on how many of them are high-risk.` },
    { q: 'With the same change, λ from 0.25 to 0.5, the amount a low-risk customer pays above her own expected cost under the pooled premium…', change: { lam: 0.5 }, options: ['doubles', 'rises, but less than double', 'does not change'], judge: (b, a) => Math.abs(a.subsidy / b.subsidy - 2) < 1e-6 ? 0 : a.subsidy > b.subsidy + 0.5 ? 1 : 2, why: (b, a) => `It rises from ${M.b01_usd(b.subsidy)} to ${M.b01_usd(a.subsidy)}. The overpayment is λ(p_H − p_L)L, linear in λ: the more high risks in the pool, the more low risks pay for them, and the stronger their reason to leave.` },
    { q: 'Double the cost of the illness, from $40,000 to $80,000. The standard deviation per member as a share of the premium…', change: { L: 80000 }, options: ['doubles', 'halves', 'does not change'], judge: (b, a) => a.cvN > b.cvN * 1.5 ? 0 : a.cvN < b.cvN * 0.75 ? 1 : 2, why: (b, a) => `It stays at ${pct(a.cvN, 0)}: both the premium (${M.b01_usd(a.prem)}) and the standard deviation (${M.b01_usd(a.sdN)}) double. Relative risk in the pool depends on the probabilities and the pool size, not on the size of the loss.` }
  ]
});
