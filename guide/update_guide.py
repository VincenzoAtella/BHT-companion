#!/usr/bin/env python3
"""Keep the guides in step with the app.

    python3 guide/update_guide.py           # retake the screenshots from the built app, compile the guides, copy the PDFs to companion/dist
    python3 guide/update_guide.py --check   # only check; exit code 1 if the guides are out of date

What is checked:
  1. the screenshots were taken from the current interface: a fingerprint of the files that draw the
     interface (app code, styles, the page shell in build.py and the examples shown in the figures) is
     stored in guide/figures/STAMP when the screenshots are taken; any later change makes it stale;
  2. every item of the app's left menu is named in the student guide (as \\ui{...}).

companion/build.py runs this script at the end of every build: it retakes the screenshots and recompiles
the guides when the interface has changed and Playwright and latexmk are available; otherwise it prints a
warning. Needs: pip install playwright (Chromium), latexmk with pdflatex.
"""
import asyncio, hashlib, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, 'companion')
HTML = os.path.join(APP, 'dist', 'BHT-Study-Companion.html')
FIG = os.path.join(HERE, 'figures')
STAMP = os.path.join(FIG, 'STAMP')
GUIDES = [('student_guide', 'BHT-Study-Companion-Student-Guide.pdf')]
# files that decide what the screenshots show
UI_FILES = ['src/app.js', 'src/features.js', 'src/style.css', 'src/examples.js', 'src/examples/ch08.js', 'content.py']
EXAMPLE = 'b08-lemons'        # the example shown in the figures
QCHAPTER, QITEM = 8, 'lemons-1'


def fingerprint():
    h = hashlib.sha256()
    for f in UI_FILES:
        p = os.path.join(APP, f)
        if os.path.exists(p):
            h.update(f.encode()); h.update(open(p, 'rb').read())
    # the page shell (menu) lives in build.py
    b = open(os.path.join(APP, 'build.py'), encoding='utf-8').read()
    h.update(re.search(r"body = '''(.*?)'''", b, re.S).group(1).encode())
    return h.hexdigest()[:16]


def menu_items():
    b = open(os.path.join(APP, 'build.py'), encoding='utf-8').read()
    return re.findall(r'class="toplink" href="[^"]*">([^<]+?)\s*(?:<|</a>)', b)


def check():
    problems = []
    stamp = open(STAMP).read().strip() if os.path.exists(STAMP) else ''
    if stamp != fingerprint():
        problems.append('the screenshots in guide/figures were taken before the latest changes to the interface')
    body = open(os.path.join(HERE, 'student_guide_body.tex'), encoding='utf-8').read()
    missing = [m for m in menu_items() if '\\ui{' + m + '}' not in body]
    if missing:
        problems.append('menu items not described in the student guide: ' + ', '.join(missing))
    for g, _ in GUIDES:
        pdf, tex = os.path.join(HERE, g + '.pdf'), os.path.join(HERE, g + '.tex')
        newest = max(os.path.getmtime(os.path.join(HERE, f)) for f in os.listdir(HERE) if f.endswith('.tex'))
        newest = max(newest, max(os.path.getmtime(os.path.join(FIG, f)) for f in os.listdir(FIG) if f != 'STAMP'))
        if not os.path.exists(pdf) or os.path.getmtime(pdf) < newest:
            problems.append(f'guide/{g}.pdf is older than its sources')
    return problems


async def shots():
    from playwright.async_api import async_playwright
    U = 'file://' + HTML
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 1000}, device_scale_factor=1.5)
        await ctx.route('http*://**', lambda r: r.abort())
        pg = await ctx.new_page(); await pg.goto(U); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=os.path.join(FIG, 'app-map.png'))
        await pg.goto(U + '#' + EXAMPLE); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=os.path.join(FIG, 'app-predict.png'))
        await pg.locator('#challenges .opt').first.click(); await pg.wait_for_timeout(1200)
        await pg.evaluate("document.querySelector('#status').scrollIntoView({block:'start'}); window.scrollBy(0,-90)")
        await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(FIG, 'app-example.png'))
        await pg.goto(U + f'#q-{QCHAPTER}'); await pg.wait_for_timeout(1500)
        c = pg.locator('#qc-' + QITEM)
        await c.locator('textarea').fill('Sellers know quality and buyers do not, so the price reflects average quality and the best cars leave the market first.')
        await c.locator('.tfb[data-a="1"]').click(); await pg.wait_for_timeout(600)
        await pg.evaluate(f"document.querySelector('#qc-{QITEM}').scrollIntoView({{block:'start'}}); window.scrollBy(0,-200)")
        await pg.wait_for_timeout(400); await pg.screenshot(path=os.path.join(FIG, 'app-questions.png'))
        await b.close()
    from PIL import Image
    for f in os.listdir(FIG):
        if f.endswith('.png'):
            Image.open(os.path.join(FIG, f)).convert('RGB').save(os.path.join(FIG, f[:-4] + '.jpg'), quality=88)
            os.remove(os.path.join(FIG, f))


def update():
    if not os.path.exists(HTML):
        sys.exit('Build the app first: python3 companion/build.py')
    asyncio.run(shots())
    for g, out in GUIDES:
        subprocess.run(['latexmk', '-g', '-pdf', '-interaction=nonstopmode', g + '.tex'], cwd=HERE,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not os.path.exists(os.path.join(HERE, g + '.pdf')):
            sys.exit(f'latexmk failed on guide/{g}.tex')
        shutil.copy(os.path.join(HERE, g + '.pdf'), os.path.join(APP, 'dist', out))
    with open(STAMP, 'w') as f:
        f.write(fingerprint() + '\n')
    left = check()
    print('Guides updated: new screenshots, PDFs in companion/dist.' + ('' if not left else ' Still to fix: ' + '; '.join(left)))
    return left


if __name__ == '__main__':
    if '--check' in sys.argv:
        p = check()
        print('Guides: up to date.' if not p else 'Guides out of date: ' + '; '.join(p) + '. Run python3 guide/update_guide.py')
        sys.exit(1 if p else 0)
    sys.exit(1 if update() else 0)
