---
name: planning-orchestrator
description: Orchestrate a planning workflow across brainstorming, structured-planning, and plan-reviewer. Use whenever the user starts a planning phase, asks for a plan or strategy, wants to architect a change before coding, or needs a proposal pressure-tested before execution. This skill should coordinate the sequence explicitly instead of letting the agent skip directly to plan drafting.
---

# Planning Orchestrator

Use this skill to control the planning workflow end to end.

It exists to make the planning phase consistent:
- first clarify and shape the problem
- then build the plan
- then challenge the plan before execution

This is a coordination skill. It should decide which planning skill runs next and what artifacts must be passed forward.

## When To Use

Use this skill when:
- the user says they want to plan something
- the user asks for a strategy, architecture, or implementation plan
- the user wants to think through an idea before coding
- the user wants a plan reviewed before execution
- multiple planning skills are available and the agent needs to apply them in the right order

## Core Rule

Do not treat brainstorming, structured planning, and plan review as interchangeable.

They are separate phases with separate goals:
- `brainstorming` clarifies the request
- `structured-planning` turns the clarified request into an execution plan
- `plan-reviewer` challenges the plan and exposes blind spots

This skill must enforce that order.

## Main-Agent Rule

The user-facing conversation stays with the current main agent during brainstorming.

That means:
- do not send the user into a side conversation with a sub-agent for discovery
- do not delegate the interactive back-and-forth clarification loop unless the user explicitly asks for that workflow
- the main agent must ask the questions, absorb the answers, and decide when the request is clear enough to move on

Sub-agents are optional only after the problem is sufficiently clarified and the work becomes mostly synthesis or critique.

## AskUser Safety

If the agent uses the `AskUser` tool during planning, it must use plain text only.

Do not send JSON.
Do not wrap the questionnaire in code fences.
Do not add headings, explanations, or prose before the questionnaire block.

Use only the exact marker format expected by the parser:

[question] Your question here
[topic] Short topic here
[option] First option
[option] Second option

Each `[question]` block must include 2 to 10 `[option]` lines.

If the agent is not intentionally using `AskUser`, ask the user in normal prose instead.

## Workflow

### Phase 1: Activate Brainstorming

Invoke `brainstorming` first.

The purpose of this phase is to:
- understand the goal
- clarify scope and constraints
- uncover hidden assumptions
- surface missing business rules and edge cases
- compare viable directions when there is real design choice

Stay in this phase until the main agent can produce a compact planning brief with:
- goal
- scope
- constraints
- assumptions
- open questions
- recommended direction

Do not move to structured planning just because the user asked for a plan. Move only when the request is actually clear enough to plan.

### Phase 2: Activate Structured Planning

Once the planning brief is stable, invoke `structured-planning`.

Pass forward:
- the agreed goal
- in-scope and out-of-scope boundaries
- relevant business rules
- constraints
- assumptions
- unresolved questions
- the recommended direction from brainstorming

The output of this phase should be a concrete implementation plan with:
- summary
- business rules
- affected files or areas
- implementation phases
- dependency mapping
- parallelization analysis
- data flow
- error handling
- testing considerations
- acceptance criteria
- risks and mitigations

### Phase 3: Activate Plan Review

After the structured plan is drafted, invoke `plan-reviewer`.

This phase is mandatory before execution begins.

The review must pressure-test the plan for:
- weak assumptions
- unanswered questions
- missing edge cases
- unsafe sequencing
- unrealistic parallel work
- missing dependencies
- vague acceptance criteria
- operational or rollout gaps

If the reviewer finds material problems, the plan should be revised before execution.

### Phase 4: Return The Reviewed Plan

Return the planning result to the user in a clear final package:
- the plan itself
- the review verdict
- the main risks or open questions still remaining
- whether execution is ready to begin

## Sub-Agent Guidance

Sub-agents may be used selectively, but only when they improve throughput without breaking the user interaction model.

Good uses:
- drafting the structured plan from an already validated planning brief
- reviewing a drafted plan independently
- researching a narrow dependency or architecture question

Bad uses:
- making the user answer clarifying questions through a hidden sub-agent
- splitting brainstorming across multiple independent conversations
- delegating before the problem statement is stable

When sub-agents are used, the main agent remains responsible for:
- deciding when to invoke them
- merging their output
- keeping the user conversation coherent

## Transition Criteria

Move from `brainstorming` to `structured-planning` only when:
- the goal is concrete
- scope is bounded
- major constraints are known
- assumptions are visible
- there is enough clarity to propose execution phases

Move from `structured-planning` to `plan-reviewer` only when:
- the plan is detailed enough to critique
- dependencies and file impact are visible
- acceptance criteria exist

## Completion Condition

This skill is complete only when:
- the user request has gone through brainstorming
- a structured plan has been produced
- the plan has been reviewed critically
- the user receives a final reviewed planning output that is ready for execution or clearly marked for revision
