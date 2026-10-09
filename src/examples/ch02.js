// ===== BHT Chapter 2: Demand for health care =====
// solvers for this chapter: M.b02_<name>
const b02n = (x, d = 2) => nf(x, d).replace(/^-/, '−');   // signed numbers with a true minus sign
const b02arc = (Q1, Q2, P1, P2) => ((Q2 - Q1) / (Q1 + Q2)) / ((P2 - P1) / (P1 + P2));   // Eq. (2.2)

// 1. Simple (Eq. 2.1) and arc (Eq. 2.2) elasticities between two price-quantity points.
// P in copayment percent, Q per person-year; unit 'month' divides Q by 12.
M.b02_elast = function ({ P1, P2, Q1, Q2, unit }) {
  const u = unit === 'month' ? 1 / 12 : 1, q1 = Q1 * u, q2 = Q2 * u;
  const dPp = (P2 - P1) / P1, dQp = (q2 - q1) / q1;
  const e12 = dQp / dPp;                                   // starting from point 1
  const e21 = ((q1 - q2) / q2) / ((P1 - P2) / P2);         // starting from point 2
  const arc = b02arc(q1, q2, P1, P2);
  const slope = Math.abs(q2 - q1) > 1e-12 ? (P2 - P1) / (q2 - q1) : NaN;   // copay points per unit of care
  return { P1, P2, q1, q2, u, dPp, dQp, e12, e21, arc, slope };
};

EX.push({
  id: 'b02-arc', ch: 2, title: 'Simple and arc elasticities',
  ref: 'BHT Section 2.3, Eqs. (2.1)–(2.2), Figure 2.4',
  anchors: [[2, 'elasticity of demand for dental care is also −0.06'], [2, 'demand for dental care would be −0.28'], [2, 'outpatient care is −0.17 and for dental is −0.16']],
  intro: 'Two plans of the RAND experiment give two points on a demand curve: the copayment rate P and the quantity of care Q. The baseline is BHT’s worked example for outpatient care, 2.32 episodes a year at a 25% copayment and 1.9 at 95%; the preset loads BHT’s dental data. Move either point, or count care per month instead of per year, and compare the slope with the two simple elasticities and the arc elasticity.',
  eq: String.raw`\epsilon=\frac{(Q_2-Q_1)/Q_1}{(P_2-P_1)/P_1},\qquad \epsilon_{arc}=\frac{\Delta Q/(Q_1+Q_2)}{\Delta P/(P_1+P_2)}`,
  params: [
    { id: 'P1', label: 'Copayment rate of plan 1, P₁ (%)', min: 5, max: 100, step: 1, book: 25, d: 0 },
    { id: 'Q1', label: 'Care used in plan 1, Q₁ (per year)', min: 0.2, max: 4, step: 0.01, book: 2.32, d: 2 },
    { id: 'P2', label: 'Copayment rate of plan 2, P₂ (%)', min: 5, max: 100, step: 1, book: 95, d: 0 },
    { id: 'Q2', label: 'Care used in plan 2, Q₂ (per year)', min: 0.2, max: 4, step: 0.01, book: 1.9, d: 2 }
  ],
  toggles: [{ id: 'unit', label: 'Count quantity', options: [['year', 'Per year'], ['month', 'Per month']], book: 'year' }],
  presets: [{ label: 'Dental care (Figure 2.4)', values: { Q1: 1.06, Q2: 0.88 } }],
  compute: S => M.b02_elast(S),
  outputs: (S, R, B) => [
    { label: 'Price change from plan 1', v: pct(R.dPp, 0), b: pct(B.dPp, 0) },
    { label: 'Quantity change from plan 1', v: b02n(100 * R.dQp, 1) + '%', b: b02n(100 * B.dQp, 1) + '%' },
    { label: 'Elasticity from plan 1, Eq. (2.1)', v: b02n(R.e12, 2), b: b02n(B.e12, 2) },
    { label: 'Elasticity from plan 2, Eq. (2.1)', v: b02n(R.e21, 2), b: b02n(B.e21, 2) },
    { label: 'Arc elasticity, Eq. (2.2)', v: b02n(R.arc, 2), b: b02n(B.arc, 2), key: true },
    { label: 'Slope ΔP/ΔQ (copay points per unit of care)', v: isFinite(R.slope) ? b02n(R.slope, 1) : 'vertical', b: b02n(B.slope, 1), key: true }
  ],
  verdict: (S, R) => Math.abs(S.P2 - S.P1) < 1e-9 ? { tone: 'neutral', text: 'The two plans charge the same price, so no elasticity can be measured.' }
    : R.arc > 0 ? { tone: 'warn', text: `Use rises with price: the arc elasticity is ${b02n(R.arc, 2)}, an upward-sloping demand curve.` }
    : R.arc > -1 ? { tone: 'ok', text: `Demand is inelastic: a 1% higher copayment lowers use by about ${nf(-R.arc, 2)}%, measured at the midpoint.` }
    : { tone: 'warn', text: `Demand is elastic: the arc elasticity is ${b02n(R.arc, 2)}, beyond −1.` },
  chart(el, S, R, B) {
    const x1 = Math.max(0.5, 1.25 * Math.max(R.q1, R.q2)), x1n = x1 > 2 ? Math.ceil(x1) : x1;
    const P = Plot(el, { x0: 0, x1: x1n, y0: 0, y1: 100, xlabel: S.unit === 'month' ? 'Quantity of care (per month)' : 'Quantity of care (per year)', ylabel: 'Copayment rate (%)', aria: 'Two points on a demand curve' });
    if (S.unit !== 'month') { P.seg(B.q1, B.P1, B.q2, B.P2, 'ghost'); }
    P.seg(R.q1, R.P1, R.q2, R.P2, 's-pri thick');
    const mq = (R.q1 + R.q2) / 2, mp = (R.P1 + R.P2) / 2;
    P.pt(mq, mp, 'p-hollow', 'midpoint', 8, 4);
    P.pt(R.q1, R.P1, 'p-pri', `(${nf(R.q1, S.unit === 'month' ? 3 : 2)}, ${nf(R.P1, 0)}%)`, 8, R.P1 > R.P2 ? -8 : 16);
    P.pt(R.q2, R.P2, 'p-sec', `(${nf(R.q2, S.unit === 'month' ? 3 : 2)}, ${nf(R.P2, 0)}%)`, 8, R.P2 > R.P1 ? -8 : 16);
    P.draw();
  },
  notice: 'The slope of the segment depends on the units of care; the elasticities do not. The simple elasticity depends on which plan you start from, because the same price gap is 280% of a 25% copayment but only 74% of a 95% one; the arc elasticity divides both changes by midpoint values and gives one answer.',
  challenges: [
    { q: 'Load the dental data: Q₁ = 1.06 and Q₂ = 0.88 at the same two copayment rates. Compared with outpatient care, the arc elasticity of dental care is…', change: { Q1: 1.06, Q2: 0.88 }, options: ['much larger in absolute value, since the segment is steeper', 'about the same', 'much smaller in absolute value'],
      judge: (b, a) => { const r = a.arc / b.arc; return r > 1.3 ? 0 : r > 0.75 ? 1 : 2; },
      why: (b, a) => `It is ${b02n(a.arc, 2)} against ${b02n(b.arc, 2)}, while the slope changes from ${b02n(b.slope, 1)} to ${b02n(a.slope, 1)} copay points per unit. Dental use falls by ${pct(-a.dQp, 0)} and outpatient use by ${pct(-b.dQp, 0)}: proportional responses are what matter, and they are nearly equal.` },
    { q: 'Count care per month instead of per year. The arc elasticity…', change: { unit: 'month' }, options: ['becomes 12 times smaller', 'does not change', 'becomes 12 times larger'],
      judge: (b, a) => Math.abs(a.arc - b.arc) < 1e-9 ? 1 : Math.abs(a.arc) < Math.abs(b.arc) ? 0 : 2,
      why: (b, a) => `It stays at ${b02n(a.arc, 2)}, while the slope goes from ${b02n(b.slope, 1)} to ${b02n(a.slope, 1)}. Both quantities shrink by the same factor, so their percentage change does not move; this is why elasticities, not slopes, compare demand for goods measured in different units.` },
    { q: 'Treat the 95% plan as the starting point instead (swap the two plans). The elasticity of Eq. (2.1) computed from the new starting point…', change: { P1: 95, Q1: 1.9, P2: 25, Q2: 2.32 }, options: ['does not change', 'becomes about five times larger in absolute value', 'turns positive'],
      judge: (b, a) => { const r = a.e12 / b.e12; return Math.abs(r - 1) < 0.05 ? 0 : r > 0 && r > 1.05 ? 1 : 2; },
      why: (b, a) => `It moves from ${b02n(b.e12, 2)} to ${b02n(a.e12, 2)}, while the arc elasticity stays at ${b02n(a.arc, 2)}. Starting from 95%, the price change is −74% instead of +280%, and the quantity change is +22% instead of −18%.` }
  ]
});

// 2. Demand with an effective price. Each episode of illness is treated if its benefit b exceeds the
// out-of-pocket price c * p. U episodes are urgent (b above the full price); M discretionary episodes
// have exponential benefits with mean v * k (in units of the RAND-era full price p = 1).
// Q(c) = U + M exp(-c p / (v k)); U, M, k fitted exactly to the free, 25% and 95% plans.
M.b02_tables = { out: [2.99, 2.32, 2.11, 1.90], inp: [0.133, 0.109, 0.099, 0.098] };
M.b02_fit = (() => {
  const fit = T => {
    const r = (T[0] - T[1]) / (T[0] - T[3]);
    const k = M.bisect(x => (1 - Math.exp(-0.25 / x)) / (1 - Math.exp(-0.95 / x)) - r, 0.01, 10);
    const Mm = (T[0] - T[1]) / (1 - Math.exp(-0.25 / k));
    return { k, M: Mm, U: T[0] - Mm };
  };
  return { out: fit(M.b02_tables.out), inp: fit(M.b02_tables.inp) };
})();
M.b02_copay = function ({ c, p, v, care }) {
  const F = M.b02_fit[care], T = M.b02_tables[care];
  const Qp = (cc, pp = p, vv = v) => F.U + F.M * Math.exp(-cc * pp / (vv * F.k));
  const Q = Qp(c), Q0 = Qp(0);
  const disc = F.M * Math.exp(-c * p / (v * F.k));
  const point = -(c * p / (v * F.k)) * disc / Q;          // dQ/dc * c/Q
  const arc = b02arc(Qp(0.25), Qp(0.95), 25, 95);
  return { c, p, v, care, U: F.U, Mn: F.M, k: F.k, T, Qp, Q, Q0, disc, discShare: disc / F.M, drop: 1 - Q / Q0, oop: c * p, point, arc, Q50: Qp(0.5) };
};

EX.push({
  id: 'b02-copay', ch: 2, title: 'Copayments and the effective price',
  ref: 'BHT Section 2.2, Tables 2.1 and 2.2',
  anchors: [[2, 'Free 2.99 2.29 0.70'], [2, '25% 2.32 1.78 0.54'], [2, '95% 1.90 1.44 0.46']],
  intro: 'Each episode of illness is treated if its benefit to the patient exceeds the out-of-pocket price c·p: the copayment rate times the full price of care. Urgent episodes are worth more than any out-of-pocket price on the sliders and are always treated; the benefits of discretionary episodes are spread out, so fewer of them are treated as the price rises. The split between the two kinds and the spread of benefits are fitted exactly to the RAND free, 25% and 95% plans in Table 2.1 (outpatient) or Table 2.2 (inpatient); the 50% plan is a check. The model itself and the price and value scales are illustrative.',
  eq: String.raw`Q(c)=U+M\,\Pr[b\ge c\,p]=U+M\,e^{-c\,p/(v k)},\qquad \epsilon(c)=\frac{dQ}{dc}\frac{c}{Q}`,
  params: [
    { id: 'c', label: 'Copayment rate c', min: 0, max: 1, step: 0.01, book: 0.25, d: 2 },
    { id: 'p', label: 'Full price of care, p (RAND-era price = 1)', min: 0.25, max: 3, step: 0.05, book: 1, d: 2 },
    { id: 'v', label: 'Value of discretionary care, v (fitted = 1)', min: 0.25, max: 3, step: 0.05, book: 1, d: 2 }
  ],
  toggles: [{ id: 'care', label: 'Type of care', options: [['out', 'Outpatient (Table 2.1)'], ['inp', 'Inpatient (Table 2.2)']], book: 'out' }],
  presets: [{ label: 'Free care', values: { c: 0 } }, { label: '95% plan', values: { c: 0.95 } }],
  compute: S => M.b02_copay(S),
  outputs: (S, R, B) => {
    const d = S.care === 'inp' ? 3 : 2;
    return [
      { label: 'Out-of-pocket price c·p (RAND-era full price = 1)', v: nf(R.oop, 2), b: nf(B.oop, 2) },
      { label: S.care === 'inp' ? 'Inpatient visits per year' : 'Outpatient episodes per year', v: nf(R.Q, d), b: nf(B.Q, 2), key: true },
      { label: 'Urgent episodes (treated at any copayment)', v: nf(R.U, d), b: nf(B.U, 2) },
      { label: 'Share of discretionary episodes treated', v: pct(R.discShare, 0), b: pct(B.discShare, 0) },
      { label: 'Use below the free plan', v: pct(R.drop, 0), b: pct(B.drop, 0) },
      { label: 'Point elasticity at c', v: b02n(R.point, 2), b: b02n(B.point, 2), key: true },
      { label: 'Arc elasticity, 25% to 95% plan', v: b02n(R.arc, 2), b: b02n(B.arc, 2) },
      { label: 'Model at the 50% plan (RAND: ' + nf(R.T[2], d) + ')', v: nf(R.Q50, d), b: nf(B.Q50, 2) }
    ];
  },
  verdict: (S, R) => S.c === 0 ? { tone: 'neutral', text: `Care is free at the point of service: every episode with any benefit is treated, ${nf(R.Q0, S.care === 'inp' ? 3 : 2)} a year.` }
    : { tone: R.drop > 0.25 ? 'warn' : 'ok', text: `At an out-of-pocket price of ${nf(R.oop, 2)} the patient skips ${pct(1 - R.discShare, 0)} of discretionary episodes, so use is ${pct(R.drop, 0)} below the free plan; urgent care is untouched.` },
  chart(el, S, R, B) {
    const x1 = S.care === 'inp' ? 0.16 : 3.6;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1: 100, xlabel: S.care === 'inp' ? 'Inpatient visits per person-year' : 'Outpatient episodes per person-year', ylabel: 'Copayment rate (%)', aria: 'Demand curve for care against the copayment rate' });
    const curve = (R0, cls) => { const pts = []; for (let i = 0; i <= 100; i++) pts.push([R0.Qp(i / 100), i]); P.path(pts, cls); };
    if (S.care === B.care) curve(B, 'ghost');
    P.vline(R.U, 's-gray dash', 'urgent only');
    curve(R, 's-pri thick');
    [0, 25, 50, 95].forEach((c, i) => P.pt(R.T[i], c, 'p-gray', i === 0 ? 'RAND' : '', 8, -6));
    P.pt(R.Q, 100 * S.c, 'p-sec', `c = ${nf(100 * S.c, 0)}%`, 10, -10);
    P.draw();
  },
  notice: 'Gray dots are the RAND plans. Demand is steep near the urgent-care floor and flatter at low copayments, where the cheap discretionary episodes are. Only the product c·p enters the decision, so a higher full price matters to an insured patient exactly as a higher copayment rate does, and not at all when care is free.',
  challenges: [
    { q: 'Start on the free plan (c = 0) and let the full price of care double (p = 2). Outpatient use…', base: { c: 0 }, change: { c: 0, p: 2 }, options: ['falls', 'does not change', 'rises'],
      judge: (b, a) => a.Q < b.Q - 1e-9 ? 0 : a.Q > b.Q + 1e-9 ? 2 : 1,
      why: (b, a) => `It stays at ${nf(a.Q, 2)} episodes. The patient pays c·p = 0 whatever p is; the marginal cost the patient bears, not the price the insurer pays, is the price of demand theory.` },
    { q: 'On the 25% plan, the full price of care doubles (p = 2). Outpatient use falls to about…', change: { p: 2 }, options: ['the level of the 50% plan at the old price', 'the level of the 95% plan', 'it stays at the 25% plan level'],
      judge: (b, a) => Math.abs(a.Q - b.Qp(0.5, 1, 1)) < 1e-6 ? 0 : Math.abs(a.Q - b.Qp(0.95, 1, 1)) < 0.05 ? 1 : 2,
      why: (b, a) => `It falls from ${nf(b.Q, 2)} to ${nf(a.Q, 2)}, which is the model’s use on the 50% plan at the old price: 0.25 × 2 = 0.5 × 1. Equal out-of-pocket prices give equal demand.` },
    { q: 'Move from the 25% plan to the 95% plan. The point elasticity of outpatient demand, in absolute value…', change: { c: 0.95 }, options: ['rises, as on a straight-line demand curve', 'falls'],
      judge: (b, a) => Math.abs(a.point) > Math.abs(b.point) ? 0 : 1,
      why: (b, a) => `It falls from ${b02n(b.point, 2)} to ${b02n(a.point, 2)}. At high copayments almost all discretionary episodes are already skipped (${pct(1 - a.discShare, 0)} of them), and the urgent episodes that remain do not respond to price.` },
    { q: 'On the 25% plan, patients come to value discretionary care twice as much (v = 2). The effect on outpatient use is the same as…', change: { v: 2 }, options: ['halving the copayment rate to 12.5%', 'doubling the full price of care', 'no change at all, since urgent care is unaffected'],
      judge: (b, a) => Math.abs(a.Q - b.Qp(0.125, 1, 1)) < 1e-6 ? 0 : Math.abs(a.Q - b.Qp(0.25, 2, 1)) < 1e-6 ? 1 : 2,
      why: (b, a) => `Use rises from ${nf(b.Q, 2)} to ${nf(a.Q, 2)}, exactly the model’s use at a 12.5% copayment with the old values. A discretionary episode is treated when its benefit exceeds c·p, so only the price relative to the value of care matters: shifting demand out works like a price cut.` }
  ]
});

// 3. Selection bias in a non-randomized survey (Figure 2.2). Half of the population is sick; the sick
// use g more episodes than the healthy at every price. Two equal-sized plans at 25% and 95%. With
// sorting strength m, the generous plan has a sick share (1 + m)/2 and the lean plan (1 − m)/2.
M.b02_select = function ({ Q95, g, m }) {
  const PL = 25, PH = 95, QL = 2.32;
  const DT = P => QL + (Q95 - QL) * (P - PL) / (PH - PL);   // true (randomized) population demand, linear
  const mL = QL + g * m / 2, mH = Q95 - g * m / 2;            // measured averages in each plan
  const DM = P => mL + (mH - mL) * (P - PL) / (PH - PL);
  const trueArc = b02arc(QL, Q95, PL, PH), measArc = b02arc(mL, mH, PL, PH);
  return { PL, PH, QL, Q95, g, m, DT, DM, mL, mH, trueArc, measArc, sickL: (1 + m) / 2, sickH: (1 - m) / 2 };
};

EX.push({
  id: 'b02-select', ch: 2, title: 'Why a survey misreads demand',
  ghost: 'Dashed gray: true demand at the baseline',
  ref: 'BHT Section 2.1, Figure 2.2, Definition 2.1',
  anchors: [[2, 'from 2.32 episodes per year to 1.9']],
  intro: 'A survey compares people in a generous plan (25% copayment) with people in a lean plan (95%). Half the population is sick and uses g more episodes a year than the healthy at any price. If plans were assigned at random, as in the RAND experiment, each plan would have half sick members and the survey would trace the true demand curve, which passes through BHT’s outpatient numbers, 2.32 episodes at 25% and 1.9 at 95%. With sorting strength m, sick people crowd into the generous plan. The sickness gap g and the sorting strength m are illustrative.',
  eq: String.raw`\bar Q_L=D_T(P_L)+\tfrac{g\,m}{2},\qquad \bar Q_H=D_T(P_H)-\tfrac{g\,m}{2},\qquad \text{sick share: }\tfrac{1+m}{2}\text{ vs }\tfrac{1-m}{2}`,
  params: [
    { id: 'Q95', label: 'True use at the 95% copayment (2.32 at 25%)', min: 1, max: 2.6, step: 0.01, book: 1.9, d: 2 },
    { id: 'g', label: 'Extra episodes of the sick, g', min: 0, max: 3, step: 0.05, book: 1.5, d: 2 },
    { id: 'm', label: 'Sorting strength, m (0 = random assignment)', min: 0, max: 1, step: 0.01, book: 0.5, d: 2 }
  ],
  presets: [{ label: 'Randomized experiment (m = 0)', values: { m: 0 } }, { label: 'Price does not matter', values: { Q95: 2.32 } }],
  compute: S => M.b02_select(S),
  outputs: (S, R, B) => [
    { label: 'Sick share: generous plan / lean plan', v: `${pct(R.sickL, 0)} / ${pct(R.sickH, 0)}`, b: `${pct(B.sickL, 0)} / ${pct(B.sickH, 0)}` },
    { label: 'Measured use at 25% (true 2.32)', v: nf(R.mL, 2), b: nf(B.mL, 2) },
    { label: 'Measured use at 95% (true ' + nf(S.Q95, 2) + ')', v: nf(R.mH, 2), b: nf(B.mH, 2) },
    { label: 'True arc elasticity', v: b02n(R.trueArc, 2), b: b02n(B.trueArc, 2), key: true },
    { label: 'Measured arc elasticity', v: b02n(R.measArc, 2), b: b02n(B.measArc, 2), key: true }
  ],
  verdict: (S, R) => Math.abs(R.measArc - R.trueArc) < 0.005 ? { tone: 'ok', text: 'The plans have the same mix of sick and healthy members, so the survey recovers the true demand curve.' }
    : { tone: 'warn', text: `The survey reports an elasticity of ${b02n(R.measArc, 2)} against a true ${b02n(R.trueArc, 2)}: part of the gap in use is the sickness of the people who chose generous coverage.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 0, x1: 4.5, y0: 0, y1: 100, xlabel: 'Outpatient episodes per person-year', ylabel: 'Copayment rate (%)', aria: 'True and measured demand curves' });
    const line = (f, cls) => { const pts = []; for (let i = 0; i <= 50; i++) pts.push([f(2 * i), 2 * i]); P.path(pts, cls); };
    line(B.DT, 'ghost');
    line(R.DT, 's-pri thick'); line(R.DM, 's-sec thick');
    P.hline(R.PL, 's-gray dot', 'P_L', 'start'); P.hline(R.PH, 's-gray dot', 'P_H', 'start');
    P.pt(R.QL, R.PL, 'p-pri', '', 0, 0); P.pt(R.Q95, R.PH, 'p-pri', '', 0, 0);
    P.pt(R.mL, R.PL, 'p-sec', 'survey', 8, 16); P.pt(R.mH, R.PH, 'p-sec', 'survey', -8, 16, 'end');
    P.text(Math.min(4.4, R.DT(5) + 0.1), 6, 'D_T', 's-pri');
    P.text(Math.min(4.4, Math.max(0.1, R.DM(12) + 0.1)), 12, 'D_M', 's-sec');
    P.draw();
  },
  notice: 'The blue line is the true demand curve D_T; the red line D_M joins what the survey measures. Selection pushes the low-price point to the right and the high-price point to the left, so D_M is flatter and price looks more powerful than it is, as in BHT Figure 2.2.',
  challenges: [
    { q: 'Suppose price has no effect at all: true use is 2.32 at both copayment rates. The survey’s measured demand curve…', change: { Q95: 2.32 }, options: ['is vertical', 'still slopes downward', 'slopes upward'],
      judge: (b, a) => a.measArc < -0.005 ? 1 : a.measArc > 0.005 ? 2 : 0,
      why: (b, a) => `The measured arc elasticity is ${b02n(a.measArc, 2)} although the true one is ${b02n(a.trueArc, 2)}. The generous plan uses ${nf(a.mL, 2)} episodes and the lean one ${nf(a.mH, 2)} only because ${pct(a.sickL, 0)} of the first plan’s members are sick.` },
    { q: 'Keep plans randomly assigned (m = 0) and double the sickness gap to g = 3. The measured elasticity…', base: { m: 0 }, change: { m: 0, g: 3 }, options: ['moves further from the truth', 'still equals the true elasticity'],
      judge: (b, a) => Math.abs(a.measArc - a.trueArc) < 1e-9 ? 1 : 0,
      why: (b, a) => `It stays at ${b02n(a.measArc, 2)}, the true value. However different the sick and the healthy are, random assignment puts the same mix in each plan, so the difference cancels (Definition 2.1).` },
    { q: 'Sorting becomes complete (m = 1): every sick person picks the generous plan. The measured arc elasticity is about…', change: { m: 1 }, options: ['the same as the truth', 'twice the truth', 'more than four times the truth'],
      judge: (b, a) => { const r = a.measArc / a.trueArc; return r < 1.2 ? 0 : r < 3 ? 1 : 2; },
      why: (b, a) => `It is ${b02n(a.measArc, 2)} against a true ${b02n(a.trueArc, 2)}, ${nf(a.measArc / a.trueArc, 1)} times as large. The whole sickness gap of ${nf(a.g, 1)} episodes now lines up with the price difference.` }
  ]
});
