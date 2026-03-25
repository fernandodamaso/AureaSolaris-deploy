---
name: structured-planning
description: Structured planning workflow that converts a clarified request into a phased implementation plan with explicit task ordering, dependency handling, task completion reviews, phase completion gates, reviewer requirements, and execution governance. Use when the user asks for a plan, wants a strategy before coding, needs work organized into phases, or wants review and quality gates designed during planning rather than left for execution time.
---

# Structured Planning

Use this skill after the problem has been clarified enough to plan concretely.

Its job is not only to define what should be built, but also to define how the work will be executed and reviewed:
- how the work is split into phases
- which tasks must happen first
- which tasks can safely run in parallel
- what each phase delivers
- what must be reviewed after each task
- what must be reviewed before a phase is considered complete
- what context each reviewer must receive

This skill should produce a plan that is executable, reviewable, and governable.

## AskUser Safety

If this skill needs to pause and ask the user for missing planning inputs through `AskUser`, use plain text only.

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

## Phase 1: Validate Planning Inputs

Before drafting the plan, confirm that the planning input is strong enough.

You should have:
- goal
- scope
- business rules
- constraints
- dependencies
- assumptions
- acceptance criteria or definition of done

If these are still materially ambiguous, pause and clarify before planning.

## Phase 2: Review The Relevant Context

Before proposing the structure of the work, audit the relevant parts of the project.

### What To Review

- Existing patterns: how similar functionality is already built
- Business logic: current data flows, validations, and transformations
- Shared code: reusable services, modules, utilities, and components
- Architecture: folder structure, layering, and module boundaries
- Naming conventions: established project style
- Tech stack: frameworks, libraries, and versions
- Operational context: deployments, jobs, integrations, or monitoring expectations if relevant

### Output Of Review

Summarize the findings that matter to the plan:
- reusable code that should be leveraged
- constraints the plan must respect
- patterns the implementation should follow
- architectural or operational risks that affect phase design

## Phase 3: Design The Phase Structure

Every plan must be organized into explicit implementation phases.

Each phase is a delivery and governance unit. It is not just a bucket of tasks.

For every phase, define:
- phase objective
- scope of work
- expected outputs
- files or systems likely to be touched
- dependencies on earlier phases
- whether the phase is parallelizable
- which tasks inside the phase are sequential versus parallelizable
- main risks
- completion criteria
- task completion review strategy
- phase completion gate

### Phase Design Rules

- A phase should group work that belongs together conceptually and operationally
- A phase should have a clear exit condition
- A phase should not hide unrelated work under one broad label
- Parallel phases are allowed only when they do not share unsafe file conflicts or runtime dependencies
- If two phases appear independent but rely on the same architectural decisions or shared contracts, treat that as a dependency and state it explicitly
- Inside a phase, tasks with blocking dependencies or prerequisite decisions must be listed first
- Parallelizable tasks should appear only after their prerequisites are satisfied and must be marked explicitly as parallelizable

## Phase 4: Plan The Review Architecture

Review planning is mandatory and must be designed during the planning phase, not left for execution time.

There are two required levels of review:

### 1. Task Completion Review

Every implementation task inside a phase must have an explicit review expectation.

For each task, specify:
- what must be reviewed
- what type of reviewer is needed
- what knowledge that reviewer must have
- what context package the reviewer must receive
- what the reviewer must validate
- whether the task can proceed only after review approval

The reviewer does not need to be a specific named skill at planning time, but the plan must define the required reviewer profile precisely enough that the right reviewer can be chosen later.

Examples of reviewer profiles:
- backend reviewer with API and persistence knowledge
- frontend reviewer with accessibility and design-system knowledge
- architecture reviewer with cross-module dependency awareness
- security reviewer for auth, permissions, secrets, or external exposure
- data reviewer for schema, migration, and transformation correctness
- test reviewer for coverage, determinism, and regression risks

### 2. Phase Completion Gate

Every phase must end with a phase completion gate.

This review evaluates the whole phase, not just individual tasks.

For each phase completion gate, specify:
- reviewer profile
- required knowledge
- context package
- what the reviewer must confirm before the next phase can start
- what unresolved issues would block phase completion

The phase completion gate should validate:
- the phase objective was met
- the phase completion criteria are satisfied
- the produced artifacts are coherent as a set
- cross-phase contracts are still valid
- important risks are understood
- the next phase has safe prerequisites

## Phase 5: Deliver The Plan

Deliver the final plan using the template below.

The written plan must be saved to:
- `docs/plans/<plan-name>-YYYY-MM-DD.md`

Rules for naming:
- use a short kebab-case plan name that reflects the change being planned
- use the date the plan is created
- keep the file name stable unless the scope changes materially
- if the user already has a preferred naming convention, follow it only if it remains clear and keeps the plan name before the date

### Plan Template

```markdown
# Plan: [Feature/Change Title]

## Index
- [Summary](#summary)
- [Goal](#goal)
- [Scope](#scope)
- [Business Rules](#business-rules)
- [Constraints](#constraints)
- [Assumptions](#assumptions)
- [Open Questions](#open-questions)
- [Relevant Existing Patterns](#relevant-existing-patterns)
- [Affected Areas](#affected-areas)
- [Implementation Phases](#implementation-phases)
- [Phase Details](#phase-details)
- [Data Flow](#data-flow)
- [Error Handling](#error-handling)
- [Testing Strategy](#testing-strategy)
- [Acceptance Criteria](#acceptance-criteria)
- [Execution Governance](#execution-governance)
- [Risks And Mitigations](#risks-and-mitigations)

## Summary
One-paragraph overview of the goal and approach.

## Goal
What should be achieved.

## Scope
- In scope:
- Out of scope:

## Business Rules
- Rule 1:
- Rule 2:
- Edge case:

## Constraints
- Constraint 1:
- Constraint 2:

## Assumptions
- Assumption 1:
- Assumption 2:

## Open Questions
- Question 1:
- Question 2:

## Relevant Existing Patterns
- Reusable code:
- Architectural constraints:
- Naming conventions:

## Affected Areas
| Action | Path | Purpose |
|--------|------|---------|
| Modify | path/to/file | Why |
| Create | path/to/file | Why |

## Implementation Phases
| Phase | Objective | Parallel | Depends On | Reviewer Type | Phase Exit Review |
|-------|-----------|----------|------------|---------------|-------------------|
| Phase 1 | [Description] | No | — | [Profile] | [What must be reviewed] |
| Phase 2 | [Description] | Yes | — | [Profile] | [What must be reviewed] |
| Phase 3 | [Description] | No | Phase 1, 2 | [Profile] | [What must be reviewed] |

## Phase Details

### Phase 1: [Title]
**Objective**
- What this phase achieves

**Scope**
- What is included in this phase

**Dependencies**
- Inputs required from earlier phases

**Execution Order**
- Sequential prerequisite tasks:
- Parallelizable tasks:
- Why this ordering is required:

**Tasks**

**Task 1: [Title]**
- Description:
- Files/Areas:
- Depends On:
- Parallel:
- Reviewer Profile:
- Required Reviewer Knowledge:
- Review Context:
- Review Checks:
- Blocks Progress:

**Task 2: [Title]**
- Description:
- Files/Areas:
- Depends On:
- Parallel:
- Reviewer Profile:
- Required Reviewer Knowledge:
- Review Context:
- Review Checks:
- Blocks Progress:

**Task 3: [Title]**
- Description:
- Files/Areas:
- Depends On:
- Parallel:
- Reviewer Profile:
- Required Reviewer Knowledge:
- Review Context:
- Review Checks:
- Blocks Progress:

**Phase Risks**
- Risk:
- Risk:

**Completion Criteria**
- Criterion 1
- Criterion 2

**Phase Completion Gate**
- Reviewer profile:
- Required knowledge:
- Context package:
- Must confirm:
- Blocks next phase if:

### Phase 2: [Title]
[Repeat the same structure]

## Data Flow
Describe inputs -> transformations -> outputs for the main flow.

## Error Handling
- Scenario 1: [What fails] -> [How it is handled]
- Scenario 2: [What fails] -> [How it is handled]

## Testing Strategy
- Unit:
- Integration:
- End-to-end:
- Edge cases:

## Acceptance Criteria
- Criterion 1
- Criterion 2

## Execution Governance
- What can run in parallel:
- What must run sequentially first:
- Which tasks unblock later parallel work:
- What must be reviewed before merge:
- What must be reviewed before phase close:
- What blocks the start of dependent phases:

## Risks And Mitigations
- Risk:
- Mitigation:
```

## Quality Checklist

Before presenting the plan, verify:

### SOLID
- Each planned module, service, or component has a clear responsibility
- Abstractions are used where they reduce coupling
- Interfaces are scoped to actual consumers

### KISS
- The simplest workable execution path is chosen
- The phase structure is understandable
- Review checkpoints do not introduce unnecessary ceremony

### DRY
- Shared logic is identified for reuse
- Business rules are not duplicated across phases
- Review criteria are reused where appropriate instead of rewritten inconsistently

### Review Governance
- Every task has a defined review expectation
- Every phase has a defined completion gate
- Reviewer requirements are specific enough to choose the right reviewer later
- Review context packages are explicit
- Blockers for moving to the next phase are visible
- Task ordering makes dependencies explicit
- Sequential prerequisite tasks are listed before parallelizable tasks

## Rules

- Never start coding before the user approves the plan
- Never deliver a plan without explicit implementation phases
- Never leave review strategy implicit
- Always start the written plan with a clickable index
- Always save the written plan to `docs/plans/<plan-name>-YYYY-MM-DD.md`
- Always define task completion review expectations for each phase
- Always mark which tasks are sequential and which can run in parallel
- Always place dependency-bound or blocking tasks before the tasks they unlock
- Always define a phase completion gate for each phase
- Always specify the reviewer profile, required knowledge, and context package for review
- Always identify what blocks the next task or next phase
- Revisit the phase structure if new dependencies or risks emerge during planning

## Completion Condition

This skill is complete only when the plan:
- is organized into explicit phases
- defines dependencies and safe parallelization
- makes task ordering and parallel execution opportunities explicit
- includes task completion review planning
- includes phase completion gates
- states reviewer requirements and context packages clearly enough for execution-time orchestration
