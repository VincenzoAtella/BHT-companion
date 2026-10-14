// =====================================================================
//  Locked solutions, spaced review, settings and installation
// =====================================================================

// ---------- settings ----------
const DEFAULTS = { theme: 'system', textSize: 'normal', reviewGoal: 20, reviewPace: 'standard', minWordsPractice: 15, minWordsExam: 8, examN: 20, examTime: 30 };
const minP = () => +ST.settings.minWordsPractice;
const minE = () => +ST.settings.minWordsExam;
const SIZES = { normal: '100%', large: '112.5%', larger: '125%' };
function applySettings() {
  const r = document.documentElement, t = ST.settings.theme;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  r.style.fontSize = SIZES[ST.settings.textSize] || '100%';
}

// ---------- locked solutions ----------
const LOCKED = typeof LOCK !== 'undefined' && !!LOCK.enabled;
const SOL = {};
function solOf(q) { if (!LOCKED) return { a: q.answer, e: q.expl }; return SOL[q.id] || null; }
const chapterUnlocked = n => !LOCKED || QUESTIONS.filter(q => q.ch === n).every(q => SOL[q.id]);
// numerical answers: right if, rounded to q.dec decimals, equal to the answer or one unit off in the last decimal
function parseNum(raw) {
  let t = String(raw ?? '').trim().replace(/\s|\u00a0|%|€|\$/g, '').replace(/[\u2212\u2013]/g, '-');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, '');
  else if (t.includes(',')) t = t.replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return parseFloat(t);
}
const fmtNum = (x, dec) => { let s = (+x).toFixed(dec); if (/^-0\.?0*$/.test(s)) s = s.slice(1); return s; };
const numCands = (x, dec) => { const u = Math.pow(10, -dec), r = Math.round(x / u); return [r, r - 1, r + 1].map(k => fmtNum(k * u, dec)); };
const ansCode = (q, c) => q.type === 'tf' ? (c ? 'T' : 'F') : q.type === 'num' ? fmtNum(c, q.dec) : 'abcde'[c];
function isRight(q, choice) {
  if (choice === null || choice === undefined || (q.type === 'num' && !isFinite(choice))) return false;
  if (q.type === 'num') {
    if (!LOCKED) return Math.abs(Math.round(choice * Math.pow(10, q.dec)) - Math.round(q.answer * Math.pow(10, q.dec))) <= 1;
    return numCands(choice, q.dec).some(a => sha256(`${LOCK.pepper}|${q.id}|${a}`).slice(0, 20) === q.tag);
  }
  if (!LOCKED) return choice === q.answer;
  return sha256(`${LOCK.pepper}|${q.id}|${ansCode(q, choice)}`).slice(0, 20) === q.tag;
}
function mcStatic(q, choice, correct, sl) {
  return `<div class="mcopts static">${q.options.map((o, k) => {
    const cls = (sl && k === sl.a) || (correct && k === choice) ? 'right' : (k === choice && !correct ? 'wrong' : '');
    return `<div class="mco ${cls}"><span class="ml">${letter(k)}</span><span>${o}</span></div>`;
  }).join('')}</div>`;
}
function verdictHTML(q, choice, correct, sl) {
  const tail = correct ? (q.type === 'num' && sl ? ` The book’s answer is ${ansText(q, sl.a)}.` : '') : sl ? ` The answer is ${ansText(q, sl.a)}.` : (q.type !== 'tf' && choice !== null && choice !== undefined ? ` Try again later; the ${q.type === 'num' ? 'book’s answer' : 'correct option'} appears when the solutions are released.` : '');
  return `<div class="verdict ${correct ? 'ok' : 'bad'}"><span class="pill">${correct ? 'Correct' : 'Incorrect'}</span><span>You answered ${ansText(q, choice)}.${tail}</span></div>`;
}
function solHTML(q, sl) {
  if (sl) return `<div class="sol"><span class="jl">Solution</span><p>${sl.e}</p></div>`;
  return `<div class="sol locked"><span class="jl">Solution</span><p>Locked until your instructor releases the solutions for Chapter ${chLab(q.ch)}. You enter the code once: it opens every solution of the chapter. <a href="#q-${q.ch}">Enter it at the top of the Questions page</a> or in <a href="#settings">Settings</a>.</p></div>`;
}
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const normCode = c => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
async function openBox(box, code) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(normCode(code)), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(box.s), iterations: LOCK.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(box.iv) }, key, b64d(box.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
const cryptoOK = () => !!(window.crypto && crypto.subtle);
async function openChapter(key, code) {
  const sol = await openBox(LOCK.boxes[key], code);
  Object.assign(SOL, sol); ST.unlocked[key] = code; return key;
}
async function tryCode(raw) {
  if (!LOCKED) return [];
  if (!cryptoOK()) throw new Error('crypto');
  const code = normCode(raw); if (code.length < 8) return [];
  try {
    const all = await openBox(LOCK.all, code);
    const keys = Object.keys(all).filter(k => LOCK.boxes[k]);
    await Promise.all(keys.map(k => openChapter(k, all[k])));
    save(); return keys;
  } catch (e) { /* not the code for every chapter */ }
  const res = await Promise.allSettled(Object.keys(LOCK.boxes).filter(k => !ST.unlocked[k]).map(k => openChapter(k, code)));
  const keys = res.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (keys.length) save();
  return keys;
}
// ---------- code entry, shared by Settings and the Questions page ----------
const codeFormHTML = () => `<form id="codeForm" class="codeform"><label class="sr" for="codeIn">Unlock code</label><input id="codeIn" autocomplete="off" spellcheck="false" placeholder="XXXXX-XXXXX"><button class="btn" type="submit">Unlock</button></form><p class="fine" id="codeMsg" role="status"></p>`;
function bindCodeForm(after) {
  const form = $('#codeForm'); if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const msg = $('#codeMsg'), v = $('#codeIn').value; msg.textContent = 'Checking the code…';
    try {
      const keys = await tryCode(v);
      if (!keys.length) { msg.textContent = 'This code does not open any chapter. Check it against the message from your instructor; letters and digits only, the dash is optional.'; return; }
      const ns = [...new Set(QUESTIONS.filter(q => keys.includes(q.key)).map(q => q.ch))].sort((a, b) => a - b);
      toast(`Solutions unlocked for ${ns.length > 1 ? 'chapters ' + ns.join(', ') : 'chapter ' + ns[0]}.`);
      renderNav(); after();
    } catch (err) { msg.textContent = 'This browser cannot check codes. Open the app in a recent version of Chrome, Edge, Firefox or Safari.'; }
  };
}

async function restoreUnlocked() {
  if (!LOCKED || !cryptoOK()) return 0;
  const res = await Promise.allSettled(Object.entries(ST.unlocked || {}).filter(([k]) => LOCK.boxes[k]).map(([k, c]) => openChapter(k, c)));
  return res.filter(r => r.status === 'fulfilled').length;
}

// SHA-256 (synchronous, small): used only to recognize a right answer.
function sha256(msg) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = new TextEncoder().encode(msg), l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(bytes); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64), rr = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + 4 * i);
    for (let i = 16; i < 64; i++) { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e, f, g, hh][i]) | 0);
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------- spaced review ----------
const PACES = {
  relaxed: { label: 'Relaxed', days: [2, 5, 12, 30, 90] },
  standard: { label: 'Standard', days: [1, 3, 7, 21, 60] },
  intensive: { label: 'Intensive', days: [1, 2, 4, 10, 30] }
};
const DAY = 864e5;
function schedule(qid, correct) {
  const I = (PACES[ST.settings.reviewPace] || PACES.standard).days, prev = ST.srs[qid];
  const box = correct ? (prev ? Math.min(prev.box + 1, I.length - 1) : 1) : 0;
  ST.srs[qid] = { box, due: Date.now() + I[box] * DAY };
}
function dueList() {
  const now = Date.now();
  return Object.entries(ST.srs || {}).filter(([id, s]) => QBY[id] && s.due <= now).sort((a, b) => a[1].due - b[1].due).map(([id]) => QBY[id]);
}
function renderReview() {
  current = null; curCh = 0;
  const due = dueList(), goal = +ST.settings.reviewGoal, today = due.slice(0, goal);
  const upcoming = Object.values(ST.srs || {}).filter(s => s.due > Date.now()).sort((a, b) => a.due - b.due);
  const learned = Object.values(ST.srs || {}).filter(s => s.box >= 3).length;
  const pace = PACES[ST.settings.reviewPace] || PACES.standard;
  $('#main').innerHTML = plainHead('Review', `Questions you have answered come back after ${pace.days.slice(0, 4).join(', ')} and ${pace.days[4]} days, a step longer each time you get them right and back to the start when you miss one. Short, spaced sessions fix what you learn better than long ones.`) + `
    <section class="practice review-page" ${acc('hn')}>
      <div class="statrow">
        <div class="stat"><b>${due.length}</b><span>due now</span></div>
        <div class="stat"><b>${today.length}</b><span>in today’s session (goal ${goal})</span></div>
        <div class="stat"><b>${Object.keys(ST.srs || {}).length}</b><span>questions in review</span></div>
        <div class="stat"><b>${learned}</b><span>well learned (four steps or more)</span></div>
      </div>
      ${today.length ? `<div id="qlist">${today.map(q => qCard(q, true, true)).join('')}</div>
        <p class="fine">When you finish, open Review again tomorrow. Questions you answered correctly will not come back until their next date.</p>`
      : `<div class="empty"><h2>Nothing is due</h2><p>${Object.keys(ST.srs || {}).length ? `Your next review is on ${new Date(upcoming[0].due).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, with ${plural(upcoming.filter(s => s.due - upcoming[0].due < DAY).length, 'question')}.` : 'Answer some questions in a chapter or take a mock exam. Every question you answer joins your review schedule.'}</p><a class="btn" href="#">Open the course map</a></div>`}
    </section>`;
  if (today.length) { bindCards($('#qlist')); typeset($('#qlist')); }
}

// ---------- settings ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (route === 'settings') renderSettings(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('Installed. You can open the app from your apps or your dock.'); });
function registerSW() {
  const ok = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && document.querySelector('link[rel="manifest"]');
  if (ok) navigator.serviceWorker.register('sw.js').catch(() => { });
}
function seg(id, options, value) {
  return `<div class="seg" role="group" data-setting="${id}">${options.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(value) === String(v)}">${l}</button>`).join('')}</div>`;
}
function sel(id, options, value) {
  return `<select data-setting="${id}" id="set-${id}">${options.map(([v, l]) => `<option value="${v}"${String(value) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
}
function installHTML() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return '<p>You are using the installed app. It works offline and updates itself when a new version is published.</p>';
  if (location.protocol === 'file:') return '<p>This copy is a single file, so it cannot be installed as an app. It already works offline: keep it in a folder and open it with a double click. Your progress stays in the browser you open it with.</p>';
  if (installEvt) return '<p>Install the companion as an app: it gets its own window and icon, works offline and updates itself.</p><p><button class="btn" id="installBtn">Install the app</button></p>';
  return `<p>To install the companion as an app:</p><ul class="steps">
    <li><b>Chrome or Edge</b>: the install icon at the right of the address bar, or the browser menu, then <i>Install</i>.</li>
    <li><b>Safari on a Mac</b> (macOS Sonoma or later): <i>File</i>, then <i>Add to Dock</i>.</li>
    <li><b>iPhone or iPad</b>: the share button, then <i>Add to Home Screen</i>.</li>
    <li><b>Android</b>: the browser menu, then <i>Install app</i>.</li></ul>`;
}
function renderSettings() {
  current = null; curCh = 0;
  const S0 = ST.settings, chs = READY;
  const unlockedChs = chs.filter(c => chapterUnlocked(c.n));
  $('#main').innerHTML = plainHead('Settings', 'Your choices are saved in this browser together with your progress.') + `
    <section class="settings" ${acc('hn')}>
      <div class="setgrid">
        <section class="setcard"><h2>Appearance</h2>
          <div class="field"><span class="flabel">Theme</span>${seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], S0.theme)}</div>
          <div class="field"><span class="flabel">Text size</span>${seg('textSize', [['normal', 'Normal'], ['large', 'Large'], ['larger', 'Larger']], S0.textSize)}</div>
        </section>
        <section class="setcard"><h2>Review</h2>
          <div class="field"><span class="flabel">Pace</span>${seg('reviewPace', Object.entries(PACES).map(([k, v]) => [k, v.label]), S0.reviewPace)}
            <p class="fhint">A question you get right comes back after ${(PACES[S0.reviewPace] || PACES.standard).days.join(', ')} days. A change applies from your next answer.</p></div>
          <div class="field"><label class="flabel" for="set-reviewGoal">Questions per session</label>${sel('reviewGoal', [[10, '10'], [20, '20'], [30, '30'], [50, '50']], S0.reviewGoal)}</div>
        </section>
        <section class="setcard"><h2>Written justifications</h2>
          <div class="field"><label class="flabel" for="set-minWordsPractice">Minimum words in practice and review</label>${sel('minWordsPractice', [[0, 'None'], [10, '10'], [15, '15 (two or three sentences)'], [25, '25']], S0.minWordsPractice)}</div>
          <div class="field"><label class="flabel" for="set-minWordsExam">Minimum words in the mock exam</label>${sel('minWordsExam', [[0, 'None'], [8, '8'], [15, '15']], S0.minWordsExam)}</div>
        </section>
        <section class="setcard"><h2>Mock exam</h2>
          <div class="field"><label class="flabel" for="set-examN">Questions</label>${sel('examN', [[10, '10'], [20, '20'], [30, '30'], [50, '50'], [0, 'All available']], S0.examN)}</div>
          <div class="field"><label class="flabel" for="set-examTime">Time limit</label>${sel('examTime', [[10, '10 min'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '60 min'], [90, '90 min'], [0, 'No limit']], S0.examTime)}</div>
        </section>
        ${LOCKED ? `<section class="setcard wide" id="unlock"><h2>Solutions</h2>
          <p>Solutions are released chapter by chapter. When your instructor sends you a code, enter it once, here or at the top of a chapter’s Questions page. A chapter code opens every solution of that chapter; a course code opens all chapters.</p>
          ${codeFormHTML()}
          <p class="fine">${unlockedChs.length ? `Unlocked: ${plural(unlockedChs.length, 'chapter')} of ${chs.length} (${unlockedChs.map(c => c.n).join(', ')}).` : `All ${chs.length} chapters are locked.`}</p>
        </section>` : ''}
        <section class="setcard wide"><h2>Install</h2>${installHTML()}</section>
        <section class="setcard wide"><h2>Your data</h2>
          <p>Progress is saved in this browser${storageOK ? '' : ', but this browser is not keeping it between sessions; save a progress file before you close the app'}. A progress file moves your work to another computer or browser, or keeps a copy.</p>
          <div class="datarow">
            <button class="btn ghostbtn" id="saveProg">Save progress file</button>
            <label class="btn ghostbtn" for="loadProg">Load progress file</label><input type="file" id="loadProg" accept=".json,application/json" hidden>
            <button class="btn danger" id="resetAll">Erase all progress</button>
          </div>
        </section>
        <section class="setcard wide about"><h2>About this copy</h2>
          <p>Built on ${esc(BUILD.date)} for the course: ${plural(READY.length, 'chapter')} with exercises, ${QUESTIONS.length} questions, ${EX.length} interactive examples. Solutions: ${LOCKED ? 'released with unlock codes' : 'always visible'}.</p>
        </section>
      </div>
    </section>`;
  $$('.seg[data-setting] button').forEach(b => b.onclick = () => { const k = b.closest('.seg').dataset.setting; ST.settings[k] = b.dataset.v; save(); applySettings(); renderSettings(); });
  $$('select[data-setting]').forEach(s => s.onchange = () => { ST.settings[s.dataset.setting] = +s.value; save(); });
  const ib = $('#installBtn'); if (ib) ib.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderSettings(); };
  bindCodeForm(renderSettings);
  $('#saveProg').onclick = () => download(`bht-progress-${(ST.name || 'student').replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'bht-companion', version: 1, saved: Date.now(), data: ST }, null, 1), 'application/json');
  $('#loadProg').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => { try { const o = JSON.parse(r.result); if (!o || o.app !== 'bht-companion' || !o.data) throw 0; ST = { ...blank(), ...o.data }; ST.settings = { ...DEFAULTS, ...(ST.settings || {}) }; save(); applySettings(); await restoreUnlocked(); toast('Progress loaded.'); renderNav(); renderSettings(); } catch (err) { toast('This file is not a progress file from this app.'); } };
    r.readAsText(f);
  };
  $('#resetAll').onclick = e => twoStep(e.target, 'Erase all progress', () => { const keep = { name: ST.name, settings: ST.settings, unlocked: ST.unlocked }; ST = { ...blank(), ...keep }; save(); renderNav(); renderSettings(); toast('Progress erased. Your settings and unlocked chapters are kept.'); });
}

// ---------- feedback and error reports ----------
// The app has no server: a report becomes an email the student sends from her own mail program
// (or copies into Teams). FEEDBACK_TO is the instructor's address.
const FEEDBACK_TO = 'atella@uniroma2.it';
const FB_KINDS = [
  ['app', 'How the app works for me', 'Is it useful? What works, what is confusing, what you would add.'],
  ['question', 'An error in a question or its solution', 'A wrong answer key, an unclear statement, a solution that does not follow.'],
  ['example', 'A problem with an interactive example', 'A number that does not match the textbook, a chart that looks wrong, a prediction you disagree with.'],
  ['book', 'A doubt about the textbook', 'A passage of Bhattacharya, Hyde and Tu that you find unclear or that seems not to hold.']
];
function fbParams() {
  const q = (location.hash.split('?')[1] || ''); const o = {};
  q.split('&').forEach(kv => { const [k, v] = kv.split('='); if (k) o[k] = decodeURIComponent(v || ''); });
  return o;
}
function fbContext(F) {
  if (F.q && QBY[F.q]) { const q = QBY[F.q]; return { ch: q.ch, where: `Chapter ${chLab(q.ch)}, ${q.type === 'num' ? 'numerical problem' : q.src === 'app' ? 'app question' : 'item'} ${q.n} (${TYPEL[q.type].toLowerCase()}; id ${q.id})`, quote: q.stem.replace(/<[^>]+>/g, '').replace(/\\\(|\\\)/g, '$').slice(0, 300) }; }
  if (F.ex) { const e = EX.find(x => x.id === F.ex); if (e) return { ch: e.ch, where: `Chapter ${chLab(e.ch)}, interactive example "${e.title}" (id ${e.id})`, quote: '' }; }
  return { ch: F.ch ? +F.ch : null, where: '', quote: '' };
}
function renderFeedback() {
  current = null; curCh = 0;
  const F = fbParams(), C = fbContext(F);
  const kind = F.kind || (F.q ? 'question' : F.ex ? 'example' : 'app');
  const chs = CHAPTERS.filter(c => c.ready);
  const log = ST.feedback || [];
  $('#main').innerHTML = `<section class="settings fb">
    <h1>Feedback and error reports</h1>
    <p class="lede">Tell the instructor what works and what does not, or report an error. Your message is prepared here and sent from your own email program, so the instructor sees who wrote it and can reply. Nothing is sent without you.</p>
    <form id="fbForm" class="setcard wide">
      <fieldset class="fbkinds"><legend class="flabel">What is it about?</legend>
        ${FB_KINDS.map(([v, l, h]) => `<label class="fbkind"><input type="radio" name="kind" value="${v}"${v === kind ? ' checked' : ''}><span><b>${esc(l)}</b><small>${esc(h)}</small></span></label>`).join('')}
      </fieldset>
      <div class="field" id="fbRateRow"><span class="flabel">Overall, the app is</span>
        <div class="seg" role="group" aria-label="Rating">${[['very', 'Very useful'], ['useful', 'Useful'], ['little', 'Of little use'], ['not', 'Not useful']].map(([v, l]) => `<button type="button" data-rate="${v}" aria-pressed="false">${l}</button>`).join('')}</div></div>
      <div class="field" id="fbChRow"><label class="flabel" for="fbCh">Chapter</label>
        <select id="fbCh"><option value="">Not specific to a chapter</option>${chs.map(c => `<option value="${c.n}"${C.ch === c.n ? ' selected' : ''}>${chLab(c.n)}. ${esc(c.t)}</option>`).join('')}</select></div>
      <div class="field" id="fbWhereRow"><label class="flabel" for="fbWhere">Where exactly</label>
        <input id="fbWhere" value="${esc(C.where)}" placeholder="Section, page, equation, item number…"></div>
      <div class="field"><label class="flabel" for="fbText" id="fbTextLabel">Your message</label>
        <textarea id="fbText" rows="6" placeholder=""></textarea></div>
      <div class="field"><label class="flabel" for="fbName">Your name (optional)</label><input id="fbName" value="${esc(ST.name || '')}"></div>
      <div class="qbtns"><button class="btn" type="submit">Open in my email program</button><button class="btn ghostbtn" type="button" id="fbCopy">Copy the message</button></div>
      <p class="fine">If no email program opens, use <b>Copy the message</b> and paste it into an email to <a href="mailto:${FEEDBACK_TO}">${FEEDBACK_TO}</a> or into a Teams chat with your instructor.</p>
      <p class="fine" id="fbMsg" role="status"></p>
    </form>
    ${log.length ? `<section class="setcard wide"><h2>Your reports</h2><ul class="fblog">${log.slice().reverse().map(r => `<li><span class="fine">${fmtDate(r.t)}</span> ${esc(r.subject)}</li>`).join('')}</ul></section>` : ''}
  </section>`;
  let rate = '';
  const sync = () => {
    const k = $('input[name=kind]:checked').value;
    $('#fbRateRow').hidden = k !== 'app'; $('#fbWhereRow').hidden = k === 'app';
    $('#fbTextLabel').textContent = k === 'app' ? 'What works, what is confusing, what would you improve or add?' : 'What is wrong, and what do you think it should be?';
    $('#fbText').placeholder = k === 'app' ? 'For example: the mock exam helped me most; the review page was unclear because…' : 'For example: the solution says (b), but with the numbers of the question I get (c) because…';
  };
  $$('input[name=kind]').forEach(r => r.onchange = sync); sync();
  $$('[data-rate]').forEach(b => b.onclick = () => { rate = b.dataset.rate; $$('[data-rate]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const compose = () => {
    const k = $('input[name=kind]:checked').value, kl = FB_KINDS.find(x => x[0] === k)[1];
    const ch = $('#fbCh').value, where = $('#fbWhere').value.trim(), text = $('#fbText').value.trim(), name = $('#fbName').value.trim();
    const subject = `[BHT app] ${kl}${ch ? ` - Chapter ${chLab(+ch)}` : ''}`;
    const lines = [`Type: ${kl}`];
    if (k === 'app' && rate) lines.push(`Overall the app is: ${$(`[data-rate="${rate}"]`).textContent}`);
    if (ch) lines.push(`Chapter: ${chLab(+ch)}. ${(CHAPTERS.find(c => c.n === +ch) || {}).t || ''}`);
    if (k !== 'app' && where) lines.push(`Where: ${where}`);
    if (k === 'question' && C.quote) lines.push(`Question text: ${C.quote}`);
    lines.push('', text || '(no message)', '', `From: ${name || 'a student'}`, `App version: ${BUILD.date}`, `Browser: ${navigator.userAgent}`);
    return { k, subject, body: lines.join('\n'), text };
  };
  const remember = m => { ST.feedback = (ST.feedback || []).concat([{ t: Date.now(), subject: m.subject }]).slice(-30); save(); };
  $('#fbForm').onsubmit = e => {
    e.preventDefault(); const m = compose();
    if (!m.text) { $('#fbMsg').textContent = 'Write a few words first.'; return; }
    location.href = `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    remember(m); $('#fbMsg').textContent = 'Your email program should now show the message. Check it and press Send.';
  };
  $('#fbCopy').onclick = async () => {
    const m = compose(); if (!m.text) { $('#fbMsg').textContent = 'Write a few words first.'; return; }
    const all = `To: ${FEEDBACK_TO}\nSubject: ${m.subject}\n\n${m.body}`;
    try { await navigator.clipboard.writeText(all); } catch (err) { const t = document.createElement('textarea'); t.value = all; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    remember(m); $('#fbMsg').textContent = 'Copied. Paste it into an email or a Teams message to your instructor.';
  };
}
