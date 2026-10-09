# App-only questions

The book's own true-or-false and multiple-choice exercises (Parts A and B) are read from the chapters. This folder adds questions that exist only in the app, so that every chapter has at least 10 true-or-false and 20 multiple-choice questions. They are locked with the same chapter codes as the book's solutions.


Blocks are separated by a blank line. Lines starting with `#` are comments. Math in `$...$`; only `\emph{...}` and `\textbf{...}` as commands; dollar amounts as `\$4,000`.

```
TF: Statement to judge, one paragraph.
ANSWER: True
WHY: The explanation shown once the chapter's solutions are unlocked.

MC: Question stem.
(a) first option
(b) second option
(c) third option
(d) fourth option
ANSWER: c
WHY: Why (c) is right and the others are not.
```

Ids are `<key>-<k>`, where k is the block's position in the file. Append new blocks at the end; never reorder or delete a block that students may have answered, or their progress on later blocks moves to other questions. To retire a question, replace its text but keep the block.
