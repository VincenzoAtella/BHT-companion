"""Solution locking for the Study Companion.

The answer key cannot be hidden from an app that grades answers on the
student's computer, so it is only obscured: each question stores a salted
SHA-256 tag of its correct answer, and the app recognizes a right answer by
recomputing the tag. The book's solutions (the explanation and the correct
option) are encrypted with AES-256-GCM, one box per chapter. A box opens only
with that chapter's unlock code, which the instructor sends when he wants the
solutions to become visible. One extra code opens every chapter.

Codes are derived from a master secret with HMAC-SHA256, so every build made
with the same secret accepts the same codes. The secret is read from the
environment variable COMPANION_UNLOCK_SECRET or from companion/.unlock-secret
(not tracked by git). Keep it: losing it means new codes for everyone.
"""
import base64, hashlib, hmac, json, os, secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITER = 150_000
HERE = os.path.dirname(os.path.abspath(__file__))
SECRET_FILE = os.path.join(HERE, '.unlock-secret')

def master_secret(create=True):
    s = os.environ.get('COMPANION_UNLOCK_SECRET', '').strip()
    if s:
        return s, 'environment'
    if os.path.exists(SECRET_FILE):
        return open(SECRET_FILE).read().strip(), SECRET_FILE
    if not create:
        return None, None
    s = secrets.token_urlsafe(32)
    with open(SECRET_FILE, 'w') as f:
        f.write(s + '\n')
    return s, SECRET_FILE + ' (new)'

def code(master, label):
    d = hmac.new(master.encode(), label.encode(), hashlib.sha256).digest()
    b = base64.b32encode(d).decode().rstrip('=')[:10]
    return b[:5] + '-' + b[5:]

def _norm(c):
    return c.upper().replace('-', '').replace(' ', '')

def _b64(b):
    return base64.b64encode(b).decode()

def seal(obj, unlock_code):
    salt, iv = os.urandom(16), os.urandom(12)
    key = hashlib.pbkdf2_hmac('sha256', _norm(unlock_code).encode(), salt, ITER, 32)
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), None)
    return {'s': _b64(salt), 'iv': _b64(iv), 'ct': _b64(ct)}

def answer_tag(pepper, qid, answer, dec=None):
    if dec is not None:   # numerical answer: the value rounded to dec decimals
        v = round(float(answer), dec)
        a = f'{(0.0 if v == 0 else v):.{dec}f}'
    else:
        a = ('T' if answer else 'F') if isinstance(answer, bool) else 'abcde'[answer]
    return hashlib.sha256(f'{pepper}|{qid}|{a}'.encode()).hexdigest()[:20]

def lock(questions, master):
    """Return (public questions, lock data for the app, codes for the instructor)."""
    pepper = secrets.token_hex(8)
    boxes, codes, public = {}, {}, []
    by_key = {}
    for q in questions:
        by_key.setdefault(q['key'], []).append(q)
    for key, qs in by_key.items():
        c = code(master, 'chapter:' + key)
        codes[key] = (qs[0]['ch'], c)
        boxes[key] = seal({q['id']: {'a': q['answer'], 'e': q['expl']} for q in qs}, c)
    all_code = code(master, 'all-chapters')
    all_box = seal({k: c for k, (_, c) in codes.items()}, all_code)
    for q in questions:
        p = {k: v for k, v in q.items() if k not in ('answer', 'expl', 'fmt')}
        p['tag'] = answer_tag(pepper, q['id'], q['answer'], q.get('dec') if q.get('type') == 'num' else None)
        public.append(p)
    data = {'enabled': True, 'iter': ITER, 'pepper': pepper, 'boxes': boxes, 'all': all_box}
    return public, data, codes, all_code
