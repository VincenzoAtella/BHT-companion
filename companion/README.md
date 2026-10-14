# Health Economics Study Companion (BHT)

An offline study app for the course Health Economics, organized on the syllabus chapters of Bhattacharya, Hyde and Tu, *Health Economics* (Palgrave Macmillan, 2014), plus the two chapters of the course addendum (A1 and A2). It has interactive model explorers with "predict first" checks, true-or-false and multiple-choice questions, spaced review, mock exams, a progress report and a feedback form.

All examples and questions on BHT chapters are original material written for the course; the addendum chapters A1 and A2 also include their own end-of-chapter exercises. The app quotes no text of the textbook and refers to it by chapter, section, figure and table.

## Build

    cd companion
    npm ci
    pip install cryptography
    COMPANION_UNLOCK_SECRET=<secret> python3 build.py     # or put the secret in companion/.unlock-secret
    # optional: BHT_TEXT=<folder with bhtNN.txt extracts> checks the anchors of the examples

Output: `dist/BHT-Study-Companion.html` (one file) and `dist/pwa/` (installable web app). Solutions are locked per chapter; the unlock codes go to `build/unlock-codes.md` (not tracked). Without a secret the build stops, so that a fresh clone never issues new codes by accident; `--new-secret` starts a new set of codes, `--open` builds with solutions visible, `--check-only` runs the checks without building.

## Content

- `content.py`: syllabus chapters, parts, question parser.
- `questions/<key>.txt`: question banks (format in `questions/README.md`).
- `numeric/<key>.txt`: numerical problems (format in `numeric/README.md`), for the addendum chapters.
- `src/examples/chNN.js`: interactive examples, NN = BHT chapter number; `ch23.js` and `ch24.js` hold the addendum chapters, shown in the app as A1 and A2.

The app code (`src/app.js`, `features.js`, `engine.js`, `examples.js`, `style.css`) is shared with the Study Companion of *Advanced Health Economics*.
