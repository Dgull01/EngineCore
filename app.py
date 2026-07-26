import hashlib
import json
from pathlib import Path
from typing import Any

from openai import OpenAI


PROJECT_FOLDER = Path(__file__).parent
MANUALS_FOLDER = PROJECT_FOLDER / "manuals"
STATE_FILE = PROJECT_FOLDER / "enginecore_state.json"

VECTOR_STORE_NAME = "EngineCore Evidence Repository"
MODEL_NAME = "gpt-5.5"

client = OpenAI()


def calculate_file_hash(file_path: Path) -> str:
    """
    Calculate a SHA-256 fingerprint for a file.

    The fingerprint lets EngineCore recognize whether a manual
    is unchanged, new, or revised.
    """
    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            sha256.update(chunk)

    return sha256.hexdigest()


def load_state() -> dict[str, Any]:
    """
    Load EngineCore's locally saved repository information.
    """
    if not STATE_FILE.exists():
        return {
            "vector_store_id": None,
            "uploaded_files": {},
        }

    try:
        with STATE_FILE.open("r", encoding="utf-8") as file:
            state = json.load(file)

        state.setdefault("vector_store_id", None)
        state.setdefault("uploaded_files", {})

        return state

    except (json.JSONDecodeError, OSError) as error:
        print(f"Warning: Could not read {STATE_FILE.name}: {error}")
        print("EngineCore will create a new evidence repository.")

        return {
            "vector_store_id": None,
            "uploaded_files": {},
        }


def save_state(state: dict[str, Any]) -> None:
    """
    Save EngineCore's repository information locally.
    """
    with STATE_FILE.open("w", encoding="utf-8") as file:
        json.dump(state, file, indent=2)


def get_or_create_vector_store(state: dict[str, Any]) -> str:
    """
    Reuse the existing vector store when possible.

    If the saved vector store cannot be reached, create a replacement.
    """
    vector_store_id = state.get("vector_store_id")

    if vector_store_id:
        try:
            vector_store = client.vector_stores.retrieve(
                vector_store_id=vector_store_id
            )

            print(f"Reusing evidence repository: {vector_store.id}")
            return vector_store.id

        except Exception as error:
            print("Saved evidence repository could not be reused.")
            print(f"Reason: {error}")
            print("Creating a replacement repository...")

    vector_store = client.vector_stores.create(
        name=VECTOR_STORE_NAME
    )

    state["vector_store_id"] = vector_store.id
    state["uploaded_files"] = {}
    save_state(state)

    print(f"Created evidence repository: {vector_store.id}")

    return vector_store.id


def synchronize_manuals(
    vector_store_id: str,
    state: dict[str, Any],
) -> list[Path]:
    """
    Upload PDFs that are new or have changed since the last run.
    """
    pdf_files = sorted(MANUALS_FOLDER.glob("*.pdf"))

    if not pdf_files:
        raise FileNotFoundError(
            f"No PDF manuals found in: {MANUALS_FOLDER}\n"
            "Copy at least one manual into that folder and run EngineCore again."
        )

    uploaded_files = state.setdefault("uploaded_files", {})
    uploaded_count = 0
    unchanged_count = 0

    for manual_path in pdf_files:
        filename = manual_path.name
        current_hash = calculate_file_hash(manual_path)
        saved_record = uploaded_files.get(filename)

        if saved_record and saved_record.get("sha256") == current_hash:
            print(f"Already indexed: {filename}")
            unchanged_count += 1
            continue

        if saved_record:
            print(f"Updated manual detected: {filename}")
        else:
            print(f"New manual detected: {filename}")

        print(f"Uploading and indexing: {filename}")

        with manual_path.open("rb") as manual_file:
            vector_store_file = (
                client.vector_stores.files.upload_and_poll(
                    vector_store_id=vector_store_id,
                    file=manual_file,
                )
            )

        uploaded_files[filename] = {
            "sha256": current_hash,
            "vector_store_file_id": getattr(
                vector_store_file,
                "id",
                None,
            ),
        }

        save_state(state)
        uploaded_count += 1

        print(f"Indexed successfully: {filename}")

    print()
    print(f"Manuals discovered: {len(pdf_files)}")
    print(f"New or changed manuals indexed: {uploaded_count}")
    print(f"Unchanged manuals reused: {unchanged_count}")

    return pdf_files


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


def build_repository_inventory(pdf_files: list[Path]) -> str:
    """
    Build a filename inventory for the model's scope review.
    """
    return "\n".join(
        f"- {manual_path.name}"
        for manual_path in pdf_files
    )


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
    vector_store_id = get_or_create_vector_store(state)
    pdf_files = synchronize_manuals(vector_store_id, state)

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