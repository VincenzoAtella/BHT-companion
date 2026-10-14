# Health Economics Study Companion (BHT)

Offline study app for the course Health Economics at Tor Vergata, organized on the syllabus chapters of Bhattacharya, Hyde and Tu, *Health Economics* (Palgrave Macmillan, 2014), plus the two chapters of the course addendum (A1 and A2).

- `companion/`: the app (questions, numerical problems, interactive examples, model engine, build and lock scripts). See `companion/README.md`.
- `guide/`: the student guide (LaTeX).
- `.github/workflows/companion.yml`: builds the app on every push to `main` and publishes it in the `app-latest` release.

Solutions are locked per chapter with codes derived from one secret. The secret is never stored in the repository: GitHub Actions reads it from the repository secret `COMPANION_UNLOCK_SECRET`; a local build reads it from the same environment variable or from `companion/.unlock-secret` (ignored by git).

© 2026 Vincenzo Atella. All rights reserved.
