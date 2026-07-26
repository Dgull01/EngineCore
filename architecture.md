# EngineCore Architecture v2

## Mission

...

---

## Architectural Analogy

EngineCore is organized similarly to a high-performance vehicle.

### Chassis

The Chassis preserves structural integrity.

It stores truth.

It maintains the evidence repository, persistence layer, audit trail,
and configuration.

The Chassis does not reason.

It does not interpret evidence.

It exists to ensure that every other component operates from the same
trusted foundation.

---

### Gyroscope

The Gyroscope maintains stability.

It keeps the reasoning process aligned with governing evidence.

It performs:

- Scope Review
- Evidence Review
- Authority Review
- Conflict Review
- Confidence Review
- Doctrine Review

The Gyroscope does not create conclusions.

It protects the reasoning process from drift.

---

### Transmission

The Transmission coordinates the interaction between components.

It determines the sequence of operations and passes information between
the Chassis, Gyroscope, and Engine.

Current implementation:

app.py

---

### Engine

The Engine performs reasoning.

It transforms validated evidence into transparent conclusions.

The Engine shall never bypass the Chassis or the Gyroscope.

Performance without integrity is considered architectural failure.

---

# Design Principles

...

1. Truth before conclusions.
2. Evidence before opinion.
3. Higher governing authority before lower authority.
4. Never hide uncertainty.
5. Never hide conflicting evidence.
6. Refuse unsupported conclusions.
7. Every conclusion must be explainable.
8. Every conclusion must be auditable.

---

# Architecture

```
                ENGINE
        (Reasoning & Responses)

        app.py
        prompts.py
        formatter.py

────────────────────────────────────

              GYROSCOPE
      (Integrity & Governance)

scope.py

evidence.py

authority.py

conflict.py

confidence.py

doctrine.py

────────────────────────────────────

               BEDROCK
          (Truth & Evidence)

repository.py

config.py

manuals/

persistent vector store

enginecore_state.json
```

---

# Bedrock

Purpose

Store truth.

Responsibilities

- Repository management
- Manual indexing
- Persistent evidence
- File fingerprints
- Synchronization
- Evidence persistence

Bedrock must never:

- Interpret evidence.
- Resolve conflicts.
- Reach conclusions.

---

# Gyroscope

Purpose

Prevent reasoning from drifting away from governing evidence.

Responsibilities

- Scope determination
- Evidence review
- Governing authority review
- Conflict detection
- Confidence evaluation
- Doctrine enforcement

Gyroscope must never:

- Invent evidence.
- Ignore higher governing authority.
- Hide conflicts.
- Modify evidence.

---

# Engine

Purpose

Reason from evidence.

Responsibilities

- Assemble reasoning components.
- Generate responses.
- Explain conclusions.
- Present evidence transparently.

Engine must never:

- Override governing evidence.
- Hide uncertainty.
- Invent missing information.

---

# Data Flow

Question

↓

Scope Review

↓

Evidence Review

↓

Authority Review

↓

Conflict Review

↓

Confidence Review

↓

Reasoning

↓

Response Formatting

↓

Final EngineCore Response

---

# Evidence Hierarchy

Level 1

Applicable Law / Adopted Code

Examples

- International Fire Code
- Local Amendments

---

Level 2

Consensus Standards

Examples

- NFPA
- UL

---

Level 3

Manufacturer Documentation

Examples

- Installation Manuals
- OIM
- Service Bulletins

---

Level 4

Company Procedures

Examples

- SOP
- Inspection Procedures

---

Level 5

Historical Evidence

Examples

- Previous Work Orders
- Service Notes

---

# Foundational Rule

EngineCore shall always identify the highest applicable governing evidence before issuing a technical conclusion.

If the governing evidence cannot be determined with sufficient confidence, EngineCore shall withhold the conclusion and request clarification.

---

# Motto

Higher than yesterday.
---

# Architectural Invariants

Architectural Invariants are the foundational rules that define
EngineCore.

These rules are intended to remain stable across future versions
of the software.

Changing an invariant requires deliberate architectural review.

---

## Invariant 1

Truth precedes conclusions.

Evidence shall exist before reasoning begins.

---

## Invariant 2

Evidence shall never be altered by the reasoning engine.

EngineCore may interpret evidence.

EngineCore shall never rewrite evidence.

---

## Invariant 3

Scope shall be established before conclusions are issued.

If scope is ambiguous, clarification shall be requested.

---

## Invariant 4

Applicable evidence shall be identified before governing authority
is evaluated.

---

## Invariant 5

Higher governing authority shall always be reviewed before lower
authority.

Applicable Code

↓

Consensus Standards

↓

Manufacturer Documentation

↓

Company Procedures

↓

Historical Evidence

---

## Invariant 6

Known conflicts shall never be hidden.

Conflicts shall be reported explicitly.

---

## Invariant 7

Confidence shall describe evidence quality.

Confidence shall never represent certainty without evidence.

---

## Invariant 8

Every technical conclusion shall identify its governing basis.

---

## Invariant 9

EngineCore shall identify missing governing evidence whenever
it materially limits confidence.

---

## Invariant 10

The evidence boundary shall always be declared.

The system shall state whether conclusions relied exclusively on
repository evidence or whether additional evidence was required.

---

## Invariant 11

Reasoning components shall have a single responsibility.

Each component shall own one architectural responsibility.

Responsibilities shall not overlap unless explicitly documented.

---

## Invariant 12

EngineCore shall refuse unsupported conclusions.

When evidence is insufficient,

the correct answer is:

"I do not have enough governing evidence."

Never invent certainty.

---

# Architectural Change Rule

Architectural changes shall strengthen one or more of the following:

- Transparency
- Explainability
- Auditability
- Integrity
- Confidence
- Evidence Traceability

If a proposed change weakens one of these principles,
the burden of proof lies with the proposed change.

---

# Architecture Standard

The architecture exists to maximize trustworthy reasoning.

Features are added only when they strengthen the architecture.

The architecture is never modified merely for convenience.
## Invariant 13

The architecture shall remain model-independent.

Large language models are interchangeable reasoning engines.

EngineCore itself shall not depend on any single AI provider.

Bedrock and Gyroscope shall remain valid regardless of which
reasoning engine is attached.