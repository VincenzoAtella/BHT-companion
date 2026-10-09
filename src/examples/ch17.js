// ===== BHT Chapter 17: The Bismarck model: social health insurance =====
// solvers for this chapter: M.b17_<name>

M.b17_eur = x => isFinite(x) ? (x < -0.5 ? '−' : '') + '€' + nf(Math.abs(x), 0) : 'n/a';
M.b17_usd = x => isFinite(x) ? (x < -0.5 ? '−' : '') + '$' + nf(Math.abs(x), 0) : 'n/a';
M.b17_res = x => Math.abs(x) < 0.5 ? '€0' : (x < 0 ? 'loss ' : 'profit ') + '€' + nf(Math.abs(x), 0);

// 1. Payments to a sickness fund for two 52-year-old men: one diabetic (expected cost cD), one healthy (cH).
// A share s of 52-year-old men is diabetic. The fund spends e times the national average cost of each type.
// scheme: none (flat community-rated payment cbar), agesex (payment = average cost of 52-year-old men),
// full (payment = average cost of the man's age-sex-disease class), expost (fund reimbursed its actual costs).
M.b17_ra = function ({ cbar, cD, cH, s, e, scheme }) {
  const cAS = s * cD + (1 - s) * cH;                         // average cost of all 52-year-old men
  const pay = (c, ee) => scheme === 'none' ? cbar : scheme === 'agesex' ? cAS : scheme === 'full' ? c : ee * c;
  const prof = (c, ee) => pay(c, ee) - ee * c;
  const payD = pay(cD, e), payH = pay(cH, e), profD = prof(cD, e), profH = prof(cH, e);
  const keep = scheme === 'expost' ? 0 : 1;                  // share of each euro saved that the fund keeps
  return { cbar, cD, cH, s, e, scheme, cAS, payD, payH, transD: payD - cbar, transH: payH - cbar, profD, profH,
    skim: profH - profD, skimNone: e * (cD - cH), keep, saveD: keep * 0.1 * cD,
    fD: ee => prof(cD, ee), fH: ee => prof(cH, ee) };
};

EX.push({
  id: 'b17-riskadj', ch: 17, title: 'Risk adjustment and cream skimming',
  ref: 'BHT Section 17.2, Definition 17.2',
  anchors: [[17, 'If the average German costs e5,000 to treat'], [17, 'receive a check for e7,000']],
  intro: 'A sickness fund must accept everyone and collects the same community-rated amount for each enrollee, set to cover the national average cost. A central fund may add a transfer. Compare a 52-year-old diabetic man with a healthy man of the same age, under four regimes: no compensation, risk adjustment by age and sex only, risk adjustment that also recognizes diabetes, and ex-post reimbursement of actual costs. The average cost of €5,000 and the €12,000 cost of a 52-year-old diabetic man follow BHT’s example; the cost of a healthy 52-year-old man (€4,500), the 20% share of diabetics among men of that age and the fund’s cost level are illustrative.',
  eq: String.raw`\text{payment}_j=\bar c+(\hat c_j-\bar c),\qquad \text{profit}_j=\text{payment}_j-e\,c_j,\qquad \hat c_j=\begin{cases}\bar c&\text{no adjustment}\\ s\,c_D+(1-s)\,c_H&\text{age and sex}\\ c_j&\text{age, sex, disease}\\ e\,c_j&\text{ex post}\end{cases}`,
  params: [
    { id: 'cbar', label: 'National average cost per person c̄ (€)', min: 2000, max: 8000, step: 100, book: 5000, d: 0 },
    { id: 'cD', label: 'Average cost of a 52-year-old diabetic man c_D (€)', min: 5000, max: 20000, step: 100, book: 12000, d: 0 },
    { id: 'cH', label: 'Average cost of a healthy 52-year-old man c_H (€)', min: 1000, max: 8000, step: 100, book: 4500, d: 0 },
    { id: 's', label: 'Share of diabetics among 52-year-old men s', min: 0, max: 0.6, step: 0.01, book: 0.2, d: 2 },
    { id: 'e', label: 'Fund’s spending relative to the national average e', min: 0.7, max: 1.3, step: 0.01, book: 1, d: 2 }
  ],
  toggles: [{ id: 'scheme', label: 'Compensation scheme', options: [['none', 'None'], ['agesex', 'Age and sex'], ['full', 'Age, sex, disease'], ['expost', 'Ex post (actual costs)']], book: 'full' }],
  presets: [
    { label: 'Switzerland before 2012 (age and sex only)', values: { scheme: 'agesex' } },
    { label: 'Efficient fund, e = 0.9', values: { e: 0.9 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b17_ra(S),
  outputs: (S, R, B) => [
    { label: 'Transfer for the diabetic man (payment − c̄)', v: M.b17_eur(R.transD), b: M.b17_eur(B.transD), key: true },
    { label: 'Payment for the healthy man', v: M.b17_eur(R.payH), b: M.b17_eur(B.payH) },
    { label: 'Fund’s result on the diabetic man', v: M.b17_res(R.profD), b: M.b17_res(B.profD) },
    { label: 'Fund’s result on the healthy man', v: M.b17_res(R.profH), b: M.b17_res(B.profH) },
    { label: 'Gain from swapping the diabetic for the healthy man', v: M.b17_eur(R.skim), b: M.b17_eur(B.skim), key: true },
    { label: 'Share of each euro saved that the fund keeps', v: pct(R.keep, 0), b: pct(B.keep, 0) }
  ],
  verdict: (S, R) => R.keep === 0
    ? { tone: 'warn', text: `No reason to skim (gain ${M.b17_eur(R.skim)}), but no reason to economize either: every euro the fund saves goes back to the central pool.` }
    : Math.abs(R.skim) < 0.5 ? { tone: 'ok', text: 'Both men are equally profitable, and the fund keeps every euro it saves on either of them.' }
    : R.skim > 0 ? { tone: 'bad', text: `Replacing the diabetic enrollee with a healthy man of the same age is worth ${M.b17_eur(R.skim)} a year to the fund: an incentive to cream skim.` }
    : { tone: 'ok', text: `The diabetic man is now worth ${M.b17_eur(-R.skim)} more to the fund than the healthy man: the fund wants to enroll the sick.` },
  chart(el, S, R, B) {
    const k = 1000;
    const all = [R.fD(0.7), R.fD(1.3), R.fH(0.7), R.fH(1.3), B.fD(0.7), B.fD(1.3)].map(v => v / k);
    const y0 = Math.min(-4, Math.floor(Math.min(...all) - 1)), y1 = Math.max(4, Math.ceil(Math.max(...all) + 1));
    const P = Plot(el, { x0: 0.7, x1: 1.3, y0, y1, xlabel: 'Fund’s spending relative to the national average, e', ylabel: 'Fund’s result per enrollee (€ thousand)', aria: 'Profit per enrollee against cost level' });
    P.hline(0, 's-gray', 'break even', 'start');
    P.fn(x => B.fD(x) / k, 'ghost');
    P.fn(x => R.fH(x) / k, 's-pri thick');
    P.fn(x => R.fD(x) / k, 's-sec thick');
    P.vline(S.e, 's-ink dot');
    P.seg(S.e, R.profD / k, S.e, R.profH / k, 's-grn thick');
    P.pt(S.e, R.profH / k, 'p-pri', 'healthy', 8, R.profH >= R.profD ? -8 : 16);
    P.pt(S.e, R.profD / k, 'p-sec', 'diabetic', 8, R.profD > R.profH ? -8 : 16);
    P.draw();
  },
  notice: 'The vertical gap between the two lines (green) is what a fund gains by enrolling the healthy man instead of the diabetic one; the slope of each line is the fund’s reward for keeping costs down. Ex-ante risk adjustment closes the gap and keeps the slopes; ex-post reimbursement closes the gap by flattening both lines.',
  challenges: [
    { q: 'Switch to a formula that adjusts only for age and sex, as in Switzerland before 2012. The gain from swapping the diabetic for the healthy man…', change: { scheme: 'agesex' }, options: ['stays at zero', 'is positive but smaller than with no adjustment', 'is as large as with no adjustment at all'],
      judge: (b, a) => Math.abs(a.skim) < 0.5 ? 0 : a.skim < a.skimNone - 0.5 ? 1 : 2,
      why: (b, a) => `It is ${M.b17_eur(a.skim)}, exactly the gain with no adjustment. Both men are 52 and male, so the formula pays ${M.b17_eur(a.payH)} for each; it moves money between funds with different age profiles but does nothing about selection within an age-sex class.` },
    { q: 'With full risk adjustment, the fund learns to treat its enrollees at 90% of the national average cost (e = 0.9). Which man is now more profitable to enroll?', change: { e: 0.9 }, options: ['the healthy man', 'the diabetic man', 'neither, both yield zero'],
      judge: (b, a) => Math.abs(a.skim) < 0.5 ? 2 : a.skim > 0 ? 0 : 1,
      why: (b, a) => `The diabetic man yields ${M.b17_eur(a.profD)} and the healthy man ${M.b17_eur(a.profH)}. The fund keeps 10% of each man’s predicted cost, and 10% of €12,000 is more than 10% of €4,500: a fund that manages a disease well can make money by enrolling the sick.` },
    { q: 'Under ex-post reimbursement of actual costs, the fund cuts its spending to e = 0.9. Its result on the diabetic man…', base: { scheme: 'expost' }, change: { scheme: 'expost', e: 0.9 }, options: ['improves by €1,200', 'improves by less than €1,200', 'does not change'],
      judge: (b, a) => Math.abs(a.profD - b.profD) < 0.5 ? 2 : a.profD - b.profD > 1199.5 ? 0 : 1,
      why: (b, a) => `It stays at ${M.b17_res(a.profD)}. The central pool pays whatever the fund spends, so the saving of €1,200 goes to the other funds; this is the loss of efficiency incentives that ex-ante risk adjustment avoids.` }
  ]
});

// 2. Payroll financing with an opt-out. Income y ~ U[10, 70] and expected cost c ~ U[1, 9] (€ thousand), independent.
// SHI charges the payroll rate t that balances its budget; people with y >= T may buy private insurance at (1 + L) c,
// and do so when that is below t y.
M.b17_payroll = function ({ T, L, opt }) {
  const ylo = 10, yhi = 70, clo = 1, chi = 9, Cbar = 5, Ybar = 40;
  const k = (t, y) => clamp(t * y / (1 + L), clo, chi);          // cost below which a person with income y opts out
  const out = t => {
    if (opt !== 'on' || T >= yhi) return { n: 0, C: 0, Y: 0 };
    const a = Math.max(T, ylo), w = 1 / ((yhi - ylo) * (chi - clo));
    const n = M.integrate(y => (k(t, y) - clo), a, yhi, 400) * w;
    const C = M.integrate(y => (k(t, y) ** 2 - clo * clo) / 2, a, yhi, 400) * w;
    const Y = M.integrate(y => y * (k(t, y) - clo), a, yhi, 400) * w;
    return { n, C, Y };
  };
  const F = t => { const o = out(t); return (Cbar - o.C) / (Ybar - o.Y); };
  let t = Cbar / Ybar;
  for (let i = 0; i < 400; i++) { const t1 = F(t); if (Math.abs(t1 - t) < 1e-12) { t = t1; break; } t = t1; }
  const o = out(t), t0 = Cbar / Ybar;
  const nIn = 1 - o.n;
  return { T, L, opt, t, t0, nOut: o.n, cOut: o.n > 1e-9 ? o.C / o.n : NaN, yOut: o.n > 1e-9 ? o.Y / o.n : NaN,
    cIn: (Cbar - o.C) / nIn, yIn: (Ybar - o.Y) / nIn, line: y => t * y / (1 + L),
    sub: (y, c) => c - t * y };                                    // net subsidy received by a member (€ thousand)
};

EX.push({
  id: 'b17-payroll', ch: 17, title: 'Payroll contributions and the private opt-out',
  ref: 'BHT Introduction and Section 17.1 (Germany), Section 17.2',
  anchors: [[17, 'e50,850 in 2012']],
  intro: 'Statutory health insurance (SHI) is financed by a payroll tax: the rate t is set so that contributions, t times income, cover the expected costs of all members, whatever their health. People earning above a threshold may instead buy private insurance, priced at their own expected cost plus a loading. Yearly incomes are spread evenly from €10,000 to €70,000 and expected costs evenly from €1,000 to €9,000, independently. The loading L stands for everything that makes private cover dearer than its expected cost, such as administration and the loss of free family coverage. The €50,850 threshold is Germany’s 2012 value in BHT; the distributions and the 100% loading are illustrative.',
  eq: String.raw`t=\frac{\sum_{i\in SHI}c_i}{\sum_{i\in SHI}y_i},\qquad i\ \text{leaves SHI}\iff y_i\ge T\ \text{and}\ (1+L)\,c_i<t\,y_i`,
  params: [
    { id: 'T', label: 'Income threshold for opting out T (€)', min: 30000, max: 69900, step: 150, book: 50850, d: 0 },
    { id: 'L', label: 'Loading of private premiums L', min: 0, max: 3, step: 0.05, book: 1, d: 2 }
  ],
  toggles: [{ id: 'opt', label: 'Private opt-out', options: [['on', 'Allowed'], ['off', 'Not allowed']], book: 'on' }],
  bookLabel: 'Baseline',
  compute: S => M.b17_payroll({ T: S.T / 1000, L: S.L, opt: S.opt }),
  outputs: (S, R, B) => [
    { label: 'SHI payroll contribution rate t', v: pct(R.t, 2), b: pct(B.t, 2), key: true },
    { label: 'Rate if nobody could opt out', v: pct(R.t0, 2) },
    { label: 'Share of the population in private insurance', v: pct(R.nOut, 1), b: pct(B.nOut, 1), key: true },
    { label: 'Average expected cost: private / SHI members', v: R.nOut > 1e-9 ? `${M.b17_eur(1000 * R.cOut)} / ${M.b17_eur(1000 * R.cIn)}` : `none / ${M.b17_eur(1000 * R.cIn)}`, b: B.nOut > 1e-9 ? `${M.b17_eur(1000 * B.cOut)} / ${M.b17_eur(1000 * B.cIn)}` : '' },
    { label: 'Average income: private / SHI members', v: R.nOut > 1e-9 ? `${M.b17_eur(1000 * R.yOut)} / ${M.b17_eur(1000 * R.yIn)}` : `none / ${M.b17_eur(1000 * R.yIn)}`, b: B.nOut > 1e-9 ? `${M.b17_eur(1000 * B.yOut)} / ${M.b17_eur(1000 * B.yIn)}` : '' },
    { label: 'Contribution of a member earning €30,000', v: M.b17_eur(1000 * 30 * R.t), b: M.b17_eur(1000 * 30 * B.t) }
  ],
  verdict: (S, R) => R.nOut < 1e-9
    ? { tone: 'ok', text: `Everyone stays in SHI and a rate of ${pct(R.t, 2)} covers the average cost of €5,000 from an average income of €40,000.` }
    : { tone: 'warn', text: `${pct(R.nOut, 1)} of people, all rich and mostly healthy, leave SHI, so those who stay pay ${pct(R.t, 2)} of their income instead of ${pct(R.t0, 2)}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 10, x1: 70, y0: 0, y1: 10, xlabel: 'Yearly income (€ thousand)', ylabel: 'Expected health cost (€ thousand)', aria: 'Who opts out of statutory insurance' });
    P.area([[10, 1], [70, 1], [70, 9], [10, 9]], 'f-band');
    if (R.opt === 'on' && R.T < 70) {
      const pts = [], n = 60;
      for (let i = 0; i <= n; i++) { const y = R.T + (70 - R.T) * i / n; pts.push([y, clamp(R.line(y), 1, 9)]); }
      P.area([[R.T, 1], ...pts, [70, 1]], 'f-sec');
      P.vline(R.T, 's-ink dot', 'threshold');
    }
    P.fn(B.line, 'ghost');
    P.fn(R.line, 's-sec thick');
    P.text(12, 9.35, 'SHI members', 'muted');
    if (R.nOut > 0.002) P.text(Math.min(67, R.T + 3), 1.35, 'private', 's-sec');
    P.text(69, Math.min(9.3, R.line(69) + 0.3), 'c = t·y/(1+L)', 's-sec', 'end');
    P.draw();
  },
  notice: 'The green rectangle is the whole population. People in the red corner, above the threshold and below the red line, pay less in the private market than in payroll contributions; they are both the richest and the healthiest, so each one who leaves takes away a net contribution to the pool and raises the rate for everyone who stays.',
  challenges: [
    { q: 'Lower the threshold from €50,850 to €30,000. The SHI contribution rate rises to about…', change: { T: 30000 }, options: ['15%', '16.5%', '20%'],
      judge: (b, a) => a.t < 0.1575 ? 0 : a.t < 0.18 ? 1 : 2,
      why: (b, a) => `It rises from ${pct(b.t, 2)} to ${pct(a.t, 2)}, and ${pct(a.nOut, 1)} of people leave instead of ${pct(b.nOut, 1)}. The newly eligible earn less, so fewer of them gain from leaving, but each rise in t makes the private market attractive to more people above the threshold.` },
    { q: 'Private cover becomes cheaper: the loading falls from 100% to 50%. A member earning €30,000, who cannot leave, pays…', change: { L: 0.5 }, options: ['more', 'less', 'the same'],
      judge: (b, a) => a.t > b.t + 1e-9 ? 0 : a.t < b.t - 1e-9 ? 1 : 2,
      why: (b, a) => `${M.b17_eur(30000 * a.t)} a year instead of ${M.b17_eur(30000 * b.t)}. Cheaper private cover pulls more rich, healthy people out of the pool (${pct(a.nOut, 1)} instead of ${pct(b.nOut, 1)}), and those who remain must replace their net contributions.` },
    { q: 'Private premiums carry a 300% loading (L = 3): private cover costs four times the expected cost. Does anyone still opt out?', change: { L: 3 }, options: ['yes', 'no'],
      judge: (b, a) => a.nOut > 1e-6 ? 0 : 1,
      why: (b, a) => `Yes: ${pct(a.nOut, 1)} of people. A healthy person earning €70,000 with expected costs of €1,000 pays ${M.b17_eur(70000 * a.t)} a year to SHI but €4,000 in the private market: under payroll financing the healthy rich pay several times their own expected cost.` }
  ]
});

// 3. A fee schedule and two clinically defensible treatments (dialysis D, transplant T) with equal lifetime cost C.
// Doctor i values a patient's QALY at v_i ~ U[0, vmax] ($ thousand) and picks dialysis iff (F_D - C) - (F_T - C) > v_i dQ.
M.b17_fees = function ({ FD, FT, dQ, vmax, C = 300 }) {
  const gap = FD - FT;
  const share = x => clamp(x / (vmax * dQ), 0, 1);
  const s = share(gap);
  return { FD, FT, dQ, vmax, C, gap, s, mD: FD - C, mT: FT - C, loss: 100 * s * dQ, spend: s * FD + (1 - s) * FT,
    full: vmax * dQ, curve: fd => 100 * share(fd - FT) };
};

EX.push({
  id: 'b17-fees', ch: 17, title: 'Fee schedules and clinical distortions',
  ref: 'BHT Section 17.3',
  anchors: [],
  intro: 'A patient with end-stage renal disease can be treated with dialysis or with a transplant. Both cost the same over the patient’s lifetime and the transplant gives a better quality of life, so with fees that reflect costs every doctor recommends the transplant. The fee schedule may pay more for dialysis. Each doctor trades her profit against the patient’s health, valuing a QALY of the patient anywhere between $0 and v̄ (doctors differ evenly in this range). Equal lifetime costs follow BHT’s example; the cost of $300,000, the fees, the QALY gain and v̄ are illustrative.',
  eq: String.raw`\text{dialysis}\iff (F_D-C)-(F_T-C)>v_i\,\Delta Q,\qquad s=\min\Big\{1,\max\Big\{0,\frac{F_D-F_T}{\bar v\,\Delta Q}\Big\}\Big\},\qquad \text{spending}=sF_D+(1-s)F_T`,
  params: [
    { id: 'FD', label: 'Fee for lifetime dialysis F_D ($ thousand)', min: 200, max: 500, step: 5, book: 360, d: 0 },
    { id: 'FT', label: 'Fee for a transplant and follow-up F_T ($ thousand)', min: 200, max: 500, step: 5, book: 300, d: 0 },
    { id: 'dQ', label: 'Extra QALYs from a transplant ΔQ', min: 0.5, max: 5, step: 0.1, book: 2, d: 1 },
    { id: 'vmax', label: 'Highest value a doctor puts on a patient’s QALY v̄ ($ thousand)', min: 20, max: 300, step: 5, book: 100, d: 0 }
  ],
  presets: [
    { label: 'Fees equal to costs', values: { FD: 300, FT: 300 } },
    { label: 'Transplant paid below cost', values: { FD: 300, FT: 250 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b17_fees(S),
  outputs: (S, R, B) => [
    { label: 'Margin on dialysis / on a transplant', v: `${M.b17_usd(1000 * R.mD)} / ${M.b17_usd(1000 * R.mT)}`, b: `${M.b17_usd(1000 * B.mD)} / ${M.b17_usd(1000 * B.mT)}` },
    { label: 'Share of patients sent to dialysis', v: pct(R.s, 0), b: pct(B.s, 0), key: true },
    { label: 'QALYs lost per 100 patients', v: nf(R.loss, 0), b: nf(B.loss, 0), key: true },
    { label: 'Payer’s spending per patient', v: M.b17_usd(1000 * R.spend), b: M.b17_usd(1000 * B.spend) },
    { label: 'Fee gap that sends every patient to dialysis', v: M.b17_usd(1000 * R.full), b: M.b17_usd(1000 * B.full) }
  ],
  verdict: (S, R) => R.s < 1e-9 ? { tone: 'ok', text: 'No doctor gains by recommending dialysis, so every patient gets the transplant.' }
    : { tone: R.s > 0.5 ? 'bad' : 'warn', text: `A fee gap of ${M.b17_usd(1000 * R.gap)} sends ${pct(R.s, 0)} of patients to the worse treatment, costing ${nf(R.loss, 0)} QALYs per 100 patients.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 200, x1: 500, y0: 0, y1: 105, xlabel: 'Fee for lifetime dialysis F_D ($ thousand)', ylabel: 'Patients sent to dialysis (%)', aria: 'Share of patients sent to dialysis against the dialysis fee' });
    if (R.gap > 0) P.rect(S.FT, Math.min(500, S.FD), 'f-sec');
    P.fn(B.curve, 'ghost', 200, 500, 300);
    P.fn(R.curve, 's-pri thick', 200, 500, 300);
    P.vline(S.FT, 's-ink dot', 'F_D = F_T');
    P.pt(S.FD, 100 * R.s, 'p-sec', pct(R.s, 0), 8, R.s > 0.9 ? 16 : -8);
    P.draw();
  },
  notice: 'Only the gap between the two fees matters: when it is zero the curve sits on the axis, and every dollar of gap above it pushes more doctors past the point where their profit outweighs their patient’s health. The red band is the distortion created by the schedule.',
  challenges: [
    { q: 'The agency raises both fees by $40,000. The share of patients sent to dialysis…', change: { FD: 400, FT: 340 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.s > b.s + 1e-9 ? 0 : a.s < b.s - 1e-9 ? 1 : 2,
      why: (b, a) => `It stays at ${pct(a.s, 0)}, while spending per patient rises from ${M.b17_usd(1000 * b.spend)} to ${M.b17_usd(1000 * a.spend)}. Clinical choices respond to relative prices, not to the level of the schedule.` },
    { q: 'Doctors care less about their patients: v̄ falls from $100,000 to $50,000 per QALY. QALYs lost per 100 patients…', change: { vmax: 50 }, options: ['double', 'rise by less than double', 'do not change'],
      judge: (b, a) => Math.abs(a.loss - 2 * b.loss) < 1e-6 ? 0 : a.loss > b.loss + 1e-9 ? 1 : 2,
      why: (b, a) => `They go from ${nf(b.loss, 0)} to ${nf(a.loss, 0)}. With the dialysis share at ${pct(b.s, 0)} the rule is linear, so halving v̄ doubles the share of doctors who give in to the fee gap.` },
    { q: 'To save money the agency cuts the transplant fee from $300,000 to $250,000 and leaves dialysis at $360,000. Payer’s spending per patient…', change: { FT: 250 }, options: ['falls by $50,000', 'falls by less than $50,000', 'rises'],
      judge: (b, a) => Math.abs(b.spend - a.spend - 50) < 1e-6 ? 0 : a.spend < b.spend ? 1 : 2,
      why: (b, a) => `It falls only from ${M.b17_usd(1000 * b.spend)} to ${M.b17_usd(1000 * a.spend)}, because the dialysis share rises from ${pct(b.s, 0)} to ${pct(a.s, 0)} and QALYs lost per 100 patients rise from ${nf(b.loss, 0)} to ${nf(a.loss, 0)}. Cutting the price of the better treatment buys part of its savings with worse care.` }
  ]
});
