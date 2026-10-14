// ===== BHT Chapter 20: The economics of health externalities =====
// solvers for this chapter: M.b20_<name>
// Both market examples use BHT's Samuelson diagrams: a flat supply curve (constant marginal cost),
// a linear private demand curve, and a constant external benefit or cost per unit, so the social
// curve is the private curve shifted by the externality.

M.b20_usd = (x, d = 0) => isFinite(x) ? (x < -0.005 * Math.pow(10, -d) ? '−$' : '$') + nf(Math.abs(x), d) : 'n/a';

// Sections 20.1-20.2, herd immunity: private demand Dpriv(Q) = a − bQ, social demand Dsoc = Dpriv + e,
// supply flat at the cost c, per-shot subsidy s paid to buyers (consumer price c − s).
M.b20_vacc = function ({ a = 30, b, c, e, s }) {
  const Dp = Q => a - b * Q, Ds = Q => a + e - b * Q;
  const Qof = p => Math.max(0, (a - p) / b);              // private quantity demanded at consumer price p
  const Qpriv = Qof(c), Qsoc = Math.max(0, (a + e - c) / b), Qs = Qof(c - s);
  const G = Q => (a + e - c) * Q - b * Q * Q / 2;          // social surplus of the first Q shots
  const loss = G(Qsoc) - G(Qs), loss0 = G(Qsoc) - G(Qpriv);
  const QJ = (a - 5) / b;                                  // a person like Jay: private benefit $5
  return { a, b, c, e, s, Dp, Ds, Qpriv, Qsoc, Qs, pc: c - s, SS: G(Qs), SSmax: G(Qsoc), loss, loss0,
    outlay: s * Qs, QJ, jayBuys: 5 >= c - s - 1e-9, jaySoc: 5 + e - c };
};

// Sections 20.1-20.2, antibiotic resistance: demand D(Q) = a − bQ, private supply flat at c,
// social supply c + d, per-course tax t on suppliers (consumer price c + t).
M.b20_abx = function ({ a = 200, b, c, d, t }) {
  const D = Q => a - b * Q;
  const Qof = p => Math.max(0, (a - p) / b);
  const Qpriv = Qof(c), Qsoc = Qof(c + d), Qt = Qof(c + t);
  const G = Q => (a - c - d) * Q - b * Q * Q / 2;          // social surplus of the first Q courses
  const loss = G(Qsoc) - G(Qt), loss0 = G(Qsoc) - G(Qpriv);
  const QH = (a - 50) / b;                                  // the patient of Section 20.3: benefit $50, net private gain $30 at c = $20
  return { a, b, c, d, t, D, Qpriv, Qsoc, Qt, pc: c + t, SS: G(Qt), SSmax: G(Qsoc), loss, loss0, rev: t * Qt,
    QH, herBuys: 50 >= c + t - 1e-9, herNet: 50 - c, herSoc: 50 - c - d };
};

// Section 20.3, the Coasian parable: the factory (worth VW a year) and the practice (worth VD) cannot both operate.
// rights: 'doctor' (right to quiet) or 'wonka' (right to make noise). A bargain costs T in all and happens
// only if it gains more than T; the payment splits the gain equally (midpoint of the two values) and each side bears T/2.
M.b20_coase = function ({ VW, VD, T, rights }) {
  const outcome = r => {
    const holder = r === 'doctor' ? 'D' : 'W';
    const vh = holder === 'D' ? VD : VW, vo = holder === 'D' ? VW : VD;
    const deal = vo - vh > T + 1e-9;
    const pay = deal ? (VW + VD) / 2 : 0;
    const runs = deal ? (holder === 'D' ? 'W' : 'D') : holder;
    const SS = (runs === 'D' ? VD : VW) - (deal ? T : 0);
    const nD = runs === 'D' ? VD - (deal ? pay + T / 2 : 0) : (deal ? pay - T / 2 : 0);
    const nW = runs === 'W' ? VW - (deal ? pay + T / 2 : 0) : (deal ? pay - T / 2 : 0);
    return { deal, pay, runs, SS, nD, nW };
  };
  const o = outcome(rights), oD = outcome('doctor'), oW = outcome('wonka');
  const best = Math.max(VW, VD);
  return { VW, VD, T, rights, ...o, best, loss: best - o.SS, gap: Math.abs(VD - VW), oD, oW };
};
M.b20_who = r => r === 'D' ? 'practice stays, factory closes' : 'factory stays, practice closes';

EX.push({
  id: 'b20-vaccine', ch: 20, title: 'Herd immunity and the Pigouvian subsidy',
  ref: 'BHT Sections 20.1-20.2, Figures 20.2, 20.3 and 20.6',
  anchors: [[20, 'it costs $10 at the local clinic'], [20, '$15 to Jay’s friends']],
  intro: 'Each flu shot costs c to supply (flat supply). People buy along the private demand curve D_priv(Q) = 30 − bQ, which ignores the herd-immunity benefit e that each shot gives to others; the social demand curve is D_soc = D_priv + e. A subsidy s per shot lowers the consumer price to c − s. The cost of $10 and the external benefit of $15 follow BHT’s example of Jay, whose private benefit is $5; the demand curve (quantities in thousands of shots, surpluses in $ thousand) is illustrative.',
  eq: String.raw`D_{soc}(Q)=D_{priv}(Q)+e,\qquad Q^*_{priv}:\ D_{priv}=c,\quad Q^*_{soc}:\ D_{soc}=c,\qquad X=p_s-p_c=e,\quad \text{total subsidy}=Q^*_{soc}\,X`,
  params: [
    { id: 'e', label: 'External benefit per shot e ($)', min: 0, max: 30, step: 0.5, book: 15, d: 1 },
    { id: 'c', label: 'Cost of a shot c = p_s ($)', min: 2, max: 30, step: 0.5, book: 10, d: 1 },
    { id: 'b', label: 'Slope of private demand b ($ per thousand shots)', min: 0.1, max: 1, step: 0.01, book: 0.2, d: 2 },
    { id: 's', label: 'Subsidy per shot s ($)', min: 0, max: 40, step: 0.5, book: 0, d: 1 }
  ],
  presets: [{ label: 'Pigouvian subsidy, s = e', values: { s: 15 } }],
  bookLabel: 'Baseline',
  ghost: 'Dashed gray: baseline social demand',
  compute: S => M.b20_vacc(S),
  outputs: (S, R, B) => [
    { label: 'Shots bought without subsidy Q*_priv (thousand)', v: nf(R.Qpriv, 1), b: nf(B.Qpriv, 1) },
    { label: 'Socially optimal shots Q*_soc (thousand)', v: nf(R.Qsoc, 1), b: nf(B.Qsoc, 1) },
    { label: 'Shots bought with the subsidy (thousand)', v: nf(R.Qs, 1), b: nf(B.Qs, 1) },
    { label: 'Consumer price p_c = c − s', v: M.b20_usd(R.pc, 2), b: M.b20_usd(B.pc, 2) },
    { label: 'Social loss, area B ($ thousand)', v: nf(R.loss, 1), b: nf(B.loss, 1), key: true },
    { label: 'Government outlay s × Q ($ thousand)', v: nf(R.outlay, 1), b: nf(B.outlay, 1), key: true },
    { label: 'Does a person like Jay get vaccinated?', v: R.jayBuys ? 'yes' : 'no', b: B.jayBuys ? 'yes' : 'no' }
  ],
  verdict: (S, R) => R.loss < 0.05
    ? { tone: 'ok', text: `The subsidy of ${M.b20_usd(S.s, 2)} equals the external benefit, so ${nf(R.Qsoc, 1)} thousand people get the shot and no surplus is lost; the outlay of $${nf(R.outlay, 0)} thousand is a transfer, not a loss.` }
    : R.Qs < R.Qsoc
      ? { tone: S.s > 0 ? 'warn' : 'bad', text: `Too few shots: ${nf(R.Qs, 1)} thousand instead of ${nf(R.Qsoc, 1)} thousand, and $${nf(R.loss, 1)} thousand of social surplus is never realized.` }
      : { tone: 'bad', text: `Too many shots: the subsidy exceeds the external benefit, so the last ${nf(R.Qs - R.Qsoc, 1)} thousand shots cost more than they are worth to society, a loss of $${nf(R.loss, 1)} thousand.` },
  chart(el, S, R, B) {
    const x1 = Math.max(250, Math.min(600, 1.15 * Math.max(R.Qsoc, R.Qs, R.Qpriv)));
    const y1 = Math.max(60, R.a + R.e + 5);
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Flu shots Q (thousand)', ylabel: 'Price, benefit, cost ($)', aria: 'Private and social demand for flu shots, supply, and social loss' });
    const qA = Math.min(R.Qs, R.Qsoc);
    if (qA > 0) P.area([[0, R.c], [0, R.Ds(0)], [qA, R.Ds(qA)], [qA, R.c]], 'f-band');
    if (Math.abs(R.Qs - R.Qsoc) > 1e-6) P.area([[R.Qs, R.c], [R.Qs, R.Ds(R.Qs)], [R.Qsoc, R.c]], 'f-sec');
    if (Math.abs(S.e - 15) > 1e-9 || Math.abs(S.b - 0.2) > 1e-9) P.fn(B.Ds, 'ghost', 0, x1);
    P.fn(R.Dp, 's-pri thick', 0, x1);
    P.fn(R.Ds, 's-grn thick', 0, x1);
    P.hline(R.c, 's-sec thick', 'S (cost c)', 'end');
    if (S.s > 0) P.hline(R.pc, 's-sec dash', 'p_c = c − s', 'end');
    P.text(Math.min(x1 * 0.04, 10), R.Dp(Math.min(x1 * 0.04, 10)) - 3.5, 'D_priv', 's-pri', 'start');
    P.text(Math.min(x1 * 0.04, 10), R.Ds(Math.min(x1 * 0.04, 10)) + 2, 'D_soc', 's-grn', 'start');
    P.pt(R.Qpriv, R.c, 'p-pri', 'α', 0, 18, 'middle');
    P.pt(R.Qsoc, R.c, 'p-grn', 'β', 0, -10, 'middle');
    if (S.s > 0 && R.Qs > 0) P.pt(R.Qs, R.pc, 'p-sec', 'γ', 8, 16);
    if (R.QJ > 0 && R.QJ < x1) P.pt(R.QJ, 5, 'p-ink small', 'Jay', 6, 14);
    P.draw();
  },
  notice: 'Green area A is the social surplus realized; red triangle B is the surplus lost between the quantity bought and Q*_soc. A subsidy equal to e moves the market from α to β. The subsidy rectangle (s × Q) is larger than B, but it is paid to vaccine buyers, so it moves welfare between people without destroying any.',
  challenges: [
    { q: 'The herd-immunity benefit doubles, from $15 to $30 per shot, with no subsidy. The social loss…', change: { e: 30 }, options: ['doubles', 'roughly triples', 'quadruples'], judge: (b, a) => { const r = a.loss / b.loss; return r < 2.5 ? 0 : r < 3.5 ? 1 : 2; },
      why: (b, a) => `It rises from $${nf(b.loss, 1)} thousand to $${nf(a.loss, 1)} thousand. Triangle B has height e and base e/b, so its area grows with the square of the externality: both the gap per shot and the number of missing shots double.` },
    { q: 'Set the Pigouvian subsidy s = $15. Compare the government outlay with the social loss it removes.', change: { s: 15 }, options: ['the outlay is larger than the loss removed', 'they are equal', 'the outlay is smaller than the loss removed'], judge: (b, a) => a.outlay > b.loss - a.loss + 1e-6 ? 0 : a.outlay < b.loss - a.loss - 1e-6 ? 2 : 1,
      why: (b, a) => `The outlay is $${nf(a.outlay, 0)} thousand, the loss removed $${nf(b.loss - a.loss, 1)} thousand. The subsidy is still worth it: the outlay is a transfer from taxpayers to vaccine buyers, while the loss removed is surplus that nobody had before.` },
    { q: 'An eager health ministry pays a subsidy of $30 per shot, twice the external benefit. Compared with no subsidy at all, the social loss is…', change: { s: 30 }, options: ['smaller', 'the same', 'larger'], judge: (b, a) => a.loss < b.loss - 0.05 ? 0 : a.loss > b.loss + 0.05 ? 2 : 1,
      why: (b, a) => `It is $${nf(a.loss, 1)} thousand in both cases. ${nf(a.Qs - a.Qsoc, 0)} thousand extra shots now cost more than their social benefit, and with linear demand the overshoot triangle is as large as the undershoot one: a subsidy that misjudges the externality by $15 does as much harm as no subsidy.` },
    { q: 'With the Pigouvian subsidy s = $15 in place, does a person like Jay (private benefit $5) now get the shot?', change: { s: 15 }, options: ['Yes', 'No'], judge: (b, a) => a.jayBuys ? 0 : 1,
      why: (b, a) => `Yes. His price falls to ${M.b20_usd(a.pc, 0)}, below his private benefit of $5, so he is paid to vaccinate. That is efficient: his shot is worth $${nf(5 + a.e, 0)} to society and costs $${nf(a.c, 0)}.` }
  ]
});

EX.push({
  id: 'b20-antibiotics', ch: 20, title: 'Antibiotic resistance and the Pigouvian tax',
  ref: 'BHT Sections 20.1-20.3, Figures 20.4, 20.5 and 20.7',
  anchors: [[20, 'imposes a total externality of $100'], [20, 'net social loss of $70']],
  intro: 'Antibiotic courses are supplied at a constant cost c, and demand is D(Q) = 200 − bQ. Each course adds resistance worth d to the rest of the world, so the social supply curve is c + d. A tax t per course, levied on suppliers, raises the consumer price to c + t. The external cost of $100 per course and the patient whose net private gain is $30 (so her course causes a net social loss of $70) follow BHT Section 20.3; the cost c = $20 and the demand curve (millions of courses, surpluses in $ million) are illustrative.',
  eq: String.raw`S_{soc}=S_{priv}+d,\qquad Q^*_{soc}:\ D=c+d,\qquad \tau=d,\qquad p_s=p_c-\tau,\qquad \text{revenue}=Q^*_{soc}\,\tau`,
  params: [
    { id: 'd', label: 'External cost of resistance per course d ($)', min: 0, max: 150, step: 1, book: 100, d: 0 },
    { id: 'c', label: 'Production cost per course c ($)', min: 0, max: 80, step: 1, book: 20, d: 0 },
    { id: 'b', label: 'Slope of demand b ($ per million courses)', min: 1, max: 5, step: 0.1, book: 2, d: 1 },
    { id: 't', label: 'Tax per course t ($)', min: 0, max: 180, step: 1, book: 0, d: 0 }
  ],
  presets: [{ label: 'Pigouvian tax, t = d', values: { t: 100 } }],
  bookLabel: 'Baseline',
  ghost: 'Dashed gray: baseline social supply',
  compute: S => M.b20_abx(S),
  outputs: (S, R, B) => [
    { label: 'Courses without tax Q*_priv (million)', v: nf(R.Qpriv, 1), b: nf(B.Qpriv, 1) },
    { label: 'Socially optimal courses Q*_soc (million)', v: nf(R.Qsoc, 1), b: nf(B.Qsoc, 1) },
    { label: 'Courses with the tax (million)', v: nf(R.Qt, 1), b: nf(B.Qt, 1) },
    { label: 'Consumer price p_c = c + t', v: M.b20_usd(R.pc), b: M.b20_usd(B.pc) },
    { label: 'Social loss, area B ($ million)', v: nf(R.loss, 0), b: nf(B.loss, 0), key: true },
    { label: 'Tax revenue t × Q ($ million)', v: nf(R.rev, 0), b: nf(B.rev, 0), key: true },
    { label: 'Patient with a $50 benefit: buys? social net', v: (R.herBuys ? 'yes' : 'no') + ', ' + M.b20_usd(R.herSoc), b: (B.herBuys ? 'yes' : 'no') + ', ' + M.b20_usd(B.herSoc) }
  ],
  verdict: (S, R) => R.loss < 0.5
    ? { tone: 'ok', text: `The tax of ${M.b20_usd(S.t)} equals the resistance cost, so only the ${nf(R.Qsoc, 1)} million courses worth their full social cost are bought, and the government collects $${nf(R.rev, 0)} million.` }
    : R.Qt > R.Qsoc
      ? { tone: S.t > 0 ? 'warn' : 'bad', text: `Overuse: ${nf(R.Qt, 1)} million courses instead of ${nf(R.Qsoc, 1)} million; the extra courses are worth less than their social cost, a loss of $${nf(R.loss, 0)} million.` }
      : { tone: 'bad', text: `The tax exceeds the external cost: courses worth more than their social cost are no longer bought, a loss of $${nf(R.loss, 0)} million.` },
  chart(el, S, R, B) {
    const x1 = Math.max(100, Math.min(220, 1.12 * R.a / R.b));
    const P = Plot(el, { x0: 0, x1, y0: 0, y1: 220, xlabel: 'Antibiotic courses Q (million)', ylabel: 'Price, benefit, cost ($)', aria: 'Demand, private and social supply of antibiotics, and social loss' });
    const qA = Math.min(R.Qt, R.Qsoc);
    if (qA > 0) P.area([[0, R.c + R.d], [0, R.D(0)], [qA, R.D(qA)], [qA, R.c + R.d]], 'f-band');
    if (Math.abs(R.Qt - R.Qsoc) > 1e-6) P.area([[R.Qt, R.c + R.d], [R.Qt, R.D(R.Qt)], [R.Qsoc, R.c + R.d]], 'f-sec');
    if (Math.abs(S.d - 100) > 1e-9 || Math.abs(S.c - 20) > 1e-9) P.hline(B.c + B.d, 'ghost');
    P.fn(R.D, 's-pri thick', 0, x1);
    P.hline(R.c, 's-sec thick', 'S_priv (cost c)', 'end');
    P.hline(R.c + R.d, 's-grn thick', 'S_soc = c + d', 'end');
    if (S.t > 0 && Math.abs(S.t - S.d) > 0.5) P.hline(R.pc, 's-sec dash', 'c + t', 'start');
    P.text(4, R.D(4) - 8, 'D', 's-pri', 'start');
    P.pt(R.Qpriv, R.c, 'p-pri', 'α', 0, 18, 'middle');
    P.pt(R.Qsoc, R.c + R.d, 'p-grn', 'β', 0, -10, 'middle');
    if (S.t > 0 && R.Qt > 0) P.pt(R.Qt, R.pc, 'p-sec', Math.abs(R.Qt - R.Qsoc) > 1 ? 'γ' : '', 8, -8);
    if (R.QH > 0 && R.QH < x1) P.pt(R.QH, 50, 'p-ink small', 'her course', 6, 14);
    P.draw();
  },
  notice: 'Without a tax, patients buy up to α, where their benefit equals the private cost. Every course between Q*_soc and Q*_priv is worth less than c + d: the red triangle B is the social loss. A tax equal to d makes patients face the full social cost and moves the market to β; its revenue (t × Q) is a transfer that can replace distortionary taxes.',
  challenges: [
    { q: 'Levy a tax of $60 per course, 60% of the resistance cost. What share of the social loss does it remove?', change: { t: 60 }, options: ['about 36%', 'about 60%', 'about 84%'], judge: (b, a) => { const f = 1 - a.loss / b.loss; return f < 0.48 ? 0 : f < 0.72 ? 1 : 2; },
      why: (b, a) => `The loss falls from $${nf(b.loss, 0)} million to $${nf(a.loss, 0)} million, so ${pct(1 - a.loss / b.loss, 0)} is removed. The first dollars of tax cut the courses with the largest net social loss; the remaining triangle shrinks with the square of the untaxed share (0.4² = 16%).` },
    { q: 'With the Pigouvian tax t = $100 in place, does the patient of Section 20.3 (benefit $50, cost $20) still take her course?', change: { t: 100 }, options: ['Yes', 'No'], judge: (b, a) => a.herBuys ? 0 : 1,
      why: (b, a) => `No. She now pays ${M.b20_usd(a.pc)}, above her benefit of $50. Without the tax she gains $${nf(b.herNet, 0)} privately while the world loses $${nf(b.d, 0)} in resistance, a net social loss of $${nf(-b.herSoc, 0)}; the tax makes her weigh that cost herself.` },
    { q: 'The tax stays at $100, but new evidence puts the resistance cost at $150 per course. The social loss left is…', base: { t: 100 }, change: { t: 100, d: 150 }, options: ['zero, since a tax is in place', 'positive, but well below the untaxed loss at d = $150', 'larger than the untaxed loss at d = $100'], judge: (b, a) => a.loss < 0.5 ? 0 : a.loss < b.loss0 ? 1 : 2,
      why: (b, a) => `It is $${nf(a.loss, 0)} million, against $${nf(a.loss0, 0)} million with no tax at d = $150. A tax set on an old estimate still corrects most of the overuse, but ${nf(a.Qt - a.Qsoc, 0)} million courses are still bought that are worth less than their new social cost.` }
  ]
});

EX.push({
  id: 'b20-coase', ch: 20, title: 'The Coase theorem and transaction costs',
  ref: 'BHT Section 20.3',
  anchors: [[20, 'lose $1,000 each year if he has to close his factory'], [20, 'pay $1,500 a year to Willy Wonka']],
  intro: 'The candy factory is worth V_W a year to Willy Wonka and the medical practice V_D to Dr Wormwood; they cannot both operate. The judge gives the property right to one of them, and the other can buy it, but striking a deal uses up resources T. The values $1,000 and $2,000 and the payment of $1,500 follow BHT’s parable; the transaction cost T, shared equally, and the rule that the payment splits the gain from the deal in half are illustrative.',
  eq: String.raw`\text{deal}\iff V_{\text{other}}-V_{\text{holder}}>T,\qquad \text{payment}=\tfrac{V_W+V_D}{2},\qquad \text{social surplus}=V_{\text{operator}}-T\cdot\mathbf{1}[\text{deal}]`,
  params: [
    { id: 'VW', label: 'Value of the factory to Wonka V_W ($ a year)', min: 0, max: 3000, step: 50, book: 1000, d: 0 },
    { id: 'VD', label: 'Value of the practice to Wormwood V_D ($ a year)', min: 0, max: 3000, step: 50, book: 2000, d: 0 },
    { id: 'T', label: 'Transaction cost of a deal T ($ a year)', min: 0, max: 2500, step: 50, book: 0, d: 0 }
  ],
  toggles: [{ id: 'rights', label: 'The judge gives the right to', options: [['wonka', 'Wonka: right to make noise'], ['doctor', 'Wormwood: right to quiet']], book: 'wonka' }],
  presets: [{ label: 'Costly bargaining, T = $1,200', values: { T: 1200 } }],
  bookLabel: 'Baseline',
  ghost: '',
  compute: S => M.b20_coase(S),
  outputs: (S, R, B) => [
    { label: 'Outcome', v: M.b20_who(R.runs), b: M.b20_who(B.runs), key: true },
    { label: 'Deal struck? payment', v: R.deal ? 'yes, ' + M.b20_usd(R.pay) : 'no', b: B.deal ? 'yes, ' + M.b20_usd(B.pay) : 'no' },
    { label: 'Wormwood’s net income', v: M.b20_usd(R.nD), b: M.b20_usd(B.nD) },
    { label: 'Wonka’s net income', v: M.b20_usd(R.nW), b: M.b20_usd(B.nW) },
    { label: 'Social surplus (net of T)', v: M.b20_usd(R.SS), b: M.b20_usd(B.SS) },
    { label: 'Social loss against the best outcome', v: M.b20_usd(R.loss), b: M.b20_usd(B.loss), key: true }
  ],
  verdict: (S, R) => R.loss < 0.5
    ? { tone: 'ok', text: `Efficient: the more valuable activity (${M.b20_who(R.runs)}) survives${R.deal ? `, because the side without the right buys it for ${M.b20_usd(R.pay)}` : ' without any deal'}.` }
    : R.deal
      ? { tone: 'warn', text: `The efficient outcome is reached, but the deal itself uses up ${M.b20_usd(S.T)}, so ${M.b20_usd(R.loss)} of surplus is lost.` }
      : { tone: 'bad', text: `No deal: buying the right would gain ${M.b20_usd(R.gap)}, less than the transaction cost of ${M.b20_usd(S.T)}, so the less valuable activity survives and ${M.b20_usd(R.loss)} is lost.` },
  chart(el, S, R, B) {
    const x1 = 2500, y1 = Math.max(R.VW, R.VD, 100) * 1.2;
    const P = Plot(el, { x0: 0, x1, y0: 0, y1, xlabel: 'Transaction cost T ($ a year)', ylabel: 'Social surplus ($ a year)', aria: 'Social surplus under each assignment of the property right as transaction costs rise' });
    const line = r => {
      const pts = [];
      for (let i = 0; i <= 250; i++) { const T = x1 * i / 250; pts.push([T, M.b20_coase({ VW: S.VW, VD: S.VD, T, rights: r }).SS]); }
      return pts;
    };
    P.hline(R.best, 's-gray dash', 'best outcome', 'start');
    P.path(line('wonka'), 's-pri thick');
    P.path(line('doctor'), 's-grn thick');
    const lab = (r, cls, dy) => { const v = M.b20_coase({ VW: S.VW, VD: S.VD, T: x1 * 0.9, rights: r }).SS; P.text(x1 * 0.9, v + dy, r === 'wonka' ? 'right to Wonka' : 'right to Wormwood', cls, 'end'); };
    const vw = M.b20_coase({ VW: S.VW, VD: S.VD, T: x1 * 0.9, rights: 'wonka' }).SS, vd = M.b20_coase({ VW: S.VW, VD: S.VD, T: x1 * 0.9, rights: 'doctor' }).SS;
    lab('wonka', 's-pri', vw >= vd ? y1 * 0.04 : -y1 * 0.06);
    lab('doctor', 's-grn', vd > vw ? y1 * 0.04 : -y1 * 0.06);
    P.vline(S.T, 's-ink dot');
    P.pt(S.T, R.SS, R.rights === 'wonka' ? 'p-pri' : 'p-grn', 'now', 8, -8);
    P.draw();
  },
  notice: 'With T = 0 both lines start at the best outcome: the right decides who pays whom, not what happens. As T rises, a deal costs part of its own gain (the falling segment), and once T exceeds the gap between the two values, no deal is struck and the outcome depends on who holds the right.',
  challenges: [
    { q: 'The right stays with Wonka, and negotiating costs $600 a year. What happens?', change: { T: 600 }, options: ['They still strike a deal and the practice stays', 'No deal: the practice closes'], judge: (b, a) => a.deal ? 0 : 1,
      why: (b, a) => `They strike a deal: the practice is worth $${nf(a.gap, 0)} more than the factory, more than the $600 the deal costs. The outcome is still efficient, but social surplus falls from ${M.b20_usd(b.SS)} to ${M.b20_usd(a.SS)}, because negotiating uses real resources.` },
    { q: 'Negotiating costs $1,200 a year. Give the right to Wormwood instead of Wonka. The social loss…', base: { T: 1200 }, change: { T: 1200, rights: 'doctor' }, options: ['falls to zero', 'does not change, since the Coase theorem says rights do not matter', 'rises'], judge: (b, a) => a.loss < 0.5 && b.loss > 0.5 ? 0 : Math.abs(a.loss - b.loss) < 0.5 ? 1 : 2,
      why: (b, a) => `It falls from ${M.b20_usd(b.loss)} to ${M.b20_usd(a.loss)}. With high transaction costs no deal is struck, so the outcome follows the initial right; giving it to the party that values it more avoids the need to bargain at all.` },
    { q: 'At zero transaction cost, move the right from Wonka to Wormwood. Wormwood’s net income…', change: { rights: 'doctor' }, options: ['rises by $1,500', 'rises by $1,000', 'does not change, since the outcome is the same'], judge: (b, a) => Math.abs(a.nD - b.nD - 1500) < 0.5 ? 0 : Math.abs(a.nD - b.nD - 1000) < 0.5 ? 1 : 2,
      why: (b, a) => `It rises from ${M.b20_usd(b.nD)} to ${M.b20_usd(a.nD)}, and Wonka’s falls from ${M.b20_usd(b.nW)} to ${M.b20_usd(a.nW)}. The practice stays open in both cases; the assignment of the right changes only who pays whom.` },
    { q: 'Suppose the factory becomes worth $2,500 a year, with the right given to Wormwood and no transaction cost. What happens?', base: { rights: 'doctor' }, change: { rights: 'doctor', VW: 2500 }, options: ['The practice stays: Wormwood holds the right', 'Wonka pays Wormwood to move and the factory stays'], judge: (b, a) => a.runs === 'D' ? 0 : 1,
      why: (b, a) => `Wonka buys the right for ${M.b20_usd(a.pay)}, which Wormwood prefers to the $2,000 her practice earns. The factory is now the more valuable use, and costless bargaining moves the right to it whoever holds it at first.` }
  ]
});
