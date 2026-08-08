# Planning

This project was planned in documents. It is now planned in
[Beads](https://github.com/gastownhall/beads), and the documents that used to live
here have been deleted — git history retains them.

They were removed because every session paid for them: roughly 4,000 lines, read
before a single source file was opened, most of it the history of work already
finished. Beads gives an agent the one issue it needs instead.

## Finding what used to be here

| You want                               | Run                                       |
| -------------------------------------- | ----------------------------------------- |
| What is done, and what is left         | `bd list --all`, `bd ready`               |
| A milestone (M0–M6)                    | `bd list --all --type epic`               |
| A task (T1.7.7 and friends)            | `bd show <id>` on the epic's children     |
| Why a technology was chosen (D1–D15)   | `bd list --all --type decision`           |
| What was learned doing a piece of work | `bd show <id>` — it is in the issue notes |

Standing rules — how code is written and tested — are not in Beads. They live in
[.github/instructions/](../../.github/instructions/) and load automatically.

What the project is, and how it is put together, is in the [README](../../README.md).
