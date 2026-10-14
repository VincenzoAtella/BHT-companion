// ===== Addendum Chapter 1 (app chapter 23, label A1): How health evolves, biology inside the Grossman model =====
// solvers for this chapter: M.b23_<name>

M.b23_nf = (x, d) => nf(x, d).replace(/^-/, '−');
M.b23_eur = (x, d = 0) => isFinite(x) ? (x < -0.5 * Math.pow(10, -d) ? '−' : x > 0.5 * Math.pow(10, -d) ? '+' : '') + nf(Math.abs(x), d) + ' €' : 'n/a';

// Section 1.8.3, equation (1.13), extended with the depreciation of the health gain used in Table 1.2:
// the benefit in the k-th year after delivery is theta v (1 - d)^(k-1), discounted by (1 + r)^-k, for k = 1..80 - t.
// theta follows biological age: theta = 1 - s (age + gap - 30), between 0 and 1.
M.b23_theta = (age, s) => clamp(1 - s * (age - 30), 0, 1);
M.b23_npvAt = function (t, { s, d, r, gap, C = 3000, v = 200, T = 80 }) {
  const th = M.b23_theta(t + gap, s), n = Math.max(0, T - t);
  let pv1 = 0;                                    // present value of the yearly benefit stream per unit of theta v
  for (let k = 1; k <= n; k++) pv1 += Math.pow(1 - d, k - 1) * Math.pow(1 + r, -k);
  return { th, n, pv1, pv: th * v * pv1, npv: th * v * pv1 - C, npv1: v * pv1 - C };
};
M.b23_prevention = function ({ t, s, d, r, gap }) {
  const P = { s, d, r, gap }, A = M.b23_npvAt(t, P);
  let last = null, last1 = null;                // last age of delivery at which the program pays, with and without biology
  for (let a = 30; a < 80; a++) { const x = M.b23_npvAt(a, P); if (x.npv >= 0) last = a; if (x.npv1 >= 0) last1 = a; }
  const thBE = 3000 / (200 * A.pv1);             // productivity that makes the program break even at this age
  const bioBE = s > 0 ? 30 + (1 - thBE) / s : Infinity;   // highest biological age at which it pays, at this chronological age
  return { t, s, d, r, gap, bio: t + gap, ...A, last, last1, thBE, bioBE,
    curve: a => M.b23_npvAt(a, P).npv, curve1: a => M.b23_npvAt(a, P).npv1 };
};

EX.push({
  id: 'b23-prevention', ch: 23, title: 'The same prevention program at different ages',
  ref: 'Addendum Sections 1.1 and 1.8, Eq. (1.13), Table 1.2, Figure 1.5',
  anchors: [[23, '+698 +1,623'], [23, 'that is if θ > 0.65'], [23, 'below about 48']],
  intro: 'A prevention program costs C = 3,000 euros at the age of delivery t and yields θ_t × 200 euros a year from the next year until age 80, discounted at r = 3 percent. Productivity falls by 2 percentage points a year after age 30, θ_t = 1 − 0.02 (t − 30). These are the chapter’s numbers, and the baseline is age 40, the age of Emma and Grace. You can add a depreciation of the health gain, as in the last column of Table 1.2, and let θ follow biological rather than chronological age.',
  eq: String.raw`\mathrm{NPV}(t)=-C+\theta_t\,v\sum_{k=1}^{80-t}\frac{(1-d)^{k-1}}{(1+r)^{k}},\qquad \theta_t=1-s\,(t+\text{gap}-30),\qquad d=0:\ \sum=F(80-t)=\frac{1-(1+r)^{-(80-t)}}{r}`,
  params: [
    { id: 't', label: 'Age of delivery t (chronological)', min: 30, max: 75, step: 1, book: 40, d: 0 },
    { id: 'gap', label: 'Biological age minus chronological age (years)', min: -10, max: 15, step: 1, book: 0, d: 0 },
    { id: 's', label: 'Fall in productivity θ per year of age after 30, s', min: 0, max: 0.04, step: 0.005, book: 0.02, d: 3 },
    { id: 'd', label: 'Depreciation of the health gain d (per year)', min: 0, max: 0.06, step: 0.005, book: 0, d: 3 },
    { id: 'r', label: 'Interest rate r', min: 0.01, max: 0.08, step: 0.005, book: 0.03, d: 3 }
  ],
  presets: [
    { label: 'Age 30', values: { t: 30 } },
    { label: 'Age 50', values: { t: 50 } },
    { label: 'Table 1.2, last column (d = 2%)', values: { d: 0.02 } },
    { label: 'Without biology (θ = 1)', values: { s: 0 } }
  ],
  compute: S => M.b23_prevention(S),
  outputs: (S, R, B) => [
    { label: 'Biological age and productivity θ', v: R.bio + ', θ = ' + nf(R.th, 2), b: B.bio + ', θ = ' + nf(B.th, 2) },
    { label: 'Years of benefit 80 − t', v: nf(R.n, 0), b: nf(B.n, 0) },
    { label: 'Present value of 1 euro a year (F(80 − t) when d = 0)', v: nf(R.pv1, 2), b: nf(B.pv1, 2) },
    { label: 'NPV with biology', v: M.b23_eur(R.npv), b: M.b23_eur(B.npv), key: true },
    { label: 'NPV with θ = 1 (no biology)', v: M.b23_eur(R.npv1), b: M.b23_eur(B.npv1) },
    { label: 'Smallest θ that pays at this age', v: nf(R.thBE, 2), b: nf(B.thBE, 2) },
    { label: 'Highest biological age that pays at this age', v: isFinite(R.bioBE) ? nf(R.bioBE, 1) : 'any', b: isFinite(B.bioBE) ? nf(B.bioBE, 1) : 'any' },
    { label: 'Last age of delivery at which it pays', v: R.last === null ? 'none' : String(R.last), b: B.last === null ? 'none' : String(B.last), key: true }
  ],
  verdict: (S, R) => R.npv >= 0
    ? { tone: 'ok', text: `Offer it: at age ${S.t} with θ = ${nf(R.th, 2)} the benefits are worth ${nf(R.pv, 0)} euros in present value against a cost of 3,000 euros.` }
    : R.npv1 >= 0
      ? { tone: 'warn', text: `Do not offer it: the NPV is ${M.b23_eur(R.npv)}. With θ = 1 it would be ${M.b23_eur(R.npv1)}, so the biology alone changes the sign of the answer.` }
      : { tone: 'bad', text: `Do not offer it: the NPV is ${M.b23_eur(R.npv)}, and even with θ = 1 the remaining ${R.n} years of benefit would not repay the cost.` },
  chart(el, S, R, B) {
    const ages = []; for (let a = 30; a <= 79; a++) ages.push(a);
    const hi = Math.max(2500, ...ages.map(a => R.curve1(a))) * 1.08;
    const P = Plot(el, { x0: 30, x1: 80, y0: -3200, y1: hi, xlabel: 'Age of delivery t', ylabel: 'Net present value (euros)', aria: 'Net present value of the prevention program by age of delivery, with and without the biological productivity term' });
    P.path(ages.map(a => [a, B.curve(a)]), 'ghost');
    P.hline(0, 's-ink thin');
    P.path(ages.map(a => [a, R.curve1(a)]), 's-gray dash');
    P.path(ages.map(a => [a, R.curve(a)]), 's-pri thick');
    if (R.last !== null && R.last < 79) P.vline(R.last, 's-grn dot', 'last age that pays: ' + R.last);
    P.pt(S.t, R.npv, 'p-pri', M.b23_eur(R.npv), 8, -10);
    P.text(78, R.curve1(78) + 150, 'θ = 1', 'muted', 'end');
    P.draw();
  },
  notice: 'The blue line is the NPV with biology; the dashed gray line keeps θ = 1, so the gap between them is the cost of a body that responds less. Both fall with age because the horizon shrinks, but only the blue line crosses zero in the forties. Depreciation and a higher interest rate push the whole curve down by shrinking the value of distant years.',
  challenges: [
    { q: 'Grace is 40 but her body is ten years older: set the gap to +10. Is the program still worth offering to her?', change: { gap: 10 }, options: ['Yes', 'No'], judge: (b, a) => a.npv >= 0 ? 0 : 1, why: (b, a) => `No. Her θ falls from ${nf(b.th, 2)} to ${nf(a.th, 2)}, below the ${nf(a.thBE, 2)} needed at 40, and the NPV goes from ${M.b23_eur(b.npv)} to ${M.b23_eur(a.npv)}. She has the same 40 years of benefit as Emma; only the productivity of prevention differs.` },
    { q: 'Remove the biology (s = 0) and deliver at 60 instead of 40. The program…', change: { s: 0, t: 60 }, options: ['still pays comfortably', 'roughly breaks even', 'loses more than 1,000 euros'], judge: (b, a) => a.npv > 500 ? 0 : a.npv > -1000 ? 1 : 2, why: (b, a) => `It roughly breaks even: the NPV is ${M.b23_eur(a.npv)}. With 20 years left, 200 euros a year are worth only ${nf(a.pv, 0)} euros today, so the horizon alone nearly wipes out the return even when the body responds as well as at 30.` },
    { q: 'Raise the interest rate from 3 to 5 percent. The last age at which the program pays…', change: { r: 0.05 }, options: ['stays at 45', 'falls by 1 to 5 years', 'falls by more than 5 years'], judge: (b, a) => a.last === b.last ? 0 : (b.last - (a.last === null ? 29 : a.last)) <= 5 ? 1 : 2, why: (b, a) => `It falls from ${b.last} to ${a.last === null ? 'no age at all' : a.last}. Most of the benefit arrives decades after delivery, so a higher discount rate cuts it deeply; a 2-percent depreciation of the gain has a similar effect, because both shrink the weight of distant years.` },
    { q: 'Emma is 40 but her body looks 35: set the gap to −5. By how much does the NPV rise?', change: { gap: -5 }, options: ['by about 200 euros', 'by about 460 euros', 'by about 900 euros'], judge: (b, a) => { const x = a.npv - b.npv; return x < 330 ? 0 : x < 680 ? 1 : 2; }, why: (b, a) => `From ${M.b23_eur(b.npv)} to ${M.b23_eur(a.npv)}, a rise of ${nf(a.npv - b.npv, 0)} euros. θ rises by 0.10, and each 0.01 of θ is worth 200 × F(40) / 100 ≈ ${nf(2 * a.pv1, 0)} euros at this age.` }
  ]
});

// Section 1.7, equation (1.7): P = 120 + G + beta X, G independent of X, additive genetic effects.
M.b23_herit = function ({ VG, beta, VX, Xbar }) {
  const VE = beta * beta * VX, VP = VG + VE;
  return { VG, beta, VX, Xbar, VE, VP, h2: VG / VP, mean: 120 + beta * Xbar, drop: beta * Xbar,
    curve: vx => VG / (VG + beta * beta * vx) };
};

EX.push({
  id: 'b23-heritability', ch: 23, title: 'Heritability: a share of variance, not an effect',
  ref: 'Addendum Section 1.7, Eqs. (1.6)-(1.7), Figure 1.4',
  anchors: [[23, 'is 40/(40 + 60) = 0.40'], [23, 'heritability is 40/55 ≈ 0.73']],
  intro: 'Systolic blood pressure is P = 120 + G + βX, where X is salt intake in grams a day above 5 grams. Genes and salt are independent and genetic effects are additive, so heritability is h² = Var(G)/[Var(G) + β²Var(X)]. The baseline is country A of the chapter’s worked example: Var(G) = 40, β = 2 mmHg per gram, average intake 5 and Var(X) = 15. Compare what heritability says with what a salt policy would do to the average.',
  eq: String.raw`P=\mu+G+E,\quad E=\beta(X-\bar X),\qquad \mathrm{Var}(P)=\mathrm{Var}(G)+\beta^2\mathrm{Var}(X),\qquad h^2=\frac{\mathrm{Var}(G)}{\mathrm{Var}(G)+\beta^2\mathrm{Var}(X)}`,
  params: [
    { id: 'VG', label: 'Genetic variance Var(G)', min: 5, max: 100, step: 5, book: 40, d: 0 },
    { id: 'beta', label: 'Effect of salt β (mmHg per gram)', min: 0, max: 5, step: 0.25, book: 2, d: 2 },
    { id: 'VX', label: 'Dispersion of diets Var(X)', min: 0, max: 30, step: 0.25, book: 15, d: 2 },
    { id: 'Xbar', label: 'Average salt intake X̄ (grams above 5)', min: 0, max: 10, step: 0.5, book: 5, d: 1 }
  ],
  presets: [
    { label: 'Country A', values: { VX: 15, Xbar: 5 } },
    { label: 'Country A after the salt policy', values: { VX: 0, Xbar: 0 } },
    { label: 'Country B', values: { VX: 3.75, Xbar: 5 } }
  ],
  compute: S => M.b23_herit(S),
  outputs: (S, R, B) => [
    { label: 'Environmental variance β²Var(X)', v: nf(R.VE, 1), b: nf(B.VE, 1) },
    { label: 'Variance of blood pressure Var(P)', v: nf(R.VP, 1), b: nf(B.VP, 1) },
    { label: 'Heritability h²', v: nf(R.h2, 2), b: nf(B.h2, 2), key: true },
    { label: 'Average blood pressure (mmHg)', v: nf(R.mean, 1), b: nf(B.mean, 1) },
    { label: 'Fall in the average if everyone moves to X = 0 (mmHg)', v: nf(R.drop, 1), b: nf(B.drop, 1), key: true }
  ],
  verdict: (S, R) => R.drop > 0.05 && R.h2 > 0.6
    ? { tone: 'warn', text: `Heritability is high (${nf(R.h2, 2)}), yet a policy that moves everyone to X = 0 would still lower average blood pressure by ${nf(R.drop, 1)} mmHg.` }
    : R.drop > 0.05
      ? { tone: 'neutral', text: `Heritability is ${nf(R.h2, 2)}; a policy that moves everyone to X = 0 would lower average blood pressure by ${nf(R.drop, 1)} mmHg whatever its value.` }
      : { tone: 'ok', text: `Heritability is ${nf(R.h2, 2)} and nothing is left for a salt policy to lower: average intake is already at X = 0${R.beta > 0 ? '' : ', or salt has no effect'}.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 0, x1: 30, y0: 0, y1: 1.05, xlabel: 'Dispersion of diets Var(X)', ylabel: 'Heritability h²', aria: 'Heritability as a function of the dispersion of diets' });
    P.fn(B.curve, 'ghost');
    P.hline(1, 's-gray dot');
    P.fn(R.curve, 's-pri thick');
    P.pt(15, B.curve(15), 'p-gray small', 'A', 6, 14);
    P.pt(3.75, B.curve(3.75), 'p-gray small', 'B', 6, 14);
    P.pt(S.VX, R.h2, 'p-pri', 'h² = ' + nf(R.h2, 2), 8, -10);
    P.draw();
  },
  notice: 'Heritability falls as diets become more dispersed and reaches 1 when everyone eats the same, whatever β is. The fall in average blood pressure that a salt policy can achieve depends on β and on average intake, neither of which the curve shows: the policy works through a coefficient, and heritability measures a share of variance.',
  challenges: [
    { q: 'Halve the effect of salt, β from 2 to 1, with diets as dispersed as before. Heritability…', change: { beta: 1 }, options: ['stays at 0.40, since genes have not changed', 'rises to about 0.57', 'rises to about 0.73'], judge: (b, a) => Math.abs(a.h2 - b.h2) < 1e-6 ? 0 : a.h2 < 0.65 ? 1 : 2, why: (b, a) => `It rises to ${nf(a.h2, 2)}, the value of country B. β enters squared, so halving it cuts the environmental variance from ${nf(b.VE, 0)} to ${nf(a.VE, 0)}, just as cutting Var(X) to a quarter does.` },
    { q: 'A campaign lowers average intake from 5 to 2 grams above 5, without changing how much diets differ. Heritability…', change: { Xbar: 2 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.h2 > b.h2 + 1e-9 ? 0 : a.h2 < b.h2 - 1e-9 ? 1 : 2, why: (b, a) => `It stays at ${nf(a.h2, 2)}, while average blood pressure falls from ${nf(b.mean, 0)} to ${nf(a.mean, 0)} mmHg. A shift of the whole distribution leaves every variance unchanged, so heritability cannot register the policy’s success.` },
    { q: 'Diets become twice as dispersed, Var(X) from 15 to 30, with the same average intake. Average blood pressure…', change: { VX: 30 }, options: ['rises', 'falls', 'does not change'], judge: (b, a) => a.mean > b.mean + 1e-9 ? 0 : a.mean < b.mean - 1e-9 ? 1 : 2, why: (b, a) => `It stays at ${nf(a.mean, 0)} mmHg, while heritability falls from ${nf(b.h2, 2)} to ${nf(a.h2, 2)}. The level depends on average intake and β; the dispersion changes only how differences are shared between genes and environment.` },
    { q: 'Start after the salt policy, with everyone at X = 0. New evidence shows salt is twice as harmful: β = 4. Heritability…', base: { VX: 0, Xbar: 0 }, change: { VX: 0, Xbar: 0, beta: 4 }, options: ['stays at 1', 'falls below 1'], judge: (b, a) => a.h2 > 1 - 1e-9 ? 0 : 1, why: (b, a) => `It stays at ${nf(a.h2, 2)}. With no differences in diet, salt explains none of the differences in blood pressure, however large its effect: this is the first town of Section 1.7.2.` }
  ]
});

// Section 1.9.3, equations (1.16)-(1.18): gamma(a) = gamma0 e^(b a), cumulative loss L(a) = gamma0/b (e^(b a) - 1),
// a threshold L is reached at a(L) = ln(1 + b L / gamma0) / b.
M.b23_gompertz = function ({ g0, b, LD, LM }) {
  LD = Math.min(LD, LM);
  const age = L => Math.log(1 + b * L / g0) / b;
  const onset = age(LD), death = age(LM), yrs = death - onset;
  return { g0, b, LD, LM, onset, death, yrs, share: yrs / death, loss: a => g0 / b * (Math.exp(b * a) - 1), shift: Math.LN2 / b };
};

EX.push({
  id: 'b23-gompertz', ch: 23, title: 'Gompertz depreciation and years of disability',
  ref: 'Addendum Section 1.9.3, Eqs. (1.16)-(1.18), Table 1.3, Figure 1.7',
  anchors: [[23, 'disability begins at 72.1 and death occurs at 83.6']],
  intro: 'With no new investment, health declines at the Gompertz rate γ(a) = γ0 e^(ba). Disability begins when the cumulative loss ln(H0/Ha) reaches L_D and death occurs when it reaches L_M. The baseline is scenario A of Table 1.3: γ0 = 0.0005, b = 0.08, L_D = 2, L_M = 5. The presets are the chapter’s four technologies: each acts on a different part of the model.',
  eq: String.raw`\gamma(a)=\gamma_0e^{ba},\qquad \ln\frac{H_0}{H_a}=\frac{\gamma_0}{b}\left(e^{ba}-1\right),\qquad a(L)=\frac1b\ln\!\left(1+\frac{bL}{\gamma_0}\right)`,
  params: [
    { id: 'g0', label: 'Depreciation at birth γ0', min: 0.0001, max: 0.002, step: 0.00005, book: 0.0005, d: 5 },
    { id: 'b', label: 'Speed at which depreciation accelerates b', min: 0.04, max: 0.12, step: 0.005, book: 0.08, d: 3 },
    { id: 'LD', label: 'Disability threshold L_D', min: 0.5, max: 6, step: 0.1, book: 2, d: 1 },
    { id: 'LM', label: 'Survival threshold L_M = ln(H0/Hmin)', min: 1, max: 8, step: 0.1, book: 5, d: 1 }
  ],
  presets: [
    { label: 'A. Baseline', values: { g0: 0.0005, b: 0.08, LD: 2, LM: 5 } },
    { label: 'B. Aging postponed', values: { g0: 0.00025, b: 0.08, LD: 2, LM: 5 } },
    { label: 'C. Aging slowed', values: { g0: 0.0005, b: 0.07, LD: 2, LM: 5 } },
    { label: 'D. Rescue medicine', values: { g0: 0.0005, b: 0.08, LD: 2, LM: 6 } },
    { label: 'E. Function preserved', values: { g0: 0.0005, b: 0.08, LD: 2.5, LM: 5 } }
  ],
  compute: S => M.b23_gompertz(S),
  outputs: (S, R, B) => [
    { label: 'Onset of disability a(L_D)', v: nf(R.onset, 1), b: nf(B.onset, 1) },
    { label: 'Death a(L_M)', v: nf(R.death, 1), b: nf(B.death, 1), key: true },
    { label: 'Years lived with disability', v: nf(R.yrs, 1), b: nf(B.yrs, 1), key: true },
    { label: 'Share of life with disability', v: pct(R.share, 1), b: pct(B.share, 1) }
  ],
  verdict: (S, R) => {
    const dL = R.death - 83.57, dY = R.yrs - 11.43;
    if (S.LD > S.LM - 1e-9) return { tone: 'neutral', text: 'The disability threshold is at or above the survival threshold, so death comes without a period of disability.' };
    if (Math.abs(dL) < 0.05 && Math.abs(dY) < 0.05) return { tone: 'neutral', text: `Baseline: ${nf(R.yrs, 1)} years of disability out of a life of ${nf(R.death, 1)} years.` };
    return dY < -0.05
      ? { tone: 'ok', text: `Life ${dL >= 0 ? 'lasts' : 'ends at'} ${nf(R.death, 1)} years and disability lasts ${nf(R.yrs, 1)} years, ${nf(-dY, 1)} fewer than at baseline.` }
      : dY > 0.05
        ? { tone: 'warn', text: `Life lasts ${nf(R.death, 1)} years, but disability lasts ${nf(R.yrs, 1)} years, ${nf(dY, 1)} more than at baseline.` }
        : { tone: 'neutral', text: `Life lasts ${nf(R.death, 1)} years and the years of disability are almost unchanged at ${nf(R.yrs, 1)}: the curve has shifted, not changed shape.` };
  },
  chart(el, S, R, B) {
    const x1 = Math.min(160, Math.max(100, Math.ceil((R.death + 4) / 10) * 10)), y1 = Math.max(6.5, R.LM + 1);
    const P = Plot(el, { x0: 30, x1, y0: 0, y1, xlabel: 'Age a', ylabel: 'Cumulative loss ln(H0/Ha)', aria: 'Cumulative loss of health under Gompertz depreciation, with the disability and survival thresholds' });
    if (R.yrs > 0.01) P.rect(R.onset, R.death, 'f-sec');
    P.fn(B.loss, 'ghost');
    P.hline(R.LD, 's-sec dash', 'disability, L_D = ' + nf(R.LD, 1), 'start');
    P.hline(R.LM, 's-ink dash', 'survival, L_M = ' + nf(R.LM, 1), 'start');
    P.fn(R.loss, 's-pri thick', 30, x1, 240);
    P.pt(R.onset, R.LD, 'p-sec', nf(R.onset, 1), -8, -8, 'end');
    P.pt(R.death, R.LM, 'p-ink', nf(R.death, 1), -8, -8, 'end');
    P.draw();
  },
  notice: 'The red band is the period of disability, between the ages at which the curve crosses the two thresholds. Changing γ0 slides the curve sideways and leaves the band almost as wide; changing b changes its slope and so the width of the band; changing a threshold moves only one edge of the band.',
  challenges: [
    { q: 'Aging accelerates faster: b from 0.08 to 0.10. Life gets shorter. The years lived with disability…', change: { b: 0.1 }, options: ['rise', 'fall', 'stay about the same'], judge: (b, a) => a.yrs > b.yrs + 0.3 ? 0 : a.yrs < b.yrs - 0.3 ? 1 : 2, why: (b, a) => `They fall from ${nf(b.yrs, 1)} to ${nf(a.yrs, 1)}, while death comes at ${nf(a.death, 1)} instead of ${nf(b.death, 1)}. A steeper curve crosses the gap between the two thresholds faster, roughly in ln(L_M/L_D)/b years: a worse technology can mean fewer years of disability.` },
    { q: 'A stronger rescue medicine raises L_M from 5 to 7. Of the extra years of life, how many are lived with disability?', change: { LM: 7 }, options: ['all of them', 'about half', 'none'], judge: (b, a) => Math.abs((a.yrs - b.yrs) - (a.death - b.death)) < 0.05 ? 0 : (a.yrs - b.yrs) > 0.25 * (a.death - b.death) ? 1 : 2, why: (b, a) => `All of them: death moves from ${nf(b.death, 1)} to ${nf(a.death, 1)} while disability still begins at ${nf(a.onset, 1)}, so the years of disability rise from ${nf(b.yrs, 1)} to ${nf(a.yrs, 1)}. Keeping people alive at lower health adds years only at the end of the band.` },
    { q: 'Combine rescue medicine (L_M = 6) with preserved function (L_D = 2.5). Compared with the baseline 11.4 years, disability lasts…', change: { LM: 6, LD: 2.5 }, options: ['longer', 'slightly less, between 9 and 11.4 years', 'much less, under 9 years'], judge: (b, a) => a.yrs > b.yrs ? 0 : a.yrs >= 9 ? 1 : 2, why: (b, a) => `${nf(a.yrs, 1)} years: onset moves to ${nf(a.onset, 1)} and death to ${nf(a.death, 1)}. Raising L_D by 0.5 buys more delay than raising L_M by 1, because the curve is steeper at older ages, so each unit of loss is crossed faster near death than near the onset.` },
    { q: 'Slow aging further than scenario C: b from 0.08 to 0.06. The share of life spent with disability…', change: { b: 0.06 }, options: ['rises', 'falls', 'stays the same'], judge: (b, a) => a.share > b.share + 0.001 ? 0 : a.share < b.share - 0.001 ? 1 : 2, why: (b, a) => `It rises slightly, from ${pct(b.share, 1)} to ${pct(a.share, 1)}, although life lengthens from ${nf(b.death, 1)} to ${nf(a.death, 1)} years. A flatter curve stretches the period of disability (now ${nf(a.yrs, 1)} years) a little more than in proportion to life.` }
  ]
});
