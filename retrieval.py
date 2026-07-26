from pathlib import Path

from openai import OpenAI

from config import MODEL_NAME
from repository import build_repository_inventory


def run_targeted_retrieval_plan(
    client: OpenAI,
    vector_store_id: str,
    pdf_files: list[Path],
    user_question: str,
) -> str:
    """
    Perform EngineCore's first retrieval pass.

    This pass does not issue the final technical answer. It identifies
    the governing evidence that the final analysis must retrieve,
    including exact rules needed to support derived design steps.
    """
    repository_inventory = build_repository_inventory(pdf_files)

    planning_prompt = f"""
You are EngineCore's targeted retrieval planner.

USER QUESTION
{user_question}

AVAILABLE REPOSITORY FILES
{repository_inventory}

PURPOSE

Perform a first evidence-retrieval pass before EngineCore issues its
technical determination.

Do not write the final short-form or long-form answer.

Identify the evidence the final review must retrieve and verify.

RETRIEVAL RULES

1. Use only the uploaded repository.
2. Identify the exact manufacturer, system, appliance, component,
   procedure, or field condition involved.
3. Identify every materially applicable authority category:
   - Adopted code
   - Consensus standard
   - Manufacturer documentation
   - Company procedure
   - Historical or field evidence
4. Search for the controlling clause, not merely a document reference.
5. If one document references another governing document, search for
   the directly applicable language in that referenced document.
6. Identify any conclusion that depends on a calculated, inferred,
   or derived design step.
7. For every derived design step, retrieve the exact rule authorizing
   that method.

Examples of derived design steps include:
- Dividing an appliance into multiple coverage modules
- Combining nozzle coverage areas
- Selecting a measurement reference point
- Applying one appliance rule to another appliance category
- Calculating required flow numbers
- Choosing between revisions
- Treating a usual range as an allowed limit

8. Mathematical fit alone is not proof that a design method is permitted.
9. If the exact controlling clause is not retrieved, state that clearly.
10. Do not claim that no conflict exists when governing review remains
    incomplete.
11. Distinguish:
    - Document located
    - Applicable clause retrieved
    - Document referenced but clause not retrieved
    - Expected document missing
12. Keep the plan focused on evidence that could change the final answer.

Return exactly this structure:

TARGETED RETRIEVAL PLAN

QUESTION SCOPE
Identify the manufacturer, system, subject, and proposed condition.

CONTROLLING QUESTIONS
List the factual or design questions that must be resolved before a
responsible determination can be issued.

REQUIRED GOVERNING EVIDENCE
For each expected source, provide:
- Authority level
- Repository filename when located
- Exact rule or subject that must be retrieved
- Status:
  - CLAUSE RETRIEVED
  - DOCUMENT LOCATED — CLAUSE NOT RETRIEVED
  - NOT LOCATED
  - APPLICABILITY UNVERIFIED

DERIVED STEPS REQUIRING PROOF
Identify every calculated or inferred step that requires direct
authorization from governing evidence.

POTENTIAL CONFLICTS OR NUANCES
Identify differences in terminology, dimensions, measurement points,
revisions, or authority that require comparison.

MATERIAL EVIDENCE GAPS
Identify missing or unretrieved evidence that must limit the final
determination or confidence.

FINAL-PASS INSTRUCTIONS
State exactly what the final EngineCore review must verify before
issuing its answer.
"""

    response = client.responses.create(
        model=MODEL_NAME,
        input=planning_prompt,
        tools=[
            {
                "type": "file_search",
                "vector_store_ids": [vector_store_id],
            }
        ],
    )

    return response.output_text