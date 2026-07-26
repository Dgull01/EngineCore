from prompts import build_enginecore_prompt
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


def get_response_mode() -> str:
    """
    Select the response presentation mode.

    Both modes require the same full governing review.
    Only the presentation depth changes.
    """
    print()
    response_mode = input(
        "Response mode [short/long] (default short): "
    ).strip().lower()

    if response_mode in {"long", "l", "detailed", "full"}:
        return "long"

    return "short"
    repository_inventory = build_repository_inventory(pdf_files)

    prompt = build_enginecore_prompt(
    user_question=user_question,
    repository_inventory=repository_inventory,
    response_mode=response_mode,
)

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
def run_enginecore_question(
    vector_store_id: str,
    pdf_files: list[Path],
    user_question: str,
    response_mode: str,
) -> None:
    """
    Run a technical question through EngineCore using the selected
    short-form or long-form response presentation.
    """
    repository_inventory = build_repository_inventory(pdf_files)

    prompt = build_enginecore_prompt(
        user_question=user_question,
        repository_inventory=repository_inventory,
        response_mode=response_mode,
    )

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
    """
    Start EngineCore, synchronize the evidence repository,
    collect the user's question and response mode, and run the analysis.
    """
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
    response_mode = get_response_mode()

    run_enginecore_question(
        vector_store_id=vector_store_id,
        pdf_files=pdf_files,
        user_question=user_question,
        response_mode=response_mode,
    )

    print()
    print("=" * 70)
    print("END ENGINECORE RESPONSE")
    print("=" * 70)


if __name__ == "__main__":
    main()

