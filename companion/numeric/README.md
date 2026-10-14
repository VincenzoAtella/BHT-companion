# Numerical problems (analytical problems of chapters A1 and A2)

One file per chapter, named by its key in `content.py` (`biology.txt` for Chapter A1, `sesgradient.txt` for A2). The problems are the analytical problems of the course chapters A1 and A2, restricted to the parts whose answer is a single number; the solutions come from the solutions file of those chapters. In the app each numerical part is one question: the student types the number, and the app checks it at the stated number of decimals. Answers and solutions are locked with the chapter's code, like the other questions.

Lines starting with `#` are comments. Text uses the book's LaTeX conventions: math in `$...$` or `\[...\]`, `\ref{}`, `\eqref{}`, `\textcite{}`, `\emph{}`.

```
PROBLEM: 13
TEXT: The setting of the problem, as in the book (only what the numerical parts need).
PART: a
ASK: What the student must compute, as in the book's part (a).
ANSWER: 0.375
DEC: 3
UNIT: euro
SOLUTION: The worked solution of this part, from the solutions manual.
PART: c
ASK: ...
ANSWER: 1250
DEC: 0
SOLUTION: ...
```

`PROBLEM` is the problem's number in the chapter's exercises. `DEC` is the number of decimals at which the answer is checked (the student's answer is accepted if, rounded to DEC decimals, it equals the answer or differs by one unit in the last decimal). `UNIT` is optional. Question ids are `<key>-c<problem><part>`: keep problem numbers and part letters as in the book, so that students' progress survives edits.
