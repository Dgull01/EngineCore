import hashlib
import json
from pathlib import Path
from typing import Any

from openai import OpenAI

from config import MANUALS_FOLDER, STATE_FILE, VECTOR_STORE_NAME


def calculate_file_hash(file_path: Path) -> str:
    """
    Calculate a SHA-256 fingerprint for a document.

    EngineCore uses the fingerprint to determine whether a document
    is new, unchanged, or revised.
    """
    sha256 = hashlib.sha256()

    with file_path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            sha256.update(chunk)

    return sha256.hexdigest()


def load_state() -> dict[str, Any]:
    """
    Load EngineCore's locally saved repository state.
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
    Save EngineCore's repository state locally.
    """
    with STATE_FILE.open("w", encoding="utf-8") as file:
        json.dump(state, file, indent=2)


def get_or_create_vector_store(
    client: OpenAI,
    state: dict[str, Any],
) -> str:
    """
    Reuse the existing vector store when possible.

    If the saved repository cannot be reached, create a replacement.
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
    client: OpenAI,
    vector_store_id: str,
    state: dict[str, Any],
) -> list[Path]:
    """
    Upload PDFs that are new or changed since the previous run.
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


def build_repository_inventory(pdf_files: list[Path]) -> str:
    """
    Build a readable filename inventory for scope and authority review.
    """
    return "\n".join(
        f"- {manual_path.name}"
        for manual_path in pdf_files
    )