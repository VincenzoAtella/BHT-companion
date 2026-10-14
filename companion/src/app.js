// =====================================================================
//  BHT Health Economics Study Companion
//  Map of the book -> chapter -> interactive examples and questions,
//  plus a timed mock exam and a self-assessment report.
//  Color rule: the hue tells where you are in the book (one per part);
//  green, amber and red tell how you are doing; chart colors belong to the model.
// =====================================================================
EX.forEach(e => { e.bookLabel = e.bookLabel || 'Baseline'; });
const KEY = 'bht-companion-v1';
const blank = () => ({ name: '', checks: {}, answers: {}, exams: [], running: null, seen: {}, last: '', srs: {}, unlocked: {}, settings: {}, feedback: [] });
let ST = (() => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? { ...blank(), ...v } : blank(); } catch (e) { return blank(); } })();
ST.settings = { ...DEFAULTS, ...(ST.settings || {}) };
let storageOK = true;
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); storageOK = true; } catch (e) { storageOK = false; } }

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const words = s => (s || '').trim().split(/\s+/).filter(Boolean).length;
const QBY = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const READY = CHAPTERS.filter(c => c.ready);
const CH = n => CHAPTERS.find(c => c.n === n) || { n, t: 'Chapter ' + n, part: 0, partTitle: '' };
const chTitle = n => CH(n).t;
const chLab = n => CH(n).lab || n;   // chapters written for the course, outside BHT, show a label such as A1
const shortT = c => { const [a, b] = c.t.split(':'); return b && CHAPTERS.some(d => d !== c && (d.t.split(':')[0] === a || d.t.startsWith(a + ' '))) ? b.trim().replace(/^the /, '').replace(/^./, x => x.toUpperCase()) : a; };   // when two chapters share the part before the colon, show the part after it
const fmtDate = t => new Date(t).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const mmss = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
const letter = k => '(' + 'abcde'[k] + ')';
const ansText = (q, a) => a === undefined || a === null || (q.type === 'num' && !isFinite(a)) ? 'no answer' : q.type === 'tf' ? (a ? 'True' : 'False') : q.type === 'num' ? fmtNum(a, q.dec) + (q.unit ? ' ' + q.unit : '') : letter(a) + ' ' + q.options[a];
const TYPEL = { tf: 'True or false', mc: 'Multiple choice', num: 'Numerical' };
const setupOf = q => (q.pid && SETUPS[q.pid]) || '';
const plural = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
const firstSentence = s => { const m = String(s).match(/^.*?[.?!](\s|$)/); return m ? m[0].trim() : s; };

// ---------- parts of the book ----------
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const PARTS = (() => {
  const m = new Map();
  CHAPTERS.forEach(c => { const k = c.part || 0; if (!m.has(k)) m.set(k, { k, title: c.partTitle || '', chs: [] }); m.get(k).chs.push(c); });
  return [...m.values()].map((p, i) => ({ ...p, hue: 'h' + (i % 4) }));
})();
const partOf = n => PARTS.find(p => p.chs.some(c => c.n === n)) || PARTS[0];
const partLabel = p => p.k === 8 ? 'Part A' : p.k ? `Part ${ROMAN[p.k] || p.k}` : 'Opening chapter';
const partName = p => p.k ? p.title.split(':')[0] : 'Why health economics?';
const partSub = p => p.k ? (p.title.split(':')[1] || '').trim() : 'BHT Chapter 1: what makes health and health care different from other goods, and the questions the course takes up.';
const acc = hue => `style="--acc:var(--${hue});--acc-soft:var(--${hue}-soft)"`;
const accCh = n => acc(partOf(n).hue);

function typeset(el) { if (window.MathJax && MathJax.typesetPromise) { try { MathJax.typesetClear && MathJax.typesetClear([el]); } catch (e) { } return MathJax.typesetPromise([el]).catch(() => { }); } return Promise.resolve(); }
function download(name, text, type) {
  const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3200); }
function twoStep(btn, label, action) {
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; action(); return; }
  btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = 'Click again to confirm';
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 3500);
}
function markSeen(id, lvl) { if ((ST.seen[id] || 0) < lvl) { ST.seen[id] = lvl; save(); renderTabsState(); } }

// ---------- scoring ----------
function chapterStats(n) {
  const qs = QUESTIONS.filter(q => q.ch === n);
  const st = { total: qs.length, tfN: qs.filter(q => q.type === 'tf').length, answered: 0, correct: 0, tf: [0, 0], mc: [0, 0], num: [0, 0], rated: 0, ratingPts: 0, examSeen: 0, examCorrect: 0 };
  qs.forEach(q => {
    const a = ST.answers[q.id]; if (!a) return;
    st.answered++; if (a.first.correct) st.correct++;
    const t = st[q.type] || st.mc; t[1]++; if (a.first.correct) t[0]++;
    if (q.type === 'tf' && a.rating) { st.rated++; st.ratingPts += a.rating === 'yes' ? 1 : a.rating === 'partly' ? 0.5 : 0; }
  });
  ST.exams.forEach(ex => ex.items.forEach(it => { const q = QBY[it.qid]; if (q && q.ch === n) { st.examSeen++; if (it.correct) st.examCorrect++; if (q.type === 'tf' && it.rating) { st.rated++; st.ratingPts += it.rating === 'yes' ? 1 : it.rating === 'partly' ? 0.5 : 0; } } }));
  const exs = EX.filter(e => e.ch === n);
  st.exN = exs.length; st.explored = exs.filter(e => ST.seen[e.id] === 2).length;
  st.checksTot = exs.reduce((a, e) => a + e.challenges.length, 0);
  st.checks = exs.reduce((a, e) => a + e.challenges.filter((_, i) => ST.checks[e.id + ':' + i] === true).length, 0);
  st.checksAns = exs.reduce((a, e) => a + e.challenges.filter((_, i) => ST.checks[e.id + ':' + i] !== undefined).length, 0);
  const seen = new Set(Object.keys(ST.answers).filter(id => QBY[id] && QBY[id].ch === n));
  ST.exams.forEach(ex => ex.items.forEach(it => { if (QBY[it.qid] && QBY[it.qid].ch === n && it.choice !== null && it.choice !== undefined) seen.add(it.qid); }));
  st.coverage = st.total ? seen.size / st.total : 0;
  const n1 = st.answered + st.examSeen, c1 = st.correct + st.examCorrect;  // predictions are reported apart
  st.mastery = n1 ? c1 / n1 : null;
  st.level = st.coverage < 0.5 ? ['none', 'Not enough evidence'] : st.mastery >= 0.8 ? ['ok', 'Ready'] : st.mastery >= 0.6 ? ['warn', 'Review'] : ['bad', 'Not yet'];
  const doneN = st.explored + st.checksAns + st.answered, totN = st.exN + st.checksTot + st.total;
  st.progress = totN ? doneN / totN : 0;
  return st;
}
const pctS = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';

// ---------- thumbnails of the example charts ----------
const thumbCache = {};
const bookState = ex => { const o = {}; (ex.params || []).forEach(p => o[p.id] = p.book); (ex.toggles || []).forEach(t => o[t.id] = t.book); return o; };
function fillThumbs(root) {
  const els = $$('.thumb[data-ex]', root); let i = 0;
  const step = () => {
    if (i >= els.length) return;
    const el = els[i++], id = el.dataset.ex;
    if (!thumbCache[id]) {
      const ex = EX.find(e => e.id === id), tmp = document.createElement('div');
      try { const S0 = bookState(ex), R0 = ex.compute(S0); ex.chart(tmp, S0, R0, R0); thumbCache[id] = tmp.innerHTML; } catch (e) { thumbCache[id] = ''; }
    }
    if (el.isConnected) el.innerHTML = thumbCache[id];
    setTimeout(step, 0);
  };
  setTimeout(step, 30);
}

// ---------- rail ----------
let current = null, S = null, B = null, route = '', curCh = 0;
function renderNav() {
  $('#nav').innerHTML = PARTS.map(p => {
    const ready = p.chs.filter(c => c.ready), soon = p.chs.length - ready.length;
    return `<section class="rpart" ${acc(p.hue)}>
      <p class="rpart-t"><span class="rpart-l">${partLabel(p)}</span> ${esc(partName(p))}</p>
      ${ready.length ? `<ul>${ready.map(c => { const st = chapterStats(c.n); return `<li><a class="rch${curCh === c.n ? ' active' : ''}" href="#ch-${c.n}" title="${esc(c.t)}"><span class="rnum">${chLab(c.n)}</span><span class="rtitle">${esc(shortT(c))}</span><span class="lvl ${st.level[0]}" title="${esc(st.level[1])}"></span><span class="rbar"><i style="width:${Math.round(100 * st.progress)}%"></i></span></a></li>`; }).join('')}</ul>` : ''}
      ${soon ? `<p class="rsoon">${ready.length ? plural(soon, 'more chapter') : plural(soon, 'chapter')} in preparation</p>` : ''}
    </section>`;
  }).join('');
  $$('.toplink').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + route || (route.startsWith('exam') && a.getAttribute('href') === '#exam') || (!route && a.getAttribute('href') === '#')));
  const rc = $('#revcount'); if (rc) { const n = dueList().length; rc.textContent = n; rc.hidden = !n; }
  const sel = $('#mobsel');
  sel.innerHTML = `<option value="">Go to…</option><option value="home">Map of the course</option><option value="exam">Mock exam</option><option value="report">My report</option><option value="feedback">Feedback</option>` + PARTS.filter(p => p.chs.some(c => c.ready)).map(p => `<optgroup label="${esc(partLabel(p) + '. ' + partName(p))}">${p.chs.filter(c => c.ready).map(c => `<option value="ch-${c.n}">${chLab(c.n)}. ${esc(shortT(c))}</option>`).join('')}</optgroup>`).join('');
  sel.value = curCh ? 'ch-' + curCh : '';
  $('#namebox').textContent = ST.name ? ST.name : 'Add your name in My report';
}

// ---------- home: the map of the book ----------
function tile(c) {
  if (!c.ready) return `<div class="tile soon"><span class="tnum">${chLab(c.n)}</span><span class="ttitle">${esc(shortT(c))}</span><span class="tmeta">In preparation</span></div>`;
  const st = chapterStats(c.n), exs = EX.filter(e => e.ch === c.n);
  const meta = [exs.length ? plural(exs.length, 'example') : '', plural(st.total, 'question')].filter(Boolean).join(', ');
  return `<a class="tile${exs.length ? ' has-ex' : ''}" href="#ch-${c.n}">
    <span class="tnum">${chLab(c.n)}</span>
    <span class="ttitle">${esc(shortT(c))}</span>
    ${exs.length ? `<span class="thumb" data-ex="${exs[0].id}" aria-hidden="true"></span>` : ''}
    <span class="tmeta">${meta}</span>
    <span class="tbar" title="${Math.round(100 * st.progress)}% done"><i style="width:${Math.round(100 * st.progress)}%"></i></span>
  </a>`;
}
function renderHome() {
  current = null; curCh = 0;
  const ans = Object.keys(ST.answers).length, explored = EX.filter(e => ST.seen[e.id] === 2).length;
  const last = ST.last && EX.find(e => e.id === ST.last);
  $('#main').innerHTML = `
    <section class="home">
      <div class="hero">
        <h1>Study Companion</h1>
        <p class="lede">Run the course models, answer the exercises and see where you stand. Each part of the textbook has its own color; open a chapter on the map to find its examples and questions.</p>
        <div class="hero-act">
          ${dueList().length ? `<a class="btn" href="#review">Review ${plural(dueList().length, 'due question')}</a>` : ''}
          ${last ? `<a class="btn" ${accCh(last.ch)} href="#${last.id}">Continue with ${esc(last.title)}</a>` : (() => { const f = CHAPTERS.find(c => c.ready) || CHAPTERS[0]; return `<a class="btn" ${accCh(f.n)} href="#ch-${f.n}">Start with Chapter ${chLab(f.n)}</a>`; })()}
          <button class="btn ghostbtn" id="rnd">Open a random example</button>
          <a class="btn ghostbtn" href="#exam">Take a mock exam</a>
        </div>
        <p class="standing">You have explored ${explored} of ${EX.length} interactive examples and answered ${ans} of ${QUESTIONS.length} questions${ST.exams.length ? `, with ${plural(ST.exams.length, 'mock exam')} taken` : ''}.</p>
      </div>
      <div class="map">${PARTS.map(p => {
        const ready = p.chs.filter(c => c.ready).length, exN = EX.filter(e => p.chs.some(c => c.n === e.ch)).length;
        return `<section class="prow" ${acc(p.hue)}>
          <header class="phead"><p class="plabel">${partLabel(p)}</p><h2>${esc(partName(p))}</h2><p class="psub">${esc(partSub(p))}</p>
            <p class="pmeta">${plural(p.chs.length, 'chapter')}${p.chs.length > 1 ? `, ${ready} with exercises` : ''}${exN ? `, ${plural(exN, 'interactive example')}` : ''}</p></header>
          <div class="tiles">${p.chs.map(tile).join('')}</div>
        </section>`;
      }).join('')}</div>
    </section>`;
  $('#rnd').onclick = () => { const pool = EX.filter(e => ST.seen[e.id] !== 2); const pick = (pool.length ? pool : EX)[Math.floor(Math.random() * (pool.length || EX.length))]; location.hash = pick.id; };
  fillThumbs($('#main'));
}

// ---------- chapter band and tabs ----------
function band(n, active, h1) {
  const c = CH(n), p = partOf(n), exs = EX.filter(e => e.ch === n), st = chapterStats(n);
  const T = h1 ? 'h1' : 'p';
  return `<header class="band" ${acc(p.hue)}>
    <div class="band-grid">
      <span class="band-num" aria-hidden="true">${chLab(n)}</span>
      <div class="band-txt"><p class="band-part"><a href="#">${partLabel(p)}. ${esc(partName(p))}</a></p><${T} class="band-title">${h1 ? '' : `<span class="sr">Chapter ${chLab(n)}. </span>`}${esc(c.t)}</${T}></div>
    </div>
    <nav class="tabs" aria-label="Chapter ${chLab(n)}">
      <a href="#ch-${n}"${active === 'ov' ? ' class="active" aria-current="page"' : ''}>Overview</a>
      ${exs.map(e => `<a href="#${e.id}" data-tab="${e.id}"${active === e.id ? ' class="active" aria-current="page"' : ''}>${esc(e.title)}<span class="tabpf${pfDone(e) === e.challenges.length ? ' all' : ''}" title="Predictions answered">${pfDone(e)}/${e.challenges.length}</span><span class="tabdone" ${ST.seen[e.id] === 2 ? '' : 'hidden'} title="Explored">✓</span></a>`).join('')}
      ${c.ready ? `<a href="#q-${n}"${active === 'q' ? ' class="active" aria-current="page"' : ''}>Questions <span class="cnt">${st.answered}/${st.total}</span></a>` : ''}
    </nav>
  </header>`;
}
const pfDone = e => e.challenges.filter((_, i) => ST.checks[e.id + ':' + i] !== undefined).length;
function renderTabsState() { $$('.tabs [data-tab]').forEach(a => { const d = $('.tabdone', a); if (d) d.hidden = ST.seen[a.dataset.tab] !== 2; const e = EX.find(x => x.id === a.dataset.tab), f = $('.tabpf', a); if (e && f) { f.textContent = `${pfDone(e)}/${e.challenges.length}`; f.classList.toggle('all', pfDone(e) === e.challenges.length); } }); }

function renderChapter(n) {
  current = null; curCh = n;
  const c = CH(n), exs = EX.filter(e => e.ch === n), st = chapterStats(n);
  const state = id => ST.seen[id] === 2 ? 'Explored' : ST.seen[id] === 1 ? 'Opened' : 'Not opened yet';
  $('#main').innerHTML = band(n, 'ov', true) + `
    <div class="ov${exs.length ? '' : ' solo'}" ${accCh(n)}>
      ${exs.length ? `<section class="ov-ex">
        <h2>Run the models</h2>
        ${exs.length ? `<p class="sub">Each example opens at its baseline values. Change one assumption at a time and watch the equilibrium move.</p>
        <div class="excards">${exs.map(e => `<a class="excard" href="#${e.id}">
            <span class="thumb" data-ex="${e.id}" aria-hidden="true"></span>
            <span class="ec-t">${esc(e.title)}</span>
            <span class="ec-d">${esc(firstSentence(e.intro))}</span>
            <span class="ec-s${ST.seen[e.id] === 2 ? ' done' : ''}">${state(e.id)}${e.challenges.length ? `, ${e.challenges.filter((_, i) => ST.checks[e.id + ':' + i] !== undefined).length} of ${e.challenges.length} checks answered` : ''}</span>
          </a>`).join('')}</div>`
        : ''}
      </section>` : ''}
      <aside class="ov-side">
        ${c.ready ? `<div class="qbox">
          <h2>Test yourself</h2>
          <p>${plural(st.total, 'question')} from the chapter’s exercises: ${st.tfN} true or false, ${st.total - st.tfN} multiple choice.</p>
          <div class="meter" title="${st.answered} of ${st.total} answered"><i style="width:${Math.round(100 * st.answered / (st.total || 1))}%"></i></div>
          <p class="fine">${st.answered} answered, ${st.correct} right first time.${st.checksTot ? ` ${st.checks} of ${st.checksTot} predictions right first time.` : ''}</p>
          <p class="readiness">Readiness <span class="pill ${st.level[0]}">${st.level[1]}</span></p>
          <div class="qbtns"><a class="btn" href="#q-${n}">Practice the questions</a><button class="btn ghostbtn" id="examThis">Mock exam on this chapter</button></div>
          ${exs.length ? '' : '<p class="fine">Interactive examples for this chapter are not written yet.</p>'}
        </div>` : ''}
      </aside>
    </div>
    ${chapterPager(n)}`;
  const b = $('#examThis'); if (b) b.onclick = () => { examPreset = [n]; location.hash = 'exam'; };
  fillThumbs($('#main'));
}
function chapterPager(n) {
  const i = READY.findIndex(c => c.n === n), prev = READY[i - 1], next = READY[i + 1];
  return `<nav class="pager">${prev ? `<a href="#ch-${prev.n}" class="pg prev" ${accCh(prev.n)}><span>Previous chapter</span>${chLab(prev.n)}. ${esc(shortT(prev))}</a>` : '<span></span>'}${next ? `<a href="#ch-${next.n}" class="pg next" ${accCh(next.n)}><span>Next chapter</span>${chLab(next.n)}. ${esc(shortT(next))}</a>` : '<span></span>'}</nav>`;
}

// ---------- explore (examples) ----------
function openExample(id) {
  const ex = EX.find(e => e.id === id);
  current = ex; curCh = ex.ch; S = bookState(ex); B = ex.compute(bookState(ex));
  ST.last = id; markSeen(id, 1); save();
  $('#main').innerHTML = band(ex.ch, ex.id, false) + `
    <article class="ex" ${accCh(ex.ch)}>
      <header class="exhead">
        <div class="exhead-t"><h1>${esc(ex.title)}</h1><p class="lede">${esc(ex.intro)}</p><p class="ref">${/^Chapter A\d/.test(ex.ref) ? 'In the course materials' : 'In the textbook'}: ${esc(ex.ref)} · <a href="#feedback?ex=${ex.id}">Report a problem with this example</a></p></div>
        <div class="eq">\\[${esc(eqLines(ex.eq))}\\]</div>
      </header>
      <section class="checks" id="predict" aria-labelledby="pfh"><div class="pfhead"><h2 id="pfh">Predict first</h2><span class="pill" id="pfcount"></span></div><p class="sub">Before you touch the figure, commit to an answer: the app then sets the parameters and shows what the model says.</p><div id="challenges"></div></section>
      <div class="status" id="status" role="status"></div>
      <div class="work">
        <aside class="controls" aria-label="Assumptions and parameters">
          <h2>Assumptions</h2>
          <div class="presets"><button class="btn" id="resetBook">${esc(ex.bookLabel || 'Baseline')}</button>${(ex.presets || []).map((p, i) => `<button class="btn ghostbtn" data-preset="${i}">${esc(p.label)}</button>`).join('')}</div>
          <div id="toggles"></div><div id="sliders"></div>
        </aside>
        <section class="figure">
          <div id="verdict" class="verdict"></div>
          <div id="chart" class="chart"></div>
          ${ex.ghost === '' ? '' : `<p class="legend"><span class="ghostkey"></span>${esc(ex.ghost || (ex.bookLabel === 'Baseline' ? 'Dashed gray: baseline' : 'Dashed gray: the baseline case'))}</p>`}
          <div class="tblwrap"><table class="out"><thead><tr><th>Result</th><th class="num">Now</th><th class="num">${esc(ex.bookLabel || 'Book')}</th><th class="num">Change</th></tr></thead><tbody id="outputs"></tbody></table></div>
          <p class="notice">${esc(ex.notice)}</p>
        </section>
      </div>
      ${examplePager(ex)}
    </article>`;
  buildControls(ex); buildChallenges(ex); update();
  typeset($('.exhead'));
}
function buildControls(ex) {
  $('#toggles').innerHTML = (ex.toggles || []).map(t => `<div class="toggle"><span class="tlabel">${esc(t.label)}</span><div class="seg" role="group" aria-label="${esc(t.label)}">${t.options.map(([v, l]) => `<button data-t="${t.id}" data-v="${v}" aria-pressed="${S[t.id] === v}">${esc(l)}</button>`).join('')}</div></div>`).join('');
  $$('#toggles button').forEach(b => b.onclick = () => { S[b.dataset.t] = b.dataset.v; markSeen(ex.id, 2); syncControls(); update(); });
  $('#sliders').innerHTML = ex.params.map(p => `<div class="slider" data-p="${p.id}">
      <div class="slab"><label for="r-${ex.id}-${p.id}">${esc(p.label)}</label><span class="bookv">${ex.bookLabel === 'Baseline' ? 'baseline' : 'book'} ${(+p.book).toFixed(p.d)}</span></div>
      <div class="srow"><input type="range" id="r-${ex.id}-${p.id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${S[p.id]}">
      <input type="number" class="numin" id="n-${ex.id}-${p.id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${(+S[p.id]).toFixed(p.d)}" aria-label="${esc(p.label)} value"></div></div>`).join('');
  ex.params.forEach(p => {
    const r = $(`#r-${ex.id}-${p.id}`), n = $(`#n-${ex.id}-${p.id}`);
    r.oninput = () => { S[p.id] = +r.value; n.value = (+r.value).toFixed(p.d); markSeen(ex.id, 2); syncControls(); update(); };
    n.onchange = () => { let v = clamp(+n.value, p.min, p.max); if (!isFinite(v)) v = p.book; S[p.id] = v; r.value = v; n.value = v.toFixed(p.d); markSeen(ex.id, 2); syncControls(); update(); };
  });
  $('#resetBook').onclick = () => { S = bookState(ex); syncControls(); update(); };
  $$('[data-preset]').forEach(b => b.onclick = () => { S = { ...bookState(ex), ...ex.presets[+b.dataset.preset].values }; markSeen(ex.id, 2); syncControls(); update(); });
  syncControls();
}
function syncControls() {
  const ex = current;
  ex.params.forEach(p => {
    const box = $(`.slider[data-p="${p.id}"]`); box.hidden = p.show ? !p.show(S) : false;
    $(`#r-${ex.id}-${p.id}`).value = S[p.id]; $(`#n-${ex.id}-${p.id}`).value = (+S[p.id]).toFixed(p.d);
    box.classList.toggle('changed', Math.abs(S[p.id] - p.book) > 1e-12);
  });
  $$('#toggles button').forEach(b => b.setAttribute('aria-pressed', S[b.dataset.t] === b.dataset.v));
}
const shortLabel = l => l.split(/,|\(| — /)[0].trim();
function renderStatus(ex) {
  const changed = ex.params.filter(p => !(p.show && !p.show(S)) && Math.abs(S[p.id] - p.book) > 1e-12);
  const tog = (ex.toggles || []).filter(t => t.id !== 'view' && S[t.id] !== t.book);
  const all = changed.map(p => shortLabel(p.label)).concat(tog.map(t => t.label));
  const el = $('#status');
  if (!all.length) { el.className = 'status at-book'; el.innerHTML = `<span class="sdot"></span><span class="stxt">You are at the ${ex.bookLabel === 'Baseline' ? 'baseline' : 'book’s'} values. Check that the results match the text, then change one assumption.</span>`; return; }
  el.className = 'status moved';
  el.innerHTML = `<span class="sdot"></span><span class="stxt">You changed ${plural(all.length, 'assumption')}: ${esc(all.join(', '))}.</span><button class="link" id="backBook">Back to the ${ex.bookLabel === 'Baseline' ? 'baseline' : 'book’s values'}</button>`;
  $('#backBook').onclick = () => { S = { ...bookState(ex), ...Object.fromEntries((ex.toggles || []).filter(t => t.id === 'view').map(t => [t.id, S[t.id]])) }; syncControls(); update(); };
}
const firstNum = s => { const m = String(s).replace(/,/g, '').match(/[-−]?\d+(\.\d+)?/); return m ? parseFloat(m[0].replace('−', '-')) : NaN; };
const decs = s => { const m = String(s).replace(/,/g, '').match(/\d+\.(\d+)/); return m ? m[1].length : 0; };
function changeCell(r) {
  if (r.b === undefined || r.v === r.b) return r.b === undefined ? '' : '<span class="same">–</span>';
  const a = firstNum(r.v), b = firstNum(r.b);
  if (!isFinite(a) || !isFinite(b)) return '<span class="chg">changed</span>';
  const d = a - b, k = Math.min(4, Math.max(decs(r.b), decs(r.v)));
  if (Math.abs(d) < Math.pow(10, -k) / 2) return '<span class="same">–</span>';
  const pc = String(r.v).trim().endsWith('%') || /%\s*\(?/.test(String(r.v).split(' ')[0]) ? ' pts' : '';
  return `<span class="chg ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toLocaleString('en-US', { minimumFractionDigits: k, maximumFractionDigits: k })}${pc}</span>`;
}
let raf = 0;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const ex = current; if (!ex || !$('#chart')) return;
    renderStatus(ex);
    let R;
    try { R = ex.compute(S); } catch (e) { $('#verdict').className = 'verdict bad'; $('#verdict').textContent = 'These values have no solution in the model. Move a slider back toward the baseline values.'; return; }
    const v = ex.verdict(S, R, B);
    $('#verdict').className = 'verdict ' + v.tone; $('#verdict').innerHTML = `<span class="pill">${{ ok: 'Holds', warn: 'Trade-off', bad: 'Fails', neutral: 'Result' }[v.tone]}</span><span>${esc(v.text)}</span>`;
    try { ex.chart($('#chart'), S, R, B); } catch (e) { $('#chart').innerHTML = '<p class="fine">The figure cannot be drawn for these values.</p>'; }
    $('#outputs').innerHTML = ex.outputs(S, R, B).map(r => `<tr class="${r.key ? 'key' : ''}"><td>${esc(r.label)}</td><td class="num">${esc(r.v)}</td><td class="num bookc">${r.b === undefined ? '' : esc(r.b)}</td><td class="num">${changeCell(r)}</td></tr>`).join('');
  });
}
// long display equations: break at top-level \qquad into stacked lines (MathJax SVG has no automatic line breaking)
function eqLines(tex) {
  if (tex.length < 95) return tex;
  const parts = []; let depth = 0, env = 0, start = 0;
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (c === '{') depth++; else if (c === '}') depth--;
    else if (tex.startsWith('\\begin{', i)) env++; else if (tex.startsWith('\\end{', i)) env--;
    else if (depth === 0 && env === 0 && tex.startsWith('\\qquad', i) && !/[a-zA-Z]/.test(tex[i + 6] || '')) { parts.push(tex.slice(start, i)); start = i + 6; i += 5; }
  }
  parts.push(tex.slice(start));
  return parts.length < 2 ? tex : '\\begin{gathered}' + parts.map(x => x.trim().replace(/,$/, '')).join('\\\\[4pt]') + '\\end{gathered}';
}
function buildChallenges(ex, pos) {
  // one prediction at a time, at the top of the example: the first one not yet answered
  const n = ex.challenges.length, st = i => ST.checks[ex.id + ':' + i];
  if (pos === undefined) { pos = ex.challenges.findIndex((_, i) => st(i) === undefined); if (pos < 0) pos = 0; }
  const done = ex.challenges.filter((_, i) => st(i) !== undefined).length, c = ex.challenges[pos], prev = st(pos);
  const cnt = $('#pfcount'); if (cnt) { cnt.textContent = `${done} of ${n} answered`; cnt.className = 'pill ' + (done === n ? 'ok' : 'warn'); }
  $('#challenges').innerHTML = `<div class="ckstep"><span>Prediction ${pos + 1} of ${n}</span><span class="ckdots">${ex.challenges.map((_, i) => `<button class="ckdot${i === pos ? ' cur' : ''}${st(i) === true ? ' ok' : st(i) === false ? ' bad' : ''}" data-ckgo="${i}" aria-label="Prediction ${i + 1}${st(i) === undefined ? '' : st(i) ? ', passed' : ', missed'}"></button>`).join('')}</span></div>
    <div class="check" id="ck-${pos}"><div class="cq"><span class="cnum">${pos + 1}</span><p>${esc(c.q)}</p>${prev === undefined ? '' : `<span class="pill ${prev ? 'ok' : 'bad'}">${prev ? 'Passed' : 'Missed'}</span>`}</div>
      <div class="opts">${c.options.map((o, k) => `<button class="opt" data-c="${pos}" data-k="${k}">${esc(o)}</button>`).join('')}</div><div class="feedback" hidden></div></div>`;
  $$('#challenges .opt').forEach(b => b.onclick = () => answerCheck(ex, +b.dataset.c, +b.dataset.k));
  $$('#challenges [data-ckgo]').forEach(b => b.onclick = () => buildChallenges(ex, +b.dataset.ckgo));
}
function answerCheck(ex, i, k) {
  const c = ex.challenges[i], key = ex.id + ':' + i, base = { ...bookState(ex), ...(c.base || {}) };
  const before = ex.compute(base), after = ex.compute({ ...base, ...c.change }), right = c.judge(before, after);
  if (ST.checks[key] === undefined) { ST.checks[key] = right === k; save(); }
  markSeen(ex.id, 2); renderTabsState();
  const box = $('#ck-' + i);
  $$('.opt', box).forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === right); b.classList.toggle('wrong', j === k && k !== right); });
  const fb = $('.feedback', box); fb.hidden = false;
  fb.innerHTML = `<p><b>${k === right ? 'Correct.' : 'Not quite. The model says: ' + esc(c.options[right]) + '.'}</b> ${esc(c.why(before, after))}</p><p class="applied">The figure now shows this case. <button class="link" data-show>Show it</button> <button class="link" data-retry>Try again</button></p>`;
  $('[data-retry]', fb).onclick = () => buildChallenges(ex, i);
  const nx = ex.challenges.findIndex((_, j) => j > i && ST.checks[ex.id + ':' + j] === undefined), nn = nx >= 0 ? nx : (i + 1 < ex.challenges.length ? i + 1 : -1);
  fb.insertAdjacentHTML('beforeend', nn >= 0 ? `<p class="cknext"><button class="btn" data-cknext>Next prediction</button></p>` : `<p class="cknext fine">${ex.challenges.every((_, j) => ST.checks[ex.id + ':' + j] !== undefined) ? 'All predictions answered. Now explore the model freely: change one assumption at a time and read the figure.' : ''}</p>`);
  const nb = $('[data-cknext]', fb); if (nb) nb.onclick = () => buildChallenges(ex, nn);
  const cnt = $('#pfcount'), done = ex.challenges.filter((_, j) => ST.checks[ex.id + ':' + j] !== undefined).length;
  if (cnt) { cnt.textContent = `${done} of ${ex.challenges.length} answered`; cnt.className = 'pill ' + (done === ex.challenges.length ? 'ok' : 'warn'); }
  $('[data-show]', fb).onclick = () => $('.figure').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  S = { ...base, ...c.change }; syncControls(); update(); renderNav();
}
function examplePager(ex) {
  const sib = EX.filter(e => e.ch === ex.ch), i = sib.indexOf(ex), prev = sib[i - 1], next = sib[i + 1];
  const nextCh = !next ? READY.find(c => c.n > ex.ch) : null;
  return `<nav class="pager">${prev ? `<a href="#${prev.id}" class="pg prev"><span>Previous example</span>${esc(prev.title)}</a>` : `<a href="#ch-${ex.ch}" class="pg prev"><span>Back to</span>Chapter ${chLab(ex.ch)} overview</a>`}${next ? `<a href="#${next.id}" class="pg next"><span>Next example</span>${esc(next.title)}</a>` : `<a href="#q-${ex.ch}" class="pg next"><span>Then</span>Chapter ${chLab(ex.ch)} questions</a>`}</nav>`;
}

// ---------- practice ----------
let qFilter = 'all';
function renderPractice(n) {
  current = null; curCh = n;
  const qs = QUESTIONS.filter(q => q.ch === n), st = chapterStats(n);
  const shown = qs.filter(q => { const a = ST.answers[q.id]; return qFilter === 'all' || (qFilter === 'open' && !a) || (qFilter === 'missed' && a && !a.first.correct); });
  $('#main').innerHTML = band(n, 'q', false) + `
    <section class="practice" ${accCh(n)}>
      <h1>Questions</h1>
      <p class="lede">${qs.some(q => q.type === 'num') ? 'The chapter’s exercises: true or false and multiple choice, then the numerical parts of its analytical problems. ' : 'True-or-false and multiple-choice questions on the chapter. '}For true or false, write your justification first, in two or three sentences, as the exam asks; then choose. For a numerical part, work it out on paper and type the number. Your first answer is the one that counts in your report.</p>
      ${LOCKED && !chapterUnlocked(n) ? `<div class="locknote"><p>The solutions for this chapter are locked. You will see whether each answer is right. When your instructor sends the code, enter it once here: it opens every solution of the chapter, including the questions you already answered.</p>${codeFormHTML()}</div>` : ''}
      <div class="statrow">
        <div class="stat"><b>${st.answered}/${st.total}</b><span>answered</span></div>
        <div class="stat"><b>${pctS(st.correct, st.answered)}</b><span>right first time</span></div>
        <div class="stat"><b>${pctS(st.tf[0], st.tf[1])}</b><span>true or false</span></div>
        <div class="stat"><b>${pctS(st.mc[0], st.mc[1])}</b><span>multiple choice</span></div>
        ${qs.some(q => q.type === 'num') ? `<div class="stat"><b>${pctS(st.num[0], st.num[1])}</b><span>numerical</span></div>` : ''}
        <div class="stat"><span class="pill ${st.level[0]}">${st.level[1]}</span><span>chapter readiness</span></div>
      </div>
      <div class="seg filt" role="group" aria-label="Filter">${[['all', 'All'], ['open', 'Not answered'], ['missed', 'Missed']].map(([v, l]) => `<button data-f="${v}" aria-pressed="${qFilter === v}">${l}</button>`).join('')}</div>
      <div id="qlist">${shown.length ? practiceList(shown) : '<p class="fine">No questions match this filter.</p>'}</div>
      ${chapterPager(n)}
    </section>`;
  $$('.filt button').forEach(b => b.onclick = () => { qFilter = b.dataset.f; renderPractice(n); });
  bindCards($('#qlist'));
  bindCodeForm(() => renderPractice(n));
  typeset($('#qlist'));
}
function practiceList(shown) {
  const ab = shown.filter(q => q.type !== 'num'), c = shown.filter(q => q.type === 'num');
  if (!c.length) return ab.map(q => qCard(q)).join('');
  const groups = []; c.forEach(q => { const g = groups[groups.length - 1]; if (g && g.pid === q.pid) g.qs.push(q); else groups.push({ pid: q.pid, qs: [q] }); });
  return (ab.length ? `<h2 class="h2s qsec">True or false and multiple choice</h2>` + ab.map(q => qCard(q)).join('') : '')
    + `<h2 class="h2s qsec">Numerical problems</h2><p class="fine">The parts of the chapter’s analytical problems whose answer is a number. Type the number with a point or a comma for decimals, without thousands separators; it is checked at the decimals shown, and one unit off in the last decimal is accepted. Parts that ask you to derive or explain stay in the chapter.</p>`
    + groups.map(g => { const n0 = g.qs[0].n.replace(/\(.*$/, ''); return `<div class="numprob"><p class="numhead">Problem ${n0}</p><div class="numsetup">${setupOf(g.qs[0])}</div>${g.qs.map(q => qCard(q)).join('')}</div>`; }).join('');
}
function numInputHTML(q, idp, val) {
  return `<div class="numrow"><label class="sr" for="${idp}">Your answer</label><input id="${idp}" class="ansin" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="Your answer" value="${val ?? ''}">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}<span class="fine">${q.dec ? `${plural(q.dec, 'decimal')}` : 'a whole number'}</span></div>`;
}
function qCard(q, retry, showCh) {
  const a = ST.answers[q.id], done = a && !retry;
  const head = `<div class="qhead"><span class="qtype ${q.type}">${TYPEL[q.type]}</span><span class="qnum">${q.type === 'num' ? (showCh ? `Chapter ${chLab(q.ch)}, problem ${q.n}` : `Part ${q.n.replace(/^.*\(|\)$/g, '')}`) : showCh ? `Chapter ${chLab(q.ch)}, item ${q.n}` : `Item ${q.n}`}${q.src === 'app' ? ' · app question' : ''}</span><a class="qreport" href="#feedback?q=${q.id}" title="Report an error in this question">Report</a>${a ? `<span class="pill ${a.first.correct ? 'ok' : 'bad'}">${a.first.correct ? 'Right first time' : 'Missed first time'}</span>` : ''}</div>${q.type === 'num' && showCh ? `<div class="numsetup">${setupOf(q)}</div>` : ''}<p class="stem">${q.stem}</p>`;
  if (!done) {
    if (q.type === 'num') return `<div class="qcard" id="qc-${q.id}" data-q="${q.id}"${showCh ? ' data-showch="1"' : ''}>${head}
      <form class="numform">${numInputHTML(q, 'n-' + q.id)}<button class="btn" type="submit">Check</button></form><p class="fine nummsg" role="status"></p></div>`;
    if (q.type === 'tf') return `<div class="qcard" id="qc-${q.id}" data-q="${q.id}"${showCh ? ' data-showch="1"' : ''}>${head}
      <label class="jl" for="j-${q.id}">Your justification</label>
      <textarea id="j-${q.id}" rows="3" placeholder="Two or three sentences: why is the statement true or false?"></textarea>
      <div class="jrow"><span class="wc" id="wc-${q.id}">${minP() ? `0 words, at least ${minP()}` : 'Optional'}</span><div class="opts"><button class="opt tfb" data-a="1"${minP() ? ' disabled' : ''}>True</button><button class="opt tfb" data-a="0"${minP() ? ' disabled' : ''}>False</button></div></div></div>`;
    return `<div class="qcard" id="qc-${q.id}" data-q="${q.id}"${showCh ? ' data-showch="1"' : ''}>${head}<div class="mcopts">${q.options.map((o, k) => `<button class="mco" data-a="${k}"><span class="ml">${letter(k)}</span><span>${o}</span></button>`).join('')}</div></div>`;
  }
  const last = a.last, sl = solOf(q);
  return `<div class="qcard answered" id="qc-${q.id}" data-q="${q.id}"${showCh ? ' data-showch="1"' : ''}>${head}
    ${q.type === 'mc' ? mcStatic(q, last.choice, last.correct, sl) : ''}
    ${verdictHTML(q, last.choice, last.correct, sl)}
    ${q.type === 'tf' && last.just ? `<div class="just"><span class="jl">Your justification</span><p>${esc(last.just)}</p></div>` : ''}
    ${solHTML(q, sl)}
    ${q.type === 'tf' && sl ? `<div class="rate"><span>Does your justification make the same argument as the solution?</span><div class="seg">${[['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']].map(([v, l]) => `<button data-rate="${v}" aria-pressed="${a.rating === v}">${l}</button>`).join('')}</div></div>` : ''}
    <p class="applied">${a.attempts > 1 ? `Attempts: ${a.attempts}. ` : ''}<button class="link" data-retry>Try again</button></p></div>`;
}
function bindCards(root) {
  $$('.qcard', root).forEach(card => {
    const q = QBY[card.dataset.q];
    const ta = $('textarea', card);
    if (ta) {
      const wc = $('.wc', card);
      ta.oninput = () => { const w = words(ta.value); wc.textContent = minP() ? `${plural(w, 'word')}, at least ${minP()}` : plural(w, 'word'); wc.classList.toggle('okw', w >= minP()); $$('.tfb', card).forEach(b => b.disabled = w < minP()); };
      $$('.tfb', card).forEach(b => b.onclick = () => commit(q, b.dataset.a === '1', ta.value.trim(), card));
    }
    $$('.mcopts:not(.static) .mco', card).forEach(b => b.onclick = () => commit(q, +b.dataset.a, '', card));
    const nf = $('.numform', card);
    if (nf) nf.onsubmit = e => { e.preventDefault(); const x = parseNum($('.ansin', card).value); if (x === null || isNaN(x)) { $('.nummsg', card).textContent = 'Type a number, for example 0.375 or -12.5 (no thousands separators).'; return; } commit(q, x, '', card); };
    $$('[data-rate]', card).forEach(b => b.onclick = () => { ST.answers[q.id].rating = b.dataset.rate; save(); $$('[data-rate]', card).forEach(x => x.setAttribute('aria-pressed', x === b)); renderNav(); });
    const r = $('[data-retry]', card); if (r) r.onclick = () => { card.outerHTML = qCard(q, true, card.dataset.showch); const nc = $('#qc-' + q.id); bindCards(nc.parentNode); typeset(nc); };
  });
}
function commit(q, choice, just, card) {
  const correct = isRight(q, choice);
  schedule(q.id, correct);
  const rec = { choice, correct, just, t: Date.now() };
  const a = ST.answers[q.id];
  if (!a) ST.answers[q.id] = { first: rec, last: rec, attempts: 1 };
  else { a.last = rec; a.attempts = (a.attempts || 1) + 1; }
  save();
  card.outerHTML = qCard(q, false, card.dataset.showch);
  const nc = $('#qc-' + q.id); bindCards(nc.parentNode); typeset(nc); renderNav();
  const cnt = $('.tabs a.active .cnt'); if (cnt) { const st = chapterStats(q.ch); cnt.textContent = `${st.answered}/${st.total}`; }
}

// ---------- mock exam ----------
let examPreset = null;
function plainHead(title, lede) { return `<header class="band plain" ${acc('hn')}><div class="band-txt"><h1 class="band-title">${title}</h1>${lede ? `<p class="band-lede">${lede}</p>` : ''}</div></header>`; }
function renderExam() {
  current = null; curCh = 0;
  if (ST.running) return renderRunning();
  const hist = ST.exams.slice().reverse(), pre = examPreset; examPreset = null;
  const isOn = n => pre ? pre.includes(n) : true;
  $('#main').innerHTML = plainHead('Mock exam', 'A random draw of true-or-false and multiple-choice items from the chapters you select. There is no feedback until you submit. If time runs out, the exam is submitted as it stands.') + `
    <section class="exam" ${acc('hn')}>
      <form id="setup" class="setup">
        <div class="setparts">${PARTS.filter(p => p.chs.some(c => c.ready)).map(p => `<fieldset class="setpart" ${acc(p.hue)}><legend><label class="chk"><input type="checkbox" class="pall" data-part="${p.k}"> <b>${partLabel(p)}. ${esc(partName(p))}</b></label></legend>
          ${p.chs.filter(c => c.ready).map(c => `<label class="chk"><input type="checkbox" name="ch" data-part="${p.k}" value="${c.n}"${isOn(c.n) ? ' checked' : ''}> <span class="cn">${chLab(c.n)}</span> ${esc(shortT(c))}</label>`).join('')}</fieldset>`).join('')}</div>
        <div class="setrow">
          <label>Questions <select id="nq">${[10, 20, 30, 50, 0].map(v => `<option value="${v}"${+ST.settings.examN === v ? ' selected' : ''}>${v || 'All available'}</option>`).join('')}</select></label>
          <label>Time limit <select id="tl">${[10, 20, 30, 45, 60, 90, 0].map(v => `<option value="${v}"${+ST.settings.examTime === v ? ' selected' : ''}>${v ? v + ' min' : 'No limit'}</option>`).join('')}</select></label>
          <label class="chk"><input type="checkbox" id="rj" checked> Require a written justification for true or false (at least ${minE()} words)</label>
        </div>
        <div class="setgo"><button class="btn big" type="submit">Start the exam</button><span class="fine" id="avail"></span></div>
      </form>
      <h2 class="h2s">Past exams</h2>
      ${hist.length ? `<div class="tblwrap"><table class="out"><thead><tr><th>Date</th><th>Chapters</th><th class="num">Score</th><th class="num">Time used</th><th></th></tr></thead><tbody>${hist.map(ex => `<tr><td>${fmtDate(ex.start)}</td><td>${ex.chapters.map(chLab).join(', ')}</td><td class="num">${ex.score}/${ex.items.length} (${pctS(ex.score, ex.items.length)})</td><td class="num">${mmss(ex.used)}${ex.limit ? ' / ' + ex.limit + ':00' : ''}</td><td><a href="#exam-${ex.id}">Review</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="fine">No exams yet.</p>'}
    </section>`;
  const sync = () => {
    $$('.pall').forEach(pa => { const boxes = $$(`input[name=ch][data-part="${pa.dataset.part}"]`), on = boxes.filter(b => b.checked).length; pa.checked = on === boxes.length; pa.indeterminate = on > 0 && on < boxes.length; });
    const chs = $$('input[name=ch]:checked').map(i => +i.value); const n = QUESTIONS.filter(q => chs.includes(q.ch)).length;
    $('#avail').textContent = chs.length ? `${n} questions available in ${plural(chs.length, 'chapter')}.` : 'Select at least one chapter.';
  };
  $$('input[name=ch]').forEach(i => i.onchange = sync);
  $$('.pall').forEach(pa => pa.onchange = () => { $$(`input[name=ch][data-part="${pa.dataset.part}"]`).forEach(b => b.checked = pa.checked); sync(); });
  sync();
  $('#setup').onsubmit = e => {
    e.preventDefault();
    const chs = $$('input[name=ch]:checked').map(i => +i.value);
    if (!chs.length) { toast('Select at least one chapter.'); return; }
    const pool = QUESTIONS.filter(q => chs.includes(q.ch));
    let n = +$('#nq').value || pool.length; n = Math.min(n, pool.length);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const byCh = chs.map(c => shuffled.filter(q => q.ch === c)); const pick = [];
    while (pick.length < n) { let added = false; for (const arr of byCh) { if (arr.length && pick.length < n) { pick.push(arr.shift()); added = true; } } if (!added) break; }
    pick.sort(() => Math.random() - 0.5);
    ST.running = { id: 'e' + Date.now(), start: Date.now(), limit: +$('#tl').value, reqJust: $('#rj').checked, chapters: chs, items: pick.map(q => ({ qid: q.id, choice: null, just: '', flag: false })), pos: 0 };
    save(); renderRunning();
  };
}
let timerH = 0;
function renderRunning() {
  const R = ST.running; const it = R.items[R.pos], q = QBY[it.qid];
  const minW = R.reqJust ? minE() : 0;
  $('#main').innerHTML = `
    <section class="exam running" ${accCh(q.ch)}>
      <div class="exbar">
        <div><p class="sub">Mock exam on ${R.chapters.length > 6 ? plural(R.chapters.length, 'chapter') : 'chapter' + (R.chapters.length > 1 ? 's ' : ' ') + R.chapters.map(chLab).join(', ')}</p><b>Question ${R.pos + 1} of ${R.items.length}</b></div>
        <div class="timer" id="timer" aria-live="off"></div>
      </div>
      <div class="navgrid" aria-label="Questions">${R.items.map((x, i) => `<button class="ng${i === R.pos ? ' cur' : ''}${x.choice !== null ? ' done' : ''}${x.flag ? ' flag' : ''}" data-i="${i}" aria-label="Question ${i + 1}">${i + 1}</button>`).join('')}</div>
      <div class="qcard" id="exq">
        <div class="qhead"><span class="qtype ${q.type}">${TYPEL[q.type]}</span><span class="qnum">Chapter ${chLab(q.ch)}</span></div>
        ${q.type === 'num' ? `<div class="numsetup">${setupOf(q)}</div>` : ''}
        <p class="stem">${q.stem}</p>
        ${q.type === 'num' ? numInputHTML(q, 'exn', it.choice === null || it.choice === undefined ? '' : it.raw ?? it.choice) + '<p class="fine" id="exnmsg"></p>' : q.type === 'tf' ? `
          ${R.reqJust ? `<label class="jl" for="exj">Your justification</label><textarea id="exj" rows="3" placeholder="Why is the statement true or false?">${esc(it.just)}</textarea><span class="wc" id="exwc"></span>` : ''}
          <div class="opts"><button class="opt sel" data-a="1" aria-pressed="${it.choice === true}">True</button><button class="opt sel" data-a="0" aria-pressed="${it.choice === false}">False</button></div>`
      : `<div class="mcopts">${q.options.map((o, k) => `<button class="mco sel" data-a="${k}" aria-pressed="${it.choice === k}"><span class="ml">${letter(k)}</span><span>${o}</span></button>`).join('')}</div>`}
      </div>
      <div class="exctl">
        <button class="btn ghostbtn" id="prev"${R.pos === 0 ? ' disabled' : ''}>Previous</button>
        <button class="btn ghostbtn" id="flag">${it.flag ? 'Remove flag' : 'Flag for review'}</button>
        <button class="btn ghostbtn" id="next"${R.pos === R.items.length - 1 ? ' disabled' : ''}>Next</button>
        <span class="grow"></span>
        <button class="btn danger" id="abandon">Abandon</button>
        <button class="btn" id="submit">Submit exam</button>
      </div>
      <p class="fine" id="exmsg"></p>
    </section>`;
  const ta = $('#exj');
  const syncTF = () => { if (!ta) return; const w = words(ta.value); $('#exwc').textContent = `${plural(w, 'word')}, at least ${minW}`; $('#exwc').classList.toggle('okw', w >= minW); $$('.sel').forEach(b => b.disabled = w < minW); };
  if (ta) { ta.oninput = () => { it.just = ta.value; save(); syncTF(); }; syncTF(); }
  const ni = $('#exn');
  if (ni) ni.oninput = () => { const x = parseNum(ni.value); it.raw = ni.value; it.choice = x === null || isNaN(x) ? null : x; save(); $('#exnmsg').textContent = x !== null && isNaN(x) ? 'Not a number yet: no thousands separators.' : ''; $$('.ng')[R.pos].classList.toggle('done', it.choice !== null); };
  $$('.sel').forEach(b => b.onclick = () => {
    it.choice = q.type === 'tf' ? b.dataset.a === '1' : +b.dataset.a; if (ta) it.just = ta.value;
    save(); $$('.sel').forEach(x => x.setAttribute('aria-pressed', x === b)); $$('.ng')[R.pos].classList.add('done');
  });
  $$('.ng').forEach(b => b.onclick = () => { R.pos = +b.dataset.i; save(); renderRunning(); });
  $('#prev').onclick = () => { R.pos--; save(); renderRunning(); };
  $('#next').onclick = () => { R.pos++; save(); renderRunning(); };
  $('#flag').onclick = () => { it.flag = !it.flag; save(); renderRunning(); };
  $('#abandon').onclick = e => twoStep(e.target, 'Abandon', () => { ST.running = null; save(); clearInterval(timerH); renderExam(); });
  $('#submit').onclick = e => {
    const un = R.items.filter(x => x.choice === null).length;
    if (un && !e.target.dataset.armed) $('#exmsg').textContent = `${un} question${un === 1 ? ' is' : 's are'} unanswered and will count as wrong.`;
    twoStep(e.target, 'Submit exam', finishExam);
  };
  clearInterval(timerH);
  const tick = () => {
    const used = (Date.now() - R.start) / 1000;
    if (R.limit) { const left = R.limit * 60 - used; $('#timer').textContent = mmss(left) + ' left'; $('#timer').classList.toggle('low', left < 120); if (left <= 0) { clearInterval(timerH); finishExam(true); } }
    else $('#timer').textContent = mmss(used) + ' elapsed';
  };
  tick(); timerH = setInterval(tick, 1000);
  typeset($('#exq'));
}
function finishExam(timeout) {
  clearInterval(timerH);
  const R = ST.running; if (!R) return;
  const used = Math.min((Date.now() - R.start) / 1000, R.limit ? R.limit * 60 : Infinity);
  const items = R.items.map(x => { const q = QBY[x.qid]; return { qid: x.qid, choice: x.choice, just: x.just, flag: x.flag, correct: isRight(q, x.choice) }; });
  items.forEach(it => { if (it.choice !== null && it.choice !== undefined) schedule(it.qid, it.correct); });
  const rec = { id: R.id, start: R.start, used: Math.round(used), limit: R.limit, chapters: R.chapters, reqJust: R.reqJust, items, score: items.filter(x => x.correct).length, timeout: !!timeout };
  ST.exams.push(rec); ST.running = null; save();
  location.hash = 'exam-' + rec.id;
  if (timeout) setTimeout(() => toast('Time is up. Your exam was submitted.'), 300);
}
function renderExamReview(id) {
  current = null; curCh = 0;
  const ex = ST.exams.find(e => e.id === id); if (!ex) { location.hash = 'exam'; return; }
  const by = {}; ex.items.forEach(it => { const q = QBY[it.qid]; if (!q) return; by[q.ch] = by[q.ch] || [0, 0]; by[q.ch][1]++; if (it.correct) by[q.ch][0]++; });
  const items = ex.items.filter(i => QBY[i.qid]);
  const tf = items.filter(i => QBY[i.qid].type === 'tf'), mc = items.filter(i => QBY[i.qid].type === 'mc'), nm = items.filter(i => QBY[i.qid].type === 'num');
  const pc = ex.score / ex.items.length;
  $('#main').innerHTML = plainHead('Exam results', `Taken ${fmtDate(ex.start)}${ex.timeout ? ', submitted when time ran out' : ''}.`) + `
    <section class="exam review" ${acc('hn')}>
      <div class="statrow">
        <div class="stat"><b>${ex.score}/${ex.items.length}</b><span>score</span></div>
        <div class="stat"><b>${Math.round(100 * pc)}%</b><span><span class="pill ${pc >= 0.8 ? 'ok' : pc >= 0.6 ? 'warn' : 'bad'}">${pc >= 0.8 ? 'Strong' : pc >= 0.6 ? 'Adequate' : 'Weak'}</span></span></div>
        <div class="stat"><b>${pctS(tf.filter(i => i.correct).length, tf.length)}</b><span>true or false</span></div>
        <div class="stat"><b>${pctS(mc.filter(i => i.correct).length, mc.length)}</b><span>multiple choice</span></div>
        ${nm.length ? `<div class="stat"><b>${pctS(nm.filter(i => i.correct).length, nm.length)}</b><span>numerical</span></div>` : ''}
        <div class="stat"><b>${mmss(ex.used)}</b><span>time used${ex.limit ? ' of ' + ex.limit + ' min' : ''}</span></div>
      </div>
      <div class="tblwrap"><table class="out"><thead><tr><th>Chapter</th><th class="num">Correct</th><th class="num">Share</th></tr></thead><tbody>${Object.keys(by).sort((a, b) => a - b).map(k => `<tr><td><span class="cn" ${accCh(+k)}>${chLab(+k)}</span> ${esc(chTitle(+k))}</td><td class="num">${by[k][0]}/${by[k][1]}</td><td class="num">${pctS(by[k][0], by[k][1])}</td></tr>`).join('')}</tbody></table></div>
      <h2 class="h2s">Question by question</h2>
      <p class="fine">For each true-or-false item, compare your justification with the solution and rate it. The ratings feed your report.</p>
      <div id="revlist">${ex.items.map((it, i) => { const q = QBY[it.qid]; if (!q) return ''; return `<div class="qcard answered" data-i="${i}" ${accCh(q.ch)}>
        <div class="qhead"><span class="qtype ${q.type}">${i + 1}. ${TYPEL[q.type]}</span><span class="qnum">Chapter ${chLab(q.ch)}, ${q.type === 'num' ? 'problem' : 'item'} ${q.n}</span>${it.flag ? '<span class="pill warn">Flagged</span>' : ''}</div>
        ${q.type === 'num' ? `<div class="numsetup">${setupOf(q)}</div>` : ''}
        <p class="stem">${q.stem}</p>
        ${q.type === 'mc' ? mcStatic(q, it.choice, it.correct, solOf(q)) : ''}
        ${verdictHTML(q, it.choice, it.correct, solOf(q))}
        ${q.type === 'tf' && it.just ? `<div class="just"><span class="jl">Your justification</span><p>${esc(it.just)}</p></div>` : ''}
        ${solHTML(q, solOf(q))}
        ${q.type === 'tf' && it.just && solOf(q) ? `<div class="rate"><span>Does your justification make the same argument as the solution?</span><div class="seg">${[['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']].map(([v, l]) => `<button data-rate="${v}" aria-pressed="${it.rating === v}">${l}</button>`).join('')}</div></div>` : ''}
      </div>`; }).join('')}</div>
      <p class="qbtns"><a class="btn" href="#exam">New exam</a> <a class="btn ghostbtn" href="#report">See my report</a></p>
    </section>`;
  $$('#revlist .qcard').forEach(card => $$('[data-rate]', card).forEach(b => b.onclick = () => { ex.items[+card.dataset.i].rating = b.dataset.rate; save(); $$('[data-rate]', card).forEach(x => x.setAttribute('aria-pressed', x === b)); }));
  typeset($('#main'));
}

// ---------- report ----------
function renderReport() {
  current = null; curCh = 0;
  const totQ = QUESTIONS.length, ans = Object.keys(ST.answers).length;
  const firstRight = Object.values(ST.answers).filter(a => a.first.correct).length;
  const checksTot = EX.reduce((a, e) => a + e.challenges.length, 0), checksOk = Object.values(ST.checks).filter(Boolean).length;
  const explored = EX.filter(e => ST.seen[e.id] === 2).length;
  const last = ST.exams[ST.exams.length - 1], best = ST.exams.reduce((m, e) => Math.max(m, e.score / e.items.length), 0);
  let rated = 0, pts = 0; READY.forEach(c => { const st = chapterStats(c.n); rated += st.rated; pts += st.ratingPts; });
  const lastExamResult = {}; ST.exams.forEach(ex => ex.items.forEach(it => lastExamResult[it.qid] = it));
  const revisit = QUESTIONS.filter(q => { const a = ST.answers[q.id], e = lastExamResult[q.id]; return (a && !a.first.correct && !(a.last && a.last.correct && e && e.correct)) || (e && !e.correct); });
  const range = READY.length ? `chapters ${READY[0].n}–${READY[READY.length - 1].n}` : '';
  $('#main').innerHTML = `
    <section class="report" id="report" ${acc('hn')}>
      <div class="rhead">
        <div><p class="rsub">Health Economics (Bhattacharya, Hyde and Tu), ${range}</p><h1>Study report</h1>
        <p class="who"><label for="sname">Student</label> <input id="sname" value="${esc(ST.name)}" placeholder="Your name" autocomplete="name"><span class="printname">${esc(ST.name || '-')}</span>, ${fmtDate(Date.now())}</p></div>
        <div class="ractions noprint"><button class="btn" id="saveRep">Save report as file</button><button class="btn ghostbtn" id="printRep">Print or save as PDF</button></div>
      </div>
      <div class="statrow">
        <div class="stat"><b>${ans}/${totQ}</b><span>questions practiced</span></div>
        <div class="stat"><b>${pctS(firstRight, ans)}</b><span>right first time</span></div>
        <div class="stat"><b>${rated ? Math.round(100 * pts / rated) + '%' : '–'}</b><span>justifications matching the solution (self-rated)</span></div>
        <div class="stat"><b>${explored}/${EX.length}</b><span>examples explored</span></div>
        <div class="stat"><b>${checksOk}/${checksTot}</b><span>predictions right first time</span></div>
        <div class="stat"><b>${ST.exams.length ? Math.round(100 * last.score / last.items.length) + '%' : '–'}</b><span>last mock exam${ST.exams.length > 1 ? `, best ${Math.round(100 * best)}%` : ''}</span></div>
      </div>
      <h2 class="h2s">Readiness by chapter</h2>
      <div class="tblwrap"><table class="out rtable"><thead><tr><th>Chapter</th><th class="num">Practiced</th><th class="num">T/F</th><th class="num">MC</th><th class="num">Num.</th><th class="num">Justif.</th><th class="num">Exam items</th><th class="num">Predictions</th><th>Readiness</th></tr></thead>
      <tbody>${PARTS.filter(p => p.chs.some(c => c.ready)).map(p => `<tr class="partrow" ${acc(p.hue)}><td colspan="9">${partLabel(p)}. ${esc(partName(p))}</td></tr>` + p.chs.filter(c => c.ready).map(c => { const st = chapterStats(c.n); return `<tr><td><span class="cn" ${acc(p.hue)}>${chLab(c.n)}</span> ${esc(shortT(c))}</td><td class="num">${st.answered}/${st.total}</td><td class="num">${pctS(st.tf[0], st.tf[1])}</td><td class="num">${pctS(st.mc[0], st.mc[1])}</td><td class="num">${pctS(st.num[0], st.num[1])}</td><td class="num">${st.rated ? Math.round(100 * st.ratingPts / st.rated) + '%' : '–'}</td><td class="num">${st.examSeen ? st.examCorrect + '/' + st.examSeen : '–'}</td><td class="num">${st.checksTot ? st.checks + '/' + st.checksTot : '–'}</td><td><span class="pill ${st.level[0]}">${st.level[1]}</span></td></tr>`; }).join('')).join('')}</tbody></table></div>
      <details class="method"><summary>How readiness is computed</summary><p>For each chapter the report pools two kinds of evidence: your first answer to each practice question and every mock-exam answer. Readiness is the share answered correctly. It reads <b>Ready</b> at 80 percent or more, <b>Review</b> from 60 to 79 percent, and <b>Not yet</b> below 60 percent. If you have seen fewer than half of the chapter’s questions, it reads <b>Not enough evidence</b>. Justification ratings are your own comparison with the solutions, and the Predictions column counts your first answers to the predict-first questions on the chapter’s examples. Both are reported but do not enter readiness: a prediction tests intuition about a model, and a wrong one is part of learning it.</p></details>
      <h2 class="h2s">What to revisit</h2>
      ${revisit.length ? `<p class="fine">${plural(revisit.length, 'item')} you missed and have not since answered correctly.</p>${READY.map(c => { const r = revisit.filter(q => q.ch === c.n); return r.length ? `<h3 class="h3s" ${accCh(c.n)}><span class="cn">${chLab(c.n)}</span> ${esc(c.t)}</h3>${r.map(q => `<div class="revitem"><p class="stem"><span class="qnum">${q.type === 'num' ? `Problem ${q.n}, numerical` : `Item ${q.n}, ${q.type === 'tf' ? 'true or false' : 'multiple choice'}`}.</span> ${q.stem}</p>${solOf(q) ? `<p class="ans"><b>Answer: ${ansText(q, solOf(q).a)}.</b> ${solOf(q).e}</p>` : `<p class="ans locked">The solution for this chapter is still locked.</p>`}</div>`).join('')}` : ''; }).join('')}` : '<p class="fine">Nothing to revisit yet.</p>'}
      <h2 class="h2s">Mock exams</h2>
      ${ST.exams.length ? `<div class="tblwrap"><table class="out"><thead><tr><th>Date</th><th>Chapters</th><th class="num">Score</th><th class="num">Time used</th></tr></thead><tbody>${ST.exams.slice().reverse().map(ex => `<tr><td>${fmtDate(ex.start)}</td><td>${ex.chapters.map(chLab).join(', ')}</td><td class="num">${ex.score}/${ex.items.length} (${pctS(ex.score, ex.items.length)})</td><td class="num">${mmss(ex.used)}${ex.limit ? ' / ' + ex.limit + ':00' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="fine">No mock exams yet.</p>'}
      <p class="fine noprint">To save or move your progress, or to erase it, open <a href="#settings">Settings</a>.</p>
    </section>`;
  $('#sname').oninput = e => { ST.name = e.target.value; $('.printname').textContent = ST.name || '-'; save(); renderNav(); };
  $('#printRep').onclick = () => window.print();
  $('#saveRep').onclick = saveReportFile;
  typeset($('#report'));
}
async function saveReportFile() {
  await typeset($('#report'));
  const clone = $('#report').cloneNode(true);
  $$('.noprint', clone).forEach(n => n.remove());
  const pn = $('.printname', clone); if (pn) pn.style.display = 'inline';
  const inp = $('#sname', clone); if (inp) inp.remove(); const lab = $('label[for=sname]', clone); if (lab) lab.remove();
  $$('details', clone).forEach(d => d.setAttribute('open', ''));
  const css = $('#main-css').textContent, fonts = $('#fonts').textContent;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Study report, ${esc(ST.name || 'student')}, ${new Date().toISOString().slice(0, 10)}</title><style>${fonts}</style><style>${css} body{padding:24px} .report{max-width:960px;margin:0 auto}</style></head><body>${clone.outerHTML}</body></html>`;
  download(`bht-report-${(ST.name || 'student').replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`, html, 'text/html');
}

// ---------- routing ----------
function go() {
  const h = decodeURIComponent(location.hash.replace('#', ''));
  if (ST.running && h !== 'exam') { location.hash = 'exam'; return; }
  route = h; clearInterval(timerH);
  const main = $('#main'); main.removeAttribute('style');
  if (EX.some(e => e.id === h)) openExample(h);
  else if (/^ch-\d+$/.test(h) && READY.some(c => c.n === +h.slice(3))) renderChapter(+h.slice(3));
  else if (/^q-\d+$/.test(h) && READY.some(c => c.n === +h.slice(2))) { qFilter = 'all'; renderPractice(+h.slice(2)); }
  else if (h === 'exam') renderExam();
  else if (h.startsWith('exam-')) renderExamReview(h.slice(5));
  else if (h === 'report') renderReport();
  else if (h === 'review') renderReview();
  else if (h === 'settings') renderSettings();
  else if (h === 'feedback' || h.startsWith('feedback?')) { route = 'feedback'; renderFeedback(); }
  else { route = ''; renderHome(); }
  renderNav();
  const a = $('.rch.active'); if (a && a.scrollIntoViewIfNeeded) a.scrollIntoViewIfNeeded(false);
  const tab = $('.tabs a.active'); if (tab) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);
document.addEventListener('DOMContentLoaded', () => {
  $('#mobsel').onchange = e => { const v = e.target.value; if (!v) return; if (v === 'home') { history.replaceState(null, '', location.pathname); go(); } else location.hash = v; };
  applySettings(); save(); go();
  restoreUnlocked().then(n => { if (n) go(); });
  registerSW();
});
