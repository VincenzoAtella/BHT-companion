// ===== BHT Chapter 7: Demand for insurance =====
// solvers for this chapter: M.b07_<name>
// Utility is the power function U(I) = I^rho: concave (risk-averse) for rho < 1,
// linear (risk-neutral) at rho = 1, convex (risk-loving) for rho > 1.

M.b07_usd = (x, d = 0) => isFinite(x) ? (x < 0 ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';
M.b07_U = rho => ({ u: I => Math.pow(Math.max(I, 0), rho), inv: v => Math.pow(Math.max(v, 0), 1 / rho) });

// Sections 7.2-7.3: a two-outcome lottery, expected utility against the utility of expected income.
M.b07_lottery = function ({ IH, IS, p, rho }) {
  IS = Math.min(IS, IH - 1);
  const U = M.b07_U(rho);
  const EI = p * IS + (1 - p) * IH;
  const EU = p * U.u(IS) + (1 - p) * U.u(IH);
  const UEI = U.u(EI);
  const CE = U.inv(EU);                       // sure income with the same expected utility
  return { IH, IS, p, rho, U: U.u, EI, EU, UEI, CE, RP: EI - CE, chord: I => U.u(IS) + (I - IS) / (IH - IS) * (U.u(IH) - U.u(IS)) };
};

// Section 7.4: a contract (r, q) with q = s (IH - IS) and r = pq + m, m being the markup (price) over the fair premium.
M.b07_contract = function ({ p, rho, s, m, IH = 50000, IS = 10000 }) {
  const U = M.b07_U(rho);
  const loss = IH - IS, q = s * loss, r = p * q + m;
  const IHp = IH - r, ISp = IS - r + q;
  const EI0 = p * IS + (1 - p) * IH, EU0 = p * U.u(IS) + (1 - p) * U.u(IH), CE0 = U.inv(EU0);
  const EIp = p * ISp + (1 - p) * IHp, EUp = p * U.u(ISp) + (1 - p) * U.u(IHp), CEp = U.inv(EUp);
  // largest markup at which this coverage is still worth buying
  const ceAt = mm => U.inv(p * U.u(IS - p * q - mm + q) + (1 - p) * U.u(IH - p * q - mm));
  let mmax = 0;
  if (q > 1e-6 && ceAt(0) - CE0 > 1e-6) {
    const hi = Math.max(1, EI0 - CE0) * 1.01;
    mmax = ceAt(hi) >= CE0 ? hi : M.bisect(mm => ceAt(mm) - CE0, 0, hi, 1e-6);
  }
  const full = s > 0.9999, fair = m < 0.5, none = q < 1e-6;
  return { IH, IS, p, rho, U: U.u, q, r, IHp, ISp, EI0, EU0, CE0, EIp, EUp, CEp, gain: CEp - CE0, mmax, full, fair, none,
    type: none ? 'no insurance' : (fair ? 'fair' : 'unfair') + ', ' + (full ? 'full' : 'partial') };
};

// Section 7.5: a fair-but-partial contract P against a full-but-unfair contract F (markup mF).
M.b07_two = function ({ p, rho, sP, mF, IH = 50000, IS = 10000 }) {
  const P = M.b07_contract({ p, rho, s: sP, m: 0, IH, IS });
  const EI = P.EI0, CEF = EI - mF, mstar = EI - P.CEp;   // F' leaves her indifferent: E[I]P - E[I]F' = mstar
  const U = M.b07_U(rho);
  return { p, rho, EI, CE0: P.CE0, EU0: P.EU0, CEP: P.CEp, EUP: P.EUp, CEF, EUF: U.u(CEF), mstar, mF,
    choice: CEF > P.CEp + 1e-6 ? 'F' : CEF < P.CEp - 1e-6 ? 'P' : 'either', ISp: P.ISp, IHp: P.IHp, rP: P.r };
};

EX.push({
  id: 'b07-lottery', ch: 7, title: 'Expected utility and risk aversion',
  ref: 'BHT Sections 7.2-7.3, Figures 7.2-7.3, Definition 7.3',
  anchors: [[7, 'awards $500 with probability 0.5 and $0 with probability 0.5'], [7, 'a check for $250 with probability 1']],
  intro: 'Income is I_H with probability 1 − p and I_S with probability p, and utility is U(I) = I^ρ. The baseline is BHT’s lottery of Section 7.3: $500 or $0 with equal probability, so expected income is $250, the value of the sure check. The square-root utility (ρ = 0.5) is an illustrative choice. Compare the expected utility of the lottery, read off the chord SH, with the utility of its expected income, read off the curve.',
  eq: String.raw`E[I]=pI_S+(1-p)I_H,\qquad E[U(I)]=pU(I_S)+(1-p)U(I_H),\qquad U(E[I])>E[U(I)]\iff U''<0`,
  params: [
    { id: 'IH', label: 'Income if healthy I_H ($)', min: 100, max: 1000, step: 10, book: 500, d: 0 },
    { id: 'IS', label: 'Income if sick I_S ($)', min: 0, max: 900, step: 10, book: 0, d: 0 },
    { id: 'p', label: 'Probability of sickness p', min: 0.01, max: 0.99, step: 0.01, book: 0.5, d: 2 },
    { id: 'rho', label: 'Utility exponent ρ in U(I) = I^ρ', min: 0.1, max: 1.5, step: 0.05, book: 0.5, d: 2 }
  ],
  presets: [{ label: 'Risk-neutral, ρ = 1', values: { rho: 1 } }, { label: 'Risk-loving, ρ = 1.5', values: { rho: 1.5 } }],
  bookLabel: 'Baseline',
  compute: S => M.b07_lottery(S),
  outputs: (S, R, B) => [
    { label: 'Expected income E[I]', v: M.b07_usd(R.EI), b: M.b07_usd(B.EI) },
    { label: 'Expected utility E[U(I)] (point A)', v: nf(R.EU, 2), b: nf(B.EU, 2) },
    { label: 'Utility of expected income U(E[I]) (point A′)', v: nf(R.UEI, 2), b: nf(B.UEI, 2), key: true },
    { label: 'Sure income worth the same as the lottery', v: M.b07_usd(R.CE, 2), b: M.b07_usd(B.CE, 2) },
    { label: 'Risk premium: E[I] minus that sure income', v: M.b07_usd(R.RP, 2), b: M.b07_usd(B.RP, 2), key: true }
  ],
  verdict: (S, R) => R.RP > 0.005
    ? { tone: 'ok', text: `Risk-averse: U(E[I]) = ${nf(R.UEI, 2)} exceeds E[U] = ${nf(R.EU, 2)}, and she would give up up to ${M.b07_usd(R.RP, 2)} of expected income to remove the risk.` }
    : R.RP < -0.005
      ? { tone: 'bad', text: `Risk-loving: with a convex utility the lottery is worth more than its expected income; she would need ${M.b07_usd(-R.RP, 2)} on top of E[I] to give it up.` }
      : { tone: 'neutral', text: 'Risk-neutral: with a linear utility the chord and the curve coincide, so only expected income matters.' },
  chart(el, S, R, B) {
    const x1 = 1050, y1 = R.U(x1) * 1.08;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Income I ($)', ylabel: 'Utility U(I)', aria: 'Utility curve, chord between the two outcomes, expected utility and utility of expected income' });
    if (Math.abs(S.rho - 0.5) > 1e-9) P.fn(x => B.U(x), 'ghost', 0, x1);
    P.fn(R.U, 's-pri thick', 0, x1, 240);
    P.seg(R.IS, R.U(R.IS), R.IH, R.U(R.IH), 's-ink');
    P.seg(R.EI, 0, R.EI, Math.max(R.UEI, R.EU), 's-gray dot');
    if (Math.abs(R.RP) > 0.5) P.seg(Math.min(R.CE, R.EI), R.EU, Math.max(R.CE, R.EI), R.EU, 's-sec thick');
    P.pt(R.IS, R.U(R.IS), 'p-ink', 'S', 8, -8);
    P.pt(R.IH, R.U(R.IH), 'p-ink', 'H', -8, -10, 'end');
    P.pt(R.EI, R.EU, 'p-sec', 'A', 8, 16);
    P.pt(R.EI, R.UEI, 'p-pri', 'A′', -8, -10, 'end');
    if (Math.abs(R.RP) > 0.5) P.pt(R.CE, R.EU, 'p-hollow small', 'sure income', R.CE < R.EI ? -8 : 8, -8, R.CE < R.EI ? 'end' : 'start');
    P.text(R.EI, R.U(x1) * 0.04, 'E[I]', 'muted', 'start');
    P.draw();
  },
  notice: 'For any p strictly between 0 and 1, point A on the chord lies below A′ on the curve whenever the curve is concave. The red segment is the risk premium: the sure income that gives the same utility as the lottery lies to the left of E[I].',
  challenges: [
    { q: 'Raise the healthy income from $500 to $1,000, with the sick income still $0. The risk premium…', change: { IH: 1000 }, options: ['doubles exactly', 'rises, but less than double', 'more than doubles'], judge: (b, a) => Math.abs(a.RP / b.RP - 2) < 1e-6 ? 0 : a.RP < 2 * b.RP ? 1 : 2, why: (b, a) => `It moves from ${M.b07_usd(b.RP, 2)} to ${M.b07_usd(a.RP, 2)}. With U(I) = I^ρ, multiplying both outcomes by the same factor multiplies the equivalent sure income, and hence the risk premium, by that factor too.` },
    { q: 'Keep expected income at $250 but narrow the spread: I_H = $400 and I_S = $100. The risk premium…', change: { IH: 400, IS: 100 }, options: ['does not change, since E[I] is the same', 'falls by about 40 percent', 'falls by about 80 percent'], judge: (b, a) => Math.abs(a.RP - b.RP) < 1e-6 ? 0 : a.RP > 0.4 * b.RP ? 1 : 2, why: (b, a) => `It falls from ${M.b07_usd(b.RP, 2)} to ${M.b07_usd(a.RP, 2)}. The spread falls by 40 percent, but the gap between the curve and the chord shrinks much faster, roughly with the square of the spread, so a risk-averse person cares little about small risks.` },
    { q: 'Make utility more concave: ρ from 0.5 to 0.25. The smallest sure check the student would accept instead of the lottery…', change: { rho: 0.25 }, options: ['rises', 'falls', 'stays at $250'], judge: (b, a) => a.CE > b.CE + 1e-6 ? 0 : a.CE < b.CE - 1e-6 ? 1 : 2, why: (b, a) => `It falls from ${M.b07_usd(b.CE, 2)} to ${M.b07_usd(a.CE, 2)}. Marginal utility now declines faster, so the $0 outcome hurts more than the $500 outcome helps, and a smaller certain amount is already as good as the gamble.` }
  ]
});

EX.push({
  id: 'b07-contract', ch: 7, title: 'Fair, unfair, full and partial contracts',
  ref: 'BHT Sections 7.4-7.5, Eq. (7.9), Table 7.1, Figure 7.4',
  anchors: [[7, 'when p = 0.25, the individual’s expected utility is shown at point A']],
  intro: 'A contract pays q = s(I_H − I_S) if she is sick, a share s of the income loss, for a premium r = pq + m, where m is the markup over the fair premium: m is the price of the contract and s its quantity. The probability p = 0.25 is that of point A in BHT Figure 7.2; incomes of $50,000 and $10,000 and U(I) = I^ρ with ρ = 0.5 are illustrative. The presets give one contract in each cell of BHT Table 7.1.',
  eq: String.raw`I_H'=I_H-r,\quad I_S'=I_S-r+q,\qquad q=s\,(I_H-I_S),\quad r=pq+m,\qquad E[\Pi]=r-pq=m`,
  params: [
    { id: 's', label: 'Share of the loss paid out s = q/(I_H − I_S)', min: 0, max: 1, step: 0.01, book: 0.5, d: 2 },
    { id: 'm', label: 'Markup over the fair premium m = r − pq ($)', min: 0, max: 4000, step: 50, book: 0, d: 0 },
    { id: 'p', label: 'Probability of sickness p', min: 0.05, max: 0.95, step: 0.01, book: 0.25, d: 2 },
    { id: 'rho', label: 'Utility exponent ρ in U(I) = I^ρ', min: 0.1, max: 1, step: 0.05, book: 0.5, d: 2 }
  ],
  presets: [
    { label: 'Fair and full (ideal)', values: { s: 1, m: 0 } },
    { label: 'Fair and partial', values: { s: 0.5, m: 0 } },
    { label: 'Unfair and full', values: { s: 1, m: 2000 } },
    { label: 'Unfair and partial', values: { s: 0.5, m: 1000 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b07_contract(S),
  outputs: (S, R, B) => [
    { label: 'Payout q and premium r', v: M.b07_usd(R.q) + ', ' + M.b07_usd(R.r), b: M.b07_usd(B.q) + ', ' + M.b07_usd(B.r) },
    { label: 'Income if healthy I_H′ and if sick I_S′', v: M.b07_usd(R.IHp) + ', ' + M.b07_usd(R.ISp), b: M.b07_usd(B.IHp) + ', ' + M.b07_usd(B.ISp) },
    { label: 'Type of contract (Table 7.1)', v: R.type, b: B.type },
    { label: 'Expected income: uninsured, insured', v: M.b07_usd(R.EI0) + ', ' + M.b07_usd(R.EIp), b: M.b07_usd(B.EI0) + ', ' + M.b07_usd(B.EIp) },
    { label: 'Expected utility: uninsured (A), insured (A_P)', v: nf(R.EU0, 2) + ', ' + nf(R.EUp, 2), b: nf(B.EU0, 2) + ', ' + nf(B.EUp, 2) },
    { label: 'Gain from the contract, in sure dollars', v: M.b07_usd(R.gain), b: M.b07_usd(B.gain), key: true },
    { label: 'Largest markup worth paying for this s', v: M.b07_usd(R.mmax), b: M.b07_usd(B.mmax), key: true }
  ],
  verdict: (S, R) => R.none
    ? { tone: 'neutral', text: 'With s = 0 the contract pays nothing: any premium above zero is a pure loss.' }
    : R.gain > 0.5
      ? { tone: R.fair && R.full ? 'ok' : 'neutral', text: `She buys this ${R.type} contract: it is worth ${M.b07_usd(R.gain)} of sure income to her${R.fair ? '' : `, although it lowers her expected income by ${M.b07_usd(S.m)}`}.` }
      : R.gain < -0.5
        ? { tone: 'bad', text: `She stays uninsured: the markup of ${M.b07_usd(S.m)} exceeds the ${M.b07_usd(R.mmax)} that this coverage is worth to her.` }
        : { tone: 'neutral', text: 'She is indifferent between this contract and no insurance.' },
  chart(el, S, R, B) {
    const x0 = 8000, x1 = 52000, y0 = R.U(x0) * 0.98, y1 = R.U(x1) * 1.01;
    const P = Plot(el, { x0, x1, y0, y1, xlabel: 'Income I ($)', ylabel: 'Utility U(I)', aria: 'Expected utility without insurance and with the chosen contract' });
    if (Math.abs(S.rho - 0.5) > 1e-9) P.fn(x => B.U(x), 'ghost', x0, x1);
    P.fn(R.U, 's-pri thick', x0, x1, 200);
    P.seg(R.IS, R.U(R.IS), R.IH, R.U(R.IH), 's-gray');
    P.pt(R.IS, R.U(R.IS), 'p-gray small', 'S', 8, 4);
    P.pt(R.IH, R.U(R.IH), 'p-gray small', 'H', -8, 14, 'end');
    P.pt(R.EI0, R.EU0, 'p-gray', 'A', 8, 16);
    if (!R.none) {
      if (R.IHp - R.ISp > 1) P.seg(R.ISp, R.U(R.ISp), R.IHp, R.U(R.IHp), 's-sec thick');
      P.pt(R.ISp, R.U(R.ISp), 'p-sec small', 'S_P', -8, -8, 'end');
      if (!R.full) P.pt(R.IHp, R.U(R.IHp), 'p-sec small', 'H_P', 8, 16);
      P.pt(R.EIp, R.EUp, 'p-sec', R.full ? 'A_F' : 'A_P', 8, 16);
    }
    P.draw();
  },
  notice: 'The contract moves income from the healthy state to the sick state, pulling the chord’s endpoints toward each other. A fair contract keeps A_P above E[I]; a markup slides it left and down. Full insurance collapses the chord to a single point on the curve.',
  challenges: [
    { q: 'Make the fair contract full: raise s from 0.5 to 1. The premium doubles from $5,000 to $10,000. Her expected income…', change: { s: 1 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.EIp > b.EIp + 0.5 ? 0 : a.EIp < b.EIp - 0.5 ? 1 : 2, why: (b, a) => `It stays at ${M.b07_usd(a.EIp)} while the gain rises from ${M.b07_usd(b.gain)} to ${M.b07_usd(a.gain)}. A fair contract charges exactly the expected payout, so the larger premium buys more certainty at a price of zero.` },
    { q: 'Keep s = 0.5 and add a markup of $1,000, so the contract lowers her expected income by $1,000. Does she still buy it?', change: { m: 1000 }, options: ['Yes', 'No'], judge: (b, a) => a.gain > 0 ? 0 : 1, why: (b, a) => `Yes: the coverage is worth up to ${M.b07_usd(a.mmax)} of markup to her, so at $1,000 she still gains ${M.b07_usd(a.gain)} in sure income. Risk-averse buyers accept unfair contracts as long as the reduction in risk is worth the price.` },
    { q: 'Start from a full contract with a markup of $2,500, which she buys. Cut the payout to half the loss, keeping the same $2,500 markup. Does she still buy?', base: { s: 1, m: 2500 }, change: { s: 0.5, m: 2500 }, options: ['Yes', 'No'], judge: (b, a) => a.gain > 0 ? 0 : 1, why: (b, a) => `No. The full contract gains her ${M.b07_usd(b.gain)} of sure income, the half contract ${M.b07_usd(a.gain)}: half coverage is worth at most ${M.b07_usd(a.mmax)} of markup to her. The same price buys less quantity, so a contract she would buy at full coverage is not worth buying at partial coverage.` },
    { q: 'Set ρ = 1 (risk-neutral) at the fair half-coverage contract. The gain from buying it…', change: { rho: 1 }, options: ['is positive', 'is zero', 'is negative'], judge: (b, a) => a.gain > 0.5 ? 0 : a.gain < -0.5 ? 2 : 1, why: (b, a) => `It falls from ${M.b07_usd(b.gain)} to ${M.b07_usd(a.gain)}. With a linear utility only expected income matters, and a fair contract leaves expected income at ${M.b07_usd(a.EIp)}.` }
  ]
});

M.b07_pick = c => c === 'F' ? 'F, full but unfair' : c === 'P' ? 'P, partial but fair' : 'indifferent';

EX.push({
  id: 'b07-twocontracts', ghost: '', ch: 7, title: 'Partial-but-fair or full-but-unfair?',
  ref: 'BHT Section 7.5, Figures 7.5-7.6',
  anchors: [],
  intro: 'Two non-ideal contracts are on offer: P pays a share s_P of the income loss at a fair premium, F pays the whole loss at a premium with markup m_F. F gives a sure income of E[I] − m_F; P leaves some risk but keeps expected income at E[I]. The chart measures each option by the sure income that gives the same expected utility. The setting (I_H = $50,000, I_S = $10,000, p = 0.25, U(I) = I^ρ with ρ = 0.5) is the illustrative one of the previous example.',
  eq: String.raw`E[U]^F=U(E[I]-m_F),\qquad E[U]^P=pU(I_S^P)+(1-p)U(I_H^P),\qquad E[U]^{F'}=E[U]^P\ \Rightarrow\ m^{*}=E[I]^P-E[I]^{F'}`,
  params: [
    { id: 'sP', label: 'Share of the loss paid by P, s_P', min: 0, max: 0.95, step: 0.01, book: 0.5, d: 2 },
    { id: 'mF', label: 'Markup of the full contract F, m_F ($)', min: 0, max: 3000, step: 25, book: 500, d: 0 },
    { id: 'p', label: 'Probability of sickness p', min: 0.05, max: 0.95, step: 0.01, book: 0.25, d: 2 },
    { id: 'rho', label: 'Utility exponent ρ in U(I) = I^ρ', min: 0.1, max: 1, step: 0.05, book: 0.5, d: 2 }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b07_two(S),
  outputs: (S, R, B) => [
    { label: 'Expected income E[I] (= E[I]^P)', v: M.b07_usd(R.EI), b: M.b07_usd(B.EI) },
    { label: 'Contract P: incomes if healthy and sick', v: M.b07_usd(R.IHp) + ', ' + M.b07_usd(R.ISp), b: M.b07_usd(B.IHp) + ', ' + M.b07_usd(B.ISp) },
    { label: 'Sure income equivalent: none, P, F', v: M.b07_usd(R.CE0) + ', ' + M.b07_usd(R.CEP) + ', ' + M.b07_usd(R.CEF), b: M.b07_usd(B.CE0) + ', ' + M.b07_usd(B.CEP) + ', ' + M.b07_usd(B.CEF) },
    { label: 'Preferred contract', v: M.b07_pick(R.choice), b: M.b07_pick(B.choice), key: true },
    { label: 'Largest markup on F before P wins, m*', v: M.b07_usd(R.mstar), b: M.b07_usd(B.mstar), key: true }
  ],
  verdict: (S, R) => R.choice === 'F'
    ? { tone: 'ok', text: `She picks the full-but-unfair contract: its markup of ${M.b07_usd(S.mF)} is below m* = ${M.b07_usd(R.mstar)}, the value of removing the risk that P leaves.` }
    : R.choice === 'P'
      ? { tone: 'warn', text: `She picks the fair-but-partial contract: a markup of ${M.b07_usd(S.mF)} is above m* = ${M.b07_usd(R.mstar)}, so F is too unfair.` }
      : { tone: 'neutral', text: `F is contract F′ of BHT Figure 7.6: at a markup of ${M.b07_usd(S.mF)} she is indifferent.` },
  chart(el, S, R, B) {
    const x1 = 3000, y1 = R.EI + 200, y0 = Math.min(R.CE0, R.EI - x1) - 300;
    const P = Plot(el, { x0: 0, x1, y0, y1, xlabel: 'Markup of the full contract m_F ($)', ylabel: 'Sure income equivalent ($)', aria: 'Value of a full unfair contract as its markup rises, against a partial fair contract' });
    if (R.mstar > 0 && R.mstar < x1) P.rect(0, R.mstar, 'f-band');
    P.fn(m => R.EI - m, 's-pri thick');
    P.hline(R.CEP, 's-sec', 'contract P', 'end');
    P.hline(R.CE0, 's-gray dash', 'no insurance', 'end');
    P.pt(S.mF, R.CEF, 'p-pri', 'F', 8, -8);
    if (R.mstar < x1) P.pt(R.mstar, R.CEP, 'p-ink', 'F′', 8, 16);
    P.draw();
  },
  notice: 'The blue line is the full contract: each dollar of markup costs a sure dollar. Contract P is a flat line below E[I] because it leaves risk. In the green band F wins; F′, where the lines cross, is the most unfair full contract she still accepts, m* = E[I]^P − E[I]^F′.',
  challenges: [
    { q: 'Raise the markup of F from $500 to $1,000. Which contract does she choose?', change: { mF: 1000 }, options: ['F, full but unfair', 'P, partial but fair'], judge: (b, a) => a.choice === 'F' ? 0 : 1, why: (b, a) => `P. Its sure income equivalent is ${M.b07_usd(a.CEP)}, above the ${M.b07_usd(a.CEF)} that F now leaves her: m* is only ${M.b07_usd(a.mstar)}, because half of the risk is already removed by P.` },
    { q: 'Make P more generous: s_P from 0.5 to 0.75. By how much does m*, the largest markup she accepts on F, fall?', change: { sP: 0.75 }, options: ['by about a quarter', 'by about half', 'by more than two thirds'], judge: (b, a) => { const f = 1 - a.mstar / b.mstar; return f > 2 / 3 ? 2 : f > 0.4 ? 1 : 0; }, why: (b, a) => `It falls from ${M.b07_usd(b.mstar)} to ${M.b07_usd(a.mstar)}, by ${pct(1 - a.mstar / b.mstar, 0)}. The uncovered share of the loss halves, but the cost of the remaining risk falls roughly with its square.` },
    { q: 'Make her more risk-averse: ρ from 0.5 to 0.25, with the markup of F at $500. Which contract does she choose?', change: { rho: 0.25 }, options: ['F, full but unfair', 'P, partial but fair'], judge: (b, a) => a.choice === 'F' ? 0 : 1, why: (b, a) => `F, by a wider margin: m* rises from ${M.b07_usd(b.mstar)} to ${M.b07_usd(a.mstar)}. The risk left by P weighs more on a more risk-averse person, so she pays more for full coverage.` },
    { q: 'Make her risk-neutral: ρ = 1, with the markup of F at $500. Which contract does she choose?', change: { rho: 1 }, options: ['F, full but unfair', 'P, partial but fair'], judge: (b, a) => a.choice === 'F' ? 0 : 1, why: (b, a) => `P. With a linear utility m* = ${M.b07_usd(a.mstar)}: she values only expected income, which the fair contract keeps at ${M.b07_usd(a.EI)} and the unfair one lowers by $500.` }
  ]
});
