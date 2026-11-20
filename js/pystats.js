/* =========================================================
 * pystats.js — the statistics the lectures of Python Lessons 22–28 show
 * (mean, standard deviation, t and chi-square tests, regression),
 * worked out here from the data so that no number is typed by hand.
 * check.mjs compares every shown result with scipy / statsmodels.
 * ========================================================= */

export const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
/** sample variance (ddof = 1, as pandas) */
export const variance = a => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
export const sd = a => Math.sqrt(variance(a));
export const sem = a => sd(a) / Math.sqrt(a.length);
/** quantile with linear interpolation (pandas' default) */
export function quantile(a, q) {
  const s = [...a].sort((x, y) => x - y), h = (s.length - 1) * q, i = Math.floor(h);
  return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i];
}
export function corr(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
}

/* ---------- special functions ---------- */
function lgamma(x) {   // Lanczos
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betacf(a, b, x) {   // continued fraction for the incomplete beta function
  const EPS = 1e-15, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 1000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
/** the regularized incomplete beta function I_x(a, b) */
function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/** the regularized upper incomplete gamma function Q(a, x) */
function gammaQ(a, x) {
  if (x <= 0) return 1;
  const gln = lgamma(a);
  if (x < a + 1) {   // series for P, then Q = 1 − P
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 1000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;   // continued fraction for Q
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/* ---------- distributions ---------- */
/** P(|T| ≥ |t|) for Student's t with df degrees of freedom (the two-sided p-value) */
export const tTwoSided = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
/** the t value with P(T ≤ value) = p */
export function tQuantile(p, df) {
  const cdf = t => (t >= 0 ? 1 - tTwoSided(t, df) / 2 : tTwoSided(t, df) / 2);
  let lo = -1000, hi = 1000;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** P(X ≥ x) for chi-square with df degrees of freedom */
export const chi2Upper = (x, df) => gammaQ(df / 2, x / 2);

/* ---------- what scipy gives ---------- */
/** stats.t.interval(level, df=n−1, loc=mean, scale=sem) → [low, high] */
export function tInterval(a, level) {
  const m = mean(a), se = sem(a), t = tQuantile((1 + level) / 2, a.length - 1);
  return [m - t * se, m + t * se];
}
/** stats.ttest_ind(a, b, equal_var) → { statistic, pvalue, df } */
export function ttestInd(a, b, equalVar = true) {
  const na = a.length, nb = b.length, va = variance(a), vb = variance(b);
  let se, df;
  if (equalVar) { const sp = ((na - 1) * va + (nb - 1) * vb) / (na + nb - 2); se = Math.sqrt(sp * (1 / na + 1 / nb)); df = na + nb - 2; }
  else { const qa = va / na, qb = vb / nb; se = Math.sqrt(qa + qb); df = (qa + qb) ** 2 / (qa ** 2 / (na - 1) + qb ** 2 / (nb - 1)); }
  const t = (mean(a) - mean(b)) / se;
  return { statistic: t, pvalue: tTwoSided(t, df), df };
}
/** stats.ttest_1samp(a, popmean) → { statistic, pvalue } */
export function ttest1(a, mu) { const t = (mean(a) - mu) / sem(a); return { statistic: t, pvalue: tTwoSided(t, a.length - 1) }; }
/** stats.chi2_contingency(table) (with Yates' correction for a 2 × 2 table, as scipy) → { statistic, pvalue, dof, expected } */
export function chi2Contingency(table) {
  const rs = table.map(r => r.reduce((s, x) => s + x, 0)), cs = table[0].map((_, j) => table.reduce((s, r) => s + r[j], 0)), n = rs.reduce((s, x) => s + x, 0);
  const expected = table.map((r, i) => r.map((_, j) => rs[i] * cs[j] / n)), dof = (table.length - 1) * (table[0].length - 1);
  let stat = 0;
  table.forEach((r, i) => r.forEach((o, j) => {
    const e = expected[i][j];
    let d = o - e;
    if (dof === 1) d = Math.sign(d) * Math.max(0, Math.abs(d) - 0.5);   // Yates
    stat += d * d / e;
  }));
  return { statistic: stat, pvalue: chi2Upper(stat, dof), dof, expected };
}
/** stats.linregress(x, y) → { slope, intercept, rvalue } */
export function linregress(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; });
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, rvalue: corr(x, y) };
}
/** least squares y ~ 1 + x1 + x2 … (statsmodels ols) → { params: [intercept, b1, b2 …], rsquared }; centred first, so years (≈ 2020) stay precise */
export function ols(y, xs) {
  const my = mean(y), mx = xs.map(mean), k = xs.length;
  const X = y.map((_, i) => xs.map((c, j) => c[i] - mx[j])), yc = y.map(v => v - my);
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const v = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i] * yc[t], 0));
  for (let c = 0; c < k; c++) {   // Gauss–Jordan with partial pivoting
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [v[c], v[p]] = [v[p], v[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j < k; j++) A[r][j] -= f * A[c][j]; v[r] -= f * v[c]; }
  }
  const b = v.map((x, i) => x / A[i][i]), params = [my - b.reduce((s, x, i) => s + x * mx[i], 0), ...b];
  const ssr = yc.reduce((s, t, i) => s + (t - X[i].reduce((a, x, j) => a + x * b[j], 0)) ** 2, 0), sst = yc.reduce((s, t) => s + t * t, 0);
  return { params, rsquared: 1 - ssr / sst };
}
