# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `HOSEKI7/takerin`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### SKILLS md

**Load /agent-browser when you need real interact with website**.
**Load /frontend-design** when designing anything.

## Device

My device os is Mac OS on **MacBook Air M1 Apple Silicon**, everything is running on default zsh terminal (unix).

## Working agreement

- **Language split**: All shipped output — are written in Bahasa Indonesia.
- **Never push to the GitHub repo** — user pushes manually.
- **Never implement outside current task scope**.
- After finishing a task or do changes, **always provide a suggested commit message**.
- **If implementation diverges from PRD or other docs, update the PRD**.
- **Use Context7 MCP** to fetch up-to-date library docs before implementing.
- **Provide verification steps** (if available and testable) so I can manually verify the work that has been done.
- **Provide task summary output** with Indonesian (even if i prompting in english).

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
