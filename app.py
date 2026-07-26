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
    is unchanged, new, or has been revised.
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

    If the saved vector store no longer exists or cannot be reached,
    create a replacement repository.
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


def run_evidence_test(
    vector_store_id: str,
    pdf_files: list[Path],
) -> None:
    """
    Run EngineCore's formatted evidence-retrieval test.
    """
    filenames = "\n".join(
        f"- {manual_path.name}"
        for manual_path in pdf_files
    )

    question = f"""
You are EngineCore, an evidence-controlled technical reasoning system.

The following files are available in the evidence repository:

{filenames}

Using only the uploaded evidence repository, identify:

1. The manual's full title.
2. Its revision number or publication date.
3. One safety-critical requirement stated in the manual.

If more than one manual is available, clearly identify which manual
supports each conclusion.

Do not use outside knowledge.
Do not guess or fill gaps with assumptions.

Return the answer using exactly this format:

ENGINECORE RESPONSE

DIRECT ANSWER
Provide a concise answer to each requested item.

EVIDENCE
For every conclusion, provide:
- The conclusion being supported.
- The uploaded document's filename.
- The page number, section, heading, or other location when available.
- A concise description of the supporting passage.

CONFIDENCE
Assign one confidence level to each conclusion:
- HIGH: directly and clearly stated in the evidence.
- MEDIUM: supported by the evidence but requires limited interpretation.
- LOW: incomplete, ambiguous, or only indirectly supported.

UNVERIFIED OR MISSING INFORMATION
Clearly identify anything that cannot be verified from the uploaded evidence.

EVIDENCE BOUNDARY
State whether the response relied exclusively on the uploaded evidence.
"""

    print()
    print("Running EngineCore evidence analysis...")
    print()

    response = client.responses.create(
        model=MODEL_NAME,
        input=question,
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

    run_evidence_test(vector_store_id, pdf_files)

    print()
    print("=" * 70)
    print("END ENGINECORE RESPONSE")
    print("=" * 70)


if __name__ == "__main__":
    main()