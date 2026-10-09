// Model engine for the HE Book example explorer. Pure functions, no DOM.
const M = {};

// ---------- numerical helpers ----------
M.bisect = function (f, a, b, tol = 1e-10, it = 200) {
  let fa = f(a), fb = f(b);
  if (isNaN(fa) || isNaN(fb) || fa * fb > 0) return NaN;
  for (let i = 0; i < it; i++) {
    const c = 0.5 * (a + b), fc = f(c);
    if (Math.abs(fc) < tol || (b - a) < tol) return c;
    if (fa * fc < 0) { b = c; fb = fc; } else { a = c; fa = fc; }
  }
  return 0.5 * (a + b);
};
// golden-section maximization on [a,b]
M.argmax = function (f, a, b, it = 120) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < it; i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
  }
  const x = 0.5 * (a + b);
  return { x, f: f(x) };
};
// grid then golden refine, safer for flat/kinked objectives
M.argmaxGrid = function (f, a, b, n = 200) {
  let best = a, bv = -Infinity;
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, v = f(x); if (v > bv) { bv = v; best = x; } }
  const h = (b - a) / n;
  return M.argmax(f, Math.max(a, best - h), Math.min(b, best + h));
};
M.integrate = function (f, a, b, n = 400) { // Simpson
  if (n % 2) n++;
  const h = (b - a) / n; let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
};

// ---------- utility families ----------
M.crra = function (g) {
  if (Math.abs(g - 1) < 1e-9) return { u: w => Math.log(w), inv: v => Math.exp(v), up: w => 1 / w };
  return { u: w => Math.pow(w, 1 - g) / (1 - g), inv: v => Math.pow(v * (1 - g), 1 / (1 - g)), up: w => Math.pow(w, -g) };
};
M.cara = function (a) {
  return { u: w => -Math.exp(-a * w) / a, inv: v => -Math.log(-a * v) / a, up: w => Math.exp(-a * w) };
};
M.util = (fam, par) => fam === 'cara' ? M.cara(par) : M.crra(par);

// ================= Chapter 1 =================
M.mhTriangle = function ({ eta, pM, c }) {
  const dM = eta * (1 - c) * pM;           // increase in spending (euro at full price)
  const dwl = 0.5 * eta * (1 - c) * (1 - c) * pM;
  return { dM, dwl, dwlFull: 0.5 * eta * pM, Mfull: pM, Mins: pM + dM, c };
};
M.zeckhauser = function ({ eta, pM, a, sigma }) {
  const A = eta * pM, R = a * sigma * sigma;
  const K = c => 0.5 * A * (1 - c) * (1 - c) + 0.5 * R * c * c;
  const cstar = A / (A + R);
  return { K, cstar, Kstar: K(cstar), dwlPart: c => 0.5 * A * (1 - c) ** 2, riskPart: c => 0.5 * R * c * c, RP: 0.5 * R };
};
M.ceCARA = (a, p, L) => Math.log(1 - p + p * Math.exp(a * L)) / a;
M.poolCARA = function ({ pL, pH, L, a, share }) { // share = fraction of high risks
  const Ppool = (share * pH + (1 - share) * pL) * L;
  const ceL = M.ceCARA(a, pL, L), ceH = M.ceCARA(a, pH, L);
  const lowStays = ceL >= Ppool;
  const astar = M.bisect(x => M.ceCARA(x, pL, L) - Ppool, 1e-9, 5e-3);
  let outcome;
  if (lowStays) outcome = 'pool';
  else if (ceH >= pH * L) outcome = 'high-only';
  else outcome = 'none';
  return { Ppool, ceL, ceH, lowStays, astar, outcome, PH: pH * L };
};
M.behavioral = function ({ p, c, eps, b0, k }) {
  // true marginal benefit b(M) = b0 - k M; perceived b(M)-eps; choose b(M)-eps = c p
  const Mc = cc => Math.max(0, (b0 - eps - cc * p) / k);
  const W = cc => { const m = Mc(cc); return b0 * m - 0.5 * k * m * m - p * m; };
  const cstar = Math.min(1, Math.max(0, 1 - eps / p));
  const ruleHelps = (1 - c) * p > eps; // raising c helps
  return { Mc, W, cstar, ruleHelps, M: Mc(c), Wc: W(c), Wstar: W(cstar), Meff: (b0 - p) / k };
};

// ================= Chapter 2 =================
M.grossman = function ({ B, w, pM, E, theta, alpha, eps, rho, delta }) {
  const kappa = Math.pow(alpha, -alpha) * Math.pow(1 - alpha, -(1 - alpha));
  const pi = kappa * Math.pow(pM, alpha) * Math.pow(w, 1 - alpha) * Math.exp(-theta * E);
  const Hstar = Math.pow((w * B / pi) / (rho + delta), 1 / eps);
  const mec = H => w * B * Math.pow(H, -eps) / pi;
  // stationary medical care: pM M = alpha pi I, I = delta H
  const Med = alpha * pi * delta * Hstar / pM;
  return { kappa, pi, Hstar, mec, userCost: rho + delta, Med };
};
M.lifecycle = function ({ eps, rho, ratio, d0, g, Hmin, a0 = 20 }) {
  const delta = t => d0 * Math.exp(g * (t - a0));
  const H = t => Math.pow(ratio / (rho + delta(t)), 1 / eps);
  // death: rho + delta_T = ratio * Hmin^-eps
  const dT = ratio * Math.pow(Hmin, -eps) - rho;
  const T = dT > d0 ? a0 + Math.log(dT / d0) / g : (dT > 0 ? a0 : NaN);
  const repl = t => delta(t) * H(t);
  const dH = t => (H(t + 1e-4) - H(t - 1e-4)) / 2e-4;
  const gross = t => repl(t) + dH(t);
  return { delta, H, T, repl, gross, H0: H(a0) };
};

// ================= Chapter 3 =================
M.riskPremium = function ({ W, L, p, fam, par }) {
  const U = M.util(fam, par);
  const Ew = W - p * L, sd = L * Math.sqrt(p * (1 - p));
  const EU = (1 - p) * U.u(W) + p * U.u(W - L);
  const CE = U.inv(EU);
  const RP = Ew - CE;
  const rA = fam === 'cara' ? par : par / Ew;
  const pratt = 0.5 * sd * sd * rA;
  const prudence = fam === 'cara' ? par : (par + 1) / Ew;
  return { Ew, sd, EU, CE, RP, pratt, ratio: RP / pratt, precaution: 0.5 * sd * sd * prudence, U };
};
M.stateDep = function ({ W, L, p, phi }) {
  const Ew = W - p * L;
  const share = 1 - phi * Ew / ((1 - p * phi) * L);
  const cH = Ew / (1 - p * phi), cS = (1 - phi) * cH;
  return { share, cH, cS, Ew, zeroAt: L / (Ew + p * L) };
};
M.weight = (p, d) => Math.pow(p, d) / Math.pow(Math.pow(p, d) + Math.pow(1 - p, d), 1 / d);

// ================= Chapter 4 =================
M.coverage = function ({ W, L, p, lam, fam, par }) {
  const U = M.util(fam, par), pi = (1 + lam) * p;
  const V = a => (1 - p) * U.u(W - pi * a * L) + p * U.u(W - L + (1 - pi) * a * L);
  let astar;
  if (fam !== 'cara' && Math.abs(par - 1) < 1e-9) {
    astar = (p * (1 - pi) * W - (1 - p) * pi * (W - L)) / (pi * (1 - pi) * L);
    astar = Math.max(0, Math.min(1, astar));
  } else astar = M.argmaxGrid(V, 0, 1).x;
  const wH = W - pi * astar * L, wS = W - L + (1 - pi) * astar * L;
  return { pi, astar, wH, wS, V, U, EU: V(astar), CE: U.inv(V(astar)), CE0: U.inv(V(0)) };
};
M.arrow = function ({ W, q, Xmax, lam, fam, par }) {
  // illness with prob q, loss uniform on [0,Xmax]
  const U = M.util(fam, par), n = 400;
  const EUof = (I, P) => (1 - q) * U.u(W - P) + q * M.integrate(x => U.u(W - P - x + I(x)), 0, Xmax, n) / Xmax;
  const premDed = D => (1 + lam) * q * (Xmax - D) * (Xmax - D) / (2 * Xmax);
  const ceDed = D => { const P = premDed(D); const below = D > 0 ? M.integrate(x => U.u(W - P - x), 0, D, 200) : 0; return U.inv((1 - q) * U.u(W - P) + q * (below + (Xmax - D) * U.u(W - P - D)) / Xmax); };
  const premCo = s => (1 + lam) * q * s * Xmax / 2;
  const ceCo = s => U.inv(EUof(x => s * x, premCo(s)));
  const ded = M.argmaxGrid(ceDed, 0, Xmax, 160);
  const co = M.argmaxGrid(ceCo, 0, 1, 160);
  const sSame = premDed(ded.x) / ((1 + lam) * q * Xmax / 2);
  return { ceDed, ceCo, premDed, premCo, Dstar: ded.x, ceDstar: ded.f, sstar: co.x, ceSstar: co.f,
    ceNone: ceCo(0), ceFull: ceCo(1), sSame, ceSame: ceCo(Math.min(1, sSame)) };
};

// ================= Chapter 5 =================
M.lemons = function ({ x0, x1, gam }) {
  // at price p in [x0,x1], offered pool uniform [x0,p], buyers value gam*(x0+p)/2
  if (gam * (x0 + x1) / 2 >= x1) return { p: x1, share: 1, full: true };
  if (gam >= 2) return { p: x1, share: 1, full: true };
  const p = gam * x0 / (2 - gam);
  if (p <= x0 + 1e-12) return { p: x0, share: 0, full: false };
  return { p, share: (p - x0) / (x1 - x0), full: false };
};
// distribution helpers for unraveling (Beta on [0,1], uniform = Beta(1,1))
M.betaDist = function (a, b) {
  const n = 2000, xs = [], cdf = [], m1 = [];
  let lnB = M.lgamma(a) + M.lgamma(b) - M.lgamma(a + b);
  const pdf = x => (x <= 0 || x >= 1) ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lnB);
  // cumulative with midpoint rule
  let C = 0, S = 0; xs.push(0); cdf.push(0); m1.push(0);
  for (let i = 1; i <= n; i++) {
    const x = i / n, xm = (i - 0.5) / n, f = pdf(xm) / n; C += f; S += f * xm;
    xs.push(x); cdf.push(C); m1.push(S);
  }
  const Z = C; for (let i = 0; i <= n; i++) { cdf[i] /= Z; m1[i] /= Z; }
  const at = (arr, x) => { if (x <= 0) return arr[0]; if (x >= 1) return arr[n]; const t = x * n, i = Math.floor(t); return arr[i] + (arr[i + 1] - arr[i]) * (t - i); };
  return { pdf: x => pdf(x) / Z, F: x => at(cdf, x), partialMean: x => at(m1, x), mean: m1[n] };
};
M.lgamma = function (z) { // Lanczos
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61560829466525, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - M.lgamma(1 - z);
  z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
};
M.mixDist = function (w, m1, m2, sd) {
  const pdf = x => w * Math.exp(-0.5 * ((x - m1) / sd) ** 2) + (1 - w) * Math.exp(-0.5 * ((x - m2) / sd) ** 2);
  const n = 2000, C = [0], S = [0]; let c = 0, s = 0;
  for (let i = 1; i <= n; i++) { const x = (i - 0.5) / n, f = pdf(x) / n; c += f; s += f * x; C.push(c); S.push(s); }
  const at = (arr, x) => { if (x <= 0) return 0; if (x >= 1) return arr[n] / c; const t = x * n, i = Math.floor(t); return (arr[i] + (arr[i + 1] - arr[i]) * (t - i)) / c; };
  return { pdf: x => pdf(x) / c, F: x => at(C, x), partialMean: x => at(S, x), mean: s / c };
};
M.unravel = function ({ m, dist, a, b, w, m1, m2, sd }) {
  const D = dist === 'mix' ? M.mixDist(w, m1, m2, sd) : M.betaDist(a, b);
  const AC = P => { const t = Math.min(1, Math.max(0, P - m)); const mass = 1 - D.F(t); if (mass < 1e-9) return 1; return (D.mean - D.partialMean(t)) / mass; };
  // equilibria: fixed points of AC(P)=P on [m, 1+m]
  const eq = []; const N = 1200; let prev = AC(0) - 0;
  for (let i = 1; i <= N; i++) {
    const P = (1 + m) * i / N, v = AC(P) - P;
    if (prev * v <= 0) { const r = M.bisect(x => AC(x) - x, (1 + m) * (i - 1) / N, P); if (!isNaN(r)) eq.push(r); }
    prev = v;
  }
  const uniq = eq.filter((x, i) => i === 0 || Math.abs(x - eq[i - 1]) > 1e-4);
  const info = uniq.map(P => { const share = 1 - D.F(Math.max(0, P - m)); const slope = (AC(P + 1e-4) - AC(P - 1e-4)) / 2e-4; return { P, share, stable: Math.abs(slope) < 1, loss: m * (1 - share) }; });
  return { AC, eq: info, D };
};
M.cobweb = function (AC, P0, rounds) { const path = [P0]; let P = P0; for (let i = 0; i < rounds; i++) { P = AC(P); path.push(P); } return path; };
M.efc = function ({ d0, d1, c0, c1, s }) {
  const P = q => d0 - d1 * q, MC = q => c0 - c1 * q, AC = q => c0 - c1 * q / 2;
  const clip = q => Math.max(0, Math.min(1, q));
  // competitive with subsidy s: buyers pay P(q), insurers receive AC(q): P(q)+s = AC(q)
  const qeq = d1 - c1 / 2 !== 0 ? clip((d0 + s - c0) / (d1 - c1 / 2)) : (d0 + s >= c0 ? 1 : 0);
  const qeff = d1 - c1 !== 0 ? clip((d0 - c0) / (d1 - c1)) : (d0 >= c0 ? 1 : 0);
  const gap = q => P(q) - MC(q);
  const lo = Math.min(qeq, qeff), hi = Math.max(qeq, qeff);
  const dwl = Math.abs(M.integrate(gap, lo, hi, 200));
  const surplus = M.integrate(q => Math.max(0, gap(q)), 0, 1, 400);
  const sEff = AC(qeff) - P(qeff);
  return { P, MC, AC, qeq, qeff, peq: P(qeq), peff: P(qeff), dwl, surplus, sEff, fiscal: s * qeq, fiscalEff: sEff * qeff, adverse: c1 > 0 };
};

// ================= Chapter 6 =================
M.rs = function ({ W, d, pH, pL, lam, g }) {
  const U = M.crra(g).u;
  const UH = (x, y) => (1 - pH) * U(x) + pH * U(y), UL = (x, y) => (1 - pL) * U(x) + pL * U(y);
  const CH = [W - pH * d, W - pH * d], uHbar = U(W - pH * d);
  const lowC = k => [W - pL * k, W - d + (1 - pL) * k];
  // IC: largest k with UH(lowC(k)) <= uHbar. UH increasing in k on fair line of L for k<d.
  const f = k => UH(...lowC(k)) - uHbar;
  const k = f(d) <= 0 ? d : M.bisect(f, 0, d);
  const CL = lowC(k), uLsep = UL(...CL);
  const poolBest = l => { const pb = l * pH + (1 - l) * pL; return M.argmaxGrid(kk => UL(W - pb * kk, W - d + (1 - pb) * kk), 0, d, 120).f; };
  const exists = l => uLsep >= poolBest(l);
  const lamStar = poolBest(0.999) > uLsep ? 1 : (poolBest(0.0001) <= uLsep ? 0 : M.bisect(l => uLsep - poolBest(l), 0.0001, 0.999, 1e-7));
  const pb = lam * pH + (1 - lam) * pL;
  // MWS: transfer t to high risks; high pay pH d - t, low pay pL k + lam t/(1-lam)
  const mwsAt = t => {
    const uh = U(W - pH * d + t);
    const tax = lam * t / (1 - lam);
    const low = kk => [W - pL * kk - tax, W - d + (1 - pL) * kk - tax];
    const kf = kk => UH(...low(kk)) - uh;
    let kk;
    if (kf(0) > 0) return null;
    // low risks never want more than full coverage
    const kFullLow = d; kk = kf(kFullLow) <= 0 ? kFullLow : M.bisect(kf, 0, kFullLow);
    const c = low(kk); return { t, k: kk, tax, uL: UL(...c), CL: c, CH: [W - pH * d + t, W - pH * d + t] };
  };
  const tMax = pH * d * 0.999;
  const best = M.argmaxGrid(t => { const r = mwsAt(t); return r ? r.uL : -1e9; }, 0, tMax * 0.6, 300);
  let mws = mwsAt(best.x); if (!mws || mws.uL < uLsep + 1e-9) mws = mwsAt(0);
  return { UH, UL, CH, CL, k, uLsep, uLfull: U(W - pL * d), uLnone: UL(W, W - d), uHbar, pb, poolBest: poolBest(lam), exists: exists(lam), lamStar, mws, mwsAt, poolBestF: poolBest };
};
M.lamStarStar = function (args) { // smallest lambda at which MWS transfer is zero
  return M.bisect(l => { const r = M.rs({ ...args, lam: l }); return r.mws.t - 1e-4; }, 0.01, 0.95, 1e-5);
};

// ================= Chapter 7 =================
M.twoDim = function ({ sp, sm, rho, mup, mum, P }) {
  const cov = rho * sp * sm;
  const vw = sp * sp + sm * sm + 2 * cov;
  const beta = (sp * sp + cov) / vw;
  const muw = mup + mum, sw = Math.sqrt(vw), z = (P - muw) / sw;
  const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const Phi = x => 0.5 * (1 + M.erf(x / Math.SQRT2));
  const share = 1 - Phi(z);
  const Ewin = muw + sw * phi(z) / Math.max(1e-12, share), Ewout = muw - sw * phi(z) / Math.max(1e-12, 1 - share);
  const gap = beta * (Ewin - Ewout);
  return { beta, cov, share, gap, adverse: beta > 0, Epi_in: mup + beta * (Ewin - muw), Epi_out: mup + beta * (Ewout - muw) };
};
M.erf = function (x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };



// ================= Chapter 7: no-trade condition and inertia =================
M.hendren = function ({ b, gam, L }) {
  // beliefs uniform on [0, b]; pooled price ratio R(p) = odds(T(p)) / odds(p), T(p) = (p + b) / 2
  const odds = x => x / (1 - x);
  const R = p => odds((p + b) / 2) / odds(p);
  const mrs = Math.pow(1 - L, -gam);
  const inf = b >= 1 ? 2 : 1;                       // limit as p -> b
  const trade = mrs > inf + 1e-12;
  // types whose MRS exceeds their pooled price ratio: R(p) < mrs  <=>  p above a cutoff
  let cut = NaN;
  if (trade) { const f = p => R(p) - mrs; cut = f(1e-6) < 0 ? 0 : M.bisect(f, 1e-6, Math.min(b, 1) - 1e-9); }
  return { R, mrs, inf, trade, cut, r02: R(0.2), r05: b > 0.5 ? R(0.5) : NaN };
};
M.inertia = function ({ kappa, cH, cS, vH, vS }) {
  // two equal groups choosing a generous plan; premium = average incremental cost of enrollees
  const pAll = (cH + cS) / 2;
  let healthyIn, premium, sickIn = true;
  if (pAll <= vH) { healthyIn = 1; premium = pAll; }
  else { healthyIn = kappa; premium = (cS + kappa * cH) / (1 + kappa); }
  if (premium > vS) { sickIn = false; }
  const surplus = (sickIn ? vS - cS : 0) + healthyIn * (vH - cH);
  const efficient = Math.max(0, vS - cS) + Math.max(0, vH - cH);
  return { pAll, healthyIn, premium, sickIn, surplus, efficient, escapeGain: premium - vH,
    premiumAt: k => (cS + k * cH) / (1 + k), surplusAt: k => (vS - cS) + k * (vH - cH) };
};
