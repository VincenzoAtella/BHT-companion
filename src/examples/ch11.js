// ===== BHT Chapter 11: Moral hazard =====
// solvers for this chapter: M.b11_<name>
// Demand for care (visits per year) is linear and passes through 8 visits at $100 a visit:
// Q(P) = max(0, 8 + s (100 − P)), where s (visits per dollar) measures price sensitivity.

M.b11_usd = (x, d = 0) => isFinite(x) ? (x < -1e-9 ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';
M.b11_Q = s => P => Math.max(0, 8 + s * (100 - P));
M.b11_Pinv = s => q => 100 + (8 - q) / s;           // marginal benefit of the q-th visit (s > 0)

// Sections 11.2-11.3: social loss from a price distortion, with coinsurance or a copay.
M.b11_costshare = function ({ plan, c, PC, PU, s }) {
  const Q = M.b11_Q(s);
  const PI = plan === 'copay' ? Math.min(PC, PU) : c * PU;   // out-of-pocket price per visit
  const QU = Q(PU), QI = Q(PI);
  const wedge = PU - PI;                                       // extent of price distortion
  const loss = 0.5 * wedge * (QI - QU);                        // = s * wedge^2 / 2 while QU > 0
  const lossFull = 0.5 * PU * (Q(0) - QU);
  return { plan, PU, PI, QU, QI, extra: QI - QU, wedge, loss, lossFull, insurer: wedge * QI, oop: PI * QI,
    elast: QU > 0 ? (s > 0 ? -s * PU / QU : 0) : NaN, s };
};

// Section 11.3, Figure 11.5: a deductible D (in dollars) followed by a copay PC.
// The deductible is used up after Omega = D / PU visits. With linear demand the patient crosses
// the deductible iff the gain YZB exceeds the loss UXY, i.e. iff Omega < (QU + QB) / 2.
M.b11_deductible = function ({ D, PC, PU, s }) {
  PC = Math.min(PC, PU);
  const Q = M.b11_Q(s);
  const QU = Q(PU), QB = Q(PC), Om = D / PU;
  const crosses = Om < (QU + QB) / 2 - 1e-9 && QB > QU + 1e-9;
  const between = Om > QU && Om < QB;
  const tri = w => s > 0 ? w * w / (2 * s) : 0;               // triangle between demand and a flat price over a width w
  const UXY = Om > QU ? tri(Om - QU) : 0;                    // surplus lost on visits QU..Omega paid at PU
  const YZB = Om < QB ? tri(QB - Math.max(Om, QU)) : 0;      // surplus gained on visits Omega..QB paid at PC
  const q = crosses ? QB : QU;
  const oop = q <= Om ? PU * q : D + PC * (q - Om);
  const insurer = q <= Om ? 0 : (PU - PC) * (q - Om);
  const loss = crosses ? 0.5 * (PU - PC) * (QB - QU) : 0;
  return { D, PC, PU, s, QU, QB, Om, crosses, between, UXY, YZB, q, oop, insurer, loss,
    Dstar: PU * (QU + QB) / 2, lossCopay: 0.5 * (PU - PC) * (QB - QU) };
};

// Section 11.5, Figures 11.6-11.9: Pauly's trade-off. Coverage x pays x·L if ill; the illness
// rate rises with coverage, p(x) = p0 + dp·x; a zero-profit premium per unit of coverage is r = p(x).
M.b11_pauly = function ({ Y, L, p0, dp, g }) {
  const U = M.crra(g);
  const pr = x => p0 + dp * x;
  const EUat = (x, r) => { const p = pr(x); return p * U.u(Y - L + x * L - r * x * L) + (1 - p) * U.u(Y - r * x * L); };
  const EU = x => EUat(x, pr(x));
  const opt = M.argmaxGrid(EU, 0, 1, 400);
  const xA = opt.x < 1e-3 ? 0 : opt.x > 1 - 1e-3 ? 1 : opt.x;
  const CE = v => U.inv(v);
  const CEA = CE(EU(xA)), CE0 = CE(EU(0)), CEF = Y - p0 * L, CEFp = Y - (p0 + dp) * L;
  // indifference curve through utility level v: the premium per unit r that gives v at coverage x
  const indiff = v => x => {
    if (x < 0.02) return NaN;
    const r = M.bisect(rr => EUat(x, rr) - v, -1, 1.5, 1e-9);
    return r;
  };
  return { Y, L, p0, dp, g, pr, xA, rA: pr(xA), CEA, CE0, CEF, CEFp, mhLoss: CEF - CEA,
    EUA: EU(xA), EUF: U.u(CEF), EUFp: U.u(CEFp), indiff };
};

EX.push({
  id: 'b11-costshare', ch: 11, title: 'Price distortion, price sensitivity and social loss',
  ref: 'BHT Sections 11.2-11.3, Figures 11.1-11.3',
  anchors: [[11, 'might have to pay 20% of any'], [11, 'each visit to the doctor might cost $25']],
  intro: 'A visit costs P_U to produce, and without insurance the patient buys Q_U visits, where his marginal benefit equals P_U. Insurance lowers his out-of-pocket price to P_I, so he moves down his demand curve to Q_I, and the visits between Q_U and Q_I cost more than they are worth to him: the red triangle is the social loss. The 20% coinsurance and the $25 copay are BHT’s illustrations; the list price of $100, the 8 visits a year at that price and the slope s = 0.04 visits per dollar (an elasticity of −0.5 at the uninsured point) are illustrative.',
  eq: String.raw`P_I=c\,P_U\ \text{(coinsurance)}\ \text{or}\ P_C\ \text{(copay)},\qquad \text{social loss}=\tfrac12\,(P_U-P_I)(Q_I-Q_U)=\tfrac12\,s\,(P_U-P_I)^2`,
  params: [
    { id: 'c', label: 'Coinsurance rate c (coinsurance plan)', min: 0, max: 1, step: 0.05, book: 0.2, d: 2 },
    { id: 'PC', label: 'Copay per visit P_C ($, copay plan)', min: 0, max: 200, step: 5, book: 25, d: 0 },
    { id: 'PU', label: 'List price of a visit P_U ($)', min: 50, max: 200, step: 5, book: 100, d: 0 },
    { id: 's', label: 'Price sensitivity s (extra visits per $1 price cut)', min: 0, max: 0.08, step: 0.005, book: 0.04, d: 3 }
  ],
  toggles: [{ id: 'plan', label: 'Cost-sharing rule', options: [['coins', 'Coinsurance'], ['copay', 'Copay']], book: 'coins' }],
  presets: [
    { label: 'Full insurance (c = 0)', values: { plan: 'coins', c: 0 } },
    { label: '$25 copay', values: { plan: 'copay', PC: 25 } },
    { label: 'Insensitive demand (s = 0)', values: { s: 0 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b11_costshare(S),
  outputs: (S, R, B) => [
    { label: 'Out-of-pocket price P_I', v: M.b11_usd(R.PI, 2), b: M.b11_usd(B.PI, 2) },
    { label: 'Price distortion P_U − P_I', v: M.b11_usd(R.wedge, 2), b: M.b11_usd(B.wedge, 2) },
    { label: 'Visits uninsured Q_U and insured Q_I', v: nf(R.QU, 2) + ', ' + nf(R.QI, 2), b: nf(B.QU, 2) + ', ' + nf(B.QI, 2) },
    { label: 'Price elasticity at the uninsured point', v: isFinite(R.elast) ? nf(R.elast, 2).replace('-', '−') : 'n/a', b: nf(B.elast, 2).replace('-', '−') },
    { label: 'Social loss per person per year', v: M.b11_usd(R.loss, 2), b: M.b11_usd(B.loss, 2), key: true },
    { label: 'Social loss with full insurance', v: M.b11_usd(R.lossFull, 2), b: M.b11_usd(B.lossFull, 2) },
    { label: 'Insurer’s spending per person', v: M.b11_usd(R.insurer, 2), b: M.b11_usd(B.insurer, 2), key: true }
  ],
  verdict: (S, R) => R.loss < 0.005
    ? { tone: 'ok', text: R.wedge < 0.005 ? 'No price distortion: the patient pays the full cost of each visit and there is no moral hazard.' : `The price falls by ${M.b11_usd(R.wedge)} but visits do not respond, so there is no moral hazard and no social loss.` }
    : { tone: 'warn', text: `Insurance adds ${nf(R.extra, 2)} visits a year, each worth less than its ${M.b11_usd(S.PU)} cost: a social loss of ${M.b11_usd(R.loss, 2)} per person, ${pct(R.loss / R.lossFull, 0)} of the loss under full insurance.` },
  chart(el, S, R, B) {
    const x1 = Math.max(M.b11_Q(S.s)(0), 12) + 1, y1 = Math.max(S.PU, 100) * 1.5;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Visits per year Q', ylabel: 'Price per visit ($)', aria: 'Demand for visits, list price, out-of-pocket price and the social-loss triangle' });
    const bP = M.b11_Pinv(0.04);
    P.path([[B.QU, B.PU], [B.QI, B.PU], [B.QI, B.PI], [B.QU, B.PU]], 'ghost');
    P.fn(bP, 'ghost', 0, x1);
    if (R.loss > 1e-6) P.area([[R.QU, R.PU], [R.QI, R.PU], [R.QI, R.PI]], 'f-sec');
    if (S.s > 1e-9) P.fn(M.b11_Pinv(S.s), 's-pri thick', 0, x1);
    else P.seg(8, 0, 8, y1, 's-pri thick');
    P.hline(R.PU, 's-gray dash', 'P_U (cost of a visit)', 'end');
    if (R.PI > 0.5) P.hline(R.PI, 's-gray dash', 'P_I (out of pocket)', 'start');
    P.pt(R.QU, R.PU, 'p-pri', 'U', -8, -8, 'end');
    P.pt(R.QI, R.PI, 'p-sec', 'I', 8, -8);
    P.draw();
  },
  notice: 'The width of the red triangle is the extra care, its height the price distortion; both grow with the distortion, so the loss grows with its square, while a steeper demand curve (smaller s) shrinks only the width. The dashed outline is the baseline, 20% coinsurance.',
  challenges: [
    { q: 'Double the coinsurance rate, from 20% to 40%. The social loss falls by…', change: { c: 0.4 }, options: ['about 20 percent', 'about 44 percent', 'about 70 percent'], judge: (b, a) => { const f = 1 - a.loss / b.loss; return f > 0.6 ? 2 : f > 0.3 ? 1 : 0; },
      why: (b, a) => `It falls from ${M.b11_usd(b.loss, 2)} to ${M.b11_usd(a.loss, 2)}. The price distortion shrinks by a quarter, from ${M.b11_usd(b.wedge)} to ${M.b11_usd(a.wedge)}, and so does the extra care, so the triangle shrinks to (3/4)² of its size.` },
    { q: 'Make demand completely insensitive to price, s = 0, keeping 20% coinsurance. The social loss…', change: { s: 0 }, options: ['falls to zero', 'falls by about half', 'does not change, because the price distortion is still $80'], judge: (b, a) => a.loss < 1e-6 ? 0 : a.loss < 0.75 * b.loss ? 1 : 2,
      why: (b, a) => `It falls from ${M.b11_usd(b.loss, 2)} to ${M.b11_usd(a.loss, 2)}. Without a behavioral response the insurer still pays ${M.b11_usd(a.insurer)} per person, but that is a transfer for care the patient would have bought anyway: moral hazard needs both a price distortion and price sensitivity.` },
    { q: 'For a visit with a list price of $200, compare 20% coinsurance with a $25 copay. With the copay, the social loss is…', base: { plan: 'coins', PU: 200 }, change: { plan: 'copay', PU: 200 }, options: ['higher', 'lower', 'the same'], judge: (b, a) => a.loss > b.loss + 1e-6 ? 0 : a.loss < b.loss - 1e-6 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b11_usd(b.loss, 2)} to ${M.b11_usd(a.loss, 2)}. Coinsurance keeps the patient’s price proportional to the cost, here $40; a fixed $25 copay leaves a larger price distortion for costly services, even though it beats 20% coinsurance for a $100 visit.` },
    { q: 'Double price sensitivity, s from 0.04 to 0.08, keeping 20% coinsurance. The social loss…', change: { s: 0.08 }, options: ['doubles', 'quadruples', 'rises by less than double'], judge: (b, a) => { const r = a.loss / b.loss; return Math.abs(r - 2) < 0.01 ? 0 : Math.abs(r - 4) < 0.01 ? 1 : 2; },
      why: (b, a) => `It moves from ${M.b11_usd(b.loss, 2)} to ${M.b11_usd(a.loss, 2)}. The height of the triangle, the $80 distortion, is fixed and only the extra care doubles; the loss is proportional to s and to the square of the distortion, so the two factors multiply rather than add.` }
  ]
});

EX.push({
  id: 'b11-deductible', ch: 11, title: 'Deductible plus copay: does the patient cross the deductible?',
  ref: 'BHT Section 11.3, Figures 11.4-11.5',
  anchors: [[11, 'a person insured with a deductible of $1,000']],
  intro: 'The patient pays the full price P_U for every visit until his spending reaches the deductible, after Ω = D/P_U visits, and the copay P_C after that. Stopping at Q_U costs him nothing extra; going on to Q_B means buying the visits between Q_U and Ω at a price above their value (red triangle UXY) to reach the cheap visits between Ω and Q_B (green triangle YZB). He crosses only if YZB exceeds UXY. The $1,000 deductible and the $25 copay are BHT’s illustrations; the demand for visits (8 at $100, slope 0.04) is the illustrative one of the previous example.',
  eq: String.raw`\Omega=\frac{D}{P_U},\qquad \text{cross}\iff YZB>UXY\iff \Omega<\frac{Q_U+Q_B}{2}\ \text{(linear demand)},\qquad D^{*}=P_U\,\frac{Q_U+Q_B}{2}`,
  params: [
    { id: 'D', label: 'Deductible D ($)', min: 0, max: 1500, step: 25, book: 1000, d: 0 },
    { id: 'PC', label: 'Copay after the deductible P_C ($)', min: 0, max: 100, step: 5, book: 25, d: 0 },
    { id: 'PU', label: 'List price of a visit P_U ($)', min: 60, max: 200, step: 5, book: 100, d: 0 },
    { id: 's', label: 'Price sensitivity s (extra visits per $1 price cut)', min: 0.01, max: 0.08, step: 0.005, book: 0.04, d: 3 }
  ],
  presets: [{ label: 'Low deductible, $500', values: { D: 500 } }, { label: 'No deductible', values: { D: 0 } }],
  bookLabel: 'Baseline',
  compute: S => M.b11_deductible(S),
  outputs: (S, R, B) => [
    { label: 'Visits Q_U (full price) and Q_B (copay)', v: nf(R.QU, 2) + ', ' + nf(R.QB, 2), b: nf(B.QU, 2) + ', ' + nf(B.QB, 2) },
    { label: 'Visits needed to use up the deductible Ω', v: nf(R.Om, 2), b: nf(B.Om, 2) },
    { label: 'Surplus lost before the deductible (UXY)', v: R.Om < R.QU ? 'n/a (Ω < Q_U)' : M.b11_usd(R.UXY, 2), b: M.b11_usd(B.UXY, 2) },
    { label: 'Surplus gained after it (YZB)', v: R.Om < R.QU ? 'n/a (Ω < Q_U)' : M.b11_usd(R.YZB, 2), b: M.b11_usd(B.YZB, 2) },
    { label: 'Visits chosen', v: nf(R.q, 2), b: nf(B.q, 2), key: true },
    { label: 'Deductible at which he stops crossing, D*', v: M.b11_usd(R.Dstar), b: M.b11_usd(B.Dstar) },
    { label: 'Social loss per person', v: M.b11_usd(R.loss, 2), b: M.b11_usd(B.loss, 2), key: true },
    { label: 'Out of pocket, insurer pays', v: M.b11_usd(R.oop, 2) + ', ' + M.b11_usd(R.insurer, 2), b: M.b11_usd(B.oop, 2) + ', ' + M.b11_usd(B.insurer, 2) }
  ],
  verdict: (S, R) => R.crosses
    ? { tone: 'warn', text: `He crosses the deductible and buys ${nf(R.QB, 2)} visits instead of ${nf(R.QU, 2)}: the deductible of ${M.b11_usd(S.D)} is below D* = ${M.b11_usd(R.Dstar)}, and the extra visits cause a social loss of ${M.b11_usd(R.loss, 2)}.` }
    : { tone: 'ok', text: `He stops at ${nf(R.QU, 2)} visits and never reaches the deductible: going on would cost him ${M.b11_usd(R.UXY, 2)} of surplus to gain ${M.b11_usd(R.YZB, 2)}. No price distortion reaches him, so there is no moral hazard.` },
  chart(el, S, R, B) {
    const x1 = Math.max(M.b11_Q(S.s)(0), 12) + 1, y1 = Math.max(S.PU, 100) * 1.5;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Visits per year Q', ylabel: 'Price per visit ($)', aria: 'Demand for visits and the out-of-pocket price under a deductible followed by a copay' });
    const Pd = M.b11_Pinv(S.s);
    P.fn(M.b11_Pinv(0.04), 'ghost', 0, x1);
    if (R.Om > R.QU) P.area([[R.QU, R.PU], [Math.min(R.Om, x1), R.PU], [Math.min(R.Om, x1), Pd(Math.min(R.Om, x1))]], 'f-sec');
    if (R.Om < R.QB) { const a = Math.max(R.Om, R.QU); P.area([[a, Pd(a)], [a, R.PC], [R.QB, R.PC]], 'f-band'); }
    if (R.crosses) P.path([[R.QU, R.PU], [R.QB, R.PU], [R.QB, R.PC]], 's-sec dash');
    P.fn(Pd, 's-pri thick', 0, x1);
    P.seg(0, R.PU, Math.min(R.Om, x1), R.PU, 's-ink thick');
    if (R.Om < x1) { P.seg(R.Om, R.PU, R.Om, R.PC, 's-ink'); P.seg(R.Om, R.PC, x1, R.PC, 's-ink thick'); }
    P.text(x1 * 0.01, R.PU + y1 * 0.025, 'P_U (until the deductible)', 'muted', 'start');
    P.text(x1 * 0.99, R.PC + y1 * 0.025, 'P_C', 'muted', 'end');
    if (R.Om < x1) P.text(R.Om, y1 * 0.94, 'Ω', 'muted', 'middle');
    P.pt(R.QU, R.PU, R.crosses ? 'p-hollow' : 'p-pri', 'U', -8, -8, 'end');
    P.pt(R.QB, R.PC, R.crosses ? 'p-sec' : 'p-hollow', 'B', 8, -8);
    P.draw();
  },
  notice: 'The black step is the out-of-pocket price. With a high deductible the red triangle UXY outweighs the green YZB and he stays at U; lower the deductible past D* and he jumps to B. Once he crosses, the dashed social-loss triangle is as large as with the copay alone: the deductible works by keeping him from crossing, and when he crosses it only shifts part of the bill from the insurer to him.',
  challenges: [
    { q: 'Lower the deductible from $1,000 to $900. His visits…', change: { D: 900 }, options: ['do not change', 'rise by about 1 visit', 'jump by 3 visits, to the copay level'], judge: (b, a) => Math.abs(a.q - b.q) < 1e-6 ? 0 : a.q - b.q < 2 ? 1 : 2,
      why: (b, a) => `They jump from ${nf(b.q, 2)} to ${nf(a.q, 2)}, and the social loss from ${M.b11_usd(b.loss, 2)} to ${M.b11_usd(a.loss, 2)}. D* = ${M.b11_usd(b.Dstar)}: below it the cheap visits after the deductible (YZB = ${M.b11_usd(a.YZB, 2)}) outweigh the overpriced ones before it (UXY = ${M.b11_usd(a.UXY, 2)}), so behavior switches all at once.` },
    { q: 'With the deductible at $900, raise the copay from $25 to $60, still well below the $100 list price. His visits…', base: { D: 900 }, change: { D: 900, PC: 60 }, options: ['fall to Q_U: he no longer crosses', 'fall a little, staying above Q_U', 'do not change'], judge: (b, a) => !a.crosses ? 0 : a.q < b.q - 1e-6 ? 1 : 2,
      why: (b, a) => `They fall from ${nf(b.q, 2)} to ${nf(a.q, 2)}. A higher copay shrinks the reward YZB for crossing, and D* falls from ${M.b11_usd(b.Dstar)} to ${M.b11_usd(a.Dstar)}, below the $900 deductible, so moral hazard disappears entirely.` },
    { q: 'With the deductible at $900, make demand less price-sensitive: s from 0.04 to 0.02. Does he still cross the deductible?', base: { D: 900 }, change: { D: 900, s: 0.02 }, options: ['Yes', 'No'], judge: (b, a) => a.crosses ? 0 : 1,
      why: (b, a) => `No. With flatter demand the copay draws him only to ${nf(a.QB, 2)} visits, so the reward for crossing is small and D* falls to ${M.b11_usd(a.Dstar)}. Less price sensitivity means less moral hazard, here none at all.` }
  ]
});

M.b11_pick = R => R.xA <= 0 ? 'no insurance' : R.xA >= 1 ? 'full insurance' : 'partial, ' + pct(R.xA, 0) + ' of the loss';

EX.push({
  id: 'b11-pauly', ch: 11, title: 'Pauly’s trade-off: optimal coverage under moral hazard',
  ref: 'BHT Section 11.5, Figures 11.6-11.9',
  anchors: [],
  intro: 'A contract pays a share x of a loss L if the person falls ill. Without moral hazard the illness rate is p₀; with it, the rate rises with coverage, p(x) = p₀ + Δp·x, as along the bold line of BHT Figure 11.7. A competitive insurer breaks even, so the premium per unit of coverage equals p(x): the feasible contracts are that line. Contract F (full coverage at p₀) is not feasible; F′ (full coverage at p₀ + Δp) is. Utility is CRRA with relative risk aversion γ. All values (income $50,000, loss $20,000, p₀ = 0.10, Δp = 0.05, γ = 2) are illustrative; as in BHT’s figures, the person’s enjoyment of the riskier behavior is left out.',
  eq: String.raw`E[U](x)=p(x)\,U\!\big(Y-L+xL-p(x)\,xL\big)+\big(1-p(x)\big)\,U\!\big(Y-p(x)\,xL\big),\quad p(x)=p_0+\Delta p\,x,\quad A=\arg\max_x E[U](x)`,
  params: [
    { id: 'dp', label: 'Moral hazard: rise in illness rate at full coverage Δp', min: 0, max: 0.12, step: 0.005, book: 0.05, d: 3 },
    { id: 'g', label: 'Relative risk aversion γ', min: 0, max: 6, step: 0.25, book: 2, d: 2 },
    { id: 'p0', label: 'Illness rate without insurance p₀', min: 0.02, max: 0.3, step: 0.01, book: 0.1, d: 2 },
    { id: 'L', label: 'Loss if ill L ($)', min: 5000, max: 40000, step: 1000, book: 20000, d: 0 }
  ],
  presets: [{ label: 'No moral hazard (Figure 11.6)', values: { dp: 0 } }, { label: 'Strong moral hazard, Δp = 0.10', values: { dp: 0.1 } }],
  bookLabel: 'Baseline',
  compute: S => M.b11_pauly({ Y: 50000, L: S.L, p0: S.p0, dp: S.dp, g: S.g }),
  outputs: (S, R, B) => [
    { label: 'Optimal contract A: coverage x*', v: M.b11_pick(R), b: M.b11_pick(B), key: true },
    { label: 'Premium per unit of coverage at A', v: nf(R.rA, 3), b: nf(B.rA, 3) },
    { label: 'Sure-income value: none, A', v: M.b11_usd(R.CE0) + ', ' + M.b11_usd(R.CEA), b: M.b11_usd(B.CE0) + ', ' + M.b11_usd(B.CEA) },
    { label: 'Sure-income value: F′, F (unattainable)', v: M.b11_usd(R.CEFp) + ', ' + M.b11_usd(R.CEF), b: M.b11_usd(B.CEFp) + ', ' + M.b11_usd(B.CEF) },
    { label: 'Welfare loss from moral hazard, F minus A', v: M.b11_usd(R.mhLoss), b: M.b11_usd(B.mhLoss), key: true }
  ],
  verdict: (S, R) => R.xA >= 1
    ? { tone: 'ok', text: `Full insurance is optimal: without moral hazard the illness rate does not respond to coverage, and removing all risk is worth ${M.b11_usd(R.CEA - R.CE0)} of sure income.` }
    : R.xA <= 0
      ? { tone: 'bad', text: `No coverage is worth buying: each unit raises the illness rate, and with it the premium, by more than the risk protection is worth. Moral hazard costs ${M.b11_usd(R.mhLoss)} of sure income relative to F.` }
      : { tone: 'warn', text: `The best feasible contract covers ${pct(R.xA, 0)} of the loss at ${nf(R.rA, 3)} per unit of coverage, worth ${M.b11_usd(R.CEA - R.CEFp)} more than full coverage F′; moral hazard still costs ${M.b11_usd(R.mhLoss)} relative to F.` },
  chart(el, S, R, B) {
    const y0 = Math.max(0, S.p0 - 0.05), y1 = S.p0 + Math.max(S.dp, 0.02) + 0.05;
    const P = Plot(el, { x0: 0, x1: 1, y0, y1, xlabel: 'Level of insurance coverage x (share of the loss)', ylabel: 'Premium per unit of coverage', aria: 'Feasible contracts under moral hazard and indifference curves' });
    P.fn(B.pr, 'ghost', 0, 1);
    P.fn(R.indiff(R.EUF), 's-grn dash', 0.02, 1, 120);
    P.fn(R.indiff(R.EUA), 's-sec', 0.02, 1, 120);
    if (R.xA < 1 && R.dp > 0) P.fn(R.indiff(R.EUFp), 's-gray dash', 0.02, 1, 120);
    P.fn(R.pr, 's-pri thick', 0, 1);
    P.pt(1, S.p0, 'p-grn', 'F', -8, 16, 'end');
    if (S.dp > 0) P.pt(1, S.p0 + S.dp, 'p-gray', 'F′', -8, -8, 'end');
    P.pt(R.xA, R.rA, 'p-sec', 'A', R.xA > 0.85 ? -8 : 8, -10, R.xA > 0.85 ? 'end' : 'start');
    P.draw();
  },
  notice: 'The blue line is the set of break-even contracts; utility rises toward the lower right. A is where an indifference curve (red) touches the line. The green dashed curve through F shows the utility moral hazard puts out of reach, and the gray dashed one through F′ shows that full coverage is worse than A.',
  challenges: [
    { q: 'Remove moral hazard: Δp from 0.05 to 0. The optimal coverage…', change: { dp: 0 }, options: ['rises to full insurance', 'rises but stays partial', 'does not change'], judge: (b, a) => a.xA >= 1 ? 0 : a.xA > b.xA + 1e-3 ? 1 : 2,
      why: (b, a) => `It moves from ${pct(b.xA, 0)} to ${pct(a.xA, 0)}. With a flat line of fair contracts, as in BHT Figure 11.6, each extra unit of coverage costs exactly its expected payout, and a risk-averse person wants all of it.` },
    { q: 'Lower relative risk aversion from γ = 2 to γ = 1. The optimal coverage…', change: { g: 1 }, options: ['falls a little, staying above 40 percent', 'falls to zero', 'rises'], judge: (b, a) => a.xA <= 0 ? 1 : a.xA > b.xA ? 2 : 0,
      why: (b, a) => `It falls from ${pct(b.xA, 0)} to ${pct(a.xA, 0)}. Even the first unit of coverage raises the illness rate, and each extra case of illness costs the whole loss; with milder risk aversion the risk protection no longer pays for that, so the corner with no insurance is best.` },
    { q: 'Make the person more risk-averse, γ from 2 to 4. The welfare loss from moral hazard (F minus A)…', change: { g: 4 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.mhLoss > b.mhLoss + 0.5 ? 0 : a.mhLoss < b.mhLoss - 0.5 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b11_usd(b.mhLoss)} to ${M.b11_usd(a.mhLoss)}, although coverage at A rises from ${pct(b.xA, 0)} to ${pct(a.xA, 0)}. A more risk-averse person values the full, fairly priced contract F more, so being kept from it costs more, even if he buys more coverage.` },
    { q: 'Raise moral hazard from Δp = 0.05 to Δp = 0.08. Is full coverage at its break-even price (F′) still better than no insurance?', change: { dp: 0.08 }, options: ['Yes', 'No'], judge: (b, a) => a.CEFp > a.CE0 ? 0 : 1,
      why: (b, a) => `${a.CEFp > a.CE0 ? 'Yes' : 'No'}: F′ is now worth ${M.b11_usd(a.CEFp)} of sure income against ${M.b11_usd(a.CE0)} without insurance (at the baseline, ${M.b11_usd(b.CEFp)} against ${M.b11_usd(b.CE0)}). Full coverage removes all risk, but the extra illness it induces raises the fair premium to ${nf(a.p0 + a.dp, 2)} per dollar of coverage, which costs more than the risk protection is worth; the best contract A now covers ${pct(a.xA, 0)}.` }
  ]
});
