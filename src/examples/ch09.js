// ===== BHT Chapter 9: Adverse selection: the Rothschild-Stiglitz model =====
// solvers for this chapter: M.b09_<name>
// Endowment E = (H_E, S_E) = ($50,000, $10,000), the illustrative incomes of the Chapter 7 examples.
// Utility is U(I) = I^rho (risk-averse for rho < 1). Charts plot income in $ thousand on square axes.

M.b09_HE = 50000;
M.b09_SE = 10000;
M.b09_usd = (x, d = 0) => isFinite(x) ? (x < -0.5 * Math.pow(10, -d) ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';
M.b09_k = x => isFinite(x) ? '$' + nf(x / 1000, 1) + 'k' : 'n/a';
M.b09_p = x => nf(x, 4).replace(/0+$/, '').replace(/\.$/, '');
M.b09_none = 'none: the robust stay uninsured';
M.b09_slope = x => (x < 0 ? '−' : '') + nf(Math.abs(x), 2);

// expected utility, indifference curves and zero-profit lines in I_H-I_S space
M.b09_tools = function (rho, HE = M.b09_HE, SE = M.b09_SE) {
  const u = I => Math.pow(Math.max(I, 0), rho);
  const inv = v => v < 0 ? NaN : Math.pow(v, 1 / rho);
  const EU = (p, IH, IS) => p * u(IS) + (1 - p) * u(IH);
  const ic = (p, V) => IH => inv((V - (1 - p) * u(IH)) / p);           // I_S on the indifference curve of level V
  const zp = p => IH => SE + (1 - p) / p * (HE - IH);                   // equation (9.2)
  const mrs = (p, IH, IS) => (1 - p) / p * Math.pow(IH / IS, rho - 1);   // minus the slope dI_S/dI_H of the indifference curve
  // the contract with payout q and premium r
  const at = (q, r) => [HE - r, SE - r + q];
  return { HE, SE, L: HE - SE, rho, u, inv, EU, ic, zp, mrs, at };
};

// Sections 9.1-9.6: one risk type, a contract with payout q = s L and premium r = p q + m.
M.b09_space = function ({ p, rho, s, m }) {
  const T = M.b09_tools(rho), { HE, SE, L } = T;
  const q = s * L, r = p * q + m;
  const [IH, IS] = T.at(q, r);
  const EU0 = T.EU(p, HE, SE), EU = T.EU(p, IH, IS);
  const CE0 = T.inv(EU0), CE = T.inv(EU), EI = HE - p * L;
  const over = IS > IH + 0.5, loss = m < -0.5, worse = EU < EU0 - 1e-9;
  const region = over ? 'R1' : loss ? 'R3' : worse ? 'R2' : 'F';
  return { ...T, p, s, m, q, r, IH, IS, EU0, EU, CE0, CE, EI, gain: CE - CE0, profit: m, region,
    slopeZ: -(1 - p) / p, slopeIC: -T.mrs(p, IH, IS), icE: T.ic(p, EU0), icC: T.ic(p, EU), line: T.zp(p) };
};

M.b09_where = {
  R1: 'R1: overfull insurance (I_S > I_H)',
  R2: 'R2: worse for her than no insurance',
  R3: 'R3: loses money for the insurer',
  F: 'F: the feasible contract wedge'
};

EX.push({
  id: 'b09-space', ch: 9, title: 'Contracts in the I_H–I_S space',
  ghost: 'Dashed gray: zero-profit line at the baseline p = 0.25',
  ref: 'BHT Sections 9.1–9.6, Eq. (9.2), Figures 9.2, 9.6, 9.8 and 9.10',
  anchors: [],
  intro: 'Each point of the plane is a contract: income if healthy I_H on the horizontal axis, income if sick I_S on the vertical axis. Without insurance she is at E. A contract pays q = s(H_E − S_E) if she is sick for a premium r = pq + m, so m is the insurer’s expected profit. BHT’s chapter has no numbers: the endowment ($50,000 and $10,000), p = 0.25, U(I) = I^ρ with ρ = 0.5 and the baseline contract (s = 0.5, m = $1,000) are illustrative, as in the Chapter 7 examples. Move the contract and see in which region of BHT Figure 9.8 it falls.',
  eq: String.raw`I_H=H_E-r,\quad I_S=S_E-r+q,\qquad \text{zero profit: } I_S=\frac{1-p}{p}\,(H_E-I_H)+S_E,\qquad \left.\frac{dI_S}{dI_H}\right|_{U}=-\frac{(1-p)\,U'(I_H)}{p\,U'(I_S)}`,
  params: [
    { id: 's', label: 'Payout as a share of the loss, s = q/(H_E − S_E)', min: 0, max: 1.25, step: 0.01, book: 0.5, d: 2 },
    { id: 'm', label: 'Insurer’s expected profit m = r − pq ($)', min: -3000, max: 5000, step: 50, book: 1000, d: 0 },
    { id: 'p', label: 'Probability of sickness p', min: 0.05, max: 0.75, step: 0.01, book: 0.25, d: 2 },
    { id: 'rho', label: 'Utility exponent ρ in U(I) = I^ρ', min: 0.1, max: 1, step: 0.05, book: 0.5, d: 2 }
  ],
  presets: [
    { label: 'Ω: fair and full', values: { s: 1, m: 0 } },
    { label: 'Fair but partial', values: { s: 0.5, m: 0 } },
    { label: 'Overfull, fair', values: { s: 1.2, m: 0 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b09_space(S),
  outputs: (S, R, B) => [
    { label: 'Payout q and premium r', v: M.b09_usd(R.q) + ', ' + M.b09_usd(R.r), b: M.b09_usd(B.q) + ', ' + M.b09_usd(B.r) },
    { label: 'Contract (I_H, I_S)', v: `(${M.b09_usd(R.IH)}, ${M.b09_usd(R.IS)})`, b: `(${M.b09_usd(B.IH)}, ${M.b09_usd(B.IS)})` },
    { label: 'Region of BHT Figure 9.8', v: M.b09_where[R.region], b: M.b09_where[B.region], key: true },
    { label: 'Slope of the zero-profit line −(1 − p)/p', v: M.b09_slope(R.slopeZ), b: M.b09_slope(B.slopeZ) },
    { label: 'Slope of her indifference curve at the contract', v: M.b09_slope(R.slopeIC), b: M.b09_slope(B.slopeIC) },
    { label: 'Sure income worth the same: E, contract', v: M.b09_usd(R.CE0) + ', ' + M.b09_usd(R.CE), b: M.b09_usd(B.CE0) + ', ' + M.b09_usd(B.CE) },
    { label: 'Her gain over E, in sure dollars', v: M.b09_usd(R.gain), b: M.b09_usd(B.gain), key: true }
  ],
  verdict: (S, R) => R.region === 'F'
    ? { tone: S.s > 0.9999 && S.s < 1.0001 && Math.abs(S.m) < 0.5 ? 'ok' : 'neutral', text: Math.abs(S.m) < 0.5 && Math.abs(S.s - 1) < 1e-4 ? `This is Ω: fair and full, she gets ${M.b09_usd(R.EI)} in both states and her indifference curve is tangent to the zero-profit line.` : `Both sides accept: she gains ${M.b09_usd(R.gain)} in sure income and the insurer earns ${M.b09_usd(S.m)} per contract, but a rival could offer her more and still profit.` }
    : R.region === 'R1' ? { tone: 'warn', text: `Overfull insurance: she ends up richer if sick (${M.b09_usd(R.IS)}) than if healthy (${M.b09_usd(R.IH)}), so the contract adds back risk that a fair full contract would remove.` }
    : R.region === 'R3' ? { tone: 'bad', text: `The insurer expects to lose ${M.b09_usd(-S.m)} per contract: the contract lies northeast of the zero-profit line and nobody offers it.` }
    : { tone: 'bad', text: `She is worse off than uninsured by ${M.b09_usd(-R.gain)} of sure income: the contract lies below her indifference curve through E.` },
  chart(el, S, R, B) {
    const K = 1000, x1 = 55, x0 = Math.min(15, Math.floor(R.EI / K) - 5), y0 = 5, y1 = y0 + x1 - x0;
    const P = Plot(el, { x0, x1, y0, y1, square: true, xlabel: 'Income if healthy I_H ($ thousand)', ylabel: 'Income if sick I_S ($ thousand)', aria: 'Contracts, zero-profit line and indifference curves in the space of incomes when healthy and sick' });
    // feasible wedge F: below the full-insurance line and the zero-profit line, above the indifference curve through E
    const lo = R.CE0 / K, pts = [], back = [];
    for (let i = 0; i <= 120; i++) {
      const x = lo + (R.HE / K - lo) * i / 120, top = Math.min(x, R.line(x * K) / K), bot = R.icE(x * K) / K;
      if (top >= bot - 1e-9) { pts.push([x, top]); back.unshift([x, bot]); }
    }
    if (pts.length > 1) P.area(pts.concat(back), 'f-band');
    P.fn(x => x, 's-gray');
    if (Math.abs(S.p - 0.25) > 1e-9) P.fn(x => B.line(x * K) / K, 'ghost');
    P.fn(x => R.line(x * K) / K, 's-pri thick');
    P.fn(x => R.icE(x * K) / K, 's-gray dash', x0, x1, 240);
    if (Math.abs(R.EU - R.EU0) > 1e-9) P.fn(x => R.icC(x * K) / K, 's-sec', x0, x1, 240);
    P.text(Math.max(x0, y0) + 4, Math.max(x0, y0) + 1, 'full insurance', 'muted', 'start');
    P.pt(R.HE / K, R.SE / K, 'p-ink', 'E', 8, 4);
    P.pt(R.EI / K, R.EI / K, 'p-hollow', 'Ω', -8, -8, 'end');
    P.pt(R.IH / K, R.IS / K, 'p-sec', 'C', -8, 4, 'end');
    P.draw();
  },
  notice: 'The blue zero-profit line goes through E with slope −(1 − p)/p; the gray dashed curve is her indifference curve through E. The green wedge F between them, below the 45° line, holds every contract both sides accept. Only at Ω, fair and full, is her indifference curve (red, through the contract) tangent to the zero-profit line, so no rival can lure her away at a profit.',
  challenges: [
    { q: 'Move to the fair contract that covers 80% of the loss (s = 0.8, m = 0). At that contract, compared with the zero-profit line, her indifference curve is…', change: { s: 0.8, m: 0 }, options: ['steeper', 'flatter', 'equally steep'], judge: (b, a) => Math.abs(a.slopeIC) > Math.abs(a.slopeZ) + 1e-6 ? 0 : Math.abs(a.slopeIC) < Math.abs(a.slopeZ) - 1e-6 ? 1 : 2,
      why: (b, a) => `Flatter: ${M.b09_slope(a.slopeIC)} against ${M.b09_slope(a.slopeZ)}. Below the 45° line she is poorer when sick, so a sick-state dollar is worth more to her than (1 − p)/p healthy-state dollars’ worth of fair premium; the zero-profit line therefore offers more sick-state income than she requires, and moving toward full insurance makes her better off. The two slopes are equal only on the 45° line.` },
    { q: 'Make her almost risk-neutral: raise ρ from 0.5 to 0.9, keeping the baseline contract. In which region is it now?', change: { rho: 0.9 }, options: ['F, she still buys it', 'R2, she prefers no insurance', 'R3, the insurer loses money'], judge: (b, a) => a.region === 'F' ? 0 : a.region === 'R2' ? 1 : 2,
      why: (b, a) => `${a.region === 'R2' ? 'R2' : a.region}: her gain moves from ${M.b09_usd(b.gain)} to ${M.b09_usd(a.gain)}. With little curvature in U, the risk the contract removes is worth less than the $1,000 loading, so her indifference curve through E flattens toward the zero-profit line and the wedge F shrinks.` },
    { q: 'Offer a fair contract that pays 120% of the loss (s = 1.2, m = 0). Compared with no insurance, she is…', change: { s: 1.2, m: 0 }, options: ['better off', 'worse off', 'equally well off'], judge: (b, a) => a.gain > 0.5 ? 0 : a.gain < -0.5 ? 1 : 2,
      why: (b, a) => `Better off: ${M.b09_usd(a.gain)} of sure income above E, yet the contract is in R1. It removes most of the risk (incomes ${M.b09_usd(a.IH)} and ${M.b09_usd(a.IS)}), but the fair full contract Ω gives her ${M.b09_usd(a.EI)} for sure, which she values more; no one would choose overfull coverage when Ω is available.` }
  ]
});

// Sections 9.7-9.9: two risk types and a candidate pooling contract alpha on the population zero-profit line.
// An entrant offers delta: a share k less coverage, at the premium halfway between the one that leaves
// the robust indifferent to alpha and the one that leaves the frail indifferent to alpha.
M.b09_pool = function ({ pr, pf, th, s, k, rho = 0.5 }) {
  pr = Math.min(pr, pf - 0.01);
  const T = M.b09_tools(rho), { HE, SE, L } = T;
  const pb = th * pr + (1 - th) * pf;
  const q = s * L, r = pb * q, [IH, IS] = T.at(q, r);
  const URa = T.EU(pr, IH, IS), UFa = T.EU(pf, IH, IS), URE = T.EU(pr, HE, SE), UFE = T.EU(pf, HE, SE);
  const delta = kk => {
    const qd = (1 - kk) * q;
    const prem = (p, V) => M.bisect(x => T.EU(p, HE - x, SE - x + qd) - V, -L, SE + qd - 1);   // premium that leaves type p at utility V
    const rR = prem(pr, URa), rF = prem(pf, UFa), rd = (rR + rF) / 2;
    return { qd, rR, rF, rd, profit: rd - pr * qd };
  };
  const robustIn = URa >= URE - 1e-9, frailIn = UFa >= UFE - 1e-9;
  // if the robust do not buy alpha there is nothing to undercut: delta is not computed
  const { qd, rR, rF, rd } = robustIn ? delta(k) : { qd: NaN, rR: NaN, rF: NaN, rd: NaN };
  const fk = kk => delta(kk).profit;
  const kmax = !robustIn ? NaN : fk(0.999) > 0 ? 1 : M.bisect(fk, 1e-4, 0.999, 1e-7);   // largest cut at which delta still profits
  const [dH, dS] = T.at(qd, rd);
  const URd = T.EU(pr, dH, dS), UFd = T.EU(pf, dH, dS);
  return { ...T, pr, pf, pb, th, s, k, q, r, IH, IS, qd, rd, dH, dS, rR, rF,
    CERa: T.inv(URa), CEFa: T.inv(UFa), CERE: T.inv(URE), CEFE: T.inv(UFE), CERd: T.inv(URd), CEFd: T.inv(UFd),
    robustIn, frailIn, kmax, entrant: rd - pr * qd, leftover: r - pf * q,
    icR: T.ic(pr, URa), icF: T.ic(pf, UFa), lineR: T.zp(pr), lineF: T.zp(pf), lineP: T.zp(pb) };
};

EX.push({
  id: 'b09-pooling', ch: 9, title: 'Why no pooling contract survives',
  ghost: '',
  ref: 'BHT Sections 9.7–9.9, Figures 9.11, 9.15 and 9.16',
  anchors: [],
  intro: 'Robust and frail customers share the endowment E and the utility U(I) = I^ρ (ρ = 0.5) but fall sick with probabilities p_r < p_f; the insurer cannot tell them apart. A pooling contract α pays a share s of the loss at the premium p_avg·q that breaks even when everyone buys, so it lies on the population zero-profit line. An entrant then offers δ with a share k less coverage and a premium cut chosen to attract the robust only. The probabilities (0.25 and 0.5), the 60% share of robust types, s = 0.5 and k = 0.25 are illustrative; BHT’s chapter has no numbers.',
  eq: String.raw`p_{avg}=\theta\,p_r+(1-\theta)\,p_f,\qquad \alpha:\ r=p_{avg}\,q,\qquad \delta:\ E[U]_r(\delta)>E[U]_r(\alpha),\ \ E[U]_f(\delta)<E[U]_f(\alpha),\ \ r_\delta>p_r\,q_\delta`,
  params: [
    { id: 's', label: 'Coverage of the pooling contract α, s = q/(H_E − S_E)', min: 0.05, max: 1, step: 0.01, book: 0.5, d: 2 },
    { id: 'th', label: 'Share of robust types θ', min: 0, max: 0.98, step: 0.01, book: 0.6, d: 2 },
    { id: 'pf', label: 'Probability of sickness, frail p_f', min: 0.3, max: 0.9, step: 0.01, book: 0.5, d: 2 },
    { id: 'k', label: 'Entrant’s cut in coverage k (share of α’s payout)', min: 0.05, max: 0.95, step: 0.01, book: 0.25, d: 2 }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b09_pool({ ...S, pr: 0.25 }),
  outputs: (S, R, B) => [
    { label: 'Pooled price p_avg and α (payout, premium)', v: `${M.b09_p(R.pb)}; ${M.b09_usd(R.q)}, ${M.b09_usd(R.r)}`, b: `${M.b09_p(B.pb)}; ${M.b09_usd(B.q)}, ${M.b09_usd(B.r)}` },
    { label: 'Sure income at α vs at E: robust', v: M.b09_usd(R.CERa) + ' vs ' + M.b09_usd(R.CERE), b: M.b09_usd(B.CERa) + ' vs ' + M.b09_usd(B.CERE) },
    { label: 'Sure income at α vs at E: frail', v: M.b09_usd(R.CEFa) + ' vs ' + M.b09_usd(R.CEFE), b: M.b09_usd(B.CEFa) + ' vs ' + M.b09_usd(B.CEFE) },
    { label: 'Entrant’s δ (payout, premium)', v: R.robustIn ? M.b09_usd(R.qd) + ', ' + M.b09_usd(R.rd) : M.b09_none, b: M.b09_usd(B.qd) + ', ' + M.b09_usd(B.rd) },
    { label: 'Gain from δ over α in sure income: robust, frail', v: R.robustIn ? M.b09_usd(R.CERd - R.CERa) + ', ' + M.b09_usd(R.CEFd - R.CEFa) : M.b09_none, b: M.b09_usd(B.CERd - B.CERa) + ', ' + M.b09_usd(B.CEFd - B.CEFa) },
    { label: 'Entrant’s expected profit per robust customer', v: R.robustIn ? M.b09_usd(R.entrant) : M.b09_none, b: M.b09_usd(B.entrant), key: true },
    { label: 'Largest cut k at which such a δ still profits', v: R.robustIn ? nf(R.kmax, 3) : M.b09_none, b: nf(B.kmax, 3) },
    { label: 'α’s expected profit per customer once only the frail stay', v: M.b09_usd(R.leftover), b: M.b09_usd(B.leftover), key: true }
  ],
  verdict: (S, R) => !R.robustIn
    ? { tone: 'bad', text: `The robust prefer no insurance to α (${M.b09_usd(R.CERE)} against ${M.b09_usd(R.CERa)} in sure income): α is not a pooling contract at all, and with only the frail it loses ${M.b09_usd(-R.leftover)} per customer.` }
    : R.entrant > 0.5
      ? { tone: 'bad', text: `α is broken: δ takes the robust and earns ${M.b09_usd(R.entrant)} on each, while α, left with the frail, loses ${M.b09_usd(-R.leftover)} per customer.` }
      : { tone: 'warn', text: `This δ cuts coverage too much: it attracts only the robust but loses ${M.b09_usd(-R.entrant)} on each. Any cut below k = ${nf(R.kmax, 3)} profits, so α still fails.` },
  chart(el, S, R, B) {
    const K = 1000, x1 = 55, x0 = Math.min(25, Math.floor(R.IH / K) - 5), y0 = 5, y1 = y0 + x1 - x0;
    const P = Plot(el, { x0, x1, y0, y1, square: true, xlabel: 'Income if healthy I_H ($ thousand)', ylabel: 'Income if sick I_S ($ thousand)', aria: 'Pooling contract alpha and the cream-skimming contract delta' });
    // the triangle of BHT Figure 9.16: above the robust curve through alpha, below the frail curve and the robust zero-profit line
    const top = [], bot = [];
    for (let i = 0; i <= 120; i++) {
      const x = R.IH / K + (R.HE - R.IH) / K * i / 120, hi = Math.min(R.icF(x * K), R.lineR(x * K)) / K, lo = R.icR(x * K) / K;
      if (hi > lo) { top.push([x, hi]); bot.unshift([x, lo]); }
    }
    if (top.length > 1) P.area(top.concat(bot), 'f-band');
    P.fn(x => x, 's-gray');
    P.fn(x => R.lineR(x * K) / K, 's-grn', x0, x1);
    P.fn(x => R.lineF(x * K) / K, 's-sec', x0, x1);
    P.fn(x => R.lineP(x * K) / K, 's-pri dash', x0, x1);
    P.fn(x => R.icR(x * K) / K, 's-grn thin dash', x0, x1, 240);
    P.fn(x => R.icF(x * K) / K, 's-sec thin dash', x0, x1, 240);
    P.text(Math.max(x0, y0) + 4, Math.max(x0, y0) + 1, 'full insurance', 'muted', 'start');
    P.pt(R.HE / K, R.SE / K, 'p-ink', 'E', 8, 4);
    P.pt(R.IH / K, R.IS / K, 'p-pri', 'α', -8, -8, 'end');
    P.pt(R.dH / K, R.dS / K, 'p-grn', 'δ', 8, 16);
    P.draw();
  },
  notice: 'Green is robust, red frail, blue dashed the population zero-profit line. Through α the robust indifference curve (green dashed) is steeper than the frail one (red dashed), so they open a wedge to the right of α. Any contract in the green area, like δ, lures only the robust and lies below their zero-profit line, wherever α sits on the blue line.',
  challenges: [
    { q: 'Make the pooling contract full: s = 1, priced at p_avg. Do the robust prefer it to staying uninsured?', change: { s: 1 }, options: ['Yes', 'No'], judge: (b, a) => a.robustIn ? 0 : 1,
      why: (b, a) => `No: full pooled coverage is worth ${M.b09_usd(a.CERa)} of sure income to them, against ${M.b09_usd(a.CERE)} uninsured. At p_avg = ${M.b09_p(a.pb)} each dollar of coverage costs them more than its expected value at p_r = 0.25, and buying full coverage magnifies that overcharge. Pooling may then fail the first condition before any rival enters.` },
    { q: 'Raise the share of robust types to θ = 0.9, so α is priced almost as for the robust. Is there still some cut in coverage at which a δ that attracts only the robust makes a profit?', change: { th: 0.9 }, options: ['Yes', 'No, the margin is gone'], judge: (b, a) => a.kmax > 1e-3 && a.robustIn ? 0 : 1,
      why: (b, a) => `Yes, but only for cuts up to k = ${nf(a.kmax, 3)} (up to ${nf(b.kmax, 3)} at θ = 0.6); at k = 0.25 δ would lose ${M.b09_usd(-a.entrant)} per customer. As long as some frail types share α, the robust pay more than their expected cost (p_avg = ${M.b09_p(a.pb)} against p_r = 0.25), so a contract only they choose can undercut it; more robust types only shrink the triangle.` },
    { q: 'Raise the share of robust types from 0.6 to 0.75, so α becomes cheaper. Once δ has taken the robust away, the expected profit per customer of the firm offering α…', change: { th: 0.75 }, options: ['moves toward zero', 'becomes more negative', 'does not change'], judge: (b, a) => a.leftover > b.leftover + 0.5 ? 0 : a.leftover < b.leftover - 0.5 ? 1 : 2,
      why: (b, a) => `It becomes more negative, from ${M.b09_usd(b.leftover)} to ${M.b09_usd(a.leftover)}. α charges p_avg·q = ${M.b09_p(a.pb)} × ${M.b09_usd(a.q)} = ${M.b09_usd(a.r)}, but the frail who stay cost p_f·q = ${M.b09_usd(a.pf * a.q)}: the more robust types in the pool, the larger the subsidy built into α and the larger the loss once they leave.` },
    { q: 'Let the entrant cut coverage much more, k = 0.8. Is δ still profitable?', change: { k: 0.8 }, options: ['Yes', 'No'], judge: (b, a) => a.entrant > 0.5 ? 0 : 1,
      why: (b, a) => `${a.entrant > 0.5 ? 'Yes' : 'No'}: profit per robust customer ${M.b09_usd(a.entrant)} (${M.b09_usd(b.entrant)} at k = 0.25). The triangle between the two indifference curves is closed by the robust zero-profit line, so profitable deviations stay close to α: cuts up to k = ${nf(a.kmax, 3)} work, a bigger cut needs so large a premium discount to win the robust that it loses money.` }
  ]
});

// Sections 9.10-9.12: the separating pair (Omega_1, Omega_3) and its existence.
M.b09_sepCore = function ({ pr, pf, rho }) {
  pr = Math.min(pr, pf - 0.01);
  const T = M.b09_tools(rho), { HE, SE, L } = T;
  const I1 = HE - pf * L, I2 = HE - pr * L, UF1 = T.u(I1);
  const q3 = M.bisect(q => T.EU(pf, HE - pr * q, SE + (1 - pr) * q) - UF1, 0, L);
  const [H3, S3] = T.at(q3, pr * q3), UR3 = T.EU(pr, H3, S3);
  const best = pb => { const f = q => T.EU(pr, HE - pb * q, SE + (1 - pb) * q); const qb = M.argmax(f, 0, L).x; return { qb, U: f(qb) }; };
  return { T, pr, pf, I1, I2, UF1, q3, H3, S3, UR3, best };
};
M.b09_sep = function ({ pr, pf, th, rho }) {
  const C = M.b09_sepCore({ pr, pf, rho }), T = C.T, { HE, SE, L } = T;
  const pb = th * C.pr + (1 - th) * pf, bp = C.best(pb);
  const breaks = bp.U > C.UR3 + 1e-9;
  const g = t => C.best(t * C.pr + (1 - t) * pf).U - C.UR3;
  const thStar = g(0) >= 0 ? 0 : g(1) <= 0 ? 1 : M.bisect(g, 0, 1, 1e-9);
  const [bH, bS] = T.at(bp.qb, pb * bp.qb);
  return { ...T, ...C, pb, qb: bp.qb, bH, bS, UR4: bp.U, breaks, thStar, exists: !breaks,
    cov3: C.q3 / L, prem3: C.pr * C.q3, CER3: T.inv(C.UR3), CER2: C.I2, CERb: T.inv(bp.U), CERE: T.inv(T.EU(C.pr, HE, SE)), CEF1: C.I1,
    icR: T.ic(C.pr, C.UR3), icF: T.ic(pf, C.UF1), lineR: T.zp(C.pr), lineF: T.zp(pf), lineP: T.zp(pb) };
};

EX.push({
  id: 'b09-separating', ch: 9, title: 'The separating equilibrium and when it fails',
  ghost: '',
  ref: 'BHT Sections 9.10–9.12, Figures 9.14 and 9.17–9.19',
  anchors: [],
  intro: 'With hidden types, the frail buy Ω₁, full insurance at their own fair price. The robust get Ω₃, the most coverage on their own zero-profit line that does not tempt the frail away from Ω₁. The pair is an equilibrium unless a contract on the population zero-profit line beats Ω₃ for the robust (region R4 of BHT Figure 9.18). With symmetric information the robust would get Ω₂. The endowment, U(I) = I^ρ, p_r = 0.25, p_f = 0.5 and the 60% share of robust types are illustrative; BHT’s chapter has no numbers.',
  eq: String.raw`\Omega_1:\ I_H=I_S=H_E-p_f(H_E-S_E),\qquad \Omega_3:\ r=p_r q,\ \ E[U]_f(\Omega_3)=U(\Omega_1),\qquad \text{exists iff } \max_{q}\,E[U]_r\big(H_E-p_{avg}q,\ S_E+(1-p_{avg})q\big)\le E[U]_r(\Omega_3)`,
  params: [
    { id: 'th', label: 'Share of robust types θ', min: 0, max: 1, step: 0.01, book: 0.6, d: 2 },
    { id: 'pr', label: 'Probability of sickness, robust p_r', min: 0.05, max: 0.6, step: 0.01, book: 0.25, d: 2 },
    { id: 'pf', label: 'Probability of sickness, frail p_f', min: 0.2, max: 0.9, step: 0.01, book: 0.5, d: 2 },
    { id: 'rho', label: 'Utility exponent ρ in U(I) = I^ρ (both types)', min: 0.05, max: 0.95, step: 0.05, book: 0.5, d: 2 }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b09_sep(S),
  outputs: (S, R, B) => [
    { label: 'Ω₁ for the frail: payout, premium', v: M.b09_usd(R.L) + ', ' + M.b09_usd(R.pf * R.L), b: M.b09_usd(B.L) + ', ' + M.b09_usd(B.pf * B.L) },
    { label: 'Ω₃ for the robust: payout, premium', v: M.b09_usd(R.q3) + ', ' + M.b09_usd(R.prem3), b: M.b09_usd(B.q3) + ', ' + M.b09_usd(B.prem3) },
    { label: 'Robust coverage at Ω₃ (share of the loss)', v: pct(R.cov3, 1), b: pct(B.cov3, 1), key: true },
    { label: 'Robust sure income: E, Ω₃, Ω₂ (symmetric information)', v: [R.CERE, R.CER3, R.CER2].map(x => M.b09_usd(x)).join(', '), b: [B.CERE, B.CER3, B.CER2].map(x => M.b09_usd(x)).join(', ') },
    { label: 'Robust sure income at the best pooled contract', v: M.b09_usd(R.CERb), b: M.b09_usd(B.CERb) },
    { label: 'Separating equilibrium exists?', v: R.exists ? 'yes' : 'no', b: B.exists ? 'yes' : 'no', key: true },
    { label: 'Largest share of robust types θ* with an equilibrium', v: nf(R.thStar, 3), b: nf(B.thStar, 3) }
  ],
  verdict: (S, R) => R.exists
    ? { tone: 'ok', text: `(Ω₁, Ω₃) is an equilibrium: the robust get ${pct(R.cov3, 0)} of the loss covered, worth ${M.b09_usd(R.CER3)} to them, more than the best pooled contract (${M.b09_usd(R.CERb)}). It survives as long as θ ≤ ${nf(R.thStar, 3)}.` }
    : { tone: 'bad', text: `No equilibrium: with θ = ${nf(S.th, 2)} > θ* = ${nf(R.thStar, 3)}, a pooled contract worth ${M.b09_usd(R.CERb)} to the robust (and preferred by the frail too) beats Ω₃ (${M.b09_usd(R.CER3)}) and makes a profit.` },
  chart(el, S, R, B) {
    const K = 1000, x1 = 55, x0 = Math.min(15, Math.floor(R.I1 / K) - 3), y0 = 5, y1 = y0 + x1 - x0;
    const P = Plot(el, { x0, x1, y0, y1, square: true, xlabel: 'Income if healthy I_H ($ thousand)', ylabel: 'Income if sick I_S ($ thousand)', aria: 'Separating contracts Omega 1 and Omega 3 and the region that breaks them' });
    // region R4: contracts both types prefer to their own, below the population zero-profit line
    const top = [], bot = [];
    for (let i = 0; i <= 160; i++) {
      const x = x0 + (R.HE / K - x0) * i / 160, hi = R.lineP(x * K) / K, lo = Math.max(R.icR(x * K), R.icF(x * K)) / K;
      if (hi > lo) { top.push([x, hi]); bot.unshift([x, lo]); }
    }
    if (top.length > 1) P.area(top.concat(bot), 'f-sec');
    P.fn(x => x, 's-gray');
    P.fn(x => R.lineR(x * K) / K, 's-grn', x0, x1);
    P.fn(x => R.lineF(x * K) / K, 's-sec', x0, x1);
    P.fn(x => R.lineP(x * K) / K, 's-pri dash', x0, x1);
    P.fn(x => R.icR(x * K) / K, 's-grn thin dash', x0, x1, 240);
    P.fn(x => R.icF(x * K) / K, 's-sec thin dash', x0, x1, 240);
    P.text(Math.max(x0, y0) + 4, Math.max(x0, y0) + 1, 'full insurance', 'muted', 'start');
    P.pt(R.HE / K, R.SE / K, 'p-ink', 'E', 8, 4);
    P.pt(R.I1 / K, R.I1 / K, 'p-sec', 'Ω₁', 10, 16);
    P.pt(R.I2 / K, R.I2 / K, 'p-hollow', 'Ω₂', -8, -8, 'end');
    P.pt(R.H3 / K, R.S3 / K, 'p-grn', 'Ω₃', 8, -8);
    if (R.breaks) P.pt(R.bH / K, R.bS / K, 'p-pri small', 'R4', -8, 14, 'end');
    P.draw();
  },
  notice: 'Ω₃ sits where the frail indifference curve through Ω₁ (red dashed) crosses the robust zero-profit line (green): the robust are rationed to keep the frail honest. Raise the share of robust types and the blue population line rotates toward the green one; once it rises above the robust curve through Ω₃ (green dashed), the red region R4 appears and the pair breaks down.',
  challenges: [
    { q: 'Raise the share of robust types from 0.6 to 0.85. Does a separating equilibrium still exist?', change: { th: 0.85 }, options: ['Yes', 'No'], judge: (b, a) => a.exists ? 0 : 1,
      why: (b, a) => `No: θ* = ${nf(a.thStar, 3)}. With many robust types the pooled price ${M.b09_p(a.pb)} is close to p_r, and a pooled contract worth ${M.b09_usd(a.CERb)} to the robust beats Ω₃ (${M.b09_usd(a.CER3)}); the frail also take it, yet it breaks even on the mix.` },
    { q: 'Raise the share of robust types from 0.6 to 0.75. The coverage the robust get at Ω₃…', change: { th: 0.75 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.cov3 > b.cov3 + 1e-6 ? 0 : a.cov3 < b.cov3 - 1e-6 ? 1 : 2,
      why: (b, a) => `It stays at ${pct(a.cov3, 1)}. Ω₁ and Ω₃ depend only on each type’s own zero-profit line and on the frail indifference curve, not on how many of each type there are; the mix matters only for whether the pair survives (θ* = ${nf(a.thStar, 3)}).` },
    { q: 'Make the frail sicker: p_f from 0.5 to 0.6. The robust coverage at Ω₃…', change: { pf: 0.6 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.cov3 > b.cov3 + 1e-6 ? 0 : a.cov3 < b.cov3 - 1e-6 ? 1 : 2,
      why: (b, a) => `It falls from ${pct(b.cov3, 1)} to ${pct(a.cov3, 1)}. Ω₁ becomes more expensive for the frail, so the robust contract, priced at p_r, tempts them more and must be rationed further to keep them at Ω₁. The robust bear the cost of the frail being riskier.` },
    { q: 'Make the robust riskier and closer to the frail: p_r from 0.25 to 0.4. The robust’s loss from hidden information, the sure income at Ω₂ minus that at Ω₃…', change: { pr: 0.4 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => (a.CER2 - a.CER3) > (b.CER2 - b.CER3) + 0.5 ? 0 : (a.CER2 - a.CER3) < (b.CER2 - b.CER3) - 0.5 ? 1 : 2,
      why: (b, a) => `It falls from ${M.b09_usd(b.CER2 - b.CER3)} to ${M.b09_usd(a.CER2 - a.CER3)}. When the types are more alike, a contract priced for the robust is less of a bargain for the frail, so the robust can be offered more coverage (${pct(a.cov3, 1)} instead of ${pct(b.cov3, 1)}) without attracting them.` }
  ]
});
