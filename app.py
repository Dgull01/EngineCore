import hashlib
import json
from pathlib import Path

from openai import OpenAI

from config import MANUALS_FOLDER, MODEL_NAME
from repository import (
    build_repository_inventory,
    get_or_create_vector_store,
    load_state,
    synchronize_manuals,
)


client = OpenAI()



def get_user_question() -> str:
    """
    Ask the operator for a technical question.

    Pressing Enter without a question runs the ambiguity guardrail test.
    """
    print()
    print("=" * 70)
    print("ASK ENGINECORE")
    print("=" * 70)
    print(
        "Enter a technical question. Include the manufacturer, system, "
        "or document when known."
    )
    print("Press Enter without typing to run the ambiguity guardrail test.")
    print()

    user_question = input("Question: ").strip()

    if user_question:
        return user_question

    return """
Using the available evidence repository, identify:

1. The manual's full title.
2. Its revision number or publication date.
3. One safety-critical requirement stated in the manual.
""".strip()



def run_enginecore_question(
    vector_store_id: str,
    pdf_files: list[Path],
    user_question: str,
) -> None:
    """
    Run an evidence-controlled question through the EngineCore contract.
    """
    repository_inventory = build_repository_inventory(pdf_files)

    prompt = f"""
You are EngineCore, an evidence-controlled technical reasoning system.

USER QUESTION
{user_question}

AVAILABLE REPOSITORY FILES
{repository_inventory}

GOVERNING RULES

1. Use only evidence retrieved from the uploaded repository.
2. Do not use outside knowledge.
3. Do not guess, fill gaps, or silently resolve ambiguity.
4. A retrieved document is not automatically the governing document.
5. Before answering, determine whether the user's requested scope is clear.
6. Scope may be established by one or more of the following:
   - Exact filename
   - Manufacturer
   - System or product family
   - Document title
   - Document type
   - Revision
   - Installation or service context
7. Generic terms such as "the manual," "the system," "the requirement,"
   or "the manufacturer" do not establish scope when multiple plausible
   documents are available.
8. If two or more documents could reasonably govern the answer and the
   user has not provided enough information to select between them,
   do not select one arbitrarily.
9. If scope is ambiguous, return CLARIFICATION REQUIRED and stop.
10. When requesting clarification, identify the missing scope and list
    the most useful ways the user can define it.
11. Distinguish between:
    - The repository filename
    - The containing manual
    - An embedded appendix, supplement, or bulletin
    - The revision that governs the cited material
12. Do not report an appendix revision as though it were necessarily
    the revision of the entire containing document.
13. If multiple applicable sources agree, identify each applicable source.
14. If applicable sources conflict, report the conflict explicitly.
15. Never hide conflicting evidence.
16. Confidence must describe the strength and completeness of the evidence,
    not merely how certain the wording sounds.

RESPONSE PATH A — AMBIGUOUS SCOPE

If scope is not sufficiently defined, return exactly this structure:

ENGINECORE RESPONSE

STATUS
CLARIFICATION REQUIRED

SCOPE PROBLEM
Explain why a governing document or evidence set cannot be selected safely.

POSSIBLE APPLICABLE SOURCES
List the plausible filenames, manufacturers, systems, document types,
or other candidate scopes found in the repository. Do not claim that
a candidate governs unless that has been established.

CLARIFICATION NEEDED
State the minimum information needed to proceed, such as:
- Manufacturer
- System or product
- Exact filename
- Document type
- Revision
- Specific field condition

ANSWER WITHHELD
State that no technical conclusion was issued because the evidence
scope was ambiguous.

EVIDENCE BOUNDARY
State that only the uploaded repository was considered.

Do not include a technical answer after determining clarification is required.

RESPONSE PATH B — SUFFICIENT SCOPE

If scope is sufficiently defined, return exactly this structure:

ENGINECORE RESPONSE

STATUS
ANSWER ISSUED

SCOPE
Identify:
- The manufacturer or organization
- The system or product
- The governing document or evidence set
- The governing revision or date when verified
- Any relevant embedded appendix, bulletin, or supplement

DIRECT ANSWER
Answer the user's question concisely.

EVIDENCE
For every material conclusion, provide:
- The conclusion being supported
- Repository filename
- Containing document title when verified
- Embedded appendix, bulletin, or supplement when applicable
- Revision or publication date governing the cited material
- Page, section, heading, table, figure, or other location when available
- A concise description of the supporting evidence

MULTIPLE-SOURCE REVIEW
State whether:
- One source governed
- Multiple sources agreed
- Multiple sources covered different parts of the answer
- A conflict was found

CONFLICTS
Describe any conflicting requirements, revisions, terminology, or evidence.
If no conflict was found, state that no conflict was identified in the
retrieved applicable evidence.

CONFIDENCE
Assign a confidence level to each material conclusion:
- HIGH: directly stated in applicable governing evidence
- MEDIUM: supported but requires limited interpretation
- LOW: incomplete, indirect, ambiguous, or potentially affected by
  missing evidence

UNVERIFIED OR MISSING INFORMATION
Identify anything that could not be verified.

EVIDENCE BOUNDARY
State whether the answer relied exclusively on the uploaded repository.
"""

    print()
    print("=" * 70)
    print("ENGINECORE EVIDENCE ANALYSIS")
    print("=" * 70)
    print()

    response = client.responses.create(
        model=MODEL_NAME,
        input=prompt,
        tools=[
            {
                "type": "file_search",
                "vector_store_ids": [vector_store_id],
            }
        ],
    )

    print(response.output_text)


def main() -> None:
    print("=" * 70)
    print("ENGINECORE PERSISTENT EVIDENCE RETRIEVAL")
    print("=" * 70)

    MANUALS_FOLDER.mkdir(exist_ok=True)

    state = load_state()

    vector_store_id = get_or_create_vector_store(
        client=client,
        state=state,
    )

    pdf_files = synchronize_manuals(
        client=client,
        vector_store_id=vector_store_id,
        state=state,
    )

    user_question = get_user_question()

    run_enginecore_question(
        vector_store_id=vector_store_id,
        pdf_files=pdf_files,
        user_question=user_question,
    )

    print()
    print("=" * 70)
    print("END ENGINECORE RESPONSE")
    print("=" * 70)


if __name__ == "__main__":
    main()

