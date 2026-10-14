"""Course content for the BHT Study Companion.

The app follows the chapters of Bhattacharya, Hyde and Tu, Health Economics (Palgrave Macmillan, 2014)
that are on the course syllabus. All questions and examples are original material written for the course;
the app quotes no text of the textbook and refers to it by chapter and section.

Same interface as extract_questions.py in he-book-tools: questions(), chapters(), labels, files, CHNUM,
missing, conv(), bank(). Questions come only from questions/<key>.txt (format in questions/README.md).
A chapter is "ready" (shown with exercises) when its question bank exists.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
BANK = os.path.join(HERE, 'questions')

PARTS = ['Demand for health and health care', 'Supply of health care', 'Information economics',
         'Economics of health innovation', 'Health policy', 'Public health economics',
         'Behavioral health economics', 'Biology and health economics: two chapters written for the course, on what biology adds to the Grossman model and to the socioeconomic gradient']
# (BHT chapter number, key, title, BHT part number or 0): syllabus chapters only
SYLLABUS = [
    (1, 'why', 'Why health economics?', 0),
    (2, 'demand', 'Demand for health care', 1),
    (3, 'grossman', 'Demand for health: the Grossman model', 1),
    (4, 'disparities', 'Socioeconomic disparities in health', 1),
    (7, 'insurance', 'Demand for insurance', 3),
    (8, 'lemons', 'Adverse selection: Akerlof’s market for lemons', 3),
    (9, 'rothschild', 'Adverse selection: the Rothschild–Stiglitz model', 3),
    (10, 'realmarkets', 'Adverse selection in real markets', 3),
    (11, 'moralhazard', 'Moral hazard', 3),
    (15, 'conundrum', 'The health policy conundrum', 5),
    (16, 'beveridge', 'The Beveridge model: nationalized health care', 5),
    (17, 'bismarck', 'The Bismarck model: social health insurance', 5),
    (18, 'american', 'The American model', 5),
    (20, 'externalities', 'The economics of health externalities', 6),
    (22, 'obesity', 'Obesity', 6),
    # course addendum (the instructor's own chapters), shown as A1 and A2
    (23, 'biology', 'How health evolves: biology inside the Grossman model', 8),
    (24, 'sesgradient', 'Why the socioeconomic gradient persists', 8),
]
LAB = {23: 'A1', 24: 'A2'}   # display label of chapters that are not BHT chapters
KEY = {n: k for n, k, _, _ in SYLLABUS}
# Anchors of the examples are checked against local text extracts of the chapters, when available
# (BHT_TEXT=<folder with bhtNN.txt>); the extracts are not part of the repository.
TEXTDIR = os.environ.get('BHT_TEXT', '')
files = [os.path.join(TEXTDIR, f'bht{n:02d}.txt') for n, _, _, _ in SYLLABUS]
CHNUM = {f: n for f, (n, _, _, _) in zip(files, SYLLABUS)}
labels = {}   # examples cite BHT sections in plain text, no @labels
missing = set()

def conv(t):
    """Minimal LaTeX-to-HTML for question text: $...$ math, \\emph, \\textbf, dashes, quotes, %, euro."""
    t = t.strip()
    maths = []
    t = t.replace('\\$', '@@DOLLAR@@')
    def mk(m):
        maths.append(m.group(1)); return f'@@M{len(maths) - 1}@@'
    t = re.sub(r'\$(.+?)\$', mk, t, flags=re.S)
    t = t.replace('{,}', ',').replace('~', ' ').replace('---', '–').replace('--', '–')
    t = t.replace("``", '“').replace("''", '”').replace('`', '‘')
    t = re.sub(r'\\(emph|textit)\{([^{}]*)\}', r'<em>\2</em>', t)
    t = re.sub(r'\\textbf\{([^{}]*)\}', r'<b>\1</b>', t)
    t = t.replace('\\%', '%').replace('\\&', '&amp;').replace('\\euro{}', '€').replace('\\euro', '€')
    t = re.sub(r'\s+', ' ', t).strip()
    left = re.findall(r'\\[a-zA-Z]+', t)
    if left: missing.add('cmd:' + ','.join(set(left)))
    t = t.replace('@@DOLLAR@@', '$')
    for i, mm in enumerate(maths):
        t = t.replace(f'@@M{i}@@', '\\(' + re.sub(r'\s+', ' ', mm.strip()).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') + '\\)')
    return t

def chapters():
    return [dict(n=n, lab=LAB.get(n, str(n)), t=t, ready=os.path.exists(os.path.join(BANK, k + '.txt')), part=p,
                 partTitle=PARTS[p - 1] if p else '') for n, k, t, p in SYLLABUS]

def bank(key, ch, n0):
    f = os.path.join(BANK, key + '.txt')
    if not os.path.exists(f): return []
    txt = re.sub(r'(?m)^#.*\n?', '', open(f, encoding='utf-8').read())
    out = []
    for k, blk in enumerate([b for b in re.split(r'\n\s*\n', txt) if b.strip()], 1):
        fields = dict((m.group(1), m.group(2).strip()) for m in re.finditer(r'(?ms)^(TF|MC|ANSWER|WHY):\s*(.*?)(?=^(?:TF|MC|ANSWER|WHY):|^\([a-e]\)|\Z)', blk))
        opts = re.findall(r'(?ms)^\(([a-e])\)\s*(.*?)(?=^\([a-e]\)|^ANSWER:|\Z)', blk)
        where = f'{os.path.basename(f)}, block {k}'
        if 'TF' in fields:
            ans = fields.get('ANSWER', '').rstrip('.')
            if ans not in ('True', 'False'): raise SystemExit(f'{where}: ANSWER must be True or False')
            q = dict(type='tf', stem=conv(fields['TF']), answer=ans == 'True')
        elif 'MC' in fields:
            ans = fields.get('ANSWER', '').strip('(). ')
            letters = [l for l, _ in opts]
            if len(opts) < 3 or letters != list('abcde'[:len(opts)]) or ans not in letters:
                raise SystemExit(f'{where}: MC needs options (a), (b), (c)... and ANSWER: one of them')
            q = dict(type='mc', stem=conv(fields['MC']), options=[conv(o) for _, o in opts], answer=letters.index(ans))
        else:
            raise SystemExit(f'{where}: block must start with TF: or MC:')
        if not fields.get('WHY'): raise SystemExit(f'{where}: WHY: explanation missing')
        q.update(id=f'{key}-{k}', key=key, ch=ch, n=n0 + k, expl=conv(fields['WHY']))
        out.append(q)
    return out

NUM = os.path.join(HERE, 'numeric')
def _numfmt(x, dec):
    v = round(float(x), dec)
    if v == 0: v = 0.0
    return f'{v:.{dec}f}'
def numeric(key, ch):
    """Numerical problems in numeric/<key>.txt (format in numeric/README.md): one question per numerical part,
    id <key>-c<problem><part>."""
    f = os.path.join(NUM, key + '.txt')
    if not os.path.exists(f): return []
    txt = re.sub(r'(?m)^#.*\n?', '', open(f, encoding='utf-8').read())
    out = []
    for blk in [b for b in re.split(r'(?m)^(?=PROBLEM:)', txt) if b.strip()]:
        pm = re.match(r'PROBLEM:\s*(\S+)\s*\n', blk)
        if not pm: raise SystemExit(f'{os.path.basename(f)}: block without PROBLEM:\n{blk[:120]}')
        pid = pm.group(1); where = f'{os.path.basename(f)}, problem {pid}'
        tm = re.search(r'(?ms)^TEXT:\s*(.*?)(?=^PART:)', blk)
        if not tm: raise SystemExit(f'{where}: TEXT: then at least one PART: needed')
        text = conv(tm.group(1))
        for pb in re.split(r'(?m)^(?=PART:)', blk)[1:]:
            F = dict((m.group(1), m.group(2).strip()) for m in re.finditer(r'(?ms)^(PART|ASK|ANSWER|DEC|UNIT|SOLUTION):\s*(.*?)(?=^(?:PART|ASK|ANSWER|DEC|UNIT|SOLUTION):|\Z)', pb))
            lab = F.get('PART', '').strip('() ')
            for k in ('ASK', 'ANSWER', 'DEC', 'SOLUTION'):
                if not F.get(k): raise SystemExit(f'{where}({lab}): {k}: missing')
            try: ans = float(F['ANSWER'].replace(',', '')); dec = int(F['DEC'])
            except ValueError: raise SystemExit(f'{where}({lab}): ANSWER must be a number and DEC an integer')
            out.append(dict(id=f'{key}-c{pid.lower()}{lab}', key=key, ch=ch, n=f'{pid}({lab})', type='num', src='book',
                            setup=text, stem=conv(F['ASK']), answer=ans, dec=dec, unit=F.get('UNIT', ''),
                            fmt=_numfmt(ans, dec), expl=conv(F['SOLUTION'])))
    return out

def questions():
    Q = []
    for n, k, _, _ in SYLLABUS:
        Q.extend(bank(k, n, 0))
        Q.extend(numeric(k, n))
    return Q

if __name__ == '__main__':
    Q = questions()
    print(len(Q), 'questions;', sum(q['type'] == 'tf' for q in Q), 'true or false')
    for c in chapters():
        if c['ready']: print(c['n'], c['t'], sum(q['ch'] == c['n'] for q in Q))
    if missing: print('Unresolved:', missing)
