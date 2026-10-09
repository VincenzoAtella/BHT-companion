// Headless check of the example models, run by build.py with Node.
// Loads the bundled engine and examples, evaluates every example at the book
// values and every predict-first check, and fails on errors or NaN outputs.
const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const { EX } = new Function(code + '\nreturn { EX };')();
const book = ex => { const S = {}; (ex.params || []).forEach(p => S[p.id] = p.book); (ex.toggles || []).forEach(t => S[t.id] = t.book); return S; };
let bad = 0;
for (const ex of EX) {
  try {
    const S = book(ex), B = ex.compute(S), rows = ex.outputs(S, B, B);
    ex.verdict(S, B, B);
    rows.filter(r => /NaN|n\/a/.test(r.v)).forEach(r => { bad++; console.log(`  ${ex.id}: "${r.label}" is ${r.v} at the book values`); });
    ex.challenges.forEach((c, i) => {
      const base = { ...S, ...(c.base || {}) }, b = ex.compute(base), a = ex.compute({ ...base, ...c.change }), k = c.judge(b, a);
      if (!(k >= 0 && k < c.options.length)) { bad++; console.log(`  ${ex.id}: check ${i + 1} has no valid answer`); }
      if (/NaN/.test(c.why(b, a))) { bad++; console.log(`  ${ex.id}: check ${i + 1} explanation shows NaN`); }
    });
  } catch (e) { bad++; console.log(`  ${ex.id}: ${e.message}`); }
}
console.log(bad ? `${bad} problem(s) in the example models.` : `${EX.length} example models run at the book values.`);
process.exit(bad ? 1 : 0);
