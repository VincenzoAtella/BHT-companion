# Question banks

All questions are original and written for the course; none is taken from the textbook. One file per syllabus chapter, named by its key in `content.py` (for example `insurance.txt` for BHT Chapter 7). Each chapter should have at least 10 true-or-false and 20 multiple-choice questions. They are locked with per-chapter unlock codes.


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
