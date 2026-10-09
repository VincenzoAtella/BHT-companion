// ===== BHT Chapter 8: Adverse selection: Akerlof's market for lemons =====
// solvers for this chapter: M.b08_<name>

M.b08_nf = (x, d) => nf(x, d).replace(/^-/, '−');
M.b08_nf1 = x => nf(x, Math.abs(x - Math.round(x)) < 1e-9 ? 0 : 1);   // integers without decimals
M.b08_usd = x => (x < 0 ? '−' : '') + '$' + nf(Math.abs(x), 0);

// Akerlof's car market: quality X uniform on [0, G], sellers value a car at X, buyers at h X.
// A law bans cars with X < B; an optional ceiling caps the price at Pc.
// At price P the cars on offer are those with B <= X <= min(P, G); buyers buy iff h E[X | offer] >= P.
M.b08_market = function ({ h, B = 0, G = 100, Pc = Infinity }) {
  const top = p => Math.min(Math.max(p, B), G);
  const E = p => (B + top(p)) / 2;                          // average quality on offer at price p
  const V = p => h * E(p);                                  // buyers' expected value of a car from the offer
  let pmax;                                                 // highest price at which buyers still buy
  if (h >= 2) pmax = h * (B + G) / 2;
  else { const r = h * B / (2 - h); pmax = r >= G ? h * (B + G) / 2 : r; }
  const pbest = Math.min(pmax, Pc);                         // highest price that also respects the ceiling
  const trade = pbest > B + 1e-9;
  const qtop = trade ? Math.min(pbest, G) : B;              // best car that changes hands at pbest
  const share = trade ? (qtop - B) / G : 0;                 // share of all cars traded at pbest
  const surplus = trade ? (qtop * qtop - B * B) / (G * G) : 0;   // gains from trade realized / full-information gains
  return { h, B, G, E, V, pmax, pbest, trade, qtop, share, surplus, avg: trade ? (B + qtop) / 2 : NaN };
};

M.b08_lemons = function ({ P, h }) {
  const mk = M.b08_market({ h });
  const q = Math.min(Math.max(P, 0), 100), share = q / 100, E = q / 2, val = h * E, gain = val - P;
  const buys = q > 0 && gain >= -1e-9;
  return { P, h, q, share, E, val, gain, buys, traded: buys ? share : 0, V: mk.V, pmax: mk.trade ? mk.pmax : 0, any: mk.trade };
};

// Death spiral: expected costs X uniform on [a, b]; a share mu must buy (chosen at random), the
// others buy iff X >= P. Each year the insurer sets the premium at last year's average cost.
M.b08_spiral = function ({ P0, mu, a, b = 20000, years = 8 }) {
  const m = (a + b) / 2;
  const s = P => P <= a ? 1 : P >= b ? 0 : (b - P) / (b - a);           // share of the others who buy
  const n = P => mu + (1 - mu) * s(P);                                  // share of everyone insured
  const AC = P => {
    if (P <= a) return m;
    const vol = (1 - mu) * s(P), num = mu * m + vol * (Math.min(P, b) + b) / 2, den = mu + vol;
    return den > 1e-12 ? num / den : b;                                 // with no one left, the limit is b
  };
  const path = [];
  let P = P0;
  for (let t = 1; t <= years; t++) { const c = AC(P); path.push({ t, P, n: n(P), AC: c, res: P - c }); P = c; }
  const Pstar = mu > 0 ? M.bisect(x => AC(x) - x, a, b) : b;
  return { a, b, mu, m, AC, n, path, Pstar, nstar: n(Pstar), Plast: P };
};

EX.push({
  id: 'b08-lemons', ch: 8, title: 'The market for lemons',
  ref: 'BHT Sections 8.2 and 8.4, Eqs. (8.1)–(8.11), Figure 8.3',
  anchors: [[8, '= 37.5 − 50'], [8, '= −12.5']],
  intro: 'Car quality X is uniform between 0 and 100. Sellers value a car at X and know it; buyers value it at h·X but see only the average quality of the cars on offer. Pick a candidate price P: sellers offer only cars worth at most P, and buyers compare h times the average quality on offer with P. The baseline P = 50 and h = 3/2 are BHT’s worked example; the preset h = 5/2 is BHT’s case of buyers who value cars very highly.',
  eq: String.raw`\text{offered: } X_i\le P,\qquad E[X\mid X\le P]=\tfrac{P}{2}\ (P\le100),\qquad E[\Delta U_B]=h\,E[X\mid X\le P]-P`,
  params: [
    { id: 'P', label: 'Candidate price P', min: 0, max: 160, step: 1, book: 50, d: 0 },
    { id: 'h', label: 'Buyers’ valuation ratio h (U_B uses h·X)', min: 1, max: 3, step: 0.05, book: 1.5, d: 2 }
  ],
  presets: [{ label: 'Buyers value cars highly (h = 5/2)', values: { h: 2.5 } }],
  compute: S => M.b08_lemons(S),
  outputs: (S, R, B) => [
    { label: 'Share of cars offered at P', v: pct(R.share, 0), b: pct(B.share, 0) },
    { label: 'Average quality on offer', v: nf(R.E, 1), b: nf(B.E, 1) },
    { label: 'Buyers’ expected value h·E[X]', v: nf(R.val, 1), b: nf(B.val, 1) },
    { label: 'Buyers’ expected gain from buying', v: M.b08_nf(R.gain, 1), b: M.b08_nf(B.gain, 1), key: true },
    { label: 'Share of cars sold at P', v: pct(R.traded, 0), b: pct(B.traded, 0) },
    { label: 'Prices at which some cars sell', v: R.any ? `0 – ${nf(R.pmax, 0)}` : 'none', b: B.any ? `0 – ${nf(B.pmax, 0)}` : 'none', key: true }
  ],
  verdict: (S, R) => R.buys
    ? { tone: R.share >= 0.999 ? 'ok' : 'warn', text: `At P = ${nf(S.P, 0)} buyers expect a gain of ${nf(R.gain, 1)}, so the ${pct(R.share, 0)} of cars worth at most ${nf(R.q, 0)} change hands.` }
    : { tone: 'bad', text: `At P = ${nf(S.P, 0)} buyers give up ${nf(S.P, 0)} for a car they value at ${nf(R.val, 1)} on average, so no car sells${R.any ? ', although lower prices would work.' : ', and no other price does better.'}` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 0, x1: 160, y0: 0, y1: 160, xlabel: 'Price P', ylabel: 'Value to buyers of a car on offer', aria: 'Market for lemons' });
    if (R.any) P.rect(0, Math.min(R.pmax, 160), 'f-band');
    P.fn(p => p, 's-gray dash');
    P.fn(B.V, 'ghost');
    P.fn(R.V, 's-pri thick');
    P.text(150, 158 - 12, 'price', 'muted', 'end');
    P.text(158, R.V(158) + (R.V(158) > 140 ? -10 : 6), 'h·E[X | X ≤ P]', 's-pri', 'end');
    P.vline(S.P, 's-ink dot');
    P.seg(S.P, Math.min(S.P, 160), S.P, R.val, R.buys ? 's-grn thick' : 's-sec thick');
    P.pt(S.P, S.P, 'p-sec', 'P = ' + nf(S.P, 0), 8, -8);
    P.pt(S.P, R.val, 'p-pri', 'value ' + nf(R.val, 1), 8, 16);
    P.draw();
  },
  notice: 'The blue line is what buyers expect a car on offer to be worth. Below P = 100 it rises at slope h/2, because every price increase brings better cars onto the market; trade needs that line on or above the price line, which happens only when h ≥ 2 (green band).',
  challenges: [
    { q: 'Keep P = 50 and raise h from 1.5 to 1.9, so buyers value cars 90% more than sellers. Is there now some price at which cars sell?', change: { h: 1.9 }, options: ['Yes', 'No'], judge: (b, a) => a.any ? 0 : 1,
      why: (b, a) => `No. At P = 50 the expected gain is still ${M.b08_nf(a.gain, 1)}, and for any P below 100 it is (h/2 − 1)·P < 0; at P = 100 buyers value the full lot at ${nf(a.V(100), 0)}. Withholding of good cars halves the average quality, so h must be at least 2.` },
    { q: 'With h = 1.5, cut the price from 50 to 20. The buyers’ expected gain…', change: { P: 20 }, options: ['turns positive', 'stays negative but shrinks', 'becomes more negative'], judge: (b, a) => a.gain >= 0 ? 0 : a.gain > b.gain ? 1 : 2,
      why: (b, a) => `It moves from ${M.b08_nf(b.gain, 1)} to ${M.b08_nf(a.gain, 1)}. A lower price is cheaper but also pushes the better cars out, so the gain is −P/4 at every price and no car sells.` },
    { q: 'Now buyers value cars at h = 5/2. Raise the price from 50 to 90. The buyers’ expected gain…', base: { h: 2.5 }, change: { h: 2.5, P: 90 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.gain > b.gain + 1e-6 ? 0 : a.gain < b.gain - 1e-6 ? 1 : 2,
      why: (b, a) => `It rises from ${nf(b.gain, 1)} to ${nf(a.gain, 1)}. Each extra dollar of price adds one dollar of cost but brings in cars worth h/2 = 1.25 more to buyers on average, so buyers gain P/4 and prefer a higher price up to P = 100.` }
  ]
});

EX.push({
  id: 'b08-spiral', ghost: 'Dashed gray: BHT’s case, costs uniform on $0–$20,000 and no mandate', ch: 8, title: 'The adverse selection death spiral',
  ref: 'BHT Section 8.3, Figures 8.4 and 8.5',
  anchors: [[8, 'expected loss of $5,000 per customer'], [8, 'average $17,500 in insurance claims'], [8, 'still loses $2,500 per customer']],
  intro: 'Expected yearly health costs X are uniform between a and $20,000. Customers are risk-neutral and buy full insurance only if the premium P is below their own X; the insurer cannot turn anyone away. Each year the insurer sets the premium at last year’s average cost per enrollee. The first-year premium of $10,000 and the range $0–$20,000 follow BHT’s example; the lowest cost a and the mandate share μ (a random share of people who must buy) are illustrative extensions.',
  eq: String.raw`P_{t+1}=AC(P_t),\qquad AC(P)=\frac{\mu\,\bar X+(1-\mu)\,s(P)\,\tfrac{P+20{,}000}{2}}{\mu+(1-\mu)\,s(P)},\quad s(P)=\Pr[X\ge P]`,
  params: [
    { id: 'P0', label: 'First-year premium P₁ ($)', min: 0, max: 20000, step: 500, book: 10000, d: 0 },
    { id: 'a', label: 'Lowest expected cost a ($)', min: 0, max: 15000, step: 500, book: 0, d: 0 },
    { id: 'mu', label: 'Mandate share μ (must buy)', min: 0, max: 1, step: 0.01, book: 0, d: 2 }
  ],
  compute: S => M.b08_spiral(S),
  outputs: (S, R, B) => {
    const res = x => Math.abs(x) < 0.5 ? '$0' : (x < 0 ? 'loss ' : 'profit ') + M.b08_usd(Math.abs(x));
    const y1 = R.path[0], y2 = R.path[1], b1 = B.path[0], b2 = B.path[1];
    return [
      { label: 'Year 1: share insured', v: pct(y1.n, 0), b: pct(b1.n, 0) },
      { label: 'Year 1: average cost per enrollee', v: M.b08_usd(y1.AC), b: M.b08_usd(b1.AC) },
      { label: 'Year 1: insurer’s result per enrollee', v: res(y1.res), b: res(b1.res), key: true },
      { label: 'Year 2: premium', v: M.b08_usd(y2.P), b: M.b08_usd(b2.P) },
      { label: 'Year 2: insurer’s result per enrollee', v: res(y2.res), b: res(b2.res) },
      { label: 'Year 8: premium', v: M.b08_usd(R.path[7].P), b: M.b08_usd(B.path[7].P) },
      { label: 'Long run: premium', v: M.b08_usd(R.Pstar), b: M.b08_usd(B.Pstar), key: true },
      { label: 'Long run: share insured', v: pct(R.nstar, 0), b: pct(B.nstar, 0) }
    ];
  },
  verdict: (S, R) => R.nstar < 1e-6
    ? { tone: 'bad', text: `Death spiral: the premium climbs toward ${M.b08_usd(R.b)} and the pool shrinks toward no one, because the enrollees always cost more than the premium.` }
    : R.nstar > 0.999 ? { tone: 'ok', text: `Everyone is insured at a premium of ${M.b08_usd(R.Pstar)}.` }
    : { tone: 'warn', text: `The spiral stops at a premium of ${M.b08_usd(R.Pstar)} with ${pct(R.nstar, 0)} of people insured, ${pct(R.mu, 0)} of them by mandate.` },
  chart(el, S, R, B) {
    const k = 1000;
    const P = Plot(el, { x0: 0, x1: 21, y0: 0, y1: 21, xlabel: 'Premium P ($ thousand)', ylabel: 'Average cost of enrollees ($ thousand)', aria: 'Adverse selection death spiral' });
    P.fn(x => x, 's-gray dash', 0, 21);
    P.fn(x => B.AC(x * k) / k, 'ghost', 0, 20, 200);
    P.fn(x => R.AC(x * k) / k, 's-pri thick', 0, 20, 300);
    const pts = [[R.path[0].P / k, 0]];
    R.path.forEach((y, i) => { pts.push([y.P / k, y.AC / k]); if (i < R.path.length - 1) pts.push([y.AC / k, y.AC / k]); });
    P.path(pts, 's-sec');
    R.path.slice(0, 3).forEach((y, i) => P.pt(y.P / k, y.AC / k, 'p-sec small', i === 0 ? 'year 1' : i === 1 ? 'year 2' : '', -8, -8, 'end'));
    P.pt(R.Pstar / k, R.Pstar / k, 'p-ink', 'long run', -10, -12, 'end');
    P.text(20.6, 20.9 - 1.2, 'P = AC', 'muted', 'end');
    P.draw();
  },
  notice: 'Each step of the red staircase is one year: the insurer raises the premium to last year’s average cost, the healthiest enrollees leave, and the average cost of those who stay rises again. With no mandate the blue line lies above the 45° line everywhere, so the staircase only stops at the sickest customer.',
  challenges: [
    { q: 'Suppose no one is very healthy: raise the lowest expected cost a from $0 to $10,000. In the long run, does the market still unravel?', change: { a: 10000 }, options: ['Yes, the premium still climbs toward $20,000', 'No, it settles with part of the pool insured'], judge: (b, a) => a.nstar < 1e-6 ? 0 : 1,
      why: (b, a) => `It still unravels: the long-run premium is ${M.b08_usd(a.Pstar)}. Whatever the premium, those who buy have costs between P and $20,000, averaging (P + 20,000)/2 > P. Unlike the car buyers with h = 3/2, the insurer values each customer at exactly his cost, so a better bottom of the pool gives no margin to absorb the selection.` },
    { q: 'A mandate requires a random quarter of the population to buy (μ = 0.25). The long-run premium is about…', change: { mu: 0.25 }, options: ['$20,000', '$15,000', '$13,300', '$10,000'], judge: (b, a) => a.Pstar > 19000 ? 0 : a.Pstar > 14000 ? 1 : a.Pstar > 11500 ? 2 : 3,
      why: (b, a) => `It is ${M.b08_usd(a.Pstar)}, that is 20,000/(1 + √μ). The mandated enrollees cost $10,000 on average and keep the pool from emptying, and at that premium a third of the others buy voluntarily, so ${pct(a.nstar, 0)} of people are insured.` },
    { q: 'Mandate only 4% of the population (μ = 0.04). In the long run, roughly what share of everyone is insured?', change: { mu: 0.04 }, options: ['about 4%', 'about 20%', 'about 50%'], judge: (b, a) => a.nstar < 0.1 ? 0 : a.nstar < 0.35 ? 1 : 2,
      why: (b, a) => `${pct(a.nstar, 0)}, five times the mandate. The premium settles at ${M.b08_usd(a.Pstar)}, and every non-mandated person with expected costs above it buys voluntarily; a small anchor of average risks stops the spiral well before the pool empties.` }
  ]
});

EX.push({
  id: 'b08-policy', ghost: 'Dashed gray: BHT’s case, floor 10 and h = 3/2', ch: 8, title: 'Quality floors and price ceilings',
  ref: 'BHT Section 8.4, Eqs. (8.12)–(8.14), Figure 8.6',
  anchors: [[8, 'For prices between $10 and $30'], [8, '30 ≥ P']],
  intro: 'The car market of Section 8.2 with two policies. A law bans cars of quality below a floor B, so at price P the cars on offer have quality between B and P; a price ceiling caps P. The floor B = 10 with h = 3/2 is BHT’s example; h = 5/2 is BHT’s case of eager buyers; the ceiling level is illustrative, since BHT discusses ceilings without numbers. Shares and surplus are measured against all cars, with full information as the benchmark in which every car is sold.',
  eq: String.raw`E[X\mid B\le X\le P]=\tfrac{B+P}{2},\qquad \text{buyers buy iff } h\,\tfrac{B+P}{2}\ge P\iff P\le\tfrac{hB}{2-h}\ (h<2)`,
  params: [
    { id: 'B', label: 'Minimum quality allowed B', min: 0, max: 90, step: 1, book: 10, d: 0 },
    { id: 'h', label: 'Buyers’ valuation ratio h', min: 1, max: 3, step: 0.05, book: 1.5, d: 2 },
    { id: 'Pc', label: 'Price ceiling', min: 5, max: 250, step: 1, book: 60, d: 0, show: S => S.ceil === 'on' }
  ],
  toggles: [{ id: 'ceil', label: 'Price ceiling', options: [['off', 'None'], ['on', 'Imposed']], book: 'off' }],
  presets: [{ label: 'Eager buyers (h = 5/2), no floor', values: { h: 2.5, B: 0 } }],
  compute: S => M.b08_market({ h: S.h, B: S.B, Pc: S.ceil === 'on' ? S.Pc : Infinity }),
  outputs: (S, R, B) => {
    const rng = r => r.trade ? `${M.b08_nf1(r.B)} – ${M.b08_nf1(r.pbest)}` : 'none';
    return [
      { label: 'Prices at which cars sell', v: rng(R), b: rng(B), key: true },
      { label: 'Best car sold at the highest such price', v: R.trade ? M.b08_nf1(R.qtop) : 'none', b: M.b08_nf1(B.qtop) },
      { label: 'Share of all cars sold at that price', v: pct(R.share, 0), b: pct(B.share, 0), key: true },
      { label: 'Gains from trade realized (full information = 100%)', v: pct(R.surplus, 0), b: pct(B.surplus, 0) }
    ];
  },
  verdict: (S, R) => !R.trade ? { tone: 'bad', text: 'No price clears the market: buyers always value the cars on offer below their price.' }
    : R.share >= (100 - S.B) / 100 - 1e-9 ? { tone: S.B > 0 ? 'warn' : 'ok', text: S.B > 0 ? `Every legal car can be sold, but the ban removes the ${pct(S.B / 100, 0)} of cars below ${nf(S.B, 0)}, whose sales would also have created value.` : 'Every car can be sold: the market works despite the hidden quality.' }
    : { tone: 'warn', text: `Cars sell only at prices up to ${M.b08_nf1(R.pbest)}; at best the ${pct(R.share, 0)} of cars with quality between ${nf(S.B, 0)} and ${M.b08_nf1(R.qtop)} change hands.` },
  chart(el, S, R, B) {
    const top = Math.max(110, R.h * (S.B + 100) / 2, S.ceil === 'on' ? S.Pc : 0) * 1.06;
    const P = Plot(el, { x0: 0, x1: top, y0: 0, y1: top, xlabel: 'Price P', ylabel: 'Value to buyers of a car on offer', aria: 'Quality floor and price ceiling' });
    if (R.trade) P.rect(S.B, R.pbest, 'f-band');
    P.fn(p => p, 's-gray dash');
    P.fn(B.V, 'ghost', 10, top);
    P.fn(R.V, 's-pri thick', S.B, top);
    P.text(top * 0.97, top * 0.9, 'price', 'muted', 'end');
    P.text(top * 0.97, R.V(top) + (R.V(top) > top * 0.85 ? -top * 0.06 : top * 0.03), 'h·E[X | B ≤ X ≤ P]', 's-pri', 'end');
    if (S.B > 0) P.vline(S.B, 's-ink dot', 'floor B');
    if (S.ceil === 'on') P.vline(S.Pc, 's-sec dash', 'ceiling');
    if (R.trade) P.pt(R.pbest, R.pbest, 'p-ink', 'highest price ' + M.b08_nf1(R.pbest), 8, 18);
    P.draw();
  },
  notice: 'The floor lifts the bottom of the pool, so the blue line starts above the price line at P = B and trade is possible up to the crossing (green band). A ceiling to the left of that crossing does not protect buyers: it only keeps the better cars off the market.',
  challenges: [
    { q: 'Raise the floor from 10 to 40. What share of all cars is sold at the highest price at which cars still sell?', change: { B: 40 }, options: ['30%', '60%', '90%'], judge: (b, a) => a.share < 0.45 ? 0 : a.share < 0.75 ? 1 : 2,
      why: (b, a) => `${pct(a.share, 0)}: every legal car. At P = 100 all cars from 40 to 100 are offered, their average quality is 70, and buyers value them at 1.5 × 70 = 105 ≥ 100; buyers would pay up to ${nf(a.pbest, 0)}.` },
    { q: 'Start from a floor of 40 and tighten it to 70. The gains from trade realized…', base: { B: 40 }, change: { B: 70 }, options: ['rise', 'fall', 'do not change'], judge: (b, a) => a.surplus > b.surplus + 1e-6 ? 0 : a.surplus < b.surplus - 1e-6 ? 1 : 2,
      why: (b, a) => `They fall from ${pct(b.surplus, 0)} to ${pct(a.surplus, 0)}. All legal cars already sold at a floor of 40, so a stricter floor only bans cars between 40 and 70 that buyers value at 1.5 times what sellers do.` },
    { q: 'Buyers value cars at h = 5/2 and there is no floor. A consumer agency caps the price at 60. The share of cars sold at the highest allowed price…', base: { h: 2.5, B: 0 }, change: { h: 2.5, B: 0, ceil: 'on', Pc: 60 }, options: ['stays at 100%', 'falls to 60%', 'falls to 0'], judge: (b, a) => a.share > 0.99 ? 0 : a.share > 0.01 ? 1 : 2,
      why: (b, a) => `It falls from ${pct(b.share, 0)} to ${pct(a.share, 0)}, and the gains from trade realized fall from ${pct(b.surplus, 0)} to ${pct(a.surplus, 0)}. Owners of cars above 60 will not sell at 60, although buyers would have paid more for them.` }
  ]
});
