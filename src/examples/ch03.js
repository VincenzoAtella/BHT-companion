// ===== BHT Chapter 3: Demand for health: the Grossman model =====
// solvers for this chapter: M.b03_<name>

M.b03_n = (x, d = 1) => nf(x, d).replace(/^-/, '−');
M.b03_h = x => nf(x, 1) + ' h';

// 1. Section 3.2: one period of 24 hours. Illness avoidance T_S(H) = Θ e^{−(H − Hmin)/s} for H > Hmin.
// Health: H = H_b + ε h, where h is hours of health effort (half own time T_H, half work to buy M) and
// ε = e √(w/w̄) units of health per hour. Home good: Z = √(w/w̄) (T_P(H) − h) (half play T_Z, half work to buy J).
// Utility U = θ ln H + (1 − θ) ln Z.
M.b03_day = function ({ Hb, e, w, th }) {
  const Th = 24, Hmin = 10, s = 20, wbar = 20;
  const k = Math.sqrt(w / wbar), eps = e * k;
  const TP = H => H > Hmin ? Th * (1 - Math.exp(-(H - Hmin) / s)) : 0;
  const Z = H => k * (TP(H) - (H - Hb) / eps);
  const Hc0 = Th * eps / s > 1 ? Hmin + s * Math.log(Th * eps / s) : -Infinity;   // where T_P'(H) = 1/ε
  const HC = Math.max(Hb, Hc0), ZC = Z(HC), alive = ZC > 1e-9;
  let Hmax = HC, Hs = HC;
  if (alive) {
    Hmax = M.bisect(Z, HC, Hb + eps * Th + 1, 1e-11);
    if (th <= 1e-9) Hs = HC;
    else if (th >= 1 - 1e-9) Hs = Hmax;
    else Hs = M.argmaxGrid(H => th * Math.log(H) + (1 - th) * Math.log(Math.max(Z(H), 1e-12)), HC, Hmax, 400).x;
  }
  const Zs = alive ? Math.max(Z(Hs), 0) : 0, h = (Hs - Hb) / eps, Rz = alive ? Math.max(TP(Hs) - h, 0) : 0;
  const U = th * Math.log(Hs) + (1 - th) * Math.log(Math.max(Zs, 1e-12));
  return { Hb, Hmin, Th, eps, TP, Z, HC, ZC, Hmax, Hs, Zs, alive, th, U, free: HC > Hb + 1e-6,
    TS: Th - TP(Hs), TH: h / 2, TW: (h + Rz) / 2, TZ: Rz / 2,
    ic: H => Math.exp((U - th * Math.log(H)) / (1 - th)) };
};

EX.push({
  id: 'b03-day', ch: 3, title: 'An optimal day: the PPF for health and the home good',
  ref: 'BHT Sections 3.1-3.2, Figures 3.1-3.5',
  anchors: [[3, 'there are only 24 hours in the day']],
  intro: 'In one period of Θ = 24 hours, sick time falls with health, T_S = Θe^{−(H − H_min)/20}, and the productive time left is split between health effort (own time T_H plus work to buy M) and the home good (play T_Z plus work to buy J). One hour of health effort adds ε = e√(w/w̄) units of health, so a higher wage w makes both goods cheaper in time. Health carried into the period is H_b = (1 − γ)H_{t−1}; at the baseline it equals H_min, so the frontier starts at BHT’s point A. The 24 hours follow BHT; H_min = 10, e = 3, w = w̄ = $20 and the taste weight θ = 0.5 are illustrative.',
  eq: String.raw`T_P(H)=\Theta-T_S(H),\quad H=H_b+\varepsilon h,\quad Z=\sqrt{w/\bar w}\,\big(T_P(H)-h\big),\qquad U=\theta\ln H+(1-\theta)\ln Z,\qquad \text{point C: } T_P'(H_C)=1/\varepsilon`,
  params: [
    { id: 'th', label: 'Taste for health θ (weight on ln H)', min: 0, max: 1, step: 0.05, book: 0.5, d: 2 },
    { id: 'e', label: 'Efficiency in producing health e (units per hour)', min: 0.5, max: 5, step: 0.1, book: 3, d: 1 },
    { id: 'w', label: 'Wage w ($ per hour)', min: 5, max: 60, step: 1, book: 20, d: 0 },
    { id: 'Hb', label: 'Health carried into the period H_b = (1 − γ)H_{t−1}', min: 10, max: 60, step: 1, book: 10, d: 0 }
  ],
  presets: [
    { label: 'Cares only about Z (θ = 0)', values: { th: 0 } },
    { label: 'Cares only about H (θ = 1)', values: { th: 1 } },
    { label: 'Healthier yesterday (H_b = 30)', values: { Hb: 30 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b03_day(S),
  outputs: (S, R, B) => [
    { label: 'End of the free-lunch zone, point C: H_C and Z_C', v: R.alive ? nf(R.HC, 1) + ', ' + nf(R.ZC, 2) : 'n/a', b: nf(B.HC, 1) + ', ' + nf(B.ZC, 2) },
    { label: 'Maximum health, point E', v: R.alive ? nf(R.Hmax, 1) : 'n/a', b: nf(B.Hmax, 1) },
    { label: 'Chosen health H*', v: nf(R.Hs, 1), b: nf(B.Hs, 1), key: true },
    { label: 'Chosen home good Z*', v: nf(R.Zs, 2), b: nf(B.Zs, 2), key: true },
    { label: 'Sick time T_S', v: M.b03_h(R.TS), b: M.b03_h(B.TS) },
    { label: 'Time improving health T_H', v: M.b03_h(R.TH), b: M.b03_h(B.TH) },
    { label: 'Time working T_W', v: M.b03_h(R.TW), b: M.b03_h(B.TW) },
    { label: 'Time playing T_Z', v: M.b03_h(R.TZ), b: M.b03_h(B.TZ) }
  ],
  verdict: (S, R) => !R.alive
    ? { tone: 'bad', text: `An hour of health effort adds too little productive time to pay for itself even at H_min, so the frontier shrinks to point A: no productive time, no H and no Z. This is BHT’s economic definition of death.` }
    : S.th <= 1e-9
      ? { tone: 'neutral', text: `Health does not enter her utility, yet she chooses H* = ${nf(R.Hs, 1)} > H_min = 10: she invests up to point C only to buy productive time.` }
      : S.th >= 1 - 1e-9
        ? { tone: 'neutral', text: `She cares only about health and goes to point E: H* = ${nf(R.Hs, 1)}, with no time left for play.` }
        : { tone: 'ok', text: `She picks F in the tradeoff zone: H* = ${nf(R.Hs, 1)}, between point C (${nf(R.HC, 1)}) and maximum health (${nf(R.Hmax, 1)}), and sick for ${M.b03_h(R.TS)} of the 24.` },
  chart(el, S, R, B) {
    const x1 = Math.max(100, Math.ceil(1.1 * Math.max(R.Hmax, B.Hmax) / 10) * 10);
    const y1 = Math.max(1, Math.ceil(1.3 * Math.max(R.ZC, B.ZC)));
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Health H', ylabel: 'Home good Z', aria: 'Production possibility frontier for health and the home good, with the chosen point' });
    P.fn(x => x >= B.Hb && x <= B.Hmax ? B.Z(x) : NaN, 'ghost', B.Hb, B.Hmax, 200);
    if (R.free && R.alive) P.rect(R.Hb, R.HC, 'f-sec');
    P.vline(R.Hmin, 's-gray dot', 'H_min');
    if (R.alive) {
      P.fn(R.Z, 's-pri thick', R.Hb, R.Hmax, 240);
      if (S.th > 1e-9 && S.th < 1 - 1e-9) P.fn(R.ic, 's-sec', R.Hs * 0.55, Math.min(x1, R.Hs * 1.9), 200);
      P.pt(R.Hb, R.Z(R.Hb), 'p-ink small', 'A', -6, -8, 'end');
      P.pt(R.HC, R.ZC, 'p-ink', 'C', -6, -10, 'end');
      P.pt(R.Hmax, 0, 'p-ink', 'E', 8, -8);
      P.pt(R.Hs, R.Zs, 'p-sec', 'F', 8, -10);
    } else P.pt(R.Hb, 0, 'p-sec', 'A', 8, -8);
    P.draw();
  },
  notice: 'Between A and C (red band) more health also brings more Z, because an hour of health effort saves more than an hour of sick time: no one who values H or Z stays there. From C to E health costs home good. The red indifference curve touches the frontier at F; even with θ = 0 she stops at C, not at H_min.',
  challenges: [
    { q: 'Let her stop caring about health as such: θ from 0.5 to 0. Her chosen health…', change: { th: 0 }, options: ['falls to H_min = 10', 'falls, but stays well above H_min', 'does not change'],
      judge: (b, a) => a.Hs < 10.5 ? 0 : a.Hs < b.Hs - 1e-6 ? 1 : 2,
      why: (b, a) => `H* falls from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)}, point C. Health still buys productive time: below C an hour of health effort saves more than an hour of sick time, so even a person who values only Z invests up to C (BHT Section 3.2, Figure 3.5).` },
    { q: 'She enters the day healthier: H_b from 10 to 30, all else equal. Her time improving health T_H…', change: { Hb: 30 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.TH > b.TH + 1e-6 ? 0 : a.TH < b.TH - 1e-6 ? 1 : 2,
      why: (b, a) => `T_H falls from ${M.b03_h(b.TH)} to ${M.b03_h(a.TH)}, while H* rises from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)} and play rises from ${M.b03_h(b.TZ)} to ${M.b03_h(a.TZ)}. Inherited health does part of the work and cuts sick time, so the frontier shifts out and she needs less effort today to end up healthier (BHT Figure 3.9).` },
    { q: 'Double the wage from $20 to $40. Her chosen health H*…', change: { w: 40 }, options: ['rises', 'falls, because each hour of health effort now costs more earnings', 'does not change'],
      judge: (b, a) => a.Hs > b.Hs + 1e-6 ? 0 : a.Hs < b.Hs - 1e-6 ? 1 : 2,
      why: (b, a) => `H* rises from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)}. Half of each hour of health effort is work that pays for medical inputs M, so a higher wage raises the health produced per hour (ε rises by a factor √2): point C and maximum health both move right, and she buys more health along with more Z.` },
    { q: 'Lower her efficiency in producing health from e = 3 to e = 1. The free-lunch zone A–C…', change: { e: 1 }, options: ['widens', 'narrows', 'does not change'],
      judge: (b, a) => (a.HC - a.Hb) > (b.HC - b.Hb) + 1e-6 ? 0 : (a.HC - a.Hb) < (b.HC - b.Hb) - 1e-6 ? 1 : 2,
      why: (b, a) => `Point C moves from H = ${nf(b.HC, 1)} to ${nf(a.HC, 1)}. With less health per hour, the condition T_P′(H) = 1/ε, an hour of effort returning exactly an hour of productive time, is met at a lower health level, so the free lunch runs out earlier.` }
  ]
});

// 2. Section 3.3: the MEC with T_S(H) = Θ e^{−(H − Hmin)/s} per year (Θ = 365 days).
// A unit of health saves T_S(H)/s sick days a year and costs c = c̄/(E √(w/w̄)) days of earnings,
// so MEC(H) = T_S(H)/(s c) and H* solves MEC(H*) = r + γ.
M.b03_mec = function ({ g, r, E, w }) {
  const Th = 365, Hmin = 10, s = 25, cbar = 5;
  const c = cbar / (E * Math.sqrt(w));
  const mec = H => H > Hmin ? Th * Math.exp(-(H - Hmin) / s) / (s * c) : Th / (s * c);
  const top = Th / (s * c), price = r + g, alive = top > price;
  const Hs = alive ? Hmin + s * Math.log(top / price) : Hmin;
  const TS = alive ? price * s * c : Th;
  return { Hmin, c, mec, top, price, alive, Hs, TS, inv: g * Hs, cost: c * g * Hs, g, r };
};

EX.push({
  id: 'b03-mec', ch: 3, title: 'The MEC curve and the optimal health stock',
  ref: 'BHT Sections 3.3-3.4, Figures 3.10-3.12',
  anchors: [[3, 'a γ of 5%']],
  intro: 'Sick days per year fall with health, T_S = 365e^{−(H − H_min)/25}, so one more unit of health saves T_S/25 sick days a year. A unit of health costs c = 5/(E√(w/w̄)) days of earnings, where E is the efficiency of producing health (education) and half of the cost is own time. The return per year is the marginal efficiency of capital, MEC(H) = T_S(H)/(25c), and the optimal stock H* sets it equal to the price of health capital r + γ. The depreciation rate γ = 5% follows BHT Section 3.4; r = 0.03, H_min = 10 and the cost of 5 days are illustrative. The MEC counts only the investment return of health, as in a pure investment model.',
  eq: String.raw`MEC(H)=\frac{T_S(H)}{25\,c},\quad c=\frac{5}{E\sqrt{w/\bar w}},\qquad MEC(H^*)=r+\gamma\ \Rightarrow\ H^*=H_{min}+25\ln\frac{365}{25\,c\,(r+\gamma)},\qquad T_S(H^*)=25\,c\,(r+\gamma)`,
  params: [
    { id: 'g', label: 'Depreciation rate γ', min: 0.01, max: 0.5, step: 0.01, book: 0.05, d: 2 },
    { id: 'r', label: 'Market interest rate r', min: 0, max: 0.12, step: 0.005, book: 0.03, d: 3 },
    { id: 'E', label: 'Efficiency in producing health E (education)', min: 0.5, max: 2.5, step: 0.05, book: 1, d: 2 },
    { id: 'w', label: 'Wage relative to baseline w/w̄', min: 0.25, max: 4, step: 0.05, book: 1, d: 2 }
  ],
  presets: [
    { label: 'College graduate (E = 1.5)', values: { E: 1.5 } },
    { label: 'Older: γ = 0.20', values: { g: 0.2 } }
  ],
  bookLabel: 'Baseline',
  compute: S => M.b03_mec(S),
  outputs: (S, R, B) => [
    { label: 'Price of health capital r + γ', v: nf(R.price, 3), b: nf(B.price, 3) },
    { label: 'MEC at H_min (highest return)', v: nf(R.top, 2), b: nf(B.top, 2) },
    { label: 'Optimal health stock H*', v: nf(R.Hs, 1), b: nf(B.Hs, 1), key: true },
    { label: 'Sick days per year at H*', v: nf(R.TS, 1), b: nf(B.TS, 1), key: true },
    { label: 'Gross investment to hold H*, γH* (units a year)', v: nf(R.inv, 2), b: nf(B.inv, 2) },
    { label: 'Its cost in days of earnings a year', v: nf(R.cost, 1), b: nf(B.cost, 1) }
  ],
  verdict: (S, R) => !R.alive
    ? { tone: 'bad', text: `Even at H_min the return ${nf(R.top, 2)} falls short of r + γ = ${nf(R.price, 2)}: no investment pays, and health stays at H_min.` }
    : { tone: 'ok', text: `The MEC meets r + γ = ${nf(R.price, 3)} at H* = ${nf(R.Hs, 1)}: she accepts ${nf(R.TS, 1)} sick days a year, because removing more of them would return less than the cost of holding health capital.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 0, x1: 150, y0: 0, y1: 0.5, xlabel: 'Health stock H', ylabel: 'Rate of return per year', aria: 'Marginal efficiency of health capital and the price of health capital' });
    P.fn(B.mec, 'ghost', B.Hmin, 150, 200);
    P.vline(R.Hmin, 's-gray dot', 'H_min');
    P.fn(R.mec, 's-pri thick', R.Hmin, 150, 240);
    P.hline(R.price, 's-sec dash', 'r + γ', 'end');
    if (R.alive) {
      P.vline(R.Hs, 's-ink dot');
      P.pt(R.Hs, R.price, 'p-sec', 'H* = ' + nf(R.Hs, 0), 8, -10);
    }
    P.text(Math.min(145, R.Hmin + 25 * Math.log(R.top / 0.45)) + 3, 0.45, 'MEC', 's-pri');
    P.draw();
  },
  notice: 'The MEC falls with H because each extra unit of health saves fewer sick days; at H_min it is high but finite. Depreciation and the interest rate enter only through their sum, the horizontal line: a higher r + γ moves H* left, a more efficient producer of health has a higher MEC and moves H* right.',
  challenges: [
    { q: 'Depreciation doubles, γ from 0.05 to 0.10, so H* falls. The gross investment needed each year to hold the new H*, γH*…', change: { g: 0.1 }, options: ['falls along with H*', 'rises', 'does not change'],
      judge: (b, a) => a.inv < b.inv - 1e-6 ? 0 : a.inv > b.inv + 1e-6 ? 1 : 2,
      why: (b, a) => `H* falls from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)}, but γH* rises from ${nf(b.inv, 2)} to ${nf(a.inv, 2)} units a year (cost from ${nf(b.cost, 1)} to ${nf(a.cost, 1)} days of earnings). The stock falls by only ${pct(1 - a.Hs / b.Hs, 0)} while the rate at which it wears out doubles, so a person whose health is declining can still spend more on health.` },
    { q: 'Raise the interest rate from 0.03 to 0.06 (with γ = 0.05), or alternatively raise γ from 0.05 to 0.08. Compared with the γ change, the r change lowers H*…', change: { r: 0.06 }, options: ['by less', 'by the same amount', 'by more'],
      judge: (b, a) => { const alt = M.b03_mec({ g: 0.08, r: 0.03, E: 1, w: 1 }).Hs; return a.Hs > alt + 1e-6 ? 0 : a.Hs < alt - 1e-6 ? 2 : 1; },
      why: (b, a) => `Both give H* = ${nf(a.Hs, 1)}, down from ${nf(b.Hs, 1)}. The price of health capital is r + γ (BHT Section 3.3): forgone interest and wear and tear cost the same per unit of stock held.` },
    { q: 'Compare a college graduate who produces health 50% more efficiently (E = 1.5) with the baseline. Her sick days a year at the optimum are lower by…', change: { E: 1.5 }, options: ['a third', 'a half', 'nothing, since r + γ is the same'],
      judge: (b, a) => { const f = 1 - a.TS / b.TS; return f < 1e-6 ? 2 : Math.abs(f - 1 / 3) < 0.02 ? 0 : 1; },
      why: (b, a) => `Sick days fall from ${nf(b.TS, 1)} to ${nf(a.TS, 2)} and H* rises from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)}. At the optimum sick days are 25c(r + γ), and her cost per unit c is divided by 1.5: her MEC curve is higher at every H (BHT Figure 3.12), so she holds a larger stock at the same price.` },
    { q: 'Double the wage (w/w̄ from 1 to 2). The optimal health stock H*…', change: { w: 2 }, options: ['rises', 'falls', 'does not change'],
      judge: (b, a) => a.Hs > b.Hs + 1e-6 ? 0 : a.Hs < b.Hs - 1e-6 ? 1 : 2,
      why: (b, a) => `H* rises from ${nf(b.Hs, 1)} to ${nf(a.Hs, 1)}. A healthy day is worth twice as much, while the cost of a unit of health rises only on its own-time half, so the return to health capital rises and the MEC shifts up.` }
  ]
});

// 3. Section 3.4: aging. γ(a) = γ_20 (1 + g)^{a − 20}; H*(a) = Hmin + s ln(MEC_min/(r + γ(a))) until it reaches Hmin.
M.b03_life = function ({ g, E, r, g20 }) {
  const Th = 365, Hmin = 10, s = 25, cbar = 5;
  const top = EE => Th * EE / (s * cbar);   // MEC at Hmin
  const gam = a => g20 * Math.pow(1 + g, a - 20);
  const Hstar = EE => a => { const p = r + gam(a); return p < top(EE) ? Hmin + s * Math.log(top(EE) / p) : Hmin; };
  const death = EE => top(EE) <= r + g20 ? 20 : g <= 1e-12 ? Infinity : 20 + Math.log((top(EE) - r) / g20) / Math.log(1 + g);
  const HD = Hstar(1), HC = Hstar(E), aD = death(1), aC = death(E);
  return { Hmin, HD, HC, aD, aC, gain: aC - aD, gam, E,
    d40: HC(40) - HD(40), d70: HC(70) - HD(70) };
};
M.b03_age = a => isFinite(a) ? nf(a, 1) : 'never';

EX.push({
  id: 'b03-aging', ch: 3, title: 'Aging, education and endogenous death',
  ref: 'BHT Sections 3.4-3.5, Figures 3.13-3.14',
  anchors: [[3, 'a γ of 5%']],
  intro: 'The MEC of the previous example is kept, and the depreciation rate rises with age: γ(a) = γ_20(1 + g)^{a − 20}. Each year the person holds the stock at which the MEC equals r + γ(a), so H* falls with age and reaches H_min, the model’s death, when r + γ(a) climbs to the MEC at H_min. A high-school dropout (E = 1) is compared with a college graduate who produces health more efficiently. γ_20 = 5% follows BHT’s constant-depreciation case; the aging speed g = 6% a year, r = 0.03 and E = 1.5 are illustrative.',
  eq: String.raw`\gamma(a)=\gamma_{20}(1+g)^{a-20},\qquad H^*(a)=H_{min}+25\ln\frac{MEC(H_{min})}{r+\gamma(a)},\qquad r+\gamma(a_D)=MEC(H_{min})=\frac{365\,E}{125}`,
  params: [
    { id: 'g', label: 'Speed of aging g (growth of γ per year)', min: 0, max: 0.12, step: 0.005, book: 0.06, d: 3 },
    { id: 'E', label: 'Efficiency of the college graduate E (dropout = 1)', min: 1, max: 3, step: 0.05, book: 1.5, d: 2 },
    { id: 'r', label: 'Market interest rate r', min: 0, max: 0.12, step: 0.005, book: 0.03, d: 3 },
    { id: 'g20', label: 'Depreciation rate at age 20, γ_20', min: 0.01, max: 0.2, step: 0.01, book: 0.05, d: 2 }
  ],
  presets: [{ label: 'Fountain of youth (g = 0)', values: { g: 0 } }],
  bookLabel: 'Baseline',
  compute: S => M.b03_life(S),
  outputs: (S, R, B) => [
    { label: 'Age at death, high-school dropout', v: M.b03_age(R.aD), b: M.b03_age(B.aD), key: true },
    { label: 'Age at death, college graduate', v: M.b03_age(R.aC), b: M.b03_age(B.aC), key: true },
    { label: 'Extra years of life from education', v: isFinite(R.gain) ? nf(R.gain, 1) : 'n/a', b: nf(B.gain, 1) },
    { label: 'H* at 40: dropout, graduate', v: nf(R.HD(40), 1) + ', ' + nf(R.HC(40), 1), b: nf(B.HD(40), 1) + ', ' + nf(B.HC(40), 1) },
    { label: 'H* at 70: dropout, graduate', v: nf(R.HD(70), 1) + ', ' + nf(R.HC(70), 1), b: nf(B.HD(70), 1) + ', ' + nf(B.HC(70), 1) },
    { label: 'Depreciation rate at 40 and at 70', v: nf(R.gam(40), 3) + ', ' + nf(R.gam(70), 3), b: nf(B.gam(40), 3) + ', ' + nf(B.gam(70), 3) }
  ],
  verdict: (S, R) => !isFinite(R.aD)
    ? { tone: 'neutral', text: `With constant depreciation H* never changes: the dropout stays at ${nf(R.HD(20), 1)} and the graduate at ${nf(R.HC(20), 1)} forever, BHT’s “fountain of youth” case.` }
    : { tone: 'ok', text: `Rising depreciation drives H* down to H_min: the dropout dies at ${nf(R.aD, 1)}, the graduate at ${nf(R.aC, 1)}, ${nf(R.gain, 1)} years later.` },
  chart(el, S, R, B) {
    const P = Plot(el, { x0: 20, x1: 120, y0: 0, y1: 160, xlabel: 'Age (years)', ylabel: 'Optimal health stock H*', aria: 'Optimal health over the life cycle for a dropout and a college graduate' });
    P.fn(B.HD, 'ghost', 20, 120, 300);
    P.hline(R.Hmin, 's-gray dot', 'H_min', 'start');
    P.fn(R.HC, 's-pri thick', 20, 120, 300);
    P.fn(R.HD, 's-sec thick', 20, 120, 300);
    if (isFinite(R.aD) && R.aD <= 120) P.pt(R.aD, R.Hmin, 'p-sec', 'dropout dies', -8, -10, 'end');
    if (isFinite(R.aC) && R.aC <= 120) P.pt(R.aC, R.Hmin, 'p-pri', 'graduate dies', 8, -10);
    P.text(22, Math.min(150, R.HC(20) + 8), 'college graduate', 's-pri');
    P.text(22, Math.max(14, R.HD(20) - 12), 'dropout', 's-sec');
    P.draw();
  },
  notice: 'Both curves fall slowly at first and then fast, as the depreciation rate compounds. The vertical gap between them is the same at every age while both are alive; the graduate’s extra years come from the late stage, when her higher MEC at H_min still covers a cost of capital that has already killed the dropout.',
  challenges: [
    { q: 'Remove aging: set g = 0, so γ stays at 5% forever. The dropout dies at age…', change: { g: 0 }, options: ['about the same age, since γ is still positive', 'a much later age, but a finite one', 'never'],
      judge: (b, a) => !isFinite(a.aD) ? 2 : a.aD > b.aD + 5 ? 1 : 0,
      why: (b, a) => `Never: H* stays at ${nf(a.HD(20), 1)} at every age. With constant γ the price of health capital never rises, so each year he invests exactly γH* to replace what wears out (BHT Section 3.4). Death in the model comes from rising depreciation, not from depreciation as such.` },
    { q: 'At the baseline, the graduate’s health advantage, H*_graduate − H*_dropout, at age 70 compared with age 40 is…', change: {}, options: ['larger', 'the same', 'smaller'],
      judge: (b, a) => a.d70 > a.d40 + 1e-6 ? 0 : a.d70 < a.d40 - 1e-6 ? 2 : 1,
      why: (b, a) => `It is ${nf(a.d40, 2)} at both ages. Her MEC is the dropout’s multiplied by E at every H, so her optimum is higher by 25 ln E whatever r + γ is; the gap closes only when the dropout reaches H_min.` },
    { q: 'Double the interest rate, r from 0.03 to 0.06. The dropout’s age at death…', change: { r: 0.06 }, options: ['falls by less than one year', 'falls by about five years', 'falls by more than ten years'],
      judge: (b, a) => { const d = b.aD - a.aD; return d < 1 ? 0 : d < 10 ? 1 : 2; },
      why: (b, a) => `It falls from ${nf(b.aD, 1)} to ${nf(a.aD, 1)}. Death comes when r + γ reaches ${nf(365 / 125, 2)}, the MEC at H_min; near the end γ is far above r, so 3 extra points of interest are reached by depreciation within a few months.` },
    { q: 'Speed up aging: g from 0.06 to 0.08. The graduate’s extra years of life over the dropout…', change: { g: 0.08 }, options: ['rise', 'fall', 'do not change'],
      judge: (b, a) => a.gain > b.gain + 1e-6 ? 0 : a.gain < b.gain - 1e-6 ? 1 : 2,
      why: (b, a) => `They fall from ${nf(b.gain, 1)} to ${nf(a.gain, 1)} years, and both die earlier (dropout at ${nf(a.aD, 1)}). Her higher MEC lets her tolerate a depreciation rate about 1.5 times as high, and when γ grows faster that margin is used up in fewer years.` }
  ]
});
