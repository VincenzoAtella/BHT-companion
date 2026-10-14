// ===== BHT Chapter 22: Obesity =====
// solvers for this chapter: M.b22_<name>

M.b22_nf = (x, d) => nf(x, d).replace(/^-/, '−');
M.b22_usd = (x, d = 0) => isFinite(x) ? (x < -0.005 ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';
M.b22_sgn = (x, d = 0, u = '') => (x > 0.5 * Math.pow(10, -d) ? '+' : '') + M.b22_nf(x, d) + u;

// Definition 22.1: BMI = kg / m^2 = 703.07 lb / in^2 (= 4.88 lb / ft^2, which BHT round to 4.9).
// Classes as in BHT Section 22.1: underweight below 18, overweight 25-30, obese 30 or more.
M.b22_K = 703.07;
M.b22_class = b => b >= 30 ? 'obese' : b >= 25 ? 'overweight' : b >= 18 ? 'normal weight' : 'underweight';
M.b22_bmi = function ({ W, H }) {
  const inch = H * 12, bmi = M.b22_K * W / (inch * inch);
  const wAt = b => b * inch * inch / M.b22_K;                     // weight (lb) at which this height reaches BMI b
  return { W, H, bmi, kg: W * 0.45359237, m: inch * 0.0254, cls: M.b22_class(bmi), w18: wAt(18), w25: wAt(25), w30: wAt(30),
    toNonObese: Math.max(0, W - wAt(30)), wAt };
};

// Energy balance with price-driven calorie intake (stylized, illustrative calibration).
// Intake C = C0 p^(-eps); expenditure per day e W with e = e0 + j + x (kcal per lb of body weight);
// 3,500 kcal per lb, so dW/dt = (C - e W) / 3,500 and W(t) = W* + (W0 - W*) exp(-e t / 3,500), W* = C / e.
M.b22_energy = function ({ p, eps, j, x, C0 = 2700, e0 = 11, W0 = 180, Hin = 70 }) {
  const C = C0 * Math.pow(p, -eps), e = e0 + j + x, Wstar = C / e;
  const W = t => Wstar + (W0 - Wstar) * Math.exp(-e * t * 365 / 3500);   // t in years
  const half = 3500 * Math.LN2 / e;                                       // days to close half of the gap
  return { p, eps, j, x, C, e, Wstar, W, half, gap: Wstar - W0, burn0: e * W0, bmi: M.b22_K * Wstar / (Hin * Hin),
    spend: p * C / C0, W1: W(1) };
};

// Figure 22.6: BMI demand, the true price of a BMI point and the price under pooled insurance.
// Each BMI point above 24 adds c dollars a year to medical costs; the person pays a share s of them
// (out-of-pocket share; the rest is spread over the pool) plus a tax t per BMI point on fattening food.
// Demand: b(price) = bA + k (c - price) / 100, so bA is the efficient BMI and k the BMI points per $100.
M.b22_pool = function ({ c, s, k, t, bA = 27, b0 = 24 }) {
  const pp = s * c + t;                                  // private price of a BMI point
  const b = Math.max(b0, bA + k * (c - pp) / 100);       // chosen BMI (not below the reference)
  const dwl = 0.5 * Math.abs(c - pp) * Math.abs(b - bA);
  const others = (1 - s) * c * (b - b0);                 // the person's extra medical costs paid by the pool
  const tax = t * (b - b0);                              // fat tax paid on the food behind BMI points above 24
  const own = s * c * (b - b0);
  return { c, s, k, t, pp, b, bA, b0, dwl, others, tax, own, demand: bb => k > 0 ? c - (bb - bA) * 100 / k : NaN };
};

EX.push({
  id: 'b22-bmi', ch: 22, title: 'Body mass index',
  ref: 'BHT Section 22.1, Definition 22.1',
  anchors: [[22, 'a BMI of 17.9'], [22, 'of 35; he is obese']],
  intro: 'BMI divides weight by the square of height. The baseline is BHT’s man of 180 pounds who is 5 feet tall; the preset makes him 7 feet tall. The classes follow BHT: underweight below 18, overweight from 25 to 30, obese from 30. Move weight and height to see how the classes are cut out of the height-weight plane.',
  eq: String.raw`\text{BMI}=\frac{\text{kg}}{\text{m}^2}=703\,\frac{\text{lb}}{\text{in}^2}\approx4.9\,\frac{\text{lb}}{\text{ft}^2},\qquad \text{obese: BMI}\ge30`,
  params: [
    { id: 'W', label: 'Weight W (pounds)', min: 80, max: 400, step: 1, book: 180, d: 0 },
    { id: 'H', label: 'Height H (feet)', min: 4.5, max: 7.5, step: 0.05, book: 5, d: 2 }
  ],
  presets: [{ label: 'The 7-foot man (180 lb)', values: { W: 180, H: 7 } }, { label: '6 feet, 180 lb', values: { W: 180, H: 6 } }],
  ghost: '',
  compute: S => M.b22_bmi(S),
  outputs: (S, R, B) => [
    { label: 'Weight and height in metric units', v: `${nf(R.kg, 1)} kg, ${nf(R.m, 2)} m`, b: `${nf(B.kg, 1)} kg, ${nf(B.m, 2)} m` },
    { label: 'Body mass index', v: nf(R.bmi, 1), b: nf(B.bmi, 1), key: true },
    { label: 'Class', v: R.cls, b: B.cls, key: true },
    { label: 'Weight range from BMI 18 to 25 at this height', v: `${nf(R.w18, 0)}–${nf(R.w25, 0)} lb`, b: `${nf(B.w18, 0)}–${nf(B.w25, 0)} lb` },
    { label: 'Weight at which this height becomes obese', v: nf(R.w30, 0) + ' lb', b: nf(B.w30, 0) + ' lb' },
    { label: 'Pounds to lose to fall below BMI 30', v: nf(R.toNonObese, 0), b: nf(B.toNonObese, 0) }
  ],
  verdict: (S, R) => R.bmi >= 30
    ? { tone: 'bad', text: `A BMI of ${nf(R.bmi, 1)} is in the obese range; at ${nf(S.H, 2)} feet he would need to weigh under ${nf(R.w30, 0)} pounds to leave it.` }
    : R.bmi >= 25 ? { tone: 'warn', text: `A BMI of ${nf(R.bmi, 1)} is overweight but not obese.` }
    : R.bmi >= 18 ? { tone: 'ok', text: `A BMI of ${nf(R.bmi, 1)} is in the normal range.` }
    : { tone: 'warn', text: `A BMI of ${nf(R.bmi, 1)} is underweight: the same 180 pounds can be too little on a tall frame.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 4.5, x1: 7.5, y0: 50, y1: 420, xlabel: 'Height (feet)', ylabel: 'Weight (pounds)', aria: 'Height-weight plane with BMI classes' });
    const w = b => h => b * 144 * h * h / M.b22_K;
    const band = (lo, hi, cls) => { const pts = []; for (let i = 0; i <= 60; i++) { const h = 4.5 + 3 * i / 60; pts.push([h, w(lo)(h)]); } for (let i = 60; i >= 0; i--) { const h = 4.5 + 3 * i / 60; pts.push([h, Math.min(420, w(hi)(h))]); } P.area(pts, cls); };
    band(18, 25, 'f-band');
    band(30, 300, 'f-sec');
    P.fn(w(18), 's-gray thin');
    P.fn(w(25), 's-grn');
    P.fn(w(30), 's-sec');
    P.text(7.45, w(18)(7.45) - 22, 'BMI 18', 'muted', 'end');
    P.text(7.45, w(25)(7.45) - 24, 'BMI 25', 's-grn', 'end');
    P.text(6.2, w(30)(6.2) + 12, 'BMI 30', 's-sec', 'end');
    P.pt(B.H, B.W, 'p-gray small');
    P.pt(S.H, S.W, 'p-pri', 'BMI ' + nf(R.bmi, 1), 8, -8);
    P.draw();
  },
  notice: 'The class boundaries are parabolas in height: each extra inch allows more extra pounds than the previous one. A point moves into the red obese region by gaining weight or by being shorter at the same weight; nothing in the chart tells fat from muscle.',
  challenges: [
    { q: 'Keep the weight at 180 pounds and raise the height from 5 to 6 feet (20% taller). The BMI falls by about…', change: { H: 6 }, options: ['a fifth', 'a third', 'a half'], judge: (b, a) => { const f = 1 - a.bmi / b.bmi; return f < 0.25 ? 0 : f < 0.42 ? 1 : 2; },
      why: (b, a) => `It falls from ${nf(b.bmi, 1)} to ${nf(a.bmi, 1)}, by ${pct(1 - a.bmi / b.bmi, 0)}. Height enters squared, so 20% more height divides BMI by 1.2² = 1.44.` },
    { q: 'Scale the 5-foot man up to 6 feet keeping his shape: every dimension grows by 20%, so his weight grows by 1.2³ to 311 pounds. His BMI…', change: { H: 6, W: 311 }, options: ['stays at about 35', 'rises', 'falls'], judge: (b, a) => Math.abs(a.bmi - b.bmi) < 0.5 ? 0 : a.bmi > b.bmi ? 1 : 2,
      why: (b, a) => `It rises from ${nf(b.bmi, 1)} to ${nf(a.bmi, 1)}. Weight grows with the cube of size but BMI divides by its square only, so with the same build a taller person has a higher BMI; this is one reason why a single cutoff of 30 can misclassify people with different frames.` },
    { q: 'At 5 feet, cut the weight from 180 to 150 pounds. He is now…', change: { W: 150 }, options: ['obese', 'overweight', 'of normal weight'], judge: (b, a) => a.bmi >= 30 ? 0 : a.bmi >= 25 ? 1 : 2,
      why: (b, a) => `Overweight: his BMI falls to ${nf(a.bmi, 1)}, just below 30. At 5 feet the obese threshold is ${nf(a.w30, 0)} pounds and the normal range ends at ${nf(a.w25, 0)} pounds, so losing 30 pounds moves him only one class.` }
  ]
});

EX.push({
  id: 'b22-energy', ch: 22, title: 'Prices, technology and the energy balance',
  ref: 'BHT Section 22.2, Figure 22.4',
  anchors: [],
  intro: 'Weight settles where the calories eaten equal the calories burned. Intake falls with the relative price of food p (elasticity ε); burning is proportional to body weight, at e₀ = 11 kcal per pound a day at rest plus j for the physical effort of work and x for leisure exercise. A pound of fat stores 3,500 kcal. All values are illustrative: at the baseline a 5-foot-10 adult eats 2,700 kcal a day and weighs 180 pounds. Cheaper food and sedentary jobs are the two price changes BHT put at the center of the rise in obesity.',
  eq: String.raw`C=C_0\,p^{-\varepsilon},\qquad \frac{dW}{dt}=\frac{C-(e_0+j+x)\,W}{3{,}500},\qquad W^{*}=\frac{C}{e_0+j+x}`,
  params: [
    { id: 'p', label: 'Relative price of food p', min: 0.6, max: 1.5, step: 0.01, book: 1, d: 2 },
    { id: 'eps', label: 'Price elasticity of calorie demand ε', min: 0, max: 1, step: 0.05, book: 0.5, d: 2 },
    { id: 'j', label: 'Physical effort of work j (kcal per lb a day)', min: 0, max: 8, step: 0.5, book: 3, d: 1 },
    { id: 'x', label: 'Leisure exercise x (kcal per lb a day)', min: 0, max: 5, step: 0.5, book: 1, d: 1 }
  ],
  presets: [
    { label: 'Food 12% dearer (earlier decades)', values: { p: 1.12 } },
    { label: 'Desk job (j = 1)', values: { j: 1 } },
    { label: 'Farm work (j = 6)', values: { j: 6 } },
    { label: '20% tax on food', values: { p: 1.2 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b22_energy(S),
  outputs: (S, R, B) => [
    { label: 'Calories eaten per day', v: nf(R.C, 0), b: nf(B.C, 0) },
    { label: 'Calories burned per pound per day', v: nf(R.e, 1), b: nf(B.e, 1) },
    { label: 'Steady-state weight W*', v: nf(R.Wstar, 0) + ' lb', b: nf(B.Wstar, 0) + ' lb', key: true },
    { label: 'Change from 180 lb', v: M.b22_sgn(R.gap, 0, ' lb'), b: M.b22_sgn(B.gap, 0, ' lb'), key: true },
    { label: 'BMI at W* (height 5 ft 10 in)', v: nf(R.bmi, 1), b: nf(B.bmi, 1) },
    { label: 'Days to cover half of the change', v: nf(R.half, 0), b: nf(B.half, 0) },
    { label: 'Food spending, baseline = 100', v: nf(100 * R.spend, 0), b: nf(100 * B.spend, 0) }
  ],
  verdict: (S, R) => Math.abs(R.gap) < 0.5
    ? { tone: 'neutral', text: `Intake and burning balance at 180 pounds: weight does not change.` }
    : R.gap > 0
      ? { tone: 'bad', text: `At 180 pounds she eats ${nf(R.C - R.burn0, 0)} kcal a day more than she burns, so she gains until heavier body weight burns the surplus, at ${nf(R.Wstar, 0)} pounds.` }
      : { tone: 'ok', text: `At 180 pounds she burns ${nf(R.burn0 - R.C, 0)} kcal a day more than she eats, so she loses weight until ${nf(R.Wstar, 0)} pounds.` },
  chart(el, S, R, B) {
    const ys = [R.Wstar, 180].concat([0, 1, 2, 3, 4, 5].map(R.W));
    const lo = Math.min(...ys), hi = Math.max(...ys);
    const y0 = Math.min(150, Math.floor((lo - 10) / 10) * 10), y1 = Math.max(220, Math.ceil((hi + 10) / 10) * 10);
    const P = Plot(el, { x0: 0, x1: 5, y0, y1, xlabel: 'Years after the change', ylabel: 'Body weight (pounds)', aria: 'Path of body weight toward its new steady state' });
    P.fn(() => 180, 'ghost');
    P.hline(R.Wstar, 's-gray dash', 'W* = ' + nf(R.Wstar, 0) + ' lb', 'end');
    P.fn(R.W, 's-pri thick', 0, 5, 200);
    P.pt(R.half / 365, (180 + R.Wstar) / 2, 'p-hollow small', Math.abs(R.gap) > 2 ? 'half-way' : '', 8, R.gap > 0 ? 14 : -8);
    P.pt(1, R.W1, 'p-pri small', nf(R.W1, 0) + ' lb', 8, R.gap > 0 ? 16 : -8);
    P.draw();
  },
  notice: 'Weight does not rise forever: as the body gets heavier it burns more, and the gain stops at W*. The path closes the gap at a constant percentage rate, so most of the adjustment comes in the first year.',
  challenges: [
    { q: 'Food becomes 10% cheaper (p = 0.9), with ε = 0.5. Steady-state weight rises by about…', change: { p: 0.9 }, options: ['1%', '5%', '10%'], judge: (b, a) => { const r = a.Wstar / b.Wstar - 1; return r < 0.03 ? 0 : r < 0.075 ? 1 : 2; },
      why: (b, a) => `From ${nf(b.Wstar, 0)} to ${nf(a.Wstar, 0)} pounds, ${pct(a.Wstar / b.Wstar - 1, 1)}. Steady-state weight is proportional to intake, which rises by about ε times the price cut; a slow, steady fall in food prices thus moves the whole weight distribution up.` },
    { q: 'Her job becomes a desk job: j falls from 3 to 1 kcal per pound a day, with no other change. Her steady-state weight rises by…', change: { j: 1 }, options: ['less than 10 pounds', '10–20 pounds', 'more than 20 pounds'], judge: (b, a) => a.Wstar - b.Wstar < 10 ? 0 : a.Wstar - b.Wstar <= 20 ? 1 : 2,
      why: (b, a) => `By ${nf(a.Wstar - b.Wstar, 0)} pounds, to ${nf(a.Wstar, 0)}. At 180 pounds the change cuts burning by 360 kcal a day; the body regains that only at a weight where 13 kcal per pound cover the same 2,700 kcal. Unless leisure exercise replaces the lost effort at work, this small change in the job moves weight almost three times as much as a 10% fall in food prices.` },
    { q: 'Suppose calorie demand does not respond to price at all (ε = 0). A 20% tax on food (p = 1.2) changes steady-state weight by…', base: { eps: 0 }, change: { eps: 0, p: 1.2 }, options: ['nothing', 'about −5%', 'about −10%'], judge: (b, a) => Math.abs(a.Wstar - b.Wstar) < 0.5 ? 0 : a.Wstar / b.Wstar > 0.925 ? 1 : 2,
      why: (b, a) => `Weight stays at ${nf(a.Wstar, 0)} pounds, while food spending rises from ${nf(100 * b.spend, 0)} to ${nf(100 * a.spend, 0)}. With inelastic demand the tax changes no behavior; it only transfers money from those who eat the taxed food to the government.` },
    { q: 'After food becomes 10% cheaper, she will gain about 10 pounds in the long run. How long does it take to gain the first half of them?', change: { p: 0.9 }, options: ['about a month', 'about five months', 'about two years'], judge: (b, a) => a.half < 60 ? 0 : a.half < 365 ? 1 : 2,
      why: (b, a) => `About ${nf(a.half, 0)} days. Each pound gained burns ${nf(a.e, 0)} kcal more a day, so the daily surplus shrinks as she gains; the half-life 3,500 · ln 2 / ${nf(a.e, 0)} days depends only on how much she burns per pound, not on the size of the price change.` }
  ]
});

EX.push({
  id: 'b22-pool', ch: 22, title: 'Pooled insurance, moral hazard and a fat tax',
  ref: 'BHT Section 22.4, Figure 22.6; Section 22.7',
  anchors: [],
  intro: 'Each BMI point above 24 adds c dollars a year to a person’s medical costs. In a pool she pays only a share s of them, so the price she faces for a BMI point falls from the true price P_T = c to P_CS = s·c, plus any tax t per BMI point on fattening food. Her demand for BMI has slope k (BMI points per $100); at the true price she chooses BMI 27. All numbers are illustrative; k = 0 is the case of no price response that BHT read in the RAND experiment.',
  eq: String.raw`b(P)=b_A+\frac{k\,(c-P)}{100},\quad P=s\,c+t,\qquad \text{social loss}=\tfrac12\,|c-P|\,|b-b_A|,\qquad \text{subsidy from the pool}=(1-s)\,c\,(b-24)`,
  params: [
    { id: 'c', label: 'Medical cost of a BMI point c ($ a year)', min: 50, max: 400, step: 10, book: 150, d: 0 },
    { id: 's', label: 'Share of own costs paid out of pocket s', min: 0, max: 1, step: 0.05, book: 0.25, d: 2 },
    { id: 'k', label: 'Price sensitivity k (BMI points per $100)', min: 0, max: 4, step: 0.1, book: 2, d: 1 },
    { id: 't', label: 'Fat tax t ($ per BMI point a year)', min: 0, max: 400, step: 5, book: 0, d: 0 }
  ],
  presets: [
    { label: 'RAND free plan (s = 0)', values: { s: 0 } },
    { label: 'RAND 95% plan', values: { s: 0.95 } },
    { label: 'No price response (k = 0)', values: { k: 0 } },
    { label: 'Pigouvian tax (t = 0.75c)', values: { t: 112.5 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b22_pool(S),
  outputs: (S, R, B) => [
    { label: 'Private price of a BMI point P_CS + t', v: M.b22_usd(R.pp), b: M.b22_usd(B.pp) },
    { label: 'Chosen BMI (point B); efficient BMI (point A)', v: nf(R.b, 2) + '; ' + nf(R.bA, 0), b: nf(B.b, 2) + '; ' + nf(B.bA, 0) },
    { label: 'Social loss (triangle) per person a year', v: M.b22_usd(R.dwl), b: M.b22_usd(B.dwl), key: true },
    { label: 'Her extra medical costs paid by the pool', v: M.b22_usd(R.others), b: M.b22_usd(B.others), key: true },
    { label: 'Fat tax she pays', v: M.b22_usd(R.tax), b: M.b22_usd(B.tax) }
  ],
  verdict: (S, R) => R.dwl < 0.5
    ? { tone: R.others > 0.5 ? 'neutral' : 'ok', text: R.others > 0.5 ? `No social loss: her BMI is ${nf(R.b, 1)}, the efficient level for the price she faces, and the ${M.b22_usd(R.others)} the pool pays for her${S.t > 0 ? `, like the ${M.b22_usd(R.tax)} of tax she pays,` : ''} is a pure transfer.` : `No social loss and no subsidy: she bears the full cost of her BMI.` }
    : R.pp < S.c
      ? { tone: 'bad', text: `Moral hazard: she faces ${M.b22_usd(R.pp)} per BMI point instead of ${M.b22_usd(S.c)}, so she moves from BMI ${nf(R.bA, 0)} to ${nf(R.b, 1)}, and the extra weight costs ${M.b22_usd(R.dwl)} a year more than it is worth to her.` }
      : { tone: 'warn', text: `The tax overshoots: she faces ${M.b22_usd(R.pp)} per BMI point, more than its cost of ${M.b22_usd(S.c)}, and cuts her BMI below the efficient level.` },
  chart(el, S, R, B) {
    const x0 = 22, x1 = 36, y1 = Math.max(450, S.c * 1.15, R.pp * 1.1);
    const P = Plot(el, { x0, x1, y0: 0, y1, xlabel: 'BMI', ylabel: '$ per BMI point a year', aria: 'Demand for BMI, true price and price under pooled insurance' });
    const lo = Math.min(R.pp, S.c), hi = Math.max(R.pp, S.c);
    if (R.b > R.b0 + 1e-6 && (1 - S.s) * S.c > 0.5) P.area([[R.b0, S.s * S.c], [R.b, S.s * S.c], [R.b, S.c], [R.b0, S.c]], 'f-band');
    if (R.dwl > 0.5) P.area([[R.bA, S.c], [R.b, R.pp], [R.b, S.c]], 'f-sec');
    if (S.k > 0) P.fn(R.demand, 's-pri thick'); else P.seg(R.bA, 0, R.bA, y1, 's-pri thick');
    if (B.k > 0 && (S.k !== B.k)) P.fn(B.demand, 'ghost');
    P.hline(S.c, 's-ink', 'P_T = true price', 'end');
    if (hi - lo > 1) P.hline(R.pp, 's-sec dash', S.t > 0 ? 'P_CS + tax' : 'P_CS', 'end');
    P.text(x0 + 0.2, S.c * 0.5 + 0.5 * S.s * S.c, (1 - S.s) * S.c > 0.5 && R.b > R.b0 + 0.3 ? 'subsidy' : '', 'muted', 'start');
    P.pt(R.bA, S.c, 'p-ink', 'A', -8, -8, 'end');
    if (Math.abs(R.b - R.bA) > 0.01) P.pt(R.b, R.pp, 'p-sec', 'B', 8, 16);
    P.draw();
  },
  notice: 'The red triangle is the social loss: BMI points between A and B cost c each but are worth less to her. The green area is what the pool pays for her weight above 24. Set k = 0 and the triangle vanishes while the green area stays: pooling alone transfers money, it takes a behavioral response to destroy value.',
  challenges: [
    { q: 'Suppose demand for BMI does not respond to price at all (k = 0), as the RAND results suggest. What happens to the social loss and to the subsidy from the pool?', change: { k: 0 }, options: ['both fall to zero', 'the social loss falls to zero, the subsidy stays positive', 'both stay positive'], judge: (b, a) => a.dwl < 0.5 && a.others < 0.5 ? 0 : a.dwl < 0.5 ? 1 : 2,
      why: (b, a) => `The loss falls from ${M.b22_usd(b.dwl)} to ${M.b22_usd(a.dwl)}, but the pool still pays ${M.b22_usd(a.others)} of her medical costs. Without a behavioral response the pool only moves money from the thin to the heavy; others lose what she gains.` },
    { q: 'Move her from the 25% out-of-pocket plan to the free plan (s = 0). The social loss…', change: { s: 0 }, options: ['rises by a third', 'rises by about 78%', 'doubles'], judge: (b, a) => { const r = a.dwl / b.dwl; return r < 1.5 ? 0 : r < 1.9 ? 1 : 2; },
      why: (b, a) => `It rises from ${M.b22_usd(b.dwl)} to ${M.b22_usd(a.dwl)}. The price gap grows from 75% to 100% of c, and the loss grows with its square: (1/0.75)² ≈ 1.78, because both the base and the height of the triangle grow.` },
    { q: 'Add a fat tax of $112.50 per BMI point, equal to the part of her costs the pool pays. Her BMI and the social loss become…', change: { t: 112.5 }, options: ['BMI 27 and zero loss', 'BMI below 27 and zero loss', 'BMI 27 and a positive loss'], judge: (b, a) => Math.abs(a.b - 27) < 0.01 && a.dwl < 0.5 ? 0 : a.dwl < 0.5 ? 1 : 2,
      why: (b, a) => `Her BMI returns to ${nf(a.b, 2)} and the loss to ${M.b22_usd(a.dwl)}: the tax restores the true price, so the Pigouvian tax undoes the moral hazard. She pays ${M.b22_usd(a.tax)} in tax, as much as the pool pays for her.` },
    { q: 'With no price response (k = 0), add the same $112.50 fat tax. Social welfare…', base: { k: 0 }, change: { k: 0, t: 112.5 }, options: ['rises', 'does not change', 'falls'], judge: (b, a) => a.dwl < b.dwl - 0.5 ? 0 : Math.abs(a.dwl - b.dwl) < 0.5 ? 1 : 2,
      why: (b, a) => `It does not change: her BMI stays at ${nf(a.b, 0)} and the loss at ${M.b22_usd(a.dwl)}. She pays ${M.b22_usd(a.tax)} in tax, a transfer from heavier people, who tend to be poorer, to the government; this is why BHT warn that fat taxes without moral hazard can be regressive without any efficiency gain.` }
  ]
});
