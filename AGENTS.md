<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-agent-rules -->
# Project agent rules

## Communication

* Don’t assume.
* Don’t hide confusion.
* Flag uncertainty explicitly.
* Surface tradeoffs.
* Define success criteria and loop until verified.
* After completing any coding task, always end with:
  - Files changed: [list every file touched]
  - What was modified: [one line per file]
  - Files intentionally not touched: [if relevant]
  - Follow-up needed: [anything requiring user attention or a decision]

  Keep it short. This is a status update, not a recap.

## Behavior

* Show 2–3 options before significant tasks.
* Minimum code that solves the problem. Nothing speculative.
* Touch only what you must.
* Clean up only your own mess.
* Only change what is explicitly requested.
* Ask before making major changes.
* Do not take external actions without explicit confirmation.

## Memory

Maintain a file called `MEMORY.md`. After any significant decision about direction, format, content, approach, or strategy, add an entry:

```md
## [Date], [Decision]
**What was decided:** [the choice made]
**Why:** [the reasoning]
**What was rejected:** [alternatives considered and why they were ruled out]
```

Read `MEMORY.md` at the start of every session before doing anything. Never contradict a logged decision without flagging it first.

When the user says "session end", "wrapping up", or "let's stop here", write a session summary to `MEMORY.md`:

```md
## Session Summary, [Date]
**Worked on:** [what we focused on]
**Completed:** [what's finished]
**In progress:** [what's started but not done]
**Decisions made:** [key choices from this session]
**Next session:** [what to pick up first and any important context to carry forward]
```
<!-- END:project-agent-rules -->

<!-- BEGIN:project-deploy-rules -->
# Vercel deploy convention

When the user says "push to Vercel" for this project, deploy to production and treat the canonical user-facing URL as:

https://bonaalessandro.ink/host/login

After every production deploy, make sure `bonaalessandro.ink` is aliased to the new deployment, not only the generated `vercel.app` URL.
<!-- END:project-deploy-rules -->
