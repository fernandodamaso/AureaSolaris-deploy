---
name: plan-reviewer
description: Critically review a structured implementation plan before execution begins. Use when a plan has already been drafted and needs pressure-testing for missing questions, weak assumptions, unsafe sequencing, fake parallelism, incomplete review gates, vague reviewer requirements, or execution risks. This skill should challenge the plan, not summarize it.
---

# Plan Reviewer

Use this skill after a plan has already been created.

Its purpose is to challenge the plan before execution starts.

This is not a formatting pass and not a friendly summary pass. The goal is to find what could go wrong:
- unclear decisions
- missing dependencies
- weak sequencing
- unsupported assumptions
- unreviewable tasks
- weak phase boundaries
- incomplete governance

If the plan is not strong enough to execute safely, say so directly.

## When To Use

Use this skill when:
- the user asks to review a plan
- `structured-planning` has already produced a plan
- the agent wants a critical pass before execution
- the plan needs to be checked for sequencing, review architecture, and execution readiness

This skill should normally run after `structured-planning` and before implementation begins.

## AskUser Safety

If this skill uses the `AskUser` tool to resolve a blocking ambiguity, use plain text only.

Do not send JSON.
Do not wrap the questionnaire in code fences.
Do not add headings, explanations, or prose before the questionnaire block.

Use only the exact marker format expected by the parser:

[question] Your question here
[topic] Short topic here
[option] First option
[option] Second option

Each `[question]` block must include 2 to 10 `[option]` lines.

If you are not intentionally using `AskUser`, ask in normal prose instead.

## Review Objective

The reviewer must determine whether the plan is:
- clear enough to execute
- correctly phased
- safe in its dependency ordering
- honest about what can and cannot run in parallel
- explicit about task completion reviews
- explicit about phase completion gates
- specific about reviewer requirements and review context
- complete enough to avoid predictable rework

## What To Review

Inspect the plan for the following:

### 1. Goal And Scope Clarity

Check whether the plan clearly defines:
- the goal
- what is in scope
- what is out of scope
- what business rules are binding
- what assumptions remain unproven

### 2. Phase Structure

Check whether:
- the work is split into coherent phases
- each phase has a clear objective
- each phase has a believable exit condition
- each phase has appropriate completion criteria
- the phase boundaries make sense for execution and review

### 3. Task Ordering And Dependencies

Check whether:
- prerequisite tasks appear before dependent tasks
- dependency chains are explicit
- tasks marked as parallel really can be run in parallel
- architectural, data, or file-level dependencies are not ignored
- the ordering reduces rework rather than hiding it

### 4. Review Architecture

Check whether every phase includes both:
- task completion reviews
- a phase completion gate

For task completion reviews, check whether the plan explains:
- what each task review must validate
- what reviewer profile is needed
- what knowledge the reviewer must have
- what context the reviewer must receive
- whether the review blocks downstream work

For the phase completion gate, check whether the plan explains:
- who reviews the phase as a whole
- what context package they need
- what must be true before the next phase starts
- what unresolved issues block progression

### 5. Execution Governance

Check whether the plan is explicit about:
- what can run in parallel
- what must run sequentially first
- what blocks the start of dependent work
- what must be reviewed before merge or handoff
- what risks remain at each phase boundary

### 6. Acceptance And Risk Coverage

Check whether:
- acceptance criteria are concrete
- error handling is considered
- testing is sufficient for the scope
- major risks are named
- mitigations are plausible

## Review Standards

Be skeptical and specific.

Do not approve a plan just because it sounds reasonable. Approve it only if it is executable with clear governance.

The skill should reject plans that:
- hide critical decisions inside vague language
- claim parallel work without real independence
- omit review structure
- define reviewer roles too vaguely to be actionable
- fail to show what context reviewers need
- move to later phases without justified prerequisites

## Required Output

Use this structure:

```md
# Plan Review

## Verdict
APPROVE / APPROVE WITH CAUTIONS / REVISE BEFORE EXECUTION

## Summary
Short assessment of overall plan quality.

## Critical Findings
- Finding:
- Why it matters:
- Required change:

## Important Findings
- Finding:
- Why it matters:
- Required change:

## Missing Questions
- Question 1
- Question 2

## Edge Cases To Add
- Edge case 1
- Edge case 2

## Phase Structure Issues
- Issue:
- Recommended fix:

## Task Ordering And Dependency Issues
- Issue:
- Recommended fix:

## Review Architecture Gaps
- Missing or weak task completion reviews:
- Missing or weak phase completion gates:
- Reviewer/context definition gaps:

## Acceptance Criteria Gaps
- Gap:
- Suggested improvement:

## Recommended Amendments
- Amendment 1
- Amendment 2

## Execution Readiness
What must be true before implementation should begin.
```

## Severity Guidance

Use:
- `Critical Findings` for issues that could invalidate the plan, cause major rework, or make execution unsafe
- `Important Findings` for issues that weaken execution quality but are still recoverable

Do not fill the report with low-value nitpicks.

## Review Rules

- Do not rewrite the entire plan unless the current structure is unusable
- Do not add unrelated scope
- Do not rubber-stamp a plan
- Always test the claimed ordering and parallelization
- Always verify that prerequisite work appears before the work it unlocks
- Always verify that each phase has task completion reviews
- Always verify that each phase has a phase completion gate
- Always verify that reviewer requirements and review context are concrete enough to act on
- If governance is weak, the verdict must not be `APPROVE`

## Completion Condition

This skill is complete only when:
- the plan has been pressure-tested
- missing questions and edge cases are explicit
- phase and task sequencing have been challenged
- review architecture has been checked
- the final verdict makes clear whether execution is safe to begin
