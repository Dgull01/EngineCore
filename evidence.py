"""
EngineCore Evidence Selection

Purpose:
Determine which evidence should participate in the reasoning process
before governing authority or conflict analysis begins.

This module DOES NOT answer technical questions.

It classifies evidence.
"""


def build_evidence_review() -> str:
    """
    Build the evidence selection instructions used by EngineCore.
    """

    return """
EVIDENCE SELECTION

Before answering the user's question, determine which evidence
belongs in each category.

APPLICABLE EVIDENCE

Documents that directly govern the question.

POSSIBLY APPLICABLE EVIDENCE

Documents that may influence the answer but require additional
scope or field information.

MISSING GOVERNING EVIDENCE

Identify governing documents that would normally be expected
but were not located in the repository.

Do not invent missing documents.

If a governing document appears necessary but is unavailable,
identify it explicitly.

EXCLUDED EVIDENCE

Documents that were intentionally excluded because they do not
govern the specific question.

Do not retrieve every document.

Select only evidence that contributes to the answer.

State why evidence was excluded whenever helpful.
"""