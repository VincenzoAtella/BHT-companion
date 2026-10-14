// ===== Addendum Chapter 2 (A2): Why the socioeconomic gradient persists =====
// solvers for this chapter: M.b24_<name>

M.b24_nf = (x, d) => nf(x, d).replace(/^-/, '−');
M.b24_yr = (x, d = 2) => M.b24_nf(x, d) + ' years';

// Section 2.4, equation (2.1): A = a0 + pi S + (g0 + psi S) tau, tau = age − 40.
// a0 = 0.8 and g0 = 0.02 as in Figure 2.2. An optional adult intervention removes the
// difference in slopes from age aInt onward (it does not reverse past damage).
M.b24_paths = function ({ pi, psi, aObs, pol, aInt, a0 = 0.8, g0 = 0.02 }) {
  const stop = pol === 'on' ? aInt : Infinity;
  const gap = a => pi + psi * (Math.max(40, Math.min(a, stop)) - 40);
  const adv = a => a0 + g0 * (a - 40);
  const dis = a => adv(a) + gap(a);
  const gObs = gap(aObs), T = aObs - 40;
  return { pi, psi, aObs, stop, gap, adv, dis, g40: gap(40), gObs, g60: gap(60), g80: gap(80),
    psiOnly: T > 0 ? gObs / T : NaN,                 // the pure-divergence story with the same snapshot
    psiHat: T > 0 ? (gObs - gap(40)) / T : NaN,      // what two waves at 40 and aObs recover
    levelShare: Math.abs(gObs) > 1e-9 ? gap(40) / gObs : NaN };
};

EX.push({
  id: 'b24-levelslope', ch: 24, title: 'Level shift or divergence',
  ref: 'Addendum Section 2.4, Equation (2.1), Figure 2.2',
  anchors: [[24, 'Both produce a gap of 0.40 at age 60']],
  intro: 'A biological state A, in standard deviations, rises linearly with age. Disadvantage S can raise its level at age 40 by π (a level shift, the thrifty phenotype story) or its speed by ψ a year (divergence, the allostatic load story). The baseline is panel (a) of Figure 2.2: π = 0.40, ψ = 0, with the advantaged group starting at 0.8 and aging by 0.02 a year; the preset gives panel (b). Choose the age at which a cross-section takes its snapshot, and switch on an adult intervention that removes the difference in slopes.',
  eq: String.raw`A_{i\tau}=a_0+\pi S_i+(g_0+\psi S_i)\,\tau+\varepsilon_{i\tau},\qquad E[A\mid S{=}1,\tau]-E[A\mid S{=}0,\tau]=\pi+\psi\,\tau`,
  params: [
    { id: 'pi', label: 'Level shift at age 40, π (SD)', min: 0, max: 0.8, step: 0.01, book: 0.4, d: 2 },
    { id: 'psi', label: 'Divergence ψ (SD per year)', min: -0.01, max: 0.04, step: 0.001, book: 0, d: 3 },
    { id: 'aObs', label: 'Age of the cross-sectional snapshot', min: 40, max: 80, step: 1, book: 60, d: 0 },
    { id: 'aInt', label: 'Age at which the adult intervention starts', min: 40, max: 80, step: 1, book: 50, d: 0 }
  ],
  toggles: [{ id: 'pol', label: 'Adult intervention', options: [['off', 'None'], ['on', 'Removes the slope difference']], book: 'off' }],
  presets: [
    { label: 'Panel (a): level shift', values: { pi: 0.4, psi: 0 } },
    { label: 'Panel (b): divergence', values: { pi: 0, psi: 0.02 } },
    { label: 'Half and half', values: { pi: 0.2, psi: 0.01 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b24_paths(S),
  outputs: (S, R, B) => [
    { label: 'Gap at age 40 (π)', v: M.b24_nf(R.g40, 2), b: M.b24_nf(B.g40, 2) },
    { label: `Gap at the snapshot age, ${S.aObs} (all a cross-section sees)`, v: M.b24_nf(R.gObs, 2), b: M.b24_nf(B.gObs, 2), key: true },
    { label: 'Same snapshot as a pure level shift: π', v: M.b24_nf(R.gObs, 2) },
    { label: 'Same snapshot as pure divergence: ψ', v: M.b24_nf(R.psiOnly, 3), b: M.b24_nf(B.psiOnly, 3) },
    { label: 'Two waves (40 and snapshot): π̂, average ψ̂', v: M.b24_nf(R.g40, 2) + ', ' + M.b24_nf(R.psiHat, 3), b: M.b24_nf(B.g40, 2) + ', ' + M.b24_nf(B.psiHat, 3) },
    { label: 'Gap at age 80', v: M.b24_nf(R.g80, 2), b: M.b24_nf(B.g80, 2), key: true }
  ],
  verdict: (S, R) => {
    const tail = S.pol === 'on' ? ` The intervention at ${S.aInt} freezes the gap at ${M.b24_nf(R.gap(S.aInt), 2)} but cannot undo it.` : '';
    if (Math.abs(S.psi) < 1e-9) return { tone: 'neutral', text: `Pure level shift: the gap is ${M.b24_nf(S.pi, 2)} at every age, so an adult intervention on the slope changes nothing.` };
    if (S.pi < 1e-9) return { tone: 'warn', text: `Pure divergence: the gap grows by ${M.b24_nf(S.psi, 3)} a year and reaches ${M.b24_nf(R.gObs, 2)} at ${S.aObs}.${tail}` };
    return { tone: 'neutral', text: `Both forces: at ${S.aObs} the level shift is ${pct(R.levelShare, 0)} of the gap of ${M.b24_nf(R.gObs, 2)}, but a snapshot alone cannot reveal that share.${tail}` };
  },
  chart(el, S, R, B) {
    const top = Math.max(R.dis(80), R.dis(40), B.dis(80), R.adv(80));
    const y1 = Math.max(2.2, Math.ceil((top + 0.15) * 5) / 5), y0 = Math.min(0.6, R.dis(40) - 0.1);
    const P = Plot(el, { x0: 40, x1: 80, y0, y1, xlabel: 'Age', ylabel: 'Biological state A (SD)', aria: 'Biological state by age for the disadvantaged and advantaged groups, with the snapshot age' });
    P.fn(B.dis, 'ghost');
    if (S.pol === 'on') P.vline(S.aInt, 's-gray dash', 'intervention');
    P.vline(S.aObs, 's-ink dot', 'snapshot');
    P.fn(R.adv, 's-pri dash thick');
    P.fn(R.dis, 's-sec thick');
    P.pt(S.aObs, R.dis(S.aObs), 'p-sec', 'disadvantaged', -8, -10, 'end');
    P.pt(S.aObs, R.adv(S.aObs), 'p-pri', 'advantaged', 8, 16);
    P.pt(40, R.dis(40), 'p-sec small');
    P.pt(40, R.adv(40), 'p-pri small');
    P.draw();
  },
  notice: 'The snapshot sees only the vertical distance between the two lines at one age. The same distance can come from parallel lines or from lines that fan out; only the gap at a second age on the same people tells them apart. An intervention on the slope flattens a fan but leaves parallel lines where they are.',
  challenges: [
    { q: 'Move from panel (a) to panel (b): set π = 0 and ψ = 0.02. The gap a cross-section measures at 60…', change: { pi: 0, psi: 0.02 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.gObs > b.gObs + 1e-6 ? 0 : a.gObs < b.gObs - 1e-6 ? 1 : 2,
      why: (b, a) => `It stays at ${M.b24_nf(a.gObs, 2)}: π + 20ψ is ${M.b24_nf(b.gObs, 2)} in both stories. The two mechanisms differ in when the gap opened, and a single age cannot show that.` },
    { q: 'In panel (b) (π = 0, ψ = 0.02), take the snapshot at 70 instead of 60. The measured gap is…', base: { pi: 0, psi: 0.02 }, change: { pi: 0, psi: 0.02, aObs: 70 }, options: ['0.40, as at 60', '0.50', '0.60'],
      judge: (b, a) => Math.abs(a.gObs - 0.4) < 0.005 ? 0 : Math.abs(a.gObs - 0.5) < 0.005 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b24_nf(b.gObs, 2)} to ${M.b24_nf(a.gObs, 2)}, while in panel (a) it would stay at 0.40. Comparing gaps across ages in one cross-section hints at a slope, but there different ages are different cohorts, so the comparison mixes aging with cohort differences.` },
    { q: 'Under the level shift of panel (a), switch on an adult intervention at 50 that removes any difference in slopes. The gap at 80…', change: { pol: 'on' }, options: ['falls to zero', 'falls, but not to zero', 'does not change'],
      judge: (b, a) => a.g80 < 1e-6 ? 0 : a.g80 < b.g80 - 1e-6 ? 1 : 2,
      why: (b, a) => `It stays at ${M.b24_nf(a.g80, 2)}. With ψ = 0 there is no difference in slopes to correct; narrowing a level shift requires reversing damage already done.` },
    { q: 'Under divergence (π = 0, ψ = 0.02), the same intervention at 50. By how much does the gap at 80 fall?', base: { pi: 0, psi: 0.02 }, change: { pi: 0, psi: 0.02, pol: 'on' }, options: ['by about a quarter', 'by about half', 'by about three quarters'],
      judge: (b, a) => { const f = 1 - a.g80 / b.g80; return f > 0.65 ? 2 : f > 0.35 ? 1 : 0; },
      why: (b, a) => `From ${M.b24_nf(b.g80, 2)} to ${M.b24_nf(a.g80, 2)}, by ${pct(1 - a.g80 / b.g80, 0)}. The gap built up between 40 and 50 remains, but the 30 years of further divergence are avoided: the same policy is useless under one story and powerful under the other.` }
  ]
});

// Section 2.6, equations (2.2)-(2.3): reliability of the mean of n readings and attenuation.
// role 'x': the noisy reading is the explanatory variable, plim = lambda_n beta.
// role 'y': the noisy biomarker is the dependent variable: unbiased in units of the state,
// but in SD of the measured biomarker the coefficient is beta sqrt(lambda_n) (technical box, item 2).
M.b24_lamn = (lam, n) => n * lam / (1 + (n - 1) * lam);
M.b24_rel = function ({ lam, n, beta, role }) {
  const ln = M.b24_lamn(lam, n);
  const est = role === 'x' ? ln * beta : beta;
  const sd = beta * Math.sqrt(ln);
  return { lam, n, beta, role, ln, est, sd, factor: beta / est, bias: beta - est,
    curve: nn => role === 'x' ? M.b24_lamn(lam, nn) * beta : beta * Math.sqrt(M.b24_lamn(lam, nn)) };
};

EX.push({
  id: 'b24-reliability', ch: 24, title: 'Noisy biomarkers and repeated readings',
  ref: 'Addendum Section 2.6, Equations (2.2)-(2.3)',
  anchors: [[24, 'is 0.15/0.3 = 0.50'], [24, '3/3.7 ≈ 0.81']],
  intro: 'A single reading of a biomarker mixes the person’s long-run level with day-to-day noise; the reliability λ is the share of the variance that lies between people. The baseline follows the worked example of Section 2.6.2: λ = 0.3 and a true coefficient of 0.50 on the long-run level, so a regression on one reading gives 0.15. Average more readings, and switch the biomarker from explanatory to dependent variable to see that the same noise does very different things.',
  eq: String.raw`\lambda=\frac{\sigma_b^2}{\sigma_b^2+\sigma_w^2},\qquad \lambda_n=\frac{n\lambda}{1+(n-1)\lambda},\qquad \operatorname{plim}\hat\beta_A=\lambda_n\,\beta_A`,
  params: [
    { id: 'lam', label: 'Reliability of one reading λ', min: 0.05, max: 0.95, step: 0.01, book: 0.3, d: 2 },
    { id: 'n', label: 'Number of readings averaged n', min: 1, max: 20, step: 1, book: 1, d: 0 },
    { id: 'beta', label: 'True coefficient β (per SD of the long-run state)', min: 0.1, max: 1, step: 0.01, book: 0.5, d: 2 }
  ],
  toggles: [{ id: 'role', label: 'The noisy biomarker is', options: [['x', 'the explanatory variable'], ['y', 'the dependent variable']], book: 'x' }],
  presets: [{ label: 'Ten readings', values: { n: 10 } }, { label: 'A precise assay, λ = 0.9', values: { lam: 0.9 } }],
  bookLabel: 'Baseline',
  compute: S => M.b24_rel(S),
  outputs: (S, R, B) => {
    const o = [
      { label: 'Noise share of one reading, 1 − λ', v: pct(1 - R.lam, 0), b: pct(1 - B.lam, 0) },
      { label: 'Reliability of the mean of n readings λ_n', v: nf(R.ln, 3), b: nf(B.ln, 3), key: S.role === 'x' }
    ];
    if (S.role === 'x') return o.concat([
      { label: 'Estimated coefficient, plim of β̂', v: nf(R.est, 3), b: nf(B.est, 3), key: true },
      { label: 'True coefficient on the long-run level', v: nf(R.beta, 3), b: nf(B.beta, 3) },
      { label: 'Understatement factor β / β̂', v: nf(R.factor, 2), b: nf(B.factor, 2) }
    ]);
    return o.concat([
      { label: 'Estimated gradient, in units of the true state', v: nf(R.est, 3), b: nf(B.beta, 3), key: true },
      { label: 'Same gradient in SD of the measured biomarker', v: nf(R.sd, 3), b: nf(B.sd, 3), key: true }
    ]);
  },
  verdict: (S, R) => S.role === 'y'
    ? { tone: 'neutral', text: `Noise in the outcome costs precision, not size: the gradient is still ${nf(R.est, 2)}, but reported in SD of the noisy measure it looks like ${nf(R.sd, 2)}.` }
    : R.ln >= 0.8
      ? { tone: 'ok', text: `With ${S.n} reading${S.n > 1 ? 's' : ''} the reliability is ${nf(R.ln, 2)}: the estimate of ${nf(R.est, 2)} captures ${pct(R.ln, 0)} of the true ${nf(R.beta, 2)}.` }
      : { tone: 'warn', text: `Reliability ${nf(R.ln, 2)}: the estimate of ${nf(R.est, 2)} understates the true ${nf(R.beta, 2)} by a factor of ${nf(R.factor, 1)}.` },
  chart(el, S, R, B) {
    const y1 = Math.max(0.6, S.beta * 1.15);
    const P = Plot(el, { x0: 1, x1: 20, y0: 0, y1, xlabel: 'Number of readings averaged n', ylabel: S.role === 'x' ? 'Estimated coefficient' : 'Estimated gradient', aria: 'Estimated coefficient as the number of averaged readings rises, against the true coefficient' });
    if (S.role === 'x') {
      if (Math.abs(S.lam - 0.3) > 1e-9 || Math.abs(S.beta - 0.5) > 1e-9) P.fn(B.curve, 'ghost');
      P.hline(S.beta, 's-grn dash', 'true β', 'end');
      P.seg(S.n, R.est, S.n, S.beta, 's-sec thick');
      P.fn(R.curve, 's-pri thick');
      P.pt(S.n, R.est, 'p-pri', 'β̂ = ' + nf(R.est, 3), 8, 16);
    } else {
      P.hline(S.beta, 's-pri thick', 'gradient in units of the state: unbiased', 'end');
      P.fn(R.curve, 's-sec thick');
      P.pt(S.n, R.sd, 'p-sec', 'in SD of the measure: ' + nf(R.sd, 3), 8, 16);
    }
    P.draw();
  },
  notice: 'Averaging divides the within-person variance by n, so reliability climbs fast at first and then slowly. Noise in an explanatory variable drags its coefficient toward zero; the red segment is the bias. Noise in the outcome leaves the coefficient alone and only shrinks effects expressed in SD of the noisy measure.',
  challenges: [
    { q: 'Average two readings instead of one. The estimated coefficient…', change: { n: 2 }, options: ['doubles', 'rises, but less than double', 'does not change'],
      judge: (b, a) => Math.abs(a.est / b.est - 2) < 0.02 ? 0 : a.est > b.est + 1e-6 ? 1 : 2,
      why: (b, a) => `It rises from ${nf(b.est, 3)} to ${nf(a.est, 3)}, a factor of ${nf(a.est / b.est, 2)}. Only the noise variance is halved; the between-person variance is the same in both readings, so reliability rises from ${nf(b.ln, 2)} to ${nf(a.ln, 2)}, not to ${nf(2 * b.ln, 2)}.` },
    { q: 'Starting from ten readings, average twenty. The remaining bias β − β̂…', base: { n: 10 }, change: { n: 20 }, options: ['roughly halves', 'falls by about a tenth', 'disappears'],
      judge: (b, a) => a.bias < 1e-6 ? 2 : a.bias / b.bias < 0.7 ? 0 : 1,
      why: (b, a) => `It falls from ${nf(b.bias, 3)} to ${nf(a.bias, 3)}. The bias is β(1 − λ)/[1 + (n − 1)λ], which for large n falls roughly in proportion to 1/n, so doubling the readings nearly halves it but never removes it.` },
    { q: 'Make the noisy biomarker the dependent variable (a gradient of the biomarker on socioeconomic position), with one reading. The estimated gradient in units of the true state is…', change: { role: 'y' }, options: ['0.15, attenuated as before', '0.50, unbiased', 'above 0.50'],
      judge: (b, a) => Math.abs(a.est - 0.15) < 1e-6 ? 0 : Math.abs(a.est - a.beta) < 1e-6 ? 1 : 2,
      why: (b, a) => `It is ${nf(a.est, 3)}, the true value. Noise in the dependent variable is absorbed by the error term: it widens the confidence interval but does not shrink the slope.` },
    { q: 'With the biomarker as dependent variable, a better assay raises λ from 0.3 to 0.9. The gradient expressed in SD of the measured biomarker…', base: { role: 'y' }, change: { role: 'y', lam: 0.9 }, options: ['rises', 'does not change, since the gradient is unbiased', 'falls'],
      judge: (b, a) => a.sd > b.sd + 1e-6 ? 0 : a.sd < b.sd - 1e-6 ? 2 : 1,
      why: (b, a) => `It rises from ${nf(b.sd, 3)} to ${nf(a.sd, 3)}, although the gradient itself stays at ${nf(a.est, 2)}. A noisy measure has a larger SD, so a standardized effect partly measures the quality of the assay.` }
  ]
});

// Section 2.13.1 and technical box item 5: Gompertz hazard h(a) = m c e^{ba}, c = 2.99e-5, b = 0.09.
// Life expectancy at birth = integral of survival exp(−(mc/b)(e^{ba} − 1)).
M.b24_c = 2.99e-5;
M.b24_LE = (m, b) => M.integrate(a => Math.exp(-m * M.b24_c / b * (Math.exp(b * a) - 1)), 0, 260, 2600);
M.b24_risks = function ({ s1, s2, e, k, b = 0.09 }) {
  const L0 = M.b24_LE(1, b);
  const m1 = 1 - e * s1, m2 = 1 - e * s2, m12 = 1 - e * (s1 + s2);
  const g1 = M.b24_LE(m1, b) - L0, g2 = M.b24_LE(m2, b) - L0, g12 = M.b24_LE(m12, b) - L0;
  const gs = M.b24_LE(1, b * (1 - k / 100)) - L0;
  return { s1, s2, e, k, b, L0, m1, m2, m12, g1, g2, g12, gs, sum: g1 + g2, bonus: g12 - g1 - g2,
    share2: e * s2 / m1, shift: m => Math.log(1 / m) / b, slowShare: gs / g12 };
};

EX.push({
  id: 'b24-competing', ch: 24, title: 'Competing risks: why eliminating two diseases is worth more than the sum',
  ref: 'Addendum Section 2.13.1, Figure 2.7, technical box item 5',
  anchors: [[24, 'Eliminating cancer adds 3.95 years'], [24, 'Eliminating both adds 11.65 years'], [24, 'by 10 percent adds 7.88 years']],
  intro: 'The hazard of death rises exponentially with age, h(a) = m c e^{ba}, and each cause holds a fixed share of it. The baseline is the worked example of Section 2.13.1: b = 0.09 and c = 2.99 × 10⁻⁵ give a life expectancy at birth of 82.6 years; cancer holds 30 percent and cardiovascular disease 35 percent of the hazard; slowing aging lowers b by 10 percent. Change the shares, remove only part of each cause, or slow aging more.',
  eq: String.raw`h(a)=m\,c\,e^{ba},\qquad e_0=\int_0^\infty \exp\!\Big[-\tfrac{mc}{b}\big(e^{ba}-1\big)\Big]da,\qquad \Delta e_0\approx\frac{\ln(1/m)}{b}`,
  params: [
    { id: 's1', label: 'Cancer share of the hazard σ₁', min: 0.05, max: 0.5, step: 0.01, book: 0.3, d: 2 },
    { id: 's2', label: 'Cardiovascular share of the hazard σ₂', min: 0.05, max: 0.45, step: 0.01, book: 0.35, d: 2 },
    { id: 'e', label: 'Share of each cause removed', min: 0.1, max: 1, step: 0.05, book: 1, d: 2 },
    { id: 'k', label: 'Slowing of aging: cut in b (%)', min: 0, max: 30, step: 1, book: 10, d: 0 }
  ],
  bookLabel: 'Baseline',
  ghost: 'Dashed gray outlines: baseline gains',
  compute: S => M.b24_risks(S),
  outputs: (S, R, B) => [
    { label: 'Life expectancy at birth, no change', v: M.b24_yr(R.L0, 1), b: M.b24_yr(B.L0, 1) },
    { label: 'Gain from removing cancer', v: M.b24_yr(R.g1), b: M.b24_yr(B.g1) },
    { label: 'Gain from removing cardiovascular disease', v: M.b24_yr(R.g2), b: M.b24_yr(B.g2) },
    { label: 'Sum of the two separate gains', v: M.b24_yr(R.sum), b: M.b24_yr(B.sum) },
    { label: 'Gain from removing both', v: M.b24_yr(R.g12), b: M.b24_yr(B.g12), key: true },
    { label: 'Complementarity: both minus the sum', v: M.b24_yr(R.bonus), b: M.b24_yr(B.bonus), key: true },
    { label: 'Cardiovascular share of the hazard once cancer is removed', v: pct(R.share2, 0), b: pct(B.share2, 0) },
    { label: `Gain from slowing aging by ${S.k}%`, v: M.b24_yr(R.gs), b: M.b24_yr(B.gs) },
    { label: 'Slowing aging as a share of the gain from both', v: pct(R.slowShare, 0), b: pct(B.slowShare, 0) }
  ],
  verdict: (S, R) => R.bonus > 0.005
    ? { tone: 'ok', text: `Complements: removing both adds ${nf(R.g12, 2)} years, ${nf(R.bonus, 2)} more than the ${nf(R.sum, 2)} of the separate gains, because those saved from one cause are no longer taken by the other.` }
    : { tone: 'neutral', text: 'The gains are almost additive here.' },
  chart(el, S, R, B) {
    const vals = [R.g1, R.g2, R.g12, R.gs], base = [B.g1, B.g2, B.g12, B.gs];
    const names = ['Cancer', 'Cardiovascular', 'Both', `Slow aging ${S.k}%`];
    const y1 = Math.max(14, Math.ceil(Math.max(...vals) * 1.15 / 2) * 2);
    const P = Plot(el, { x0: 0.4, x1: 4.6, y0: 0, y1, xticks: [], xlabel: '', ylabel: 'Gain in life expectancy (years)', aria: 'Bar chart of gains in life expectancy from removing causes of death and from slowing aging' });
    const w = 0.3, yLab = -(y1) * 18 / 302;
    vals.forEach((v, i) => {
      const x = i + 1;
      P.area([[x - w, 0], [x - w, v], [x + w, v], [x + w, 0]], i === 2 ? 'f-sec' : 'f-band');
      P.path([[x - w, 0], [x - w, v], [x + w, v], [x + w, 0], [x - w, 0]], i === 2 ? 's-sec' : 's-grn');
      P.path([[x - w, 0], [x - w, base[i]], [x + w, base[i]], [x + w, 0]], 'ghost');
      P.text(x, v + y1 * 0.025, nf(v, 2), '', 'middle');
      P.text(x, yLab, names[i], 'muted', 'middle');
    });
    P.seg(3 - w - 0.12, R.sum, 3 + w + 0.12, R.sum, 's-ink dash thick');
    P.text(3 + w + 0.14, R.sum + y1 * 0.01, 'sum of', 'muted', 'start');
    P.text(3 + w + 0.14, R.sum - y1 * 0.04, 'separate', 'muted', 'start');
    P.draw();
  },
  notice: 'The dashed line across the third bar is what the two separate gains add up to; the part of the bar above it is the complementarity. Removing a cause multiplies the hazard by m and shifts survival by about ln(1/m)/b years, and ln(1/m) grows faster than linearly as m falls.',
  challenges: [
    { q: 'Instead of eliminating them, halve both diseases (share removed 0.5). The gain from halving both is…', change: { e: 0.5 }, options: ['more than half of 11.65 years', 'about half of it', 'less than half of it'],
      judge: (b, a) => a.g12 > 0.55 * b.g12 ? 0 : a.g12 > 0.45 * b.g12 ? 1 : 2,
      why: (b, a) => `It is ${nf(a.g12, 2)} years, against half of ${nf(b.g12, 2)} = ${nf(b.g12 / 2, 2)}. The gain rises with ln(1/m), and the last units of hazard removed are worth the most: halving the two causes lowers m only to ${nf(a.m12, 3)}, eliminating them to ${nf(b.m12, 2)}.` },
    { q: 'Suppose cardiovascular disease held 45 percent of the hazard instead of 35. The gain from eliminating cancer alone…', change: { s2: 0.45 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.g1 > b.g1 + 0.005 ? 0 : a.g1 < b.g1 - 0.005 ? 1 : 2,
      why: (b, a) => `It stays at ${nf(a.g1, 2)} years: with proportional hazards it depends only on cancer’s own share. What changes is the complementarity, from ${nf(b.bonus, 2)} to ${nf(a.bonus, 2)} years, because a larger rival cause takes more of the lives that cancer research saves.` },
    { q: 'Slow aging by 20 percent instead of 10 (b from 0.09 to 0.072). The gain in life expectancy…', change: { k: 20 }, options: ['about doubles', 'more than doubles', 'less than doubles'],
      judge: (b, a) => a.gs / b.gs > 2.1 ? 1 : a.gs / b.gs < 1.9 ? 2 : 0,
      why: (b, a) => `It rises from ${nf(b.gs, 2)} to ${nf(a.gs, 2)} years, ${nf(a.gs / b.gs, 2)} times as much. Lowering b slows the growth of every cause of death at once. Life expectancy is roughly [ln(b/c) − 0.58]/b, so each further cut in b buys more years than the one before.` },
    { q: 'Let cancer hold only 10 percent of the hazard (cardiovascular disease still 35). The extra gain from eliminating both, above the sum of the separate gains…', change: { s1: 0.1 }, options: ['shrinks below one year', 'stays near 2.9 years', 'grows'],
      judge: (b, a) => a.bonus < 1 ? 0 : a.bonus > b.bonus + 0.05 ? 2 : 1,
      why: (b, a) => `It falls from ${nf(b.bonus, 2)} to ${nf(a.bonus, 2)} years. The bonus is about ln[1 + σ₁σ₂/(1 − σ₁ − σ₂)]/b: complementarity is strong only when both causes are large, so it matters most for the major diseases of aging.` }
  ]
});
