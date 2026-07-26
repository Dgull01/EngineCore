"""
EngineCore Module Router

Purpose:
Route a user question to the applicable EngineCore knowledge modules.

Input:
- User question
- Available module registry

Output:
- List of applicable module IDs

Version 1 uses explicit product and manufacturer terms from each module
manifest. It does not retrieve evidence or issue technical conclusions.
"""

from typing import Any

from module_registry import load_module_registry


def normalize_text(value: str) -> str:
    """
    Normalize text for simple case-insensitive matching.
    """
    return value.strip().lower()


def build_module_search_terms(
    manifest: dict[str, Any],
) -> set[str]:
    """
    Build searchable terms from one module manifest.
    """
    search_terms = {
        normalize_text(manifest["name"]),
        normalize_text(manifest["manufacturer"]),
        normalize_text(manifest["category"]),
    }

    for product in manifest["products"]:
        search_terms.add(normalize_text(product))

    for domain in manifest["domains"]:
        search_terms.add(
            normalize_text(domain.replace("_", " "))
        )

    return {
        term
        for term in search_terms
        if term
    }


def route_question_to_modules(
    user_question: str,
) -> list[dict[str, Any]]:
    """
    Return every module whose manifest terms match the question.
    """
    normalized_question = normalize_text(user_question)
    registry = load_module_registry()
    matches = []

    for manifest in registry:
        search_terms = build_module_search_terms(manifest)

        matched_terms = sorted(
            term
            for term in search_terms
            if term in normalized_question
        )

        if matched_terms:
            matches.append(
                {
                    "module_id": manifest["module_id"],
                    "name": manifest["name"],
                    "status": manifest["status"],
                    "matched_terms": matched_terms,
                    "manifest_path": manifest["_manifest_path"],
                }
            )

    return matches


def print_routing_result(
    user_question: str,
) -> None:
    """
    Print a readable standalone routing test.
    """
    matches = route_question_to_modules(user_question)

    print("=" * 70)
    print("ENGINECORE MODULE ROUTER")
    print("=" * 70)
    print()
    print(f"Question: {user_question}")
    print()

    if not matches:
        print("No applicable modules identified.")
        print("Active Scope Acquisition may be required.")
        return

    for match in matches:
        print(f"Module: {match['name']}")
        print(f"ID: {match['module_id']}")
        print(f"Status: {match['status']}")
        print(
            "Matched terms: "
            + ", ".join(match["matched_terms"])
        )
        print(f"Manifest: {match['manifest_path']}")
        print()

    print(f"Modules routed: {len(matches)}")


def main() -> None:
    """
    Run the standalone Module Router validation.
    """
    print("=" * 70)
    print("TEST ENGINECORE MODULE ROUTER")
    print("=" * 70)
    print()

    user_question = input("Question: ").strip()

    if not user_question:
        print("No question entered.")
        return

    print()
    print_routing_result(user_question)


if __name__ == "__main__":
    main()