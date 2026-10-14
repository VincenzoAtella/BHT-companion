#!/usr/bin/env python3
"""Build the HE Book Study Companion: one self-contained HTML file that runs
offline in any browser.

Steps
  1. Extract the true-or-false and multiple-choice questions and the chapter
     list from the LaTeX sources (extract_questions.py).
  2. Resolve the @label references in src/examples.js to the numbers of the
     compiled book (Section, Eq., Figure, Table).
  3. Check that the numbers each example reproduces still appear in its
     chapter (the "anchors"). A missing anchor means the chapter changed and
     the example may need updating.
  4. Run every example model at the book values with Node (src/check_examples.js).
  5. Lock the book's solutions (see lock.py) unless --open is given, and
     write the unlock codes to build/unlock-codes.md for the instructor.
  6. Inline MathJax and the fonts and write two outputs from the same page:
     dist/HE-Book-Study-Companion.html  one file, to send by mail or Teams
     dist/pwa/                           installable web app, for a web address

Usage (from the repository root):
  cd companion && npm install      # once, fetches MathJax and the fonts
  python3 companion/build.py       # --strict: fail on missing anchors
  python3 companion/build.py --check-only   # steps 1-4 only, writes nothing
                                   # --open:   solutions always visible
"""
import base64, datetime, hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'src')
NM = os.path.join(HERE, 'node_modules')
OUT = os.path.join(HERE, 'dist', 'BHT-Study-Companion.html')
strict = '--strict' in sys.argv
open_mode = '--open' in sys.argv
PWA = os.path.join(HERE, 'dist', 'pwa')

sys.path.insert(0, HERE)
import content as xq  # noqa: E402
import lock  # noqa: E402

def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

# 1. questions and chapters --------------------------------------------------
Q = xq.questions()
C = xq.chapters()
print(f'Questions: {len(Q)} ({sum(q["type"] == "tf" for q in Q)} true or false) '
      f'from chapters {", ".join(str(c["n"]) for c in C if c["ready"])}')
if xq.missing:
    print('  Unresolved in questions:', ', '.join(sorted(xq.missing)))

# 2. label references in the examples ---------------------------------------
examples = read('examples.js')
# examples of the later chapters, one file per chapter (src/examples/chNN.js), in chapter order
# Each file is named after the chapter FILE (chapters/chNN_*.tex) and writes ch: NN and anchors [NN, ...]
# with that file number; here they are mapped to the chapter's current number in the book, and files of
# chapters that main.tex does not include are skipped.
EXDIR = os.path.join(SRC, 'examples')
FILENUM = {n: n for n in xq.CHNUM.values()}
skipped_ex = []
if os.path.isdir(EXDIR):
    for fn in sorted(os.listdir(EXDIR)):
        if not fn.endswith('.js'):
            continue
        num = int(re.match(r'ch(\d+)', fn).group(1))
        if num not in FILENUM:
            skipped_ex.append(fn)
            continue
        js = read(os.path.join('examples', fn))
        new = FILENUM[num]
        if new != num:
            js = re.sub(r'\bch: %d\b' % num, 'ch: %d' % new, js)
            js = re.sub(r'\[%d, \'' % num, "[%d, '" % new, js)
        examples += '\n' + js
if skipped_ex:
    print('Examples skipped (chapter not in the syllabus): ' + ', '.join(skipped_ex))
unknown = set()
def resolve(m):
    lab = m.group(1)
    if lab not in xq.labels:
        unknown.add(lab)
        return '?'
    return xq.labels[lab]
examples = re.sub(r'@([a-z0-9]+:[A-Za-z0-9_:\-]+)', resolve, examples)
if unknown:
    sys.exit('Labels used in src/examples.js not found in the chapters: ' + ', '.join(sorted(unknown)))

# 3. anchors ------------------------------------------------------------------
chapter_text = {}
for f in xq.files:
    if os.path.exists(f):
        chapter_text[xq.CHNUM[f]] = re.sub(r'\s+', ' ', open(f, encoding='utf-8').read())
if not chapter_text:
    print('Anchors: not checked (set BHT_TEXT to the folder with the chapter text extracts).')
stale = []
for m in re.finditer(r"\n  id: '([^']+)'[\s\S]*?(?=\nEX\.push|\Z)", examples):
    block = m.group(0)
    a = re.search(r'anchors: (\[.*\]),\n', block)
    if not a:
        continue
    for ch, txt in re.findall(r"\[(\d+), '((?:[^'\\]|\\.)*)'\]", a.group(1)):
        txt = txt.replace('\\\\', '\\')
        if int(ch) in chapter_text and re.sub(r'\s+', ' ', txt) not in chapter_text[int(ch)]:
            stale.append(f'{m.group(1)}: "{txt}" no longer appears in chapter {ch}')
if stale:
    print('Examples whose anchors are not in the textbook text:')
    for s in stale:
        print(('::warning::' if os.environ.get('GITHUB_ACTIONS') else '  ') + s)
    if strict:
        sys.exit(1)
else:
    print('Anchors: every example still matches the numbers in its chapter.')

chapters_js = 'const CHAPTERS = ' + json.dumps(C, ensure_ascii=False) + ';\n'
model_js = read('engine.js') + '\n' + chapters_js + examples

# 4. model check with Node ----------------------------------------------------
check_only = '--check-only' in sys.argv
os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
if check_only:   # a private bundle, so several checks can run at once
    import tempfile
    bundle = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False).name
else:
    bundle = os.path.join(HERE, 'build', 'models.js')
with open(bundle, 'w', encoding='utf-8') as f:
    f.write(model_js)
if shutil.which('node'):
    r = subprocess.run(['node', os.path.join(SRC, 'check_examples.js'), bundle])
    if r.returncode:
        sys.exit('The example models failed the check; the app was not built.')
else:
    print('Node not found: skipped the check of the example models.')
if check_only:
    sys.exit(0)

# 5. assemble -------------------------------------------------------------------
if not os.path.isdir(NM):
    sys.exit('Missing companion/node_modules. Run "npm install" in the companion folder first.')
FS = os.path.join(NM, '@fontsource')
LAT = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,'
       'U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')
GRK = 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF'
def face(fam, path, w, rng):
    b = base64.b64encode(open(os.path.join(FS, path), 'rb').read()).decode()
    return (f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;"
            f"src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng};}}")
faces = []
for w in (400, 600, 700):
    faces.append(face('Source Serif 4', f'source-serif-4/files/source-serif-4-latin-{w}-normal.woff2', w, LAT))
    faces.append(face('Source Serif 4', f'source-serif-4/files/source-serif-4-greek-{w}-normal.woff2', w, GRK))
for w in (400, 500, 600):
    faces.append(face('IBM Plex Sans', f'ibm-plex-sans/files/ibm-plex-sans-latin-{w}-normal.woff2', w, LAT))
    faces.append(face('IBM Plex Sans', f'ibm-plex-sans/files/ibm-plex-sans-greek-{w}-normal.woff2', w, GRK))

mathjax = open(os.path.join(NM, 'mathjax', 'es5', 'tex-svg.js'), encoding='utf-8').read()
css = read('style.css')
# solutions: locked unless --open
if open_mode:
    Qpub, lock_data = Q, {'enabled': False}
    print('Solutions: always visible (--open).')
else:
    # The secret comes from COMPANION_UNLOCK_SECRET or companion/.unlock-secret. A new secret means new
    # unlock codes, so it is created only on request (--new-secret), never by accident in a fresh clone.
    master, where = lock.master_secret(create='--new-secret' in sys.argv)
    if not master:
        sys.exit('No unlock secret: set COMPANION_UNLOCK_SECRET (or put it in companion/.unlock-secret) to keep the '
                 'codes already given to students, or run with --new-secret to start a new set of codes.')
    Qpub, lock_data, codes, all_code = lock.lock(Q, master)
    if where:
        print(f'Solutions: locked by chapter (secret from {where.replace(ROOT + os.sep, "")}).')
        titles = {c['n']: c['t'] for c in C}
        lines = ['# Study Companion: unlock codes', '',
                 'Send a code when you want the solutions of a chapter to become visible.',
                 'Every build made with the same secret accepts these codes. Keep this file private.', '',
                 f'**All chapters:** `{all_code}`', '', '| Chapter | Title | Code |', '|---|---|---|']
        for key, (n, c) in sorted(codes.items(), key=lambda kv: kv[1][0]):
            lines.append(f"| {xq.LAB.get(n, n)} | {titles.get(n, key)} | `{c}` |")
        os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
        with open(os.path.join(HERE, 'build', 'unlock-codes.md'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
        print('Unlock codes written to companion/build/unlock-codes.md (not tracked by git).')
SETUPS = {}   # numerical parts share the setting of their problem: stored once
for q in Qpub:
    if q.get('type') == 'num':
        pid = q['id'].rsplit('-c', 1)[0] + '-c' + re.match(r'\d+', q['n']).group(0)
        SETUPS[pid] = q.pop('setup'); q['pid'] = pid
build_info = {'date': datetime.date.today().strftime('%d %B %Y').lstrip('0')}
questions_js = ('const QUESTIONS = ' + json.dumps(Qpub, ensure_ascii=False) + ';\n'
                + 'const LOCK = ' + json.dumps(lock_data) + ';\n'
                + 'const SETUPS = ' + json.dumps(SETUPS, ensure_ascii=False) + ';\n'
                + 'const BUILD = ' + json.dumps(build_info) + ';\n')
app_js = questions_js + model_js + '\n' + read('features.js') + '\n' + read('app.js')
for name, text in (('MathJax', mathjax), ('app', app_js)):
    if '</script' in text.lower():
        sys.exit(f'The {name} script contains "</script" and cannot be inlined.')

body = '''<div class="mobbar"><div class="row"><a href="#" class="brand" style="margin:0"><b>Health Economics Companion</b></a></div><select id="mobsel" aria-label="Go to"></select></div>
<div class="shell">
  <nav class="rail" aria-label="Sections, chapters and examples">
    <a href="#" class="brand"><span>Health Economics · BHT</span><b>Study Companion</b></a>
    <p class="who-rail" id="namebox"></p>
    <div class="toplinks"><a class="toplink" href="#">Map of the course</a><a class="toplink" href="#review">Review <span class="badge" id="revcount" hidden></span></a><a class="toplink" href="#exam">Mock exam</a><a class="toplink" href="#report">My report</a><a class="toplink" href="#settings">Settings</a><a class="toplink" href="#feedback">Feedback</a></div>
    <div id="nav"></div>
  </nav>
  <main id="main"></main>
</div>
<div id="toast" role="status" hidden></div>'''

mj_config = ("window.MathJax = { tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] }, "
             "svg: { fontCache: 'local' }, options: { enableMenu: false }, startup: { typeset: false } };")
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Health Economics Study Companion (BHT)</title>
<!--PWA-->
<style id="fonts">{''.join(faces)}</style>
<style id="main-css">{css}</style>
<script>{mj_config}</script>
<script>{mathjax}</script>
</head>
<body>
{body}
<script>
{app_js}
</script>
</body>
</html>
'''
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html.replace('<!--PWA-->\n', ''))
print(f'Wrote {os.path.relpath(OUT, ROOT)} ({len(html.encode()) / 1e6:.1f} MB)')

# installable web app: same page plus manifest, service worker and icons
pwa_tags = ('<link rel="manifest" href="manifest.webmanifest">\n'
            '<meta name="theme-color" content="#1F4E79">\n'
            '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<meta name="apple-mobile-web-app-title" content="HE Course">\n')
page = html.replace('<!--PWA-->\n', pwa_tags)
version = hashlib.sha256(page.encode()).hexdigest()[:12]
shutil.rmtree(PWA, ignore_errors=True)
shutil.copytree(os.path.join(SRC, 'icons'), os.path.join(PWA, 'icons'))
with open(os.path.join(PWA, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(page)
shutil.copy(os.path.join(SRC, 'manifest.webmanifest'), os.path.join(PWA, 'manifest.webmanifest'))
with open(os.path.join(PWA, 'sw.js'), 'w', encoding='utf-8') as f:
    f.write(read('sw.js').replace('__VERSION__', version))
print(f'Wrote {os.path.relpath(PWA, ROOT)}/ (installable web app, version {version}); publish the folder on any https address.')
