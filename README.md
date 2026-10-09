# Health Economics Study Companion (BHT)

An offline study app for the course Health Economics, organized on the syllabus chapters of Bhattacharya, Hyde and Tu, *Health Economics* (Palgrave Macmillan, 2014). It has interactive model explorers with "predict first" checks, true-or-false and multiple-choice questions, spaced review, mock exams, a progress report and a feedback form.

All examples and questions are original material written for the course. The app quotes no text of the textbook and refers to it by chapter, section, figure and table.

## Build

    npm install
    BHT_TEXT=<folder with bhtNN.txt extracts> python3 build.py     # BHT_TEXT is optional: it checks the anchors of the examples

Output: `dist/BHT-Study-Companion.html` (one file) and `dist/pwa/` (installable web app). Solutions are locked per chapter; the unlock codes go to `build/unlock-codes.md` and the secret to `.unlock-secret` (neither is tracked). `--open` builds with solutions visible.

## Content

- `content.py`: syllabus chapters, parts, question parser.
- `questions/<key>.txt`: question banks (format in `questions/README.md`).
- `src/examples/chNN.js`: interactive examples, NN = BHT chapter number.

The app code (`src/app.js`, `features.js`, `engine.js`, `examples.js`, `style.css`) is shared with the Study Companion of *Advanced Health Economics*.
