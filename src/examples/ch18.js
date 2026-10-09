// ===== BHT Chapter 18: The American model =====
// solvers for this chapter: M.b18_<name>

M.b18_usd = (x, d = 0) => isFinite(x) ? (x < -0.5 * Math.pow(10, -d) ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';
M.b18_hrs = x => isFinite(x) ? nf(Math.round(x), 0) : 'n/a';

// Section 18.1: BHT Enterprises, four workers (4 − nO young, nO old) with monthly expected costs cY and cO.
// mode 'pool': the bill is split evenly through wages; 'rated': each group forgoes its own cost.
// A rival (Acme) offers young workers their own pool; at BHT they also earn a firm-specific premium h.
M.b18_pool = function ({ cY, cO, nO, h, mode }) {
  const n = 4, nY = n - nO;
  const avgAt = x => (nY * cY + nO * x) / n;              // pooled wage forgone per head, as a function of cO
  const bill = nY * cY + nO * cO, avg = bill / n;
  const fY = mode === 'pool' ? avg : cY, fO = mode === 'pool' ? avg : cO;
  const sub = fY - cY;                                    // young worker's monthly overpayment
  const gain = sub - h;                                   // young worker's monthly gain from moving to Acme
  const leave = gain > 1e-9;
  const cOmax = nO > 0 ? cY + n * h / nO : Infinity;      // highest cO at which a pooled plan keeps the young
  return { cY, cO, nO, nY, h, mode, bill, avg, avgAt, fY, fO, sub, gain, leave, cOmax, fOafter: leave ? cO : fO };
};

// Section 18.1: the income tax exclusion of employer premiums. A worker worth Y a year; premium P;
// flat marginal tax rate t; the individual market charges (1 + lam) times the group premium.
M.b18_tax = function ({ Y, P, t, lam }) {
  const esi = p => (Y - p) * (1 - t);                    // take-home pay with employer coverage (wage Y − p, untaxed premium)
  const ind = p => Y * (1 - t) - (1 + lam) * p;          // cash left after buying the same coverage individually
  const wage = Y - P, cE = esi(P), cI = ind(P), tax = t * P, load = lam * P, adv = cE - cI;
  return { Y, P, t, lam, esi, ind, wage, cE, cI, tax, load, adv, price: 1 - t, takeNo: Y * (1 - t) };
};

// Section 18.4: the Medicaid notch. Assets A = wL + pM if wL <= Ibar, wL otherwise (Eqs. 18.1-18.2).
// Utility a ln A + (1 − a) ln(T − L) with T = 4,000 hours a year.
M.b18_notch = function ({ w, Ib, pM, a, T = 4000 }) {
  const U = (A, L) => (A > 0 && L < T) ? a * Math.log(A) + (1 - a) * Math.log(T - L) : -Infinity;
  const L1 = Math.min(Ib / w, T);
  const Lm = clamp(a * T - (1 - a) * pM / w, 0, L1), Um = U(w * Lm + pM, Lm);   // best hours keeping Medicaid
  const L3 = a * T, Un = L3 > L1 ? U(w * L3, L3) : -Infinity;                    // best hours giving up Medicaid
  const med = !(Un > Um + 1e-12);
  const L = med ? Lm : L3, A = med ? w * L + pM : w * L, Uc = med ? Um : Un;
  const L2 = L1 + pM / w;
  const curve = u => x => Math.exp((u - (1 - a) * Math.log(T - x)) / a);       // indifference curve A(L) at utility u
  const assets = x => x <= L1 + 1e-9 ? w * x + pM : w * x;
  return { w, Ib, pM, a, T, L1, L2, L3, Lm, L, A, med, earn: w * L, lost: L3 - L, Um, Un, Uc, curve, assets, bind: L3 > L1 };
};

EX.push({
  id: 'b18-passthrough', ch: 18, title: 'Wage pass-through and pooling at BHT Enterprises',
  ghost: 'Dashed gray: BHT’s case, two young workers costing $500 and two old workers costing $1,500 a month',
  ref: 'BHT Section 18.1 (Wage pass-through; Firm-specific human capital), Figure 18.2',
  anchors: [[18, 'premium of $4,000'], [18, 'forgoes exactly $1,000'], [18, 'could earn $500 more at Acme Inc']],
  intro: 'BHT Enterprises employs four workers and pays the insurer one monthly bill, which it recovers through lower wages. Under a pooled plan every worker forgoes the same amount; under differential pass-through each age group forgoes its own expected cost. A rival, Acme Inc, offers the young their own pool. The costs of $500 and $1,500 per month and the even split of the $4,000 bill follow BHT’s example. The firm-specific premium h, the extra monthly pay a young worker earns at BHT because his skills are worth more there, is an illustrative extension: BHT invokes firm-specific human capital as the glue that keeps pools together.',
  eq: String.raw`\text{pooled: } f_Y=f_O=\frac{n_Y c_Y+n_O c_O}{4},\qquad \text{rated: } f_Y=c_Y,\ f_O=c_O,\qquad \text{young leave iff } f_Y-c_Y>h`,
  params: [
    { id: 'cY', label: 'Monthly cost of a young worker c_Y ($)', min: 100, max: 1500, step: 50, book: 500, d: 0 },
    { id: 'cO', label: 'Monthly cost of an old worker c_O ($)', min: 100, max: 4000, step: 50, book: 1500, d: 0 },
    { id: 'nO', label: 'Number of old workers n_O (of 4)', min: 1, max: 3, step: 1, book: 2, d: 0 },
    { id: 'h', label: 'Firm-specific premium of a young worker at BHT, h ($/month)', min: 0, max: 1500, step: 50, book: 0, d: 0 }
  ],
  toggles: [{ id: 'mode', label: 'How BHT passes the bill through to wages', options: [['pool', 'Even split (pooled)'], ['rated', 'By age (differential)']], book: 'pool' }],
  presets: [{ label: 'Differential pass-through', values: { mode: 'rated' } }, { label: 'Pooled, with firm-specific skills ($600)', values: { mode: 'pool', h: 600 } }],
  compute: S => M.b18_pool(S),
  outputs: (S, R, B) => [
    { label: 'Monthly premium bill', v: M.b18_usd(R.bill), b: M.b18_usd(B.bill) },
    { label: 'Monthly wage forgone: young, old', v: M.b18_usd(R.fY) + ', ' + M.b18_usd(R.fO), b: M.b18_usd(B.fY) + ', ' + M.b18_usd(B.fO) },
    { label: 'Subsidy from each young worker to the old', v: M.b18_usd(R.sub), b: M.b18_usd(B.sub) },
    { label: 'Young worker’s monthly gain from moving to Acme', v: M.b18_usd(R.gain), b: M.b18_usd(B.gain), key: true },
    { label: 'Young workers', v: R.leave ? 'leave for Acme' : 'stay', b: B.leave ? 'leave for Acme' : 'stay', key: true },
    { label: 'Wage forgone by each old worker once choices are made', v: M.b18_usd(R.fOafter), b: M.b18_usd(B.fOafter) }
  ],
  verdict: (S, R) => R.leave
    ? { tone: 'bad', text: `The pool unravels: each young worker overpays ${M.b18_usd(R.sub)} a month and ${R.h > 0.5 ? `would lose only ${M.b18_usd(R.h)} of firm-specific pay` : 'has no firm-specific pay to lose'} by leaving, so the old are left to forgo ${M.b18_usd(R.cO)} each.` }
    : R.sub > 0.5
      ? { tone: 'warn', text: `The pool survives: each young worker subsidizes the old by ${M.b18_usd(R.sub)} a month, but his firm-specific premium of ${M.b18_usd(R.h)} makes BHT still his best job.` }
      : { tone: 'ok', text: `No cross-subsidy: each group pays its own expected cost through wages (${M.b18_usd(R.fY)} and ${M.b18_usd(R.fO)}), so the young have no reason to leave.` },
  chart(el, S, R, B) {
    const x1 = 4000, y1 = 4000;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Monthly cost of an old worker c_O ($)', ylabel: 'Monthly wage forgone ($)', aria: 'Wage forgone by young and old workers under pooled and age-rated pass-through' });
    P.rect(0, Math.min(R.cOmax, x1), 'f-band');
    P.fn(B.avgAt, 'ghost');
    P.fn(x => x, 's-sec', 0, x1);
    P.fn(R.avgAt, S.mode === 'pool' ? 's-pri thick' : 's-gray dash');
    P.hline(R.cY, 's-grn', 'young at Acme: c_Y', 'end');
    if (R.h > 0) P.hline(R.cY + R.h, 's-grn dash', 'c_Y + h', 'start');
    P.text(x1 * 0.97, x1 * 0.97 - 260, 'old in own pool: c_O', 's-sec', 'end');
    P.text(x1 * 0.97, R.avgAt(x1 * 0.97) + 120, 'pooled share', 's-pri', 'end');
    P.vline(R.cO, 's-ink dot');
    if (S.mode === 'pool') {
      P.pt(R.cO, R.avg, 'p-pri', 'everyone', -8, -8, 'end');
      if (R.leave) P.pt(R.cO, R.cO, 'p-hollow', 'old, once the young leave', 8, 16);
    } else {
      P.pt(R.cO, R.fY, 'p-pri', 'young', -8, -8, 'end');
      P.pt(R.cO, R.fO, 'p-sec', 'old', -8, -8, 'end');
    }
    P.draw();
  },
  notice: 'The green band marks the costs of old workers at which a pooled plan keeps the young: there the pooled share (blue) stays below what the young would forgo at Acme plus their firm-specific premium. Without firm-specific skills the band shrinks to c_O ≤ c_Y, so any pooling across observable risk unravels.',
  challenges: [
    { q: 'Under the even split, BHT replaces one young worker with a third old one. Each remaining young worker’s monthly subsidy to the old…', change: { nO: 3 }, options: ['stays at $500', 'rises to $750', 'rises to $1,000'], judge: (b, a) => Math.abs(a.sub - b.sub) < 1 ? 0 : a.sub < 875 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b18_usd(b.sub)} to ${M.b18_usd(a.sub)}. The bill becomes ${M.b18_usd(a.bill)}, so each worker forgoes ${M.b18_usd(a.avg)}, against a cost of ${M.b18_usd(a.cY)} for the young; the more old co-workers, the stronger the pull of Acme’s young-only pool.` },
    { q: 'BHT switches from the even split to differential pass-through. Its total monthly premium bill…', change: { mode: 'rated' }, options: ['falls', 'does not change', 'rises'], judge: (b, a) => a.bill < b.bill - 0.5 ? 0 : a.bill > b.bill + 0.5 ? 2 : 1,
      why: (b, a) => `It stays at ${M.b18_usd(a.bill)}. Rating by age only changes who bears the cost through wages (now ${M.b18_usd(a.fY)} for the young and ${M.b18_usd(a.fO)} for the old), which removes the young workers’ reason to leave without saving the firm anything.` },
    { q: 'Keep the even split, but suppose each young worker’s skills earn him $600 a month more at BHT than at Acme. What does each old worker end up forgoing each month?', change: { h: 600 }, options: ['$500', '$1,000', '$1,500'], judge: (b, a) => a.fOafter < 750 ? 0 : a.fOafter < 1250 ? 1 : 2,
      why: (b, a) => `${M.b18_usd(a.fOafter)}, against ${M.b18_usd(b.fOafter)} when the young leave. The young overpay ${M.b18_usd(a.sub)} but would lose ${M.b18_usd(a.h)} by quitting, so they stay and keep subsidizing the old: firm-specific human capital holds the pool together.` }
  ]
});

EX.push({
  id: 'b18-tax', ch: 18, title: 'The tax exclusion for employer premiums',
  ref: 'BHT Section 18.1',
  anchors: [[18, '$50,000 to his employer']],
  intro: 'A worker is worth Y a year to his employer. With employer coverage, the premium P is passed through to a lower wage, and the premium itself is never taxed as income. Without it, he is paid Y, pays income tax on all of it at the marginal rate t, and buys the same coverage on the individual market, which charges a markup λ over the group premium. The worker’s value of $50,000 follows BHT’s example; the premium, the tax rate and the markup are illustrative (an annual premium of $6,000 is twelve months of the $500 a young worker costs at BHT Enterprises).',
  eq: String.raw`\text{with ESI: }(Y-P)(1-t),\qquad \text{without: }Y(1-t)-(1+\lambda)P,\qquad \text{gap}=tP+\lambda P`,
  params: [
    { id: 'Y', label: 'Worker’s value to the employer Y ($/year)', min: 20000, max: 150000, step: 1000, book: 50000, d: 0 },
    { id: 'P', label: 'Group premium P ($/year)', min: 0, max: 20000, step: 250, book: 6000, d: 0 },
    { id: 't', label: 'Marginal income tax rate t', min: 0, max: 0.5, step: 0.01, book: 0.25, d: 2 },
    { id: 'lam', label: 'Individual-market markup λ', min: 0, max: 1, step: 0.05, book: 0.2, d: 2 }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b18_tax(S),
  outputs: (S, R, B) => [
    { label: 'Wage with employer coverage Y − P', v: M.b18_usd(R.wage), b: M.b18_usd(B.wage) },
    { label: 'Take-home pay with employer coverage', v: M.b18_usd(R.cE), b: M.b18_usd(B.cE) },
    { label: 'Cash left without it, after buying coverage', v: M.b18_usd(R.cI), b: M.b18_usd(B.cI) },
    { label: 'Advantage of employer coverage', v: M.b18_usd(R.adv), b: M.b18_usd(B.adv), key: true },
    { label: '… of which the tax exclusion tP', v: M.b18_usd(R.tax), b: M.b18_usd(B.tax), key: true },
    { label: '… of which the group price λP', v: M.b18_usd(R.load), b: M.b18_usd(B.load) },
    { label: 'After-tax cost to the worker of $1 of employer premium', v: M.b18_usd(R.price, 2), b: M.b18_usd(B.price, 2) }
  ],
  verdict: (S, R) => R.adv > 0.5
    ? { tone: 'ok', text: `The job with insurance leaves him ${M.b18_usd(R.adv)} a year better off for the same coverage, ${M.b18_usd(R.tax)} of it paid by the tax system.` }
    : { tone: 'neutral', text: 'With no tax and no markup, coverage costs the same through the job or on his own: the wage cut equals the premium.' },
  chart(el, S, R, B) {
    const k = 1000, x1 = 20, y1 = Math.max(R.takeNo, B.takeNo) / k * 1.08;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Group premium P ($ thousand a year)', ylabel: 'Cash after coverage ($ thousand)', aria: 'Take-home pay with employer coverage and cash left after buying coverage individually' });
    const pts = [];
    for (let i = 0; i <= 80; i++) { const x = x1 * i / 80; pts.push([x, R.esi(x * k) / k]); }
    for (let i = 80; i >= 0; i--) { const x = x1 * i / 80; pts.push([x, Math.max(R.ind(x * k) / k, 0)]); }
    P.area(pts, 'f-band');
    P.fn(x => B.esi(x * k) / k, 'ghost');
    P.fn(x => B.ind(x * k) / k, 'ghost');
    P.fn(x => R.esi(x * k) / k, 's-pri thick');
    P.fn(x => R.ind(x * k) / k, 's-sec thick');
    P.text(x1 * 0.03, R.esi(0) / k + y1 * 0.03, 'take-home with employer coverage', 's-pri', 'start');
    const xi = Math.min(x1 * 0.55, Math.max(1, (R.takeNo / k) / (1 + R.lam) * 0.6));
    P.text(xi, R.ind(xi * k) / k - y1 * 0.06, 'buys coverage on his own', 's-sec', 'start');
    P.vline(R.P / k, 's-ink dot');
    P.pt(R.P / k, R.cE / k, 'p-pri', '', 0, 0);
    P.pt(R.P / k, R.cI / k, 'p-sec', 'gap ' + M.b18_usd(R.adv), 8, 16);
    P.draw();
  },
  notice: 'The blue line falls by only (1 − t) for each dollar of premium, because the wage the worker gives up would have been taxed; the red line falls by the full price (1 + λ). The green wedge, tP + λP, widens with the premium, so the exclusion favors generous plans and jobs that offer them.',
  challenges: [
    { q: 'The group premium doubles from $6,000 to $12,000 and is passed through to the wage. Take-home pay with employer coverage falls by…', change: { P: 12000 }, options: ['$6,000', '$4,500', '$1,500'], judge: (b, a) => { const d = b.cE - a.cE; return d > 5250 ? 0 : d > 3000 ? 1 : 2; },
      why: (b, a) => `It falls by ${M.b18_usd(b.cE - a.cE)}, from ${M.b18_usd(b.cE)} to ${M.b18_usd(a.cE)}. The wage drops by the full $6,000, but that money would have been taxed at ${pct(a.t, 0)}, so the worker loses only (1 − t) of it; the rest is the tax subsidy.` },
    { q: 'Compare a worker worth $100,000 with one worth $50,000, both facing the same flat marginal rate of 25%. The dollar advantage of employer coverage for the higher earner is…', change: { Y: 100000 }, options: ['twice as large', 'the same', 'smaller'], judge: (b, a) => a.adv > b.adv + 0.5 ? 0 : a.adv < b.adv - 0.5 ? 2 : 1,
      why: (b, a) => `It is the same, ${M.b18_usd(a.adv)}. The gap tP + λP does not depend on Y; only the marginal rate and the premium matter. With progressive income taxes higher earners face higher marginal rates, so in practice the exclusion is worth more to them.` },
    { q: 'Suppose the individual market charged exactly the group premium (λ = 0). Employer coverage then beats buying coverage on his own by…', change: { lam: 0 }, options: ['$0', '$1,500', '$2,700'], judge: (b, a) => a.adv < 750 ? 0 : a.adv < 2100 ? 1 : 2,
      why: (b, a) => `By ${M.b18_usd(a.adv)}, the tax exclusion alone (0.25 × $6,000). Even with no adverse selection markup, a dollar of premium paid through the job costs the worker ${M.b18_usd(a.price, 2)} of take-home pay, against $1 out of taxed income.` }
  ]
});

EX.push({
  id: 'b18-notch', ch: 18, title: 'The Medicaid notch',
  ghost: 'Dashed gray: the baseline budget line, wage $10, threshold $15,000, Medicaid worth $5,300',
  ref: 'BHT Section 18.4 (Work disincentive effects of Medicaid), Eqs. (18.1)–(18.2), Figure 18.5',
  anchors: [[18, 'about $15,000 in 2014'], [18, 'about $5,300 per enrollee']],
  intro: 'Jay earns I = wL and is eligible for Medicaid, worth pM to him, as long as I does not exceed the threshold Ī, so his assets are A = wL + pM up to L1 = Ī/w and A = wL beyond. He values assets and leisure with the illustrative utility α ln A + (1 − α) ln(4,000 − L). The threshold of $15,000 is BHT’s figure for Medicaid eligibility after the 2010 reform, and pM = $5,300 is Medicaid spending per enrollee in 2009; the wage of $10 an hour and α = 0.5 are illustrative. L2 is where his earnings alone match his assets at L1, and L3 is the hours he would choose if he gave up Medicaid.',
  eq: String.raw`I=wL,\qquad A=\begin{cases}I+pM & I\le\bar I\\ I & I>\bar I\end{cases},\qquad \max_L\ \alpha\ln A+(1-\alpha)\ln(4000-L)`,
  params: [
    { id: 'w', label: 'Hourly wage w ($)', min: 5, max: 25, step: 0.5, book: 10, d: 1 },
    { id: 'Ib', label: 'Eligibility threshold Ī ($/year)', min: 5000, max: 30000, step: 500, book: 15000, d: 0 },
    { id: 'pM', label: 'Value of Medicaid to Jay pM ($/year)', min: 0, max: 12000, step: 100, book: 5300, d: 0 },
    { id: 'a', label: 'Weight on assets α', min: 0.2, max: 0.8, step: 0.05, book: 0.5, d: 2 }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b18_notch(S),
  outputs: (S, R, B) => [
    { label: 'L1 = Ī/w, hours at the threshold', v: M.b18_hrs(R.L1), b: M.b18_hrs(B.L1) },
    { label: 'L2, hours with the same assets as at L1', v: M.b18_hrs(R.L2), b: M.b18_hrs(B.L2) },
    { label: 'L3, best hours without Medicaid', v: M.b18_hrs(R.L3), b: M.b18_hrs(B.L3) },
    { label: 'Hours Jay works', v: M.b18_hrs(R.L), b: M.b18_hrs(B.L), key: true },
    { label: 'Earnings and assets', v: M.b18_usd(R.earn) + ', ' + M.b18_usd(R.A), b: M.b18_usd(B.earn) + ', ' + M.b18_usd(B.A) },
    { label: 'On Medicaid?', v: R.med ? 'yes' : 'no', b: B.med ? 'yes' : 'no' },
    { label: 'Hours given up compared with L3', v: M.b18_hrs(Math.max(R.lost, 0)), b: M.b18_hrs(Math.max(B.lost, 0)), key: true }
  ],
  verdict: (S, R) => !R.med
    ? { tone: 'ok', text: `Medicaid is not worth the lost hours: Jay works ${M.b18_hrs(R.L)} hours, earns ${M.b18_usd(R.earn)} and buys his own care.` }
    : Math.abs(R.L - R.L1) < 0.5 && R.bind
      ? { tone: 'bad', text: `Jay stops at the notch: he works ${M.b18_hrs(R.L)} hours to keep Medicaid, ${M.b18_hrs(R.lost)} fewer than he would work without the program.` }
      : { tone: 'warn', text: `Jay keeps Medicaid and works ${M.b18_hrs(R.L)} hours, below the threshold; the benefit lets him buy more leisure.` },
  chart(el, S, R, B) {
    const k = 1000, x1 = 3500, y1 = (R.w * 3000 + R.pM) / k * 1.15;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Hours worked per year L', ylabel: 'Assets A ($ thousand)', aria: 'Medicaid notch: budget line with a drop at the eligibility threshold and indifference curves' });
    P.fn(x => B.assets(x) / k, 'ghost', 0, Math.min(B.L1, x1));
    if (B.L1 < x1) P.fn(x => B.w * x / k, 'ghost', B.L1 + 1e-6, x1);
    if (R.L1 > 0) P.fn(x => R.assets(x) / k, 's-pri thick', 0, Math.min(R.L1, x1));
    if (R.L1 < x1) {
      P.fn(x => R.w * x / k, 's-pri thick', R.L1 + 1e-6, x1);
      P.seg(R.L1, (R.w * R.L1 + R.pM) / k, R.L1, R.w * R.L1 / k, 's-pri dot');
      P.vline(R.L1, 's-ink dot', 'L1');
    }
    if (R.med && R.bind && R.L3 < x1) P.fn(x => R.curve(R.Un)(x) / k, 's-gray dash', 0, x1, 200);
    P.fn(x => R.curve(R.Uc)(x) / k, 's-grn', 0, x1, 200);
    if (R.L2 < x1 && R.pM > 0) P.pt(R.L2, R.w * R.L2 / k, 'p-gray small', 'L2', 6, -8);
    if (R.bind && R.L3 < x1) P.pt(R.L3, R.w * R.L3 / k, 'p-hollow', 'L3', 8, 16);
    P.pt(R.L, R.A / k, 'p-pri', 'Jay', -8, -10, 'end');
    P.draw();
  },
  notice: 'Utility rises to the northwest: more assets, fewer hours. The green indifference curve passes through Jay’s choice; when he stops at L1, the dashed curve through his best point without Medicaid (L3) lies below it, so every hour between L1 and L3 is worse for him than staying at the threshold.',
  challenges: [
    { q: 'The state raises the eligibility threshold from $15,000 to $20,000. Jay’s hours…', change: { Ib: 20000 }, options: ['rise', 'fall', 'do not change'], judge: (b, a) => a.L > b.L + 0.5 ? 0 : a.L < b.L - 0.5 ? 1 : 2,
      why: (b, a) => `They rise from ${M.b18_hrs(b.L)} to ${M.b18_hrs(a.L)}. The notch no longer binds at 1,500 hours, so Jay moves to his preferred point with Medicaid, earning ${M.b18_usd(a.earn)}; this is the logic of the early-1990s expansions that raised poor women’s labor force participation.` },
    { q: 'Medicaid becomes more valuable to Jay: pM rises from $5,300 to $8,000. His hours…', change: { pM: 8000 }, options: ['fall', 'do not change', 'rise'], judge: (b, a) => a.L < b.L - 0.5 ? 0 : a.L > b.L + 0.5 ? 2 : 1,
      why: (b, a) => `They stay at ${M.b18_hrs(a.L)}. Jay was already bunched at the threshold; a richer benefit makes leaving it even less attractive, but he still wants every hour up to L1, since below the threshold extra work costs him no benefit.` },
    { q: 'Construction jobs push Jay’s wage from $10 to $15 an hour. His hours…', change: { w: 15 }, options: ['rise', 'fall', 'do not change'], judge: (b, a) => a.L > b.L + 0.5 ? 0 : a.L < b.L - 0.5 ? 1 : 2,
      why: (b, a) => `They fall from ${M.b18_hrs(b.L)} to ${M.b18_hrs(a.L)}. At $15 he reaches the $15,000 threshold sooner, and leaving Medicaid to work ${M.b18_hrs(a.L3)} hours for ${M.b18_usd(15 * a.L3)} is still slightly worse than ${M.b18_usd(a.Ib + a.pM)} of assets with ${M.b18_hrs(a.L3 - a.L)} more hours of leisure, so a higher wage cuts his hours.` },
    { q: 'Suppose Medicaid were worth only $800 a year to Jay. Does he still stop at the threshold?', change: { pM: 800 }, options: ['Yes, at 1,500 hours', 'No, he works more and leaves Medicaid'], judge: (b, a) => a.med ? 0 : 1,
      why: (b, a) => `No: he works ${M.b18_hrs(a.L)} hours and earns ${M.b18_usd(a.earn)}. Keeping Medicaid would cost him ${M.b18_usd(a.earn - a.Ib)} of earnings for a benefit worth ${M.b18_usd(a.pM)}, and the extra leisure does not make up for the gap; the notch distorts only workers who value the program enough.` }
  ]
});
