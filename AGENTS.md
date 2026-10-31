# Commits and pull requests

Commit subjects, PR titles, and PR bodies follow Conventional Commits. Write them in English.

```
<type>: <imperative summary>
```

```
refactor: make Cropin frontend-only
fix: keep the session cookie on HTTPS
feat: add project document pages
```

## Subject

- Use a lowercase type, then `: `, then a lowercase imperative summary.
- Keep the subject to one line. Do not end it with a period.
- Say what changed. Add a body only when the subject is not enough, separated by a blank line.
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`.

## No co-authorship

Commits, pull requests, titles, bodies, and trailers never include co-authorship or tool attribution.

Do not add any of these, including in a footer or a PR description:

- `Co-authored-by`
- `Co-authored`
- coautoria
- `Generated-by`, `Generated with`, or `Made with`
- a mention that Cursor, Claude, or another assistant wrote the change

One author only: the person who made the change. Do not pass `--trailer`, do not amend a message to insert a co-author, and do not put a co-author in the PR body.
