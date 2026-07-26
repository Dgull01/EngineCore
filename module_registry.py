"""
EngineCore Module Registry

Discovers and validates EngineCore knowledge-module manifests.

This component does not retrieve technical evidence or issue conclusions.
It teaches EngineCore which modules exist and whether their manifests
meet the minimum architectural contract.
"""

import json
from pathlib import Path
from typing import Any


PROJECT_FOLDER = Path(__file__).parent
MODULES_FOLDER = PROJECT_FOLDER / "modules"

REQUIRED_MANIFEST_FIELDS = {
    "module_id",
    "name",
    "manufacturer",
    "category",
    "products",
    "domains",
    "expected_authorities",
    "authority_priority",
    "document_folders",
    "status",
    "version",
}

ALLOWED_STATUSES = {
    "draft",
    "beta",
    "active",
    "retired",
}


def discover_module_manifests() -> list[Path]:
    """
    Find every module.json file beneath the modules folder.
    """
    if not MODULES_FOLDER.exists():
        return []

    return sorted(MODULES_FOLDER.rglob("module.json"))


def load_module_manifest(manifest_path: Path) -> dict[str, Any]:
    """
    Load and validate one module manifest.

    Raises a descriptive error when the JSON or required structure
    is invalid.
    """
    try:
        with manifest_path.open("r", encoding="utf-8") as file:
            manifest = json.load(file)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Invalid JSON in {manifest_path}: {error}"
        ) from error
    except OSError as error:
        raise OSError(
            f"Could not read module manifest {manifest_path}: {error}"
        ) from error

    missing_fields = REQUIRED_MANIFEST_FIELDS - manifest.keys()

    if missing_fields:
        missing_list = ", ".join(sorted(missing_fields))
        raise ValueError(
            f"{manifest_path} is missing required fields: {missing_list}"
        )

    status = manifest["status"]

    if status not in ALLOWED_STATUSES:
        allowed = ", ".join(sorted(ALLOWED_STATUSES))
        raise ValueError(
            f"{manifest_path} has invalid status '{status}'. "
            f"Allowed values: {allowed}"
        )

    list_fields = [
        "products",
        "domains",
        "expected_authorities",
        "authority_priority",
    ]

    for field_name in list_fields:
        field_value = manifest[field_name]

        if not isinstance(field_value, list) or not field_value:
            raise ValueError(
                f"{manifest_path}: '{field_name}' must be a non-empty list."
            )

    if not isinstance(manifest["document_folders"], dict):
        raise ValueError(
            f"{manifest_path}: 'document_folders' must be an object."
        )

    return manifest


def load_module_registry() -> list[dict[str, Any]]:
    """
    Discover and validate every available module manifest.
    """
    manifests = []

    for manifest_path in discover_module_manifests():
        manifest = load_module_manifest(manifest_path)

        manifest["_manifest_path"] = str(
            manifest_path.relative_to(PROJECT_FOLDER)
        )

        manifests.append(manifest)

    return manifests


def print_module_registry() -> None:
    """
    Print a readable module-registry status report.
    """
    manifests = load_module_registry()

    print("=" * 70)
    print("ENGINECORE MODULE REGISTRY")
    print("=" * 70)

    if not manifests:
        print("No module manifests discovered.")
        return

    for manifest in manifests:
        print()
        print(f"Module: {manifest['name']}")
        print(f"ID: {manifest['module_id']}")
        print(f"Category: {manifest['category']}")
        print(f"Status: {manifest['status']}")
        print(f"Version: {manifest['version']}")
        print(f"Manifest: {manifest['_manifest_path']}")

    print()
    print(f"Modules discovered: {len(manifests)}")


if __name__ == "__main__":
    print_module_registry()